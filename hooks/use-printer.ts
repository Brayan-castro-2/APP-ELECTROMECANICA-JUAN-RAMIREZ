import { useState, useCallback } from 'react';
import type { OrdenConDetallesDB } from '@/lib/supabase';

export type BtStatus = 'idle' | 'success' | 'error';

export function usePrinter() {
    const [isBtPrinting, setIsBtPrinting] = useState(false);
    const [btStatus, setBtStatus] = useState<BtStatus>('idle');
    const [btMessage, setBtMessage] = useState('');

    const handleBluetoothPrint = useCallback(async (order: OrdenConDetallesDB) => {
        if (!order) return;
        
        setIsBtPrinting(true);
        setBtStatus('idle');
        setBtMessage('');

        const datos = {
            ordenId: order.id,
            clienteNombre: order.cliente_nombre,
            clienteTelefono: order.cliente_telefono,
            patente: order.patente_vehiculo,
            vehiculo: order.vehiculos ? `${order.vehiculos.marca} ${order.vehiculos.modelo} ${order.vehiculos.anio || ''}`.trim() : null,
            motor: order.vehiculos?.motor || null,
            kmIngreso: order.kilometraje || null,
            kmSalida: order.kilometraje_salida || null,
            descripcion: order.descripcion_ingreso,
            precioTotal: order.precio_total,
            metodosPago: order.metodos_pago || null,
            atendidoPor: order.perfiles_asignado?.nombre_completo?.split(' ')[0] || null,
        };

        const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        try {
            if (isLocalhost) {
                const res = await fetch('/api/print/ticket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos),
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    setBtStatus('success');
                    setBtMessage(result.message || '¡Ticket enviado a la impresora!');
                } else {
                    throw new Error(result.error + (result.detail ? `\n${result.detail}` : ''));
                }
            } else {
                let printedOk = false;
                try {
                    const res = await fetch('http://localhost:3001/print', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(datos),
                        signal: AbortSignal.timeout(8000),
                    });
                    const result = await res.json();
                    if (res.ok && result.success) {
                        setBtStatus('success');
                        setBtMessage(`¡Ticket #${order.id} impreso! ✓`);
                        printedOk = true;
                    } else {
                        throw new Error(result.error || 'Error del servidor local');
                    }
                } catch (localErr: any) {
                    const localMsg = localErr?.message || '';
                    if (localMsg.includes('fetch') || localMsg.includes('Failed') || localMsg.includes('refused') || localMsg.includes('abort')) {
                        try {
                            const { imprimirConQZ } = await import('@/lib/qz-print');
                            const printerName = process.env.NEXT_PUBLIC_PRINTER_NAME || 'JP80H';
                            await imprimirConQZ(datos, printerName);
                            setBtStatus('success');
                            setBtMessage(`¡Ticket #${order.id} enviado a la impresora! ✓`);
                            printedOk = true;
                        } catch {
                            throw new Error(
                                'No se detectó el Servidor de Impresión en esta PC.\n\n' +
                                '1. Descarga el servidor aquí: [/downloads/Impresion-ElectromecanicaJR.zip]\n' +
                                '2. Descomprime el archivo y abre "print-server.exe"\n' +
                                '3. Deja la ventana abierta y vuelve a intentar.'
                            );
                        }
                    } else {
                        throw localErr;
                    }
                }
                if (!printedOk) throw new Error('No se pudo imprimir');
            }
        } catch (err: any) {
            setBtStatus('error');
            const msg = err?.message || String(err);
            setBtMessage(msg);
        } finally {
            setIsBtPrinting(false);
            // Don't auto-clear if it's an error that requires downloading
            if (btStatus !== 'error') {
                setTimeout(() => {
                    setBtStatus('idle');
                    setBtMessage('');
                }, 8000);
            }
        }
    }, []);

    return {
        isBtPrinting,
        btStatus,
        btMessage,
        handleBluetoothPrint,
        setBtStatus
    };
}
