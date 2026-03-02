'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { obtenerOrdenesPorMecanico, type OrdenConDetallesDB } from '@/lib/storage-adapter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ClipboardList,
    Car,
    Calendar,
    User,
    Loader2,
    AlertCircle,
    CheckCircle,
    Clock,
    Wrench
} from 'lucide-react';

export default function MecanicoOrdenesPage() {
    const { user } = useAuth();
    const [ordenes, setOrdenes] = useState<OrdenConDetallesDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrdenes();
    }, [user]);

    const loadOrdenes = async () => {
        if (!user) return;

        setIsLoading(true);
        const data = await obtenerOrdenesPorMecanico(user.id);
        setOrdenes(data);
        setIsLoading(false);
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'pendiente':
                return (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendiente
                    </Badge>
                );
            case 'en_progreso':
                return (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        <Wrench className="w-3 h-3 mr-1" />
                        En Progreso
                    </Badge>
                );
            case 'completada':
                return (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completada
                    </Badge>
                );
            default:
                return <Badge variant="outline">{estado}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#0066FF] rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Mis Órdenes</h1>
                    <p className="text-sm text-gray-400">
                        Todas tus órdenes creadas y asignadas
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-4">
                        <Clock className="w-5 h-5 text-amber-400 mb-2" />
                        <p className="text-2xl font-bold text-white">
                            {ordenes.filter(o => o.estado === 'pendiente').length}
                        </p>
                        <p className="text-sm text-amber-400">Pendientes</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-4">
                        <Wrench className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">
                            {ordenes.filter(o => o.estado === 'en_progreso').length}
                        </p>
                        <p className="text-sm text-blue-400">En Progreso</p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Órdenes */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                    Todas mis órdenes ({ordenes.length})
                </h2>

                {ordenes.length === 0 ? (
                    <Card className="bg-[#1a1a1a] border-[#333333]">
                        <CardContent className="py-12 text-center">
                            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No tienes órdenes activas</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Las órdenes que crees aparecerán aquí
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {ordenes.map((orden) => (
                            <Card key={orden.id} className="bg-[#1a1a1a] border-[#333333] hover:border-[#0066FF]/30 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#0066FF]/20 rounded-lg flex items-center justify-center">
                                                <Car className="w-5 h-5 text-[#0066FF]" />
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">
                                                    {orden.vehiculos?.patente || 'Sin patente'}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {orden.vehiculos?.marca} {orden.vehiculos?.modelo}
                                                </p>
                                            </div>
                                        </div>
                                        {getEstadoBadge(orden.estado)}
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {new Date(orden.fecha_ingreso).toLocaleDateString('es-CL', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        {orden.perfiles_asignado && (
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <User className="w-4 h-4" />
                                                <span>Asignado a: {orden.perfiles_asignado.nombre_completo}</span>
                                            </div>
                                        )}

                                        {orden.descripcion_ingreso && (
                                            <div className="mt-3 p-3 bg-[#0a0a0a] rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">Descripción:</p>
                                                <p className="text-sm text-gray-300">{orden.descripcion_ingreso}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Indicador de solo lectura */}
                                    <div className="mt-4 pt-3 border-t border-[#333333]">
                                        <p className="text-xs text-gray-500 italic">
                                            Vista de solo lectura - No puedes editar esta orden
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
