/**
 * printer-service.ts
 * Servicio de impresión ESC/POS para impresora JP80H via Bluetooth.
 *
 * Estrategia de conexión (en orden):
 * 1. PowerShell + WinRT: conecta directo por MAC sin necesitar "conectar" en Windows
 *    (igual que Waiterio en Android — solo necesita Bluetooth activo en la PC)
 * 2. COM port (serialport): fallback si PowerShell falla (requiere conexión pre-establecida)
 *
 * Prerequisitos: npm install serialport
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

// ============================================================
// CONFIGURACIÓN
// ============================================================
const BT_MAC = process.env.PRINTER_MAC || '86:67:7A:B9:0F:7F';
const COM_PORT_PRIMARY = process.env.PRINTER_COM_PORT || 'COM3';
const COM_PORT_SECONDARY = process.env.PRINTER_COM_PORT_2 || 'COM5';
const BAUD_RATE = 9600;
const CHARS_PER_LINE = 32;
const PS_SCRIPT_PATH = path.join(process.cwd(), 'tools', 'bt-print.ps1');

// ============================================================
// TIPOS
// ============================================================
export interface TicketDatos {
    ordenId: number;
    clienteNombre?: string | null;
    clienteTelefono?: string | null;
    patente: string;
    vehiculo?: string | null;
    motor?: string | null;
    kmIngreso?: number | null;
    kmSalida?: number | null;
    descripcion?: string | null;
    precioTotal?: number | null;
    metodosPago?: Array<{ metodo: string; monto: number }> | null;
    atendidoPor?: string | null;
}

export type PrintResult =
    | { success: true; method: string; message: string }
    | { success: false; error: string; tip?: string; detail?: string };

// ============================================================
// HELPERS DE FORMATO DE TEXTO
// ============================================================
function center(text: string, width = CHARS_PER_LINE): string {
    if (text.length >= width) return text.substring(0, width);
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text;
}

function twoColumns(left: string, right: string, width = CHARS_PER_LINE): string {
    const maxLeft = width - right.length - 1;
    const l = left.substring(0, maxLeft);
    const dots = '.'.repeat(Math.max(1, width - l.length - right.length));
    return l + dots + right;
}

function wrap(text: string, width = CHARS_PER_LINE): string[] {
    const result: string[] = [];
    text.split('\n').forEach(line => {
        if (line.length <= width) {
            result.push(line);
        } else {
            for (let i = 0; i < line.length; i += width) {
                result.push(line.substring(i, i + width));
            }
        }
    });
    return result;
}

const DIVIDER = '-'.repeat(CHARS_PER_LINE);
const DIVIDER2 = '='.repeat(CHARS_PER_LINE);

// ============================================================
// BUILDER DEL BUFFER ESC/POS
// ============================================================
function buildEscPosBuffer(datos: TicketDatos): Buffer {
    const ESC = 0x1b;
    const GS = 0x1d;
    const LF = 0x0a;

    const chunks: Buffer[] = [];
    const t = (s: string) => Buffer.from(s + '\n', 'ascii');

    // Inicializar + encoding PC437
    chunks.push(Buffer.from([ESC, 0x40]));        // Init impresora
    chunks.push(Buffer.from([ESC, 0x74, 0x00]));  // PC437 (USA Standard)

    // ---- ENCABEZADO ----
    chunks.push(Buffer.from([ESC, 0x61, 0x01]));  // Centrar
    chunks.push(Buffer.from([ESC, 0x45, 0x01]));  // Bold ON
    chunks.push(Buffer.from([ESC, 0x21, 0x10]));  // Doble alto
    chunks.push(t('ELECTROMECANICA JR. SPA'));
    chunks.push(Buffer.from([ESC, 0x21, 0x00]));  // Normal size
    chunks.push(Buffer.from([ESC, 0x45, 0x00]));  // Bold OFF
    chunks.push(t('SERVICIO DE MECANICA,'));
    chunks.push(t('ELECTRONICA AUTOMOTRIZ Y GRUAS'));
    chunks.push(t('A INMAR 2280 L IND SEC 2'));
    chunks.push(t('PUERTO MONTT'));
    chunks.push(t('electromecanicajr.spa@gmail.com'));
    chunks.push(Buffer.from([ESC, 0x61, 0x00]));  // Izquierda
    chunks.push(Buffer.from([LF]));

    // ---- INFO DEL TICKET ----
    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    chunks.push(t(DIVIDER2));
    chunks.push(t(`Ticket #: ${datos.ordenId}`));
    chunks.push(t(`Fecha:    ${fecha}`));
    chunks.push(t(DIVIDER));

    // ---- DATOS DEL VEHÍCULO Y CLIENTE ----
    if (datos.clienteNombre) chunks.push(t(`Cliente: ${datos.clienteNombre}`));
    if (datos.clienteTelefono) chunks.push(t(`Tel:     ${datos.clienteTelefono}`));
    chunks.push(t(`Patente: ${datos.patente}`));
    if (datos.vehiculo) chunks.push(t(`Vehiculo: ${datos.vehiculo}`));
    if (datos.motor) chunks.push(t(`Motor:    ${datos.motor}`));
    if (datos.kmIngreso) chunks.push(t(`KM Entrada: ${datos.kmIngreso.toLocaleString('es-CL')}`));
    if (datos.kmSalida) chunks.push(t(`KM Salida:  ${datos.kmSalida.toLocaleString('es-CL')}`));
    chunks.push(Buffer.from([LF]));
    chunks.push(t(DIVIDER));

    // ---- SERVICIOS ----
    chunks.push(Buffer.from([ESC, 0x61, 0x01])); // Centrar
    chunks.push(Buffer.from([ESC, 0x45, 0x01])); // Bold ON
    chunks.push(t('- SERVICIOS -'));
    chunks.push(Buffer.from([ESC, 0x45, 0x00])); // Bold OFF
    chunks.push(Buffer.from([ESC, 0x61, 0x00])); // Izquierda
    chunks.push(Buffer.from([LF]));

    if (datos.descripcion) {
        datos.descripcion.split('\n')
            .filter(l => l.trim())
            .flatMap(l => wrap(l))
            .forEach(l => chunks.push(t(l)));
    }
    chunks.push(Buffer.from([LF]));
    chunks.push(t(DIVIDER));

    // ---- TOTAL ----
    if (datos.precioTotal !== undefined && datos.precioTotal !== null) {
        chunks.push(Buffer.from([ESC, 0x45, 0x01]));
        chunks.push(t(twoColumns('TOTAL:', `$${datos.precioTotal.toLocaleString('es-CL')}`)));
        chunks.push(Buffer.from([ESC, 0x45, 0x00]));
    }
    if (datos.metodosPago?.length) {
        datos.metodosPago.forEach(mp =>
            chunks.push(t(twoColumns(`  ${mp.metodo.toUpperCase()}:`, `$${mp.monto.toLocaleString('es-CL')}`)))
        );
    }

    // ---- PIE ----
    chunks.push(Buffer.from([LF]));
    chunks.push(t(DIVIDER2));
    chunks.push(Buffer.from([ESC, 0x61, 0x01])); // Centrar
    chunks.push(t('*** GRACIAS POR SU PREFERENCIA ***'));
    if (datos.atendidoPor) {
        chunks.push(t(`Atendido por: ${datos.atendidoPor}`));
    }
    chunks.push(Buffer.from([LF, LF, LF]));
    chunks.push(Buffer.from([GS, 0x56, 0x42, 0x05])); // Cortar papel

    return Buffer.concat(chunks);
}

// ============================================================
// MÉTODO 1: PowerShell WinRT (RFCOMM directo por MAC)
// ============================================================
/**
 * Se conecta directamente a la JP80H usando la MAC address via WinRT RFCOMM.
 * No requiere que el usuario haga "Conectar" en Windows Bluetooth.
 * Solo necesita que la impresora esté encendida y emparejada alguna vez.
 */
