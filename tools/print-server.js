/**
 * print-server.js — Servidor de Impresión Local para Electromecánica JR
 * =====================================================================
 * Ejecutar en la PC del taller: node print-server.js
 * NO requiere tener el código del proyecto Next.js.
 *
 * Dependencias (instalar una vez):
 *   npm install
 *
 * Este servidor recibe solicitudes de impresión desde el navegador
 * (incluso desde la versión de producción en Vercel) y envía los
 * comandos ESC/POS a la impresora JP80H via Bluetooth o COM port.
 */

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ──────────────────────────────────────────────
// CONFIGURACIÓN — editar si es necesario
// ──────────────────────────────────────────────
const PORT = 3001;
const COM_PRIMARY = process.env.PRINTER_COM_PORT || 'COM3';
const COM_SECONDARY = process.env.PRINTER_COM_PORT_2 || 'COM5';
const BT_MAC = process.env.PRINTER_MAC || '86:67:7A:B9:0F:7F';
const BAUD_RATE = 9600;
// Dominio de la app en Vercel (para CORS)
const VERCEL_ORIGIN = process.env.APP_ORIGIN || 'https://app-electromecanica-juan-ramirez.vercel.app';
const LOGO_FILENAME = 'logo-ticket-2.png';

let cachedLogoBuffer = null;

// ──────────────────────────────────────────────
// ESC/POS BUILDER
// ──────────────────────────────────────────────
const CHARS = 32;

function center(text) {
    if (text.length >= CHARS) return text.substring(0, CHARS);
    const pad = Math.floor((CHARS - text.length) / 2);
    return ' '.repeat(pad) + text;
}

function twoCol(left, right) {
    const maxL = CHARS - right.length - 1;
    const l = left.substring(0, maxL);
    return l + '.'.repeat(Math.max(1, CHARS - l.length - right.length)) + right;
}

function wrapLine(text) {
    const result = [];
    text.split('\n').forEach(line => {
        if (line.length <= CHARS) { result.push(line); return; }
        for (let i = 0; i < line.length; i += CHARS) result.push(line.substring(i, i + CHARS));
    });
    return result;
}

function buildEscPos(datos) {
    const parts = [];
    const n = s => s + '\n';
    const ESC = '\x1B', GS = '\x1D';
    const D = '-'.repeat(CHARS);
    const D2 = '='.repeat(CHARS);
    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

    parts.push(ESC + '@');           // Init
    parts.push(ESC + '\x74\x00');   // PC437

    // Logo (si está cargado)
    if (cachedLogoBuffer) {
        parts.push(ESC + '\x61\x01');   // Centrar logo
        parts.push(cachedLogoBuffer);
        parts.push('\n');
    }

    // Encabezado
    parts.push(ESC + '\x61\x01');   // Centrar
    parts.push(ESC + '\x45\x01');   // Bold
    parts.push(ESC + '\x21\x10');   // Doble alto
    parts.push(n('ELECTROMECANICA JR. SPA'));
    parts.push(ESC + '\x21\x00');
    parts.push(ESC + '\x45\x00');
    parts.push(n('SERVICIO DE MECANICA,'));
    parts.push(n('ELECTRONICA AUTOMOTRIZ Y GRUAS'));
    parts.push(n('A INMAR 2280 L IND SEC 2'));
    parts.push(n('PUERTO MONTT'));
    parts.push(n('electromecanicajr.spa@gmail.com'));
    parts.push(ESC + '\x61\x00');
    parts.push('\n');

    // Info ticket
    parts.push(n(D2));
    parts.push(n(`Ticket #: ${datos.ordenId}`));
    parts.push(n(`Fecha:    ${fecha}`));
    parts.push(n(D));

    // Cliente / vehículo
    if (datos.clienteNombre) parts.push(n(`Cliente: ${datos.clienteNombre}`));
    if (datos.clienteTelefono) parts.push(n(`Tel:     ${datos.clienteTelefono}`));
    parts.push(n(`Patente: ${datos.patente}`));
    if (datos.vehiculo) parts.push(n(`Vehiculo: ${datos.vehiculo}`));
    if (datos.motor) parts.push(n(`Motor:    ${datos.motor}`));
    if (datos.kmIngreso) parts.push(n(`KM Entrada: ${datos.kmIngreso.toLocaleString('es-CL')}`));
    if (datos.kmSalida) parts.push(n(`KM Salida:  ${datos.kmSalida.toLocaleString('es-CL')}`));
    parts.push('\n');
    parts.push(n(D));

    // Servicios
    parts.push(ESC + '\x61\x01');
    parts.push(ESC + '\x45\x01');
    parts.push(n('- SERVICIOS -'));
    parts.push(ESC + '\x45\x00');
    parts.push(ESC + '\x61\x00');
    parts.push('\n');
    if (datos.descripcion) {
        datos.descripcion.split('\n').filter(l => l.trim())
            .flatMap(l => wrapLine(l)).forEach(l => parts.push(n(l)));
    }
    parts.push('\n');
    parts.push(n(D));

    // Total
    if (datos.precioTotal !== undefined && datos.precioTotal !== null) {
        parts.push(ESC + '\x45\x01');
        parts.push(n(twoCol('TOTAL:', `$${datos.precioTotal.toLocaleString('es-CL')}`)));
        parts.push(ESC + '\x45\x00');
    }
    if (datos.metodosPago && datos.metodosPago.length) {
        datos.metodosPago.forEach(mp =>
            parts.push(n(twoCol(`  ${mp.metodo.toUpperCase()}:`, `$${mp.monto.toLocaleString('es-CL')}`)))
        );
    }

    // Pie
    parts.push('\n');
    parts.push(n(D2));
    parts.push(ESC + '\x61\x01');
    parts.push(n('*** GRACIAS POR SU PREFERENCIA ***'));
    if (datos.atendidoPor) parts.push(n(`Atendido por: ${datos.atendidoPor}`));
    parts.push('\n\n\n');
    parts.push(GS + '\x56\x42\x05');  // Cortar papel

    return Buffer.from(parts.join(''), 'binary');
}

