/**
 * printer-service.ts
 * Servicio de impresión ESC/POS para impresora JP80H via Bluetooth (COM port) en Windows.
 * Incluye impresión de logo como imagen raster ESC/POS.
 *
 * Prerequisitos: npm install serialport jimp
 */

import path from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================
const COM_PORT_PRIMARY = process.env.PRINTER_COM_PORT || 'COM3';
const COM_PORT_SECONDARY = process.env.PRINTER_COM_PORT_2 || 'COM5';
const BAUD_RATE = 9600;
const CHARS_PER_LINE = 32;
// Ancho de impresión en píxeles para JP80H a 203 DPI con 80mm → 480px. 
// Usamos 256 para compatibilidad y tamaño razonable del logo
const LOGO_PRINT_WIDTH = 256;

// Ruta del logo relativa a la raíz del proyecto Next.js (corre en el server)
const LOGO_PATH = path.join(process.cwd(), 'imagenes', 'LOGO ticket(fondo blanco) 2.PNG');

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
// HELPERS DE FORMATO
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
// CONVERSIÓN DE IMAGEN A BITMAP ESC/POS RASTER (GS v 0)
// ============================================================
/**
 * Convierte una imagen a buffer ESC/POS raster (GS v 0).
 * La imagen se escala a LOGO_PRINT_WIDTH y se convierte a 1-bit (blanco/negro).
 * Retorna null si hay error (la impresión continúa sin logo).
 */
async function buildLogoBuffer(): Promise<Buffer | null> {
    try {
        // jimp v1.x usa exports con nombre, no default
        const jimpModule = await import('jimp') as any;
        // La clase Jimp puede estar como Jimp, default, o directamente en el módulo
        const Jimp = jimpModule.Jimp || jimpModule.default || jimpModule;
        if (!Jimp || typeof Jimp.read !== 'function') {
            throw new Error('jimp no disponible o API incompatible');
        }
        const img = await Jimp.read(LOGO_PATH);

        // Escalar manteniendo proporción
        const ratio = img.getHeight() / img.getWidth();
        const printWidth = LOGO_PRINT_WIDTH;
        const printHeight = Math.round(printWidth * ratio);

        img.resize(printWidth, printHeight);
        img.greyscale();
        img.contrast(0.3); // Aumenta contraste para mejor impresión

        // Alinear ancho a múltiplo de 8 (requerimiento ESC/POS)
        const widthBytes = Math.ceil(printWidth / 8);
        const alignedWidth = widthBytes * 8;

        const rasterData: number[] = [];

        for (let y = 0; y < printHeight; y++) {
            for (let xByte = 0; xByte < widthBytes; xByte++) {
                let byte = 0;
                for (let bit = 0; bit < 8; bit++) {
                    const x = xByte * 8 + bit;
                    if (x < printWidth) {
                        const pixel = Jimp.intToRGBA(img.getPixelColor(x, y));
                        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
                        // Píxel oscuro (< 128) → bit 1 (imprime), claro → bit 0
                        if (brightness < 128) {
                            byte |= (0x80 >> bit);
                        }
                    }
                }
                rasterData.push(byte);
            }
        }

        // Construir comando ESC/POS: GS v 0
        // GS 0x76 0x30 m xL xH yL yH [data]
        // m=0 (normal), x = widthBytes, y = printHeight
        const GS = 0x1d;
        const xL = widthBytes & 0xFF;
        const xH = (widthBytes >> 8) & 0xFF;
        const yL = printHeight & 0xFF;
        const yH = (printHeight >> 8) & 0xFF;

        const header = Buffer.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
        const data = Buffer.from(rasterData);

        // Centrar logo: GS L (left margin) en función del ancho de papel
        // Para 80mm (576 dots) centramos el logo de LOGO_PRINT_WIDTH dots
        const leftMarginDots = Math.max(0, Math.floor((576 - printWidth) / 2));
        const centerCmd = Buffer.from([GS, 0x4C, leftMarginDots & 0xFF, (leftMarginDots >> 8) & 0xFF]);

        return Buffer.concat([centerCmd, header, data]);

    } catch (err) {
        console.warn('⚠️  No se pudo procesar el logo para impresión:', (err as Error).message);
        return null;
    }
}

// ============================================================
// BUILDER DE BUFFER ESC/POS
// ============================================================
async function buildEscPosBuffer(datos: TicketDatos): Promise<Buffer> {
    const ESC = 0x1b;
    const GS = 0x1d;
    const LF = 0x0a;

    const chunks: Buffer[] = [];
    const t = (s: string) => Buffer.from(s + '\n', 'ascii');

    // Init + PC437
    chunks.push(Buffer.from([ESC, 0x40]));       // Init impresora
    chunks.push(Buffer.from([ESC, 0x74, 0x00])); // Encoding PC437

    // --- LOGO (imagen raster) ---
    chunks.push(Buffer.from([ESC, 0x61, 0x01])); // Centrar
    const logoBuffer = await buildLogoBuffer();
    if (logoBuffer) {
        chunks.push(logoBuffer);
        chunks.push(Buffer.from([LF]));          // Espaciado después del logo
    }

    // --- TEXTO DE EMPRESA ---
    chunks.push(Buffer.from([ESC, 0x61, 0x01])); // Centrar
    chunks.push(Buffer.from([ESC, 0x45, 0x01])); // Bold ON
    chunks.push(t('ELECTROMECANICA JR. SPA'));
    chunks.push(Buffer.from([ESC, 0x45, 0x00])); // Bold OFF
    chunks.push(t('SERVICIO DE MECANICA,'));
    chunks.push(t('ELECTRONICA AUTOMOTRIZ Y GRUAS'));
    chunks.push(t('ACTIVIDADES DE SERVICIOS'));
    chunks.push(t('VINCULADAS AL TRANSPORTE'));
    chunks.push(t('TERRESTRE N.C.P.'));
    chunks.push(t('A INMAR 2280 L IND SEC 2'));
    chunks.push(t('PUERTO MONTT'));
    chunks.push(t('electromecanicajr.spa@gmail.com'));
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

    const buffer = await buildEscPosBuffer(datos);

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