async function printViaPowerShell(datos: TicketDatos): Promise<void> {
    const { execFile } = await import('child_process');

    if (!fs.existsSync(PS_SCRIPT_PATH)) {
        throw new Error(`Script PowerShell no encontrado: ${PS_SCRIPT_PATH}`);
    }

    // Escribir el buffer ESC/POS a un archivo temporal
    const buffer = buildEscPosBuffer(datos);
    const tmpFile = path.join(os.tmpdir(), `ticket_${datos.ordenId}_${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, buffer);

    try {
        await new Promise<void>((resolve, reject) => {
            execFile(
                'powershell.exe',
                [
                    '-NoProfile',
                    '-ExecutionPolicy', 'Bypass',
                    '-File', PS_SCRIPT_PATH,
                    '-dataFile', tmpFile,
                    '-mac', BT_MAC,
                ],
                { timeout: 20000 },
                (error, stdout, stderr) => {
                    if (error) {
                        const msg = stderr?.trim() || stdout?.trim() || error.message;
                        reject(new Error(`PowerShell: ${msg}`));
                    } else if (stdout.includes('PRINT_OK')) {
                        resolve();
                    } else {
                        const msg = stderr?.trim() || stdout?.trim() || 'Respuesta inesperada del script';
                        reject(new Error(`PowerShell: ${msg}`));
                    }
                }
            );
        });
    } finally {
        // Limpiar archivo temporal
        try { fs.unlinkSync(tmpFile); } catch { }
    }
}

// ============================================================
// MÉTODO 2: COM Port via serialport (fallback)
// ============================================================
async function printViaCOM(datos: TicketDatos, comPort: string): Promise<void> {
    const { SerialPort } = await import('serialport') as any;
    const buffer = buildEscPosBuffer(datos);

    await new Promise<void>((resolve, reject) => {
        const port = new SerialPort({
            path: comPort,
            baudRate: BAUD_RATE,
            autoOpen: false,
        });

        port.open((openErr: Error | null) => {
            if (openErr) return reject(new Error(`No se pudo abrir ${comPort}: ${openErr.message}`));

            port.write(buffer, (writeErr: Error | null) => {
                if (writeErr) {
                    port.close(() => { });
                    return reject(new Error(`Error al escribir en ${comPort}: ${writeErr.message}`));
                }
                port.drain((drainErr: Error | null) => {
                    port.close((closeErr: Error | null) => {
                        if (drainErr || closeErr) {
                            console.warn('Advertencia al cerrar puerto:', drainErr || closeErr);
                        }
                        resolve();
                    });
                });
            });
        });

        port.on('error', (err: Error) => {
            reject(new Error(`Error de puerto: ${err.message}`));
        });
    });
}

// ============================================================
// FUNCIÓN PRINCIPAL PÚBLICA
// ============================================================
export async function imprimirTicket(datos: TicketDatos): Promise<PrintResult> {
    const errors: Record<string, string> = {};

    // --- INTENTO 1: PowerShell WinRT (directo por MAC, sin necesitar "Conectar" en Windows) ---
    try {
        console.log(`🖨️  Intentando imprimir via Bluetooth RFCOMM (MAC: ${BT_MAC})...`);
        await printViaPowerShell(datos);
        console.log('✅ Impresión Bluetooth exitosa via PowerShell');
        return {
            success: true,
            method: `Bluetooth RFCOMM (${BT_MAC})`,
            message: `¡Ticket #${datos.ordenId} impreso por Bluetooth! ✓`,
        };
    } catch (e: any) {
        const msg = e?.message || String(e);
        console.warn('⚠️  PowerShell Bluetooth falló:', msg);
        errors['Bluetooth'] = msg;
    }

    // --- INTENTO 2: COM port principal ---
    try {
        console.log(`🖨️  Intentando imprimir via ${COM_PORT_PRIMARY}...`);
        await printViaCOM(datos, COM_PORT_PRIMARY);
        console.log(`✅ Impresión exitosa via ${COM_PORT_PRIMARY}`);
        return {
            success: true,
            method: COM_PORT_PRIMARY,
            message: `¡Ticket #${datos.ordenId} impreso via ${COM_PORT_PRIMARY}! ✓`,
        };
    } catch (e: any) {
        const msg = e?.message || String(e);
        console.warn(`⚠️  ${COM_PORT_PRIMARY} falló:`, msg);
        errors[COM_PORT_PRIMARY] = msg;
    }

    // --- INTENTO 3: COM port secundario ---
    if (COM_PORT_SECONDARY !== COM_PORT_PRIMARY) {
        try {
            console.log(`🖨️  Intentando imprimir via ${COM_PORT_SECONDARY}...`);
            await printViaCOM(datos, COM_PORT_SECONDARY);
            console.log(`✅ Impresión exitosa via ${COM_PORT_SECONDARY}`);
            return {
                success: true,
                method: COM_PORT_SECONDARY,
                message: `¡Ticket #${datos.ordenId} impreso via ${COM_PORT_SECONDARY}! ✓`,
            };
        } catch (e: any) {
            const msg = e?.message || String(e);
            console.error(`❌ ${COM_PORT_SECONDARY} también falló:`, msg);
            errors[COM_PORT_SECONDARY] = msg;
        }
    }

    // --- TODOS FALLARON ---
    const detail = Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(' | ');
    return {
        success: false,
        error: 'No se pudo conectar a la impresora JP80H.',
        detail,
        tip: [
            '1. Asegúrate que la JP80H esté encendida',
            '2. Que el Bluetooth de la PC esté activo',
            '3. Que la impresora esté emparejada con esta PC (solo hace falta una vez)',
            `4. MAC configurada: ${BT_MAC}`,
            `5. Errores: ${detail}`,
        ].join('\n'),
    };
}
