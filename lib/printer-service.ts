/**
 * printerService.ts
 * Servicio de impresión ESC/POS para impresora JP80H
 * 
 * Estrategia:
 * 1. Intenta imprimir por USB (automático, detecta el dispositivo)
 * 2. Si falla, intenta por puerto COM Bluetooth/Serie (configurado en PRINTER_COM_PORT)
 * 3. Si todo falla, lanza error descriptivo al cliente
 * 
 * Instalación: npm install escpos escpos-usb escpos-network
 * Para Bluetooth vía COM: npm install serialport (opcional)
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const COM_PORT = process.env.PRINTER_COM_PORT || 'COM3';  // Puerto COM Bluetooth (Windows)
const CHARS_PER_LINE = 32;  // Caracteres por línea para JP80H en modo normal
const BT_MAC = '86:67:7A:B9:0F:7F';  // MAC de la JP80H (referencia)

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

export type PrintResult = { success: true; method: string; message: string } | { success: false; error: string; tip?: string };

// ============================================================
// HELPERS DE FORMATO
// ============================================================

/** Centra texto dentro del ancho del ticket */
function center(text: string, width = CHARS_PER_LINE): string {
    if (text.length >= width) return text;
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text;
}

/** Alinea izquierda y derecha con puntos de relleno en el medio */
function twoColumns(left: string, right: string, width = CHARS_PER_LINE): string {
    const maxLeft = width - right.length - 1;
    const trimmedLeft = left.substring(0, maxLeft);
    const dots = '.'.repeat(Math.max(1, width - trimmedLeft.length - right.length));
    return trimmedLeft + dots + right;
}

/** Trunca/ajusta texto a max chars por línea */
function wrap(text: string, width = CHARS_PER_LINE): string[] {
    const lines: string[] = [];
    const words = text.split('\n');
    for (const word of words) {
        if (word.length <= width) {
            lines.push(word);
        } else {
            // Divide líneas largas
            for (let i = 0; i < word.length; i += width) {
                lines.push(word.substring(i, i + width));
            }
        }
    }
    return lines;
}

/** Línea divisoria */
const DIVIDER_DASH = '-'.repeat(CHARS_PER_LINE);
const DIVIDER_EQUAL = '='.repeat(CHARS_PER_LINE);

// ============================================================
// GENERADOR DE TEXTO DEL TICKET
// ============================================================
/** Genera el ticket como array de líneas de texto plano */
function buildTicketLines(datos: TicketDatos): string[] {
    const lines: string[] = [];
    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

    // Encabezado
    lines.push(center('ELECTROMECANICA JR'));
    lines.push(center('Taller Mecanico'));
    lines.push(DIVIDER_EQUAL);
    lines.push('');

    // Info básica
    lines.push(`Ticket #: ${datos.ordenId}`);
    lines.push(`Fecha: ${fecha}`);
    lines.push(DIVIDER_DASH);

    // Cliente y vehículo
    if (datos.clienteNombre) lines.push(`Cliente: ${datos.clienteNombre}`);
    if (datos.clienteTelefono) lines.push(`Tel: ${datos.clienteTelefono}`);
    lines.push(`Patente: ${datos.patente}`);
    if (datos.vehiculo) lines.push(`Vehiculo: ${datos.vehiculo}`);
    if (datos.motor) lines.push(`Motor: ${datos.motor}`);
    if (datos.kmIngreso) lines.push(`KM Entrada: ${datos.kmIngreso.toLocaleString('es-CL')}`);
    if (datos.kmSalida) lines.push(`KM Salida:  ${datos.kmSalida.toLocaleString('es-CL')}`);
    lines.push('');
    lines.push(DIVIDER_DASH);

    // Servicios
    lines.push(center('- SERVICIOS -'));
    lines.push('');
    if (datos.descripcion) {
        const serviceLines = datos.descripcion.split('\n').filter(l => l.trim());
        for (const sLine of serviceLines) {
            wrap(sLine).forEach(l => lines.push(l));
        }
    }
    lines.push('');
    lines.push(DIVIDER_DASH);

    // Total y métodos de pago
    if (datos.precioTotal !== undefined && datos.precioTotal !== null) {
        const totalStr = `$${datos.precioTotal.toLocaleString('es-CL')}`;
        lines.push(twoColumns('TOTAL:', totalStr));
    }
    if (datos.metodosPago && datos.metodosPago.length > 0) {
        for (const mp of datos.metodosPago) {
            lines.push(twoColumns(`  ${mp.metodo.toUpperCase()}:`, `$${mp.monto.toLocaleString('es-CL')}`));
        }
    }
    lines.push('');
    lines.push(DIVIDER_EQUAL);

    // Pie
    lines.push('');
    lines.push(center('*** GRACIAS POR SU PREFERENCIA ***'));
    if (datos.atendidoPor) {
        lines.push(center(`Atendido por: ${datos.atendidoPor}`));
    }
    lines.push('');
    lines.push('');

    return lines;
}

