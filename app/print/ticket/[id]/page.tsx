'use client';

import { useRef, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { obtenerOrdenPorId, buscarVehiculoPorPatente, obtenerPerfilPorId, type OrdenDB, type VehiculoDB, type PerfilDB } from '@/lib/storage-adapter';
import { Button } from '@/components/ui/button';
import { Download, Loader2, MessageCircle, Printer, Bluetooth, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import Image from 'next/image';

export default function TicketPage() {
    const params = useParams();
    const orderId = Number(params.id);

    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const [orden, setOrden] = useState<OrdenDB | null>(null);
    const [vehiculo, setVehiculo] = useState<VehiculoDB | null>(null);
    const [mecanico, setMecanico] = useState<PerfilDB | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBtPrinting, setIsBtPrinting] = useState(false);
    const [btStatus, setBtStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [btMessage, setBtMessage] = useState('');

    const ticketRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (user.role !== 'admin') {
            router.push('/recepcion');
            return;
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        const loadData = async () => {
            const ordenData = await obtenerOrdenPorId(orderId);

            if (ordenData) {
                setOrden(ordenData);

                // Buscar vehículo completo desde Supabase por patente
                const veh = await buscarVehiculoPorPatente(ordenData.patente_vehiculo);
                setVehiculo(veh);

                // Buscar mecánico asignado
                if (ordenData.asignado_a) {
                    const mec = await obtenerPerfilPorId(ordenData.asignado_a);
                    setMecanico(mec);
                }
            }
            setIsLoading(false);
        };
        loadData();
    }, [orderId]);

    const handlePrint = () => {
        window.print();
    };

    // ============================================================
    // Imprimir en JP80H via ESC/POS
    // - En localhost: usa la API route (serialport + PowerShell — funciona directo)
    // - En producción (Vercel): usa QZ Tray via WebSocket local
    // ============================================================
    const handleBluetoothPrint = async () => {
        if (!orden) return;
        setIsBtPrinting(true);
        setBtStatus('idle');
        setBtMessage('');

        const datos = {
            ordenId: orden.id,
            clienteNombre: orden.cliente_nombre,
            clienteTelefono: orden.cliente_telefono,
            patente: orden.patente_vehiculo,
            vehiculo: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio || ''}`.trim() : null,
            motor: vehiculo?.motor || null,
            kmIngreso: (orden as any).kilometraje || null,
            kmSalida: (orden as any).kilometraje_salida || null,
            descripcion: orden.descripcion_ingreso,
            precioTotal: orden.precio_total,
            metodosPago: (orden as any).metodos_pago || null,
            atendidoPor: mecanico?.nombre_completo?.split(' ')[0] || null,
        };

        const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        try {
            if (isLocalhost) {
                // ── LOCALHOST: usar API route con serialport / PowerShell ──
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
                // ── PRODUCCIÓN (Vercel): servidor local en localhost:3001 → QZ Tray ──
                // El navegador llama al servidor de impresión que corre en la PC del taller.
                let printedOk = false;

                // Intentar primero el servidor standalone (print-server.js)
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
                        setBtMessage(`¡Ticket #${orden.id} impreso! (${result.method || 'servidor local'}) ✓`);
                        printedOk = true;
                    } else {
                        throw new Error(result.error || 'Error del servidor local');
                    }
                } catch (localErr: any) {
                    const localMsg = localErr?.message || '';
                    // Si el servidor no está corriendo, intentar QZ Tray como fallback
                    if (localMsg.includes('fetch') || localMsg.includes('Failed') || localMsg.includes('refused') || localMsg.includes('abort')) {
                        try {
                            const { imprimirConQZ } = await import('@/lib/qz-print');
                            const printerName = process.env.NEXT_PUBLIC_PRINTER_NAME || 'JP80H';
                            await imprimirConQZ(datos, printerName);
                            setBtStatus('success');
                            setBtMessage(`¡Ticket #${orden.id} enviado a la impresora! ✓`);
                            printedOk = true;
                        } catch {
                            // Ambos fallaron (print-server y QZ Tray)
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
            if (msg.includes('Unable to establish') || msg.includes('ECONNREFUSED') || msg.includes('WebSocket')) {
                setBtMessage('QZ Tray no está corriendo. Instala QZ Tray en la PC del taller (qz.io) y vuelve a intentar.');
            } else if (msg.includes('not found') || msg.includes('No matching')) {
                setBtMessage('Impresora "JP80H" no encontrada. Verifica el nombre en NEXT_PUBLIC_PRINTER_NAME.');
            } else {
                setBtMessage(msg);
            }
        } finally {
            setIsBtPrinting(false);
            setTimeout(() => setBtStatus('idle'), 12000);
        }
    };

    const handleDownloadPdf = async () => {
        if (!orden) return;
        const el = ticketRef.current;
        if (!el) return;

        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf'),
        ]);

        const canvas = await html2canvas(el, {
            scale: 2,
            backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`ticket-${orden.id}.pdf`);
    };

    const handleWhatsApp = () => {
        if (!orden) return;

        const total = orden.precio_total ? `$${orden.precio_total.toLocaleString('es-CL')}` : 'Por definir';
        const vehiculoStr = vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : orden.patente_vehiculo;

        const text = `Hola ${orden.cliente_nombre || 'Cliente'},\n\nSu vehículo *${vehiculoStr}* (Patente: ${orden.patente_vehiculo}) está listo.\n\n*Total a pagar: ${total}*\n\nDetalle servicios:\n${orden.descripcion_ingreso}\n\nGracias por preferir Electromecánica JR.`;

        const url = `https://wa.me/${orden.cliente_telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    if (authLoading || (!authLoading && (!user || user.role !== 'admin'))) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!orden) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Orden no encontrada</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 flex flex-col items-center">
            {/* Action Buttons - Hidden when printing */}
            <div className="print:hidden flex flex-wrap gap-3 mb-8 fixed bottom-4 left-0 right-0 justify-center z-50 px-4">
                {/* Bluetooth Print - Principal */}
                <Button
                    onClick={handleBluetoothPrint}
                    disabled={isBtPrinting}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg px-5 text-sm"
                >
                    {isBtPrinting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : btStatus === 'success' ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                    ) : btStatus === 'error' ? (
                        <XCircle className="w-4 h-4 mr-2" />
                    ) : (
                        <Bluetooth className="w-4 h-4 mr-2" />
                    )}
                    {isBtPrinting ? 'Imprimiendo...' : btStatus === 'success' ? '¡Impreso!' : btStatus === 'error' ? 'Reintentar' : 'Imprimir JP80H'}
                </Button>
                <Button onClick={handlePrint} className="bg-black hover:bg-gray-800 text-white rounded-full shadow-lg px-5 text-sm">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                </Button>
                <Button onClick={handleDownloadPdf} className="bg-white hover:bg-gray-50 text-black rounded-full shadow-lg px-5 border border-gray-300 text-sm">
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                </Button>
                <Button onClick={handleWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full shadow-lg px-5 text-sm">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                </Button>
            </div>

            {/* Feedback Bluetooth */}
            {btStatus !== 'idle' && (
                <div className={`print:hidden fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-xl text-sm font-medium flex flex-col gap-2 max-w-[90vw] whitespace-pre-wrap ${btStatus === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    <div className="flex items-center gap-2">
                        {btStatus === 'success'
                            ? <CheckCircle className="w-5 h-5" />
                            : <XCircle className="w-5 h-5" />
                        }
                        <span className="flex-1">
                            {btMessage.split('[/downloads/Impresion-ElectromecanicaJR.zip]').map((part, i, arr) => (
                                <span key={i}>
                                    {part}
                                    {i < arr.length - 1 && (
                                        <a
                                            href="/downloads/Impresion-ElectromecanicaJR.zip"
                                            className="bg-white text-red-600 px-3 py-1 rounded-md font-bold inline-flex items-center mx-1 hover:bg-gray-100 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Download className="w-4 h-4 mr-1" />
                                            DESCARGAR AQUÍ
                                        </a>
                                    )}
                                </span>
                            ))}
                        </span>
                    </div>
                </div>
            )}

            {/* Ticket Container */}
            <div ref={ticketRef} className="bg-white text-black w-[320px] p-4 shadow-xl print:shadow-none print:w-full print:p-0 font-mono text-sm leading-tight ticket-container">
                {/* Header with Logo */}
                <div className="text-center mb-4 border-b border-dashed border-black pb-4">
                    {/* Logo */}
                    <div className="flex justify-center mb-3">
                        <div className="relative w-44 h-44">
                            <Image
                                src="/images/logo-ticket-2.png"
                                alt="Electromecánica JR"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>
                    {/* Datos legales de la empresa */}
                    <p className="text-[10px] font-bold uppercase leading-tight">ELECTROMECANICA JR. SPA</p>
                    <p className="text-[9px] uppercase leading-tight mt-0.5">SERVICIO DE MECANICA, ELECTRONICA AUTOMOTRIZ</p>
                    <p className="text-[9px] uppercase leading-tight">Y GRUAS</p>
                    <p className="text-[9px] uppercase leading-tight mt-0.5">ACTIVIDADES DE SERVICIOS VINCULADAS</p>
                    <p className="text-[9px] uppercase leading-tight">AL TRANSPORTE TERRESTRE N.C.P.</p>
                    <p className="text-[9px] uppercase leading-tight mt-0.5">A INMAR 2280 L IND SEC 2, PUERTO MONTT</p>
                    <p className="text-[9px] leading-tight">electromecanicajr.spa@gmail.com</p>
                    {/* Info del ticket */}
                    <div className="border-t border-dashed border-black mt-2 pt-2">
                        <p className="text-xs">Fecha: {new Date().toLocaleString('es-CL')}</p>
                        <p className="text-xs">Ticket #: {orden.id}</p>
                    </div>
                </div>

                {/* Client & Vehicle */}
                <div className="mb-4 border-b border-dashed border-black pb-4">
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="font-bold">Cliente:</span>
                        <span className="uppercase truncate">{orden.cliente_nombre || 'S/N'}</span>

                        <span className="font-bold">Teléfono:</span>
                        <span>{orden.cliente_telefono || 'S/N'}</span>

                        <span className="font-bold">Patente:</span>
                        <span className="font-bold uppercase">{orden.patente_vehiculo}</span>

                        <span className="font-bold">Vehículo:</span>
                        <span className="uppercase">{vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio || ''}` : 'Por definir'}</span>

                        {vehiculo?.motor && (
                            <>
                                <span className="font-bold">Motor:</span>
                                <span>{vehiculo.motor}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Services */}
                <div className="mb-4 border-b border-dashed border-black pb-4">
                    <p className="font-bold mb-2 uppercase text-center">- Detalle de Servicios -</p>
                    <div className="whitespace-pre-wrap mb-2 text-xs">
                        {orden.descripcion_ingreso}
                    </div>
                </div>

                {/* Totals - Uses admin-edited total from ordenes.precio_total */}
                <div className="mb-6">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>TOTAL:</span>
                        <span>${orden.precio_total ? orden.precio_total.toLocaleString('es-CL') : 'Por definir'}</span>
                    </div>
                    {orden.metodo_pago && (
                        <div className="flex justify-between items-center text-xs mt-1">
                            <span>Pago:</span>
                            <span className="uppercase">{orden.metodo_pago}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-xs space-y-2 pt-2 border-t border-dashed border-black">
                    <p>*** GRACIAS POR SU PREFERENCIA ***</p>
                    {mecanico && (
                        <p>Atendido por: {mecanico.nombre_completo.split(' ')[0]}</p>
                    )}
                    <p className="mt-4 text-[10px]">Guardar este ticket como comprobante</p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto; /* Thermal paper size */
                    }
                    body {
                        background: white;
                    }
                    .ticket-container {
                        box-shadow: none;
                        width: 100%;
                        padding: 10px;
                    }
                }
            `}</style>
        </div>
    );
}