// ──────────────────────────────────────────────
// IMPRIMIR (PowerShell RFCOMM → COM3 → COM5)
// ──────────────────────────────────────────────
async function printViaPowerShell(buffer, options = {}) {
    const { mac, com, baud = 9600 } = options;
    
    // Buscar el script en la misma carpeta que el ejecutable (si es un .exe)
    // o en la misma carpeta que el .js (si corre con node)
    let scriptPath = path.join(__dirname, 'bt-print.ps1');
    if (process.pkg) {
        scriptPath = path.join(path.dirname(process.execPath), 'bt-print.ps1');
    }

    if (!fs.existsSync(scriptPath)) {
        const internalPath = path.join(__dirname, 'bt-print.ps1');
        if (fs.existsSync(internalPath)) {
            scriptPath = internalPath;
        } else {
            throw new Error(`Script bt-print.ps1 no encontrado. Asegurate que este junto al ejecutable en: ${path.dirname(scriptPath)}`);
        }
    }

    const tmpFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, buffer);

    try {
        let args = `-dataFile "${tmpFile}"`;
        if (com) {
            args += ` -com "${com}" -baud ${baud}`;
        } else if (mac) {
            args += ` -mac "${mac}"`;
        } else {
            throw new Error("Se requiere MAC o puerto COM para imprimir.");
        }

        await new Promise((resolve, reject) => {
            const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ${args}`;
            exec(command, { timeout: 30000 }, (err, stdout, stderr) => {
                if (err) {
                    const cleanErr = stderr?.trim() || stdout?.trim() || err.message;
                    return reject(new Error(cleanErr));
                }
                if (stdout.includes('PRINT_OK')) return resolve();
                reject(new Error(stderr || stdout || 'Sin respuesta del script'));
            });
        });
    } finally {
        try { fs.unlinkSync(tmpFile); } catch { }
    }
}

// Eliminado printViaCOM ya que ahora usamos printViaPowerShell(..., { com })

// La funcion printViaCOM ya no existe

async function imprimir(datos) {
    const buffer = buildEscPos(datos);
    const errors = {};

    // 1. Bluetooth directo por MAC (via PowerShell)
    try {
        await printViaPowerShell(buffer, { mac: BT_MAC });
        return { success: true, method: `Bluetooth (${BT_MAC})` };
    } catch (e) { 
        errors.bluetooth = e.message; 
        console.warn(`⚠️ Bluetooth fallo: ${e.message}`);
    }

    // 2. COM port principal (via PowerShell)
    try {
        await printViaPowerShell(buffer, { com: COM_PRIMARY, baud: BAUD_RATE });
        return { success: true, method: COM_PRIMARY };
    } catch (e) { 
        errors[COM_PRIMARY] = e.message; 
        console.warn(`⚠️ ${COM_PRIMARY} fallo: ${e.message}`);
    }

    // 3. COM port secundario (via PowerShell)
    if (COM_SECONDARY !== COM_PRIMARY) {
        try {
            await printViaPowerShell(buffer, { com: COM_SECONDARY, baud: BAUD_RATE });
            return { success: true, method: COM_SECONDARY };
        } catch (e) { 
            errors[COM_SECONDARY] = e.message; 
            console.warn(`⚠️ ${COM_SECONDARY} fallo: ${e.message}`);
        }
    }

    return {
        success: false,
        error: 'No se pudo conectar a la impresora.',
        detail: Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(' | '),
    };
}

// ──────────────────────────────────────────────
// SERVIDOR HTTP
// ──────────────────────────────────────────────
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',             // Acepta peticiones desde cualquier origen (Vercel, localhost, etc.)
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

// ──────────────────────────────────────────────
// INICIO Y CARGA DE RECURSOS
// ──────────────────────────────────────────────
async function loadLogo() {
    let logoPath = path.join(__dirname, LOGO_FILENAME);
    if (process.pkg) {
        logoPath = path.join(path.dirname(process.execPath), LOGO_FILENAME);
    }

    if (!fs.existsSync(logoPath)) {
        console.log(`ℹ️  Logo no encontrado en: ${logoPath}. Saltando impresión de logo.`);
        return;
    }

    console.log(`🖼️  Cargando logo: ${logoPath}...`);
    try {
        const psCommand = `Add-Type -AssemblyName System.Drawing; $bmp=[System.Drawing.Bitmap]::FromFile('${logoPath}'); $w=$bmp.Width; $h=$bmp.Height; $wb=[Math]::Ceiling($w/8); $xL=$wb%256; $xH=[Math]::Floor($wb/256); $yL=$h%256; $yH=[Math]::Floor($h/256); $header=@(0x1D,0x76,0x30,0x00,$xL,$xH,$yL,$yH); $data=New-Object byte[]($wb*$h); $idx=0; for($y=0;$y-lt $h;$y++){for($x=0;$x-lt $wb;$x++){$b=0; for($bit=0;$bit-lt 8;$bit++){$px=($x*8)+$bit; if($px-lt $w){$p=$bmp.GetPixel($px,$y); if(($p.R+$p.G+$p.B)/3 -lt 128){$b=$b -bor (1 -shl (7-$bit))}}}; $data[$idx++]=$b}}; $bmp.Dispose(); $all=$header+$data; [System.BitConverter]::ToString($all).Replace('-','')`;

        const hex = await new Promise((resolve, reject) => {
            exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
                if (err) return reject(new Error(stderr || err.message));
                resolve(stdout.trim());
            });
        });

        if (hex && hex.length > 20) {
            cachedLogoBuffer = Buffer.from(hex, 'hex');
            console.log(`✅ Logo cargado con éxito (${cachedLogoBuffer.length} bytes).`);
        }
    } catch (err) {
        console.error(`❌ Error cargando logo:`, err.message);
    }
}

const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, CORS_HEADERS);
        return res.end();
    }

    // Health check
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, CORS_HEADERS);
        return res.end(JSON.stringify({ ok: true, version: '1.0', mac: BT_MAC, com: COM_PRIMARY }));
    }

    // Imprimir ticket
    if (req.method === 'POST' && req.url === '/print') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const datos = JSON.parse(body);
                console.log(`🖨️  Imprimiendo ticket #${datos.ordenId}...`);
                const result = await imprimir(datos);
                if (result.success) {
                    console.log(`✅ Impreso via ${result.method}`);
                } else {
                    console.error(`❌ Error:`, result.detail);
                }
                res.writeHead(result.success ? 200 : 503, CORS_HEADERS);
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error('Error procesando solicitud:', err.message);
                res.writeHead(400, CORS_HEADERS);
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, async () => {
    await loadLogo();
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Servidor de Impresión - Electromec. JR ║');
    console.log(`║   Puerto: http://localhost:${PORT}          ║`);
    console.log(`║   MAC Impresora: ${BT_MAC}  ║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('✅ Listo para recibir trabajos de impresión.');
    console.log('   Mantén esta ventana abierta mientras uses la app.');
    console.log('');
});
