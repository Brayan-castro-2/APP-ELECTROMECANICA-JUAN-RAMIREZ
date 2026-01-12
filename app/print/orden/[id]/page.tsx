'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { obtenerOrdenPorId, buscarVehiculoPorPatente, obtenerPerfilPorId, type OrdenDB, type VehiculoDB, type PerfilDB } from '@/lib/storage-adapter';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function PrintOrdenPage() {
    const params = useParams();
    const orderId = Number(params.id);

    const [orden, setOrden] = useState<OrdenDB | null>(null);
    const [vehiculo, setVehiculo] = useState<VehiculoDB | null>(null);
    const [creador, setCreador] = useState<PerfilDB | null>(null);
    const [asignado, setAsignado] = useState<PerfilDB | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const ordenData = await obtenerOrdenPorId(orderId);

            if (ordenData) {
                setOrden(ordenData);

                const [veh, crea, asig] = await Promise.all([
                    buscarVehiculoPorPatente(ordenData.patente_vehiculo),
                    obtenerPerfilPorId(ordenData.creado_por),
                    ordenData.asignado_a ? obtenerPerfilPorId(ordenData.asignado_a) : Promise.resolve(null)
                ]);

                setVehiculo(veh);
                setCreador(crea);
                setAsignado(asig);
            }

            setIsLoading(false);
        };
        loadData();
    }, [orderId]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!orden) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-gray-500">Orden no encontrada</p>
            </div>
        );
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pendiente: 'Pendiente',
            en_progreso: 'En Progreso',
            completada: 'Completada',
            cancelada: 'Cancelada',
        };
        return labels[status] || status;
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Print Button - Hidden when printing */}
            <div className="no-print fixed top-4 right-4 z-50">
                <Button onClick={handlePrint} className="bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-lg">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                </Button>
            </div>

            {/* Print Content */}
            <div className="print-container max-w-3xl mx-auto p-8">
                {/* Header with Logo */}
                <div className="border-b-2 border-gray-800 pb-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative w-32 h-32">
                                <Image
                                    src="/images/LOGO ticket(fondo blanco).png"
                                    alt="Electromecánica JR"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 leading-none">ELECTROMECÁNICA</h2>
                                <h2 className="text-xl font-bold text-[#0066FF] leading-none">JR</h2>
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-2xl font-bold text-gray-900">ORDEN DE TRABAJO</h1>
                            <p className="text-2xl font-mono font-bold text-[#0066FF]">#{orden.id.toString().padStart(5, '0')}</p>
                            <p className="text-sm text-gray-500">
                                {new Date(orden.fecha_ingreso).toLocaleDateString('es-CL', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Vehicle Info */}
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Datos del Vehículo
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Patente</p>
                                <p className="text-xl font-mono font-bold text-gray-900">{orden.patente_vehiculo}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Marca</p>
                                <p className="text-lg font-medium text-gray-900">{vehiculo?.marca || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Modelo</p>
                                <p className="text-lg font-medium text-gray-900">{vehiculo?.modelo || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Año / Color</p>
                                <p className="text-lg font-medium text-gray-900">
                                    {vehiculo ? `${vehiculo.anio} / ${vehiculo.color}` : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work Description */}
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Descripción del Trabajo
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 whitespace-pre-wrap">{orden.descripcion_ingreso}</p>
                    </div>
                </div>

                {/* Status and Assignment */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Estado</p>
                        <p className="text-lg font-semibold text-gray-900">{getStatusLabel(orden.estado)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Recibido por</p>
                        <p className="text-lg font-semibold text-gray-900">{creador?.nombre_completo || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Asignado a</p>
                        <p className="text-lg font-semibold text-gray-900">{asignado?.nombre_completo || 'Sin asignar'}</p>
                    </div>
                </div>

                {/* Cost Table (placeholder) */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Detalle de Costos
                    </h2>
                    <table className="w-full border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Descripción</th>
                                <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700 w-32">Cantidad</th>
                                <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700 w-32">P. Unit.</th>
                                <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700 w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 px-4 py-3 text-gray-600" colSpan={4}>
                                    <em>A completar por el mecánico</em>
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 h-10"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 h-10"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 h-10"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100">
                                <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right font-semibold text-gray-700">
                                    TOTAL
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-right font-bold text-gray-900">
                                    $
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-12">
                    <div className="text-center">
                        <div className="border-t-2 border-gray-400 pt-2 mx-8">
                            <p className="text-sm text-gray-600">Firma del Cliente</p>
                            <p className="text-xs text-gray-400 mt-1">Nombre:</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t-2 border-gray-400 pt-2 mx-8">
                            <p className="text-sm text-gray-600">Firma del Técnico</p>
                            <p className="text-xs text-gray-400 mt-1">Nombre:</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-4 border-t border-gray-200 text-center text-sm text-gray-400">
                    <p>Electromecánica JR • Sistema de Gestión de Taller</p>
                    <p>Documento generado el {new Date().toLocaleString('es-CL')}</p>
                </div>
            </div>
        </div>
    );
}
