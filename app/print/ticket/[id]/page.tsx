'use client';

import { useRef, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { obtenerOrdenPorId, buscarVehiculoPorPatente, obtenerPerfilPorId, type OrdenDB, type VehiculoDB, type PerfilDB } from '@/lib/storage-adapter';
import { Button } from '@/components/ui/button';
import { Download, Loader2, MessageCircle, Printer } from 'lucide-react';
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
                const [veh, mec] = await Promise.all([
                    buscarVehiculoPorPatente(ordenData.patente_vehiculo),
                    ordenData.asignado_a ? obtenerPerfilPorId(ordenData.asignado_a) : Promise.resolve(null)
                ]);
                setVehiculo(veh);
                setMecanico(mec);
            }
            setIsLoading(false);
        };
        loadData();
    }, [orderId]);

    const handlePrint = () => {
        window.print();
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
            <div className="print:hidden flex gap-4 mb-8 fixed bottom-4 z-50">
                <Button onClick={handlePrint} className="bg-black hover:bg-gray-800 text-white rounded-full shadow-lg px-6">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Ticket
                </Button>
                <Button onClick={handleDownloadPdf} className="bg-white hover:bg-gray-50 text-black rounded-full shadow-lg px-6 border border-gray-300">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                </Button>
                <Button onClick={handleWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full shadow-lg px-6">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Enviar WhatsApp
                </Button>
            </div>

            {/* Ticket Container */}
            <div ref={ticketRef} className="bg-white text-black w-[320px] p-4 shadow-xl print:shadow-none print:w-full print:p-0 font-mono text-sm leading-tight ticket-container">
                {/* Header */}
                <div className="text-center mb-4 border-b border-dashed border-black pb-4">
                    <h1 className="text-xl font-bold uppercase mb-1">Electromecánica</h1>
                    <h2 className="text-2xl font-bold uppercase mb-2">JR</h2>
                    <p className="text-xs">Fecha: {new Date().toLocaleString('es-CL')}</p>
                    <p className="text-xs">Ticket #: {orden.id}</p>
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
                        <span className="uppercase">{vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-'}</span>
                    </div>
                </div>

                {/* Services */}
                <div className="mb-4 border-b border-dashed border-black pb-4">
                    <p className="font-bold mb-2 uppercase text-center">- Detalle de Servicios -</p>
                    <div className="whitespace-pre-wrap mb-2 text-xs">
                        {orden.descripcion_ingreso}
                    </div>
                </div>

                {/* Totals */}
                <div className="mb-6">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>TOTAL:</span>
                        <span>${(orden.precio_total || 0).toLocaleString('es-CL')}</span>
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
