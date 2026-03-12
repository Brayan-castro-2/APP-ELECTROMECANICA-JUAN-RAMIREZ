import { NextRequest, NextResponse } from 'next/server';
import { imprimirTicket, type TicketDatos } from '@/lib/printer-service';

/**
 * POST /api/print/ticket
 * Recibe los datos del ticket y los envía a la impresora JP80H.
 * Intenta primero USB, luego COM Bluetooth como fallback.
 * 
 * Prerequisitos:
 *   npm install escpos escpos-usb escpos-network
 *   Configurar PRINTER_COM_PORT=COM3 en .env.local (número del puerto Bluetooth de Windows)
 */
export async function POST(request: NextRequest) {
    try {
        const datos: TicketDatos = await request.json();

        if (!datos.ordenId || !datos.patente) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos: ordenId y patente son obligatorios' },
                { status: 400 }
            );
        }

        const result = await imprimirTicket(datos);

        if (result.success) {
            return NextResponse.json(result, { status: 200 });
        } else {
            return NextResponse.json(result, { status: 503 });
        }

    } catch (error: any) {
        console.error('❌ Error en /api/print/ticket:', error);
        return NextResponse.json(
            {
                error: 'Error interno del servidor al intentar imprimir.',
                detail: error?.message || String(error)
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/print/ticket
 * Verifica la configuración actual de la impresora.
 */
export async function GET() {
    const comPort = process.env.PRINTER_COM_PORT || 'COM3';
    return NextResponse.json({
        status: 'ready',
        config: {
            comPort,
            mac: '86:67:7A:B9:0F:7F',
            modelo: 'JP80H-UB-HV2-YC',
            protocolo: 'ESC/POS',
            encoding: 'PC437',
            charsPerLine: 32,
        },
        instrucciones: {
            usb: 'Conecta el USB y Windows debería detectarla automáticamente.',
            bluetooth: `Empareja la JP80H por Bluetooth → anota el puerto COM → agrega PRINTER_COM_PORT=${comPort} al archivo .env.local`,
            driver: 'Si USB no funciona, instala el driver via Zadig (https://zadig.akeo.ie) eligiendo WinUSB.',
        }
    });
}
