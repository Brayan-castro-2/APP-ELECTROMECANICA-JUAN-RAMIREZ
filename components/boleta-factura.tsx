'use client';

import { OrdenDB, VehiculoDB, PerfilDB } from '@/lib/local-storage-service';
import { Button } from '@/components/ui/button';
import { Download, MessageCircle, Mail, Printer } from 'lucide-react';
import { useRef } from 'react';

interface BoletaFacturaProps {
    orden: OrdenDB;
    vehiculo?: VehiculoDB;
    mecanico?: PerfilDB;
}

export function BoletaFactura({ orden, vehiculo, mecanico }: BoletaFacturaProps) {
    const boletaRef = useRef<HTMLDivElement | null>(null);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        const el = boletaRef.current;
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
        pdf.save(`boleta-${orden.id}.pdf`);
    };

    const handleWhatsApp = () => {
        const phone = (orden.cliente_telefono || '').replace(/\D/g, '');
        if (!phone) {
            alert('El cliente no tiene teléfono registrado.');
            return;
        }

        const total = orden.precio_total ? `$${orden.precio_total.toLocaleString('es-CL')}` : 'Por definir';
        const vehiculoStr = vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : orden.patente_vehiculo;

        const text = `Hola ${orden.cliente_nombre || 'Cliente'},\n\nSu vehículo *${vehiculoStr}* (Patente: ${orden.patente_vehiculo}) está listo.\n\n*Total a pagar: ${total}*\n\nGracias por preferir Electromecánica JR.`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleEmail = async () => {
        alert('Funcionalidad de envío por email próximamente');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4">
            {/* Botones de acción - No se imprimen */}
            <div className="flex gap-3 print:hidden">
                <Button
                    onClick={handlePrint}
                    className="bg-[#0066FF] hover:bg-[#0052CC] text-white"
                >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                </Button>
                <Button
                    onClick={handleDownloadPdf}
                    variant="outline"
                    className="border-[#333333] text-gray-300 hover:bg-[#242424]"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                </Button>
                <Button
                    onClick={handleWhatsApp}
                    className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                </Button>
                <Button
                    onClick={handleEmail}
                    variant="outline"
                    className="border-[#333333] text-gray-300 hover:bg-[#242424]"
                >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar por Email
                </Button>
            </div>

            <div ref={boletaRef} className="bg-white text-black p-8 rounded-lg print:shadow-none print:p-0">
                <div className="border-b-2 border-black pb-4 mb-6">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <img 
                                src="/images/LOGO ticket(fondo blanco).png" 
                                alt="Logo Electromecánica JR" 
                                className="w-64 h-auto object-contain"
                            />
                            <div>
                                <h1 className="text-3xl font-bold">ELECTROMECÁNICA</h1>
                                <h2 className="text-2xl font-bold text-[#0066FF]">JR</h2>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold">BOLETA #{orden.id}</p>
                            <p className="text-sm mt-1">{formatDate(orden.fecha_completada || orden.fecha_actualizacion)}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold text-lg mb-2">DATOS DEL CLIENTE</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Nombre:</p>
                            <p className="font-semibold">{orden.cliente_nombre || 'No especificado'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Teléfono:</p>
                            <p className="font-semibold">{orden.cliente_telefono || 'No especificado'}</p>
                        </div>
                    </div>
                </div>

                {/* Datos del Vehículo */}
                <div className="mb-6">
                    <h3 className="font-bold text-lg mb-2">DATOS DEL VEHÍCULO</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Patente:</p>
                            <p className="font-semibold font-mono">{orden.patente_vehiculo}</p>
                        </div>
                        {vehiculo && (
                            <>
                                <div>
                                    <p className="text-sm text-gray-600">Marca/Modelo:</p>
                                    <p className="font-semibold">{vehiculo.marca} {vehiculo.modelo}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Año:</p>
                                    <p className="font-semibold">{vehiculo.anio}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Color:</p>
                                    <p className="font-semibold">{vehiculo.color}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Detalle de Trabajos */}
                <div className="mb-6">
                    <h3 className="font-bold text-lg mb-2">DETALLE DE TRABAJOS REALIZADOS</h3>
                    <div className="bg-gray-50 p-4 rounded">
                        <p className="text-sm mb-2"><strong>Motivo de Ingreso:</strong></p>
                        <p className="mb-4">{orden.descripcion_ingreso}</p>
                        
                        {orden.detalle_trabajos && (
                            <>
                                <p className="text-sm mb-2"><strong>Trabajos Realizados:</strong></p>
                                <p>{orden.detalle_trabajos}</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Mecánico Responsable */}
                {mecanico && (
                    <div className="mb-6">
                        <p className="text-sm text-gray-600">Mecánico Responsable:</p>
                        <p className="font-semibold">{mecanico.nombre_completo}</p>
                    </div>
                )}

                {/* Métodos de Pago */}
                {orden.metodos_pago && orden.metodos_pago.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-bold text-lg mb-3">MÉTODOS DE PAGO</h3>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            {orden.metodos_pago.map((mp, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <span className="capitalize text-gray-700">{mp.metodo}:</span>
                                    <span className="font-semibold">{formatCurrency(mp.monto)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Total */}
                <div className="border-t-2 border-black pt-4">
                    <div className="flex justify-between items-center">
                        <p className="text-xl font-bold">TOTAL A PAGAR:</p>
                        <p className="text-3xl font-bold text-[#0066FF]">
                            {formatCurrency(orden.precio_total || 0)}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
                    <p>Gracias por confiar en nuestros servicios</p>
                    <p className="mt-2">Electromecánica Juan Ramírez - Servicio Automotriz Integral</p>
                </div>
            </div>
        </div>
    );
}
