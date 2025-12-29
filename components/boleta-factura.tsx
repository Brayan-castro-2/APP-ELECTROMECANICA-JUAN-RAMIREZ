'use client';

import { OrdenDB, VehiculoDB, PerfilDB } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Printer, Mail } from 'lucide-react';

interface BoletaFacturaProps {
    orden: OrdenDB;
    vehiculo?: VehiculoDB;
    mecanico?: PerfilDB;
}

export function BoletaFactura({ orden, vehiculo, mecanico }: BoletaFacturaProps) {
    const handlePrint = () => {
        window.print();
    };

    const handleEmail = async () => {
        // TODO: Implementar envío por email
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
                    onClick={handleEmail}
                    variant="outline"
                    className="border-[#333333] text-gray-300 hover:bg-[#242424]"
                >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar por Email
                </Button>
            </div>

            {/* Boleta/Factura - Se imprime */}
            <div className="bg-white text-black p-8 rounded-lg print:shadow-none print:p-0">
                {/* Header */}
                <div className="border-b-2 border-black pb-4 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold">ELECTROMECÁNICA</h1>
                            <h2 className="text-2xl font-bold text-[#0066FF]">JUAN RAMÍREZ</h2>
                            <p className="text-sm mt-2">Servicio Automotriz Integral</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold">BOLETA #{orden.id}</p>
                            <p className="text-sm mt-1">{formatDate(orden.fecha_completada || orden.fecha_actualizacion)}</p>
                        </div>
                    </div>
                </div>

                {/* Datos del Cliente */}
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
