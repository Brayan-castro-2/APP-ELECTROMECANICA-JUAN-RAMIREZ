/**
 * qz-print.ts
 * Hook de React para imprimir via QZ Tray.
 * 
 * QZ Tray es una app de escritorio gratuita que corre en Windows y actúa como
 * puente entre la web y la impresora. La web se conecta via WebSocket.
 * 
 * ✅ Funciona desde Vercel (producción) — QZ Tray corre en la PC del taller,
 *    el navegador se conecta a él directamente vía WebSocket local.
 * 
 * Descargar QZ Tray: https://qz.io/download/
 */

'use client';

// ============================================================
// TIPOS
// ============================================================
export interface TicketParaImprimir {
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

// ============================================================
// BUILDER ESC/POS (cliente-side — solo cálculos, sin I/O)
// ============================================================
const CHARS = 32;

function center(text: string): string {
    if (text.length >= CHARS) return text.substring(0, CHARS);
    const pad = Math.floor((CHARS - text.length) / 2);
    return ' '.repeat(pad) + text;
}

function twoCol(left: string, right: string): string {
    const maxL = CHARS - right.length - 1;
    const l = left.substring(0, maxL);
    return l + '.'.repeat(Math.max(1, CHARS - l.length - right.length)) + right;
}

function wrapLine(text: string): string[] {
    const result: string[] = [];
    text.split('\n').forEach(line => {
        if (line.length <= CHARS) { result.push(line); return; }
        for (let i = 0; i < line.length; i += CHARS) result.push(line.substring(i, i + CHARS));
    });
    return result;
}

const D = '-'.repeat(CHARS);
const D2 = '='.repeat(CHARS);
const ESC = '\x1B', GS = '\x1D';

/**
 * Genera el string de comandos ESC/POS para el ticket.
 * Retorna un string que QZ Tray envía como datos "raw" a la impresora.
 */
export function buildEscPosString(datos: TicketParaImprimir): string {
    const parts: string[] = [];
    const n = (s: string) => s + '\n';
    const fecha = new Date().toLocaleString('es-CL');

    // Init + PC437
    parts.push(ESC + '@');           // Init
    parts.push(ESC + '\x74\x00');   // PC437

    // ---- ENCABEZADO ----
    parts.push(ESC + '\x61\x01');   // Centrar
    parts.push(ESC + '\x45\x01');   // Bold ON
    parts.push(ESC + '\x21\x10');   // Doble alto
    parts.push(n('ELECTROMECANICA JR. SPA'));
    parts.push(ESC + '\x21\x00');   // Normal
    parts.push(ESC + '\x45\x00');   // Bold OFF
    parts.push(n('SERVICIO DE MECANICA,'));
    parts.push(n('ELECTRONICA AUTOMOTRIZ Y GRUAS'));
    parts.push(n('A INMAR 2280 L IND SEC 2'));
    parts.push(n('PUERTO MONTT'));
    parts.push(n('electromecanicajr.spa@gmail.com'));
    parts.push(ESC + '\x61\x00');   // Izquierda
    parts.push('\n');

    // ---- INFO TICKET ----
    parts.push(n(D2));
    parts.push(n(`Ticket #: ${datos.ordenId}`));
    parts.push(n(`Fecha:    ${fecha}`));
    parts.push(n(D));

    // ---- CLIENTE/VEHÍCULO ----
    if (datos.clienteNombre) parts.push(n(`Cliente: ${datos.clienteNombre}`));
    if (datos.clienteTelefono) parts.push(n(`Tel:     ${datos.clienteTelefono}`));
    parts.push(n(`Patente: ${datos.patente}`));
    if (datos.vehiculo) parts.push(n(`Vehiculo: ${datos.vehiculo}`));
    if (datos.motor) parts.push(n(`Motor:    ${datos.motor}`));
    if (datos.kmIngreso) parts.push(n(`KM Entrada: ${datos.kmIngreso.toLocaleString('es-CL')}`));
    if (datos.kmSalida) parts.push(n(`KM Salida:  ${datos.kmSalida.toLocaleString('es-CL')}`));
    parts.push('\n');
    parts.push(n(D));

    // ---- SERVICIOS ----
    parts.push(ESC + '\x61\x01');
    parts.push(ESC + '\x45\x01');
    parts.push(n('- SERVICIOS -'));
    parts.push(ESC + '\x45\x00');
    parts.push(ESC + '\x61\x00');
    parts.push('\n');
    if (datos.descripcion) {
        datos.descripcion.split('\n').filter(l => l.trim()).flatMap(l => wrapLine(l)).forEach(l => parts.push(n(l)));
    }
    parts.push('\n');
    parts.push(n(D));

    // ---- TOTAL ----
    if (datos.precioTotal !== undefined && datos.precioTotal !== null) {
        parts.push(ESC + '\x45\x01');
        parts.push(n(twoCol('TOTAL:', `$${datos.precioTotal.toLocaleString('es-CL')}`)));
        parts.push(ESC + '\x45\x00');
    }
    if (datos.metodosPago?.length) {
        datos.metodosPago.forEach(mp =>
            parts.push(n(twoCol(`  ${mp.metodo.toUpperCase()}:`, `$${mp.monto.toLocaleString('es-CL')}`)))
        );
    }

    // ---- PIE ----
    parts.push('\n');
    parts.push(n(D2));
    parts.push(ESC + '\x61\x01');
    parts.push(n('*** GRACIAS POR SU PREFERENCIA ***'));
    if (datos.atendidoPor) parts.push(n(`Atendido por: ${datos.atendidoPor}`));
    parts.push('\n\n\n');
    parts.push(GS + '\x56\x42\x05');  // Cortar papel

    return parts.join('');
}

// ============================================================
// FUNCIÓN PRINCIPAL: Imprimir via QZ Tray
// ============================================================
/**
 * Conecta a QZ Tray corriendo en la PC local y envía el ticket.
 * 
 * @param datos - Datos del ticket
 * @param printerName - Nombre de la impresora en Windows (ej: "JP80H" o "Generic / Text Only")
 */
export async function imprimirConQZ(datos: TicketParaImprimir, printerName = 'JP80H'): Promise<void> {
    // Importación dinámica para que no falle en SSR
    const qz = (await import('qz-tray')).default;

    // Configurar seguridad (modo sin certificado — requiere "Allow unsigned" en QZ Tray)
    qz.security.setCertificatePromise((_resolve: any, _reject: any) => {
        _resolve(undefined);
    });
    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise((_toSign: any) => {
        return (_resolve: any, _reject: any) => _resolve();
    });

    // Conectar al WebSocket de QZ Tray (corre en localhost:8181 o 8182)
    if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
    }

    try {
        // Buscar la impresora por nombre (parcial)
        const printer = await qz.printers.find(printerName);
        if (!printer) {
            throw new Error(`Impresora "${printerName}" no encontrada. Verifica el nombre en QZ Tray.`);
        }

        // Configurar trabajo de impresión
        const config = qz.configs.create(printer);

        // Construir datos ESC/POS
        const escPosString = buildEscPosString(datos);

        // Enviar a imprimir como datos raw ESC/POS
        const printData = [{
            type: 'raw',
            format: 'plain',
            flavor: 'plain',
            data: escPosString,
        }];

        await qz.print(config, printData);

    } finally {
        // Desconectar (opcional, QZ Tray maneja timeouts)
        if (qz.websocket.isActive()) {
            qz.websocket.disconnect();
        }
    }
}
