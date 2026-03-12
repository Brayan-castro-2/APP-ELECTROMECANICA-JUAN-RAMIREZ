/**
 * printer-service.ts
 * Servicio de impresión ESC/POS para impresora JP80H via Bluetooth (COM port) en Windows.
 *
 * Estrategia:
 * 1. Intenta por COM port usando serialport (Bluetooth emparejado en Windows)
 * 2. Si falla COM3, intenta COM5 (el otro puerto del par Bluetooth)
 * 3. Si todo falla, lanza error descriptivo
 *
 * Prerequisitos: npm install serialport escpos escpos-usb escpos-network
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const COM_PORT_PRIMARY = process.env.PRINTER_COM_PORT || 'COM3';
const COM_PORT_SECONDARY = process.env.PRINTER_COM_PORT_2 || 'COM5';
const BAUD_RATE = 9600;   // Velocidad estándar para impresoras Bluetooth
const CHARS_PER_LINE = 32;

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
// HELPERS DE FORMATO (texto puro, sin ESC/POS aún)
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
// BUILDER DE BUFFER ESC/POS
// ============================================================
function buildEscPosBuffer(datos: TicketDatos): Buffer {
    const ESC = 0x1b;
    const GS = 0x1d;
    const LF = 0x0a;

    const chunks: Buffer[] = [];
    const t = (s: string) => Buffer.from(s + '\n', 'ascii');

    // Init + PC437
    chunks.push(Buffer.from([ESC, 0x40]));       // Init
    chunks.push(Buffer.from([ESC, 0x74, 0x00])); // PC437 encoding
    chunks.push(Buffer.from([ESC, 0x61, 0x01])); // Centrar

    // Encabezado en negrita + doble alto
    chunks.push(Buffer.from([ESC, 0x45, 0x01])); // Bold ON
    chunks.push(Buffer.from([ESC, 0x21, 0x10])); // Doble alto
    chunks.push(t('ELECTROMECANICA JR'));
    chunks.push(Buffer.from([ESC, 0x21, 0x00])); // Normal size
    chunks.push(Buffer.from([ESC, 0x45, 0x00])); // Bold OFF
    chunks.push(t('Taller Mecanico'));
    chunks.push(Buffer.from([ESC, 0x61, 0x00])); // Izquierda
    chunks.push(Buffer.from([LF]));

    // Info básica
    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    chunks.push(t(DIVIDER2));
    chunks.push(t(`Ticket #: ${datos.ordenId}`));
    chunks.push(t(`Fecha: ${fecha}`));
    chunks.push(t(DIVIDER));

    // Cliente y vehículo
    if (datos.clienteNombre) chunks.push(t(`Cliente: ${datos.clienteNombre}`));
    if (datos.clienteTelefono) chunks.push(t(`Tel: ${datos.clienteTelefono}`));
    chunks.push(t(`Patente: ${datos.patente}`));
    if (datos.vehiculo) chunks.push(t(`Vehiculo: ${datos.vehiculo}`));
    if (datos.motor) chunks.push(t(`Motor: ${datos.motor}`));
    if (datos.kmIngreso) chunks.push(t(`KM Entrada: ${datos.kmIngreso.toLocaleString('es-CL')}`));
    if (datos.kmSalida) chunks.push(t(`KM Salida:  ${datos.kmSalida.toLocaleString('es-CL')}`));
    chunks.push(Buffer.from([LF]));
    chunks.push(t(DIVIDER));

    // Servicios
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

    // Total
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

    chunks.push(Buffer.from([LF]));
    chunks.push(t(DIVIDER2));

    // Pie de página
    chunks.push(Buffer.from([ESC, 0x61, 0x01])); // Centrar
    chunks.push(t('*** GRACIAS POR SU PREFERENCIA ***'));
    if (datos.atendidoPor) {
        chunks.push(t(`Atendido por: ${datos.atendidoPor}`));
    }

    // Avance y corte
    chunks.push(Buffer.from([LF, LF, LF]));
    chunks.push(Buffer.from([GS, 0x56, 0x42, 0x05])); // Cortar papel

    return Buffer.concat(chunks);
}

// ============================================================
// IMPRIMIR VÍA SERIALPORT (más confiable que fs.writeFile en Windows)
// ============================================================
async function printViaCOM(datos: TicketDatos, comPort: string): Promise<void> {
    // Importación dinámica para evitar problemas de bundling de Next.js
    const { SerialPort } = await import('serialport') as any;

    const buffer = buildEscPosBuffer(datos);

    await new Promise<void>((resolve, reject) => {
        const port = new SerialPort({
            path: comPort,
            baudRate: BAUD_RATE,
            autoOpen: false,
        });

        port.open((openErr: Error | null) => {
            if (openErr) {
                return reject(new Error(`No se pudo abrir ${comPort}: ${openErr.message}`));
            }

            port.write(buffer, (writeErr: Error | null) => {
                if (writeErr) {
                    port.close(() => { });
                    return reject(new Error(`Error escribiendo en ${comPort}: ${writeErr.message}`));
                }

                port.drain((drainErr: Error | null) => {
                    port.close((closeErr: Error | null) => {
                        if (drainErr || closeErr) {
                            // Imprimió pero hubo error al cerrar — lo consideramos éxito
                            console.warn('Advertencia al cerrar puerto:', drainErr || closeErr);
                        }
                        resolve();
                    });
                });
            });
        });

        port.on('error', (err: Error) => {
            reject(new Error(`Error de puerto serial ${comPort}: ${err.message}`));
        });
    });
}

// ============================================================
// FUNCIÓN PRINCIPAL: COM3 → COM5
// ============================================================
export async function imprimirTicket(datos: TicketDatos): Promise<PrintResult> {
    const errors: Record<string, string> = {};

    // --- INTENTO 1: Puerto COM principal (ej: COM3) ---
    try {
        console.log(`🖨️  Intentando imprimir en ${COM_PORT_PRIMARY}...`);
        await printViaCOM(datos, COM_PORT_PRIMARY);
        console.log(`✅ Impresión exitosa en ${COM_PORT_PRIMARY}`);
        return {
            success: true,
            method: COM_PORT_PRIMARY,
            message: `¡Ticket #${datos.ordenId} enviado a la impresora (${COM_PORT_PRIMARY})! ✓`,
        };
    } catch (e: any) {
        const msg = e?.message || String(e);
        console.warn(`⚠️  ${COM_PORT_PRIMARY} falló:`, msg);
        errors[COM_PORT_PRIMARY] = msg;
    }

    // --- INTENTO 2: Puerto COM secundario (ej: COM5) ---
    if (COM_PORT_SECONDARY !== COM_PORT_PRIMARY) {
        try {
            console.log(`🖨️  Intentando imprimir en ${COM_PORT_SECONDARY}...`);
            await printViaCOM(datos, COM_PORT_SECONDARY);
            console.log(`✅ Impresión exitosa en ${COM_PORT_SECONDARY}`);
            return {
                success: true,
                method: COM_PORT_SECONDARY,
                message: `¡Ticket #${datos.ordenId} enviado a la impresora (${COM_PORT_SECONDARY})! ✓`,
            };
        } catch (e: any) {
            const msg = e?.message || String(e);
            console.error(`❌ ${COM_PORT_SECONDARY} también falló:`, msg);
            errors[COM_PORT_SECONDARY] = msg;
        }
    }

    // --- AMBOS FALLARON ---
    const errorDetails = Object.entries(errors).map(([p, m]) => `${p}: ${m}`).join(' | ');
    return {
        success: false,
        error: `No se pudo conectar a la impresora. Verifica que la JP80H esté encendida y emparejada por Bluetooth.`,
        detail: errorDetails,
        tip: [
            `1. Enciende la impresora JP80H`,
            `2. Conecta por Bluetooth si aún no está emparejada`,
            `3. En el .env verifica: PRINTER_COM_PORT=${COM_PORT_PRIMARY}`,
            `4. Si sigue fallando, prueba PRINTER_COM_PORT=${COM_PORT_SECONDARY}`,
            `5. Errores técnicos: ${errorDetails}`,
        ].join('\n'),
    };
}