// ============================================================
// MÉTODO 1: IMPRESIÓN VÍA escpos + USB
// ============================================================
async function printViaEscposUSB(datos: TicketDatos): Promise<void> {
    // Importación dinámica para evitar problemas de bundling en Next.js
    const escpos = await import('escpos').then(m => m.default || m) as any;
    const USB = await import('escpos-usb').then(m => m.default || m) as any;

    const devices = USB.findPrinter ? USB.findPrinter() : USB.FindPrinter?.();
    if (!devices || devices.length === 0) {
        throw new Error('No se encontró ninguna impresora USB. Verifica la conexión.');
    }

    const device = new USB();
    const printer = new escpos.Printer(device, { encoding: 'PC437' });
    const lines = buildTicketLines(datos);

    await new Promise<void>((resolve, reject) => {
        device.open((err: any) => {
            if (err) return reject(err);

            try {
                printer
                    .encode('PC437')
                    .align('CT');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Primera línea (encabezado): negrita + grande
                    if (i === 0) {
                        printer.style('B').size(1, 1).text(line).style('NORMAL').size(0, 0);
                    } else {
                        printer.align('LT').text(line);
                    }
                }

                printer.cut().close((closeErr: any) => {
                    if (closeErr) reject(closeErr);
                    else resolve();
                });
            } catch (printErr) {
                reject(printErr);
            }
        });
    });
}

// ============================================================
// MÉTODO 2: IMPRESIÓN VÍA COM PORT (Bluetooth/USB-Serie en Windows)
// ============================================================
async function printViaCOMPort(datos: TicketDatos, comPort: string): Promise<void> {
    const fs = await import('fs');
    const lines = buildTicketLines(datos);

    // Comandos ESC/POS crudos
    const ESC = 0x1b;
    const GS = 0x1d;
    const chunks: Buffer[] = [];

    // Init + Encoding PC437
    chunks.push(Buffer.from([ESC, 0x40]));          // Init
    chunks.push(Buffer.from([ESC, 0x74, 0x00]));    // PC437
    chunks.push(Buffer.from([ESC, 0x61, 0x01]));    // Align center

    // Primera línea (encabezado) en negrita y doble alto
    chunks.push(Buffer.from([ESC, 0x45, 0x01]));    // Bold ON
    chunks.push(Buffer.from([ESC, 0x21, 0x10]));    // Double height
    chunks.push(Buffer.from(lines[0] + '\n', 'ascii'));
    chunks.push(Buffer.from([ESC, 0x21, 0x00]));    // Normal size
    chunks.push(Buffer.from([ESC, 0x45, 0x00]));    // Bold OFF
    chunks.push(Buffer.from([ESC, 0x61, 0x00]));    // Align left

    // Resto del ticket
    for (let i = 1; i < lines.length; i++) {
        chunks.push(Buffer.from(lines[i] + '\n', 'ascii'));
    }

    // Feed + Corte
    chunks.push(Buffer.from([0x0a, 0x0a, 0x0a]));   // 3 saltos
    chunks.push(Buffer.from([GS, 0x56, 0x42, 0x05])); // Cortar papel

    const ticketBuffer = Buffer.concat(chunks);

    // En Windows, puertos COM > COM9 necesitan prefijo \\\\.\\
    const portPath = /^COM\d+$/i.test(comPort.trim()) ? `\\\\.\\${comPort.trim()}` : comPort;

    await new Promise<void>((resolve, reject) => {
        fs.writeFile(portPath, ticketBuffer, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// ============================================================
// FUNCIÓN PRINCIPAL: Intenta USB → COM Bluetooth
// ============================================================
export async function imprimirTicket(datos: TicketDatos): Promise<PrintResult> {
    const errors: string[] = [];

    // --- INTENTO 1: USB via escpos-usb ---
    try {
        console.log('🖨️  Intentando imprimir por USB...');
        await printViaEscposUSB(datos);
        console.log('✅ Impresión USB exitosa');
        return {
            success: true,
            method: 'USB',
            message: `Ticket #${datos.ordenId} impreso por USB ✓`
        };
    } catch (usbError: any) {
        const msg = usbError?.message || String(usbError);
        console.warn('⚠️  USB falló:', msg);
        errors.push(`USB: ${msg}`);
    }

    // --- INTENTO 2: Puerto COM (Bluetooth emparejado o USB-Serie) ---
    try {
        console.log(`🖨️  Intentando imprimir por COM (${COM_PORT})...`);
        await printViaCOMPort(datos, COM_PORT);
        console.log(`✅ Impresión vía ${COM_PORT} exitosa`);
        return {
            success: true,
            method: `COM (${COM_PORT})`,
            message: `Ticket #${datos.ordenId} impreso por ${COM_PORT} (Bluetooth) ✓`
        };
    } catch (comError: any) {
        const msg = comError?.message || String(comError);
        console.error('❌ COM falló:', msg);
        errors.push(`${COM_PORT}: ${msg}`);
    }

    // --- AMBOS FALLARON ---
    return {
        success: false,
        error: 'No se pudo conectar a la impresora.',
        tip: [
            'Verifica que la JP80H esté encendida.',
            'Por USB: conecta el cable USB y confirma que Windows la detecta.',
            `Por Bluetooth: empareja la impresora y configura PRINTER_COM_PORT=${COM_PORT} en tu .env.local`,
            'Para ver el puerto COM: Administrador de dispositivos → Puertos (COM y LPT)',
            `Errores detallados: ${errors.join(' | ')}`
        ].join('\n'),
    };
}
