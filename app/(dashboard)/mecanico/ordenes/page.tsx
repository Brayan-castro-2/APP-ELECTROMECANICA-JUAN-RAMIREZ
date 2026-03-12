'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { obtenerOrdenesPorMecanico, buscarVehiculoPorPatente, type OrdenConDetallesDB, type VehiculoDB } from '@/lib/storage-adapter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Wrench,
    Gauge,
    ChevronDown,
    ChevronUp,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MecanicoOrdenesPage() {
    const { user } = useAuth();
    const [ordenes, setOrdenes] = useState<OrdenConDetallesDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

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
        const config: Record<string, { class: string; label: string; icon: React.ReactNode }> = {
            pendiente: {
                class: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                label: 'Pendiente',
                icon: <Clock className="w-3 h-3 mr-1" />
            },
            en_progreso: {
                class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                label: 'En Progreso',
                icon: <Wrench className="w-3 h-3 mr-1" />
            },
            completada: {
                class: 'bg-green-500/20 text-green-400 border-green-500/30',
                label: 'Completada',
                icon: <CheckCircle className="w-3 h-3 mr-1" />
            },
            debe: {
                class: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                label: 'Debe',
                icon: <AlertCircle className="w-3 h-3 mr-1" />
            },
        };
        const c = config[estado] || { class: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: estado, icon: null };
        return (
            <Badge className={`${c.class} border flex items-center`}>
                {c.icon}
                {c.label}
            </Badge>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
            </div>
        );
    }

    const pendientes = ordenes.filter(o => o.estado === 'pendiente').length;
    const enProgreso = ordenes.filter(o => o.estado === 'en_progreso').length;
    const completadas = ordenes.filter(o => o.estado === 'completada').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#0066FF] rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Mis Órdenes</h1>
                    <p className="text-sm text-gray-400">Todas tus órdenes creadas y asignadas</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-4">
                        <Clock className="w-5 h-5 text-amber-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{pendientes}</p>
                        <p className="text-sm text-amber-400">Pendientes</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-4">
                        <Wrench className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{enProgreso}</p>
                        <p className="text-sm text-blue-400">En Progreso</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-4">
                        <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{completadas}</p>
                        <p className="text-sm text-green-400">Completadas</p>
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
                            <p className="text-gray-400">No tienes órdenes aún</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Las órdenes creadas o asignadas a ti aparecerán aquí
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {ordenes.map((orden) => {
                            const isExpanded = expandedId === orden.id;

                            return (
                                <Card
                                    key={orden.id}
                                    className="bg-[#1a1a1a] border-[#2a2a2a] overflow-hidden"
                                >
                                    {/* Card Header - siempre visible, toca para expandir */}
                                    <button
                                        className="w-full text-left"
                                        onClick={() => setExpandedId(isExpanded ? null : orden.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 bg-[#0066FF]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <Car className="w-5 h-5 text-[#0066FF]" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold font-mono text-lg">
                                                            {orden.vehiculos?.patente || orden.patente_vehiculo || 'Sin patente'}
                                                        </p>
                                                        <p className="text-sm text-gray-400 truncate">
                                                            {[orden.vehiculos?.marca, orden.vehiculos?.modelo, orden.vehiculos?.anio]
                                                                .filter(Boolean).join(' ') || 'Vehículo sin datos'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {getEstadoBadge(orden.estado)}
                                                    {isExpanded
                                                        ? <ChevronUp className="w-4 h-4 text-gray-500" />
                                                        : <ChevronDown className="w-4 h-4 text-gray-500" />
                                                    }
                                                </div>
                                            </div>

                                            {/* Fecha - always visible */}
                                            <div className="flex items-center gap-2 text-gray-400 text-sm mt-3">
                                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                                <span>
                                                    {new Date(orden.fecha_ingreso).toLocaleDateString('es-CL', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </button>

                                    {/* Detalle expandible */}
                                    {isExpanded && (
                                        <div className="border-t border-[#2a2a2a]">
                                            <CardContent className="p-4 space-y-4">

                                                {/* Datos del Vehículo */}
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">
                                                        Datos del Vehículo
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-[#0a0a0a] rounded-lg p-3">
                                                            <p className="text-xs text-gray-500 mb-1">Patente</p>
                                                            <p className="text-white font-bold font-mono">{orden.patente_vehiculo}</p>
                                                        </div>
                                                        <div className="bg-[#0a0a0a] rounded-lg p-3">
                                                            <p className="text-xs text-gray-500 mb-1">Marca / Modelo</p>
                                                            <p className="text-white font-medium">
                                                                {orden.vehiculos?.marca && orden.vehiculos?.modelo
                                                                    ? `${orden.vehiculos.marca} ${orden.vehiculos.modelo}`
                                                                    : '-'}
                                                            </p>
                                                        </div>
                                                        {orden.vehiculos?.anio && (
                                                            <div className="bg-[#0a0a0a] rounded-lg p-3">
                                                                <p className="text-xs text-gray-500 mb-1">Año</p>
                                                                <p className="text-white font-medium">{orden.vehiculos.anio}</p>
                                                            </div>
                                                        )}
                                                        {(orden.vehiculos as any)?.color && (
                                                            <div className="bg-[#0a0a0a] rounded-lg p-3">
                                                                <p className="text-xs text-gray-500 mb-1">Color</p>
                                                                <p className="text-white font-medium">{(orden.vehiculos as any).color}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Kilómetros */}
                                                {(orden.kilometraje || orden.kilometraje_salida) && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">
                                                            Kilómetros
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-[#0a0a0a] rounded-lg p-3 flex items-start gap-2">
                                                                <Gauge className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1">KM Entrada</p>
                                                                    <p className="text-white font-bold">
                                                                        {orden.kilometraje
                                                                            ? `${orden.kilometraje.toLocaleString('es-CL')} km`
                                                                            : <span className="text-gray-600">—</span>}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="bg-[#0a0a0a] rounded-lg p-3 flex items-start gap-2">
                                                                <Gauge className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1">KM Salida</p>
                                                                    <p className="text-white font-bold">
                                                                        {orden.kilometraje_salida
                                                                            ? `${orden.kilometraje_salida.toLocaleString('es-CL')} km`
                                                                            : <span className="text-gray-600">—</span>}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Cliente */}
                                                {(orden.cliente_nombre || orden.cliente_telefono) && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">
                                                            Cliente
                                                        </p>
                                                        <div className="bg-[#0a0a0a] rounded-lg p-3 space-y-1">
                                                            {orden.cliente_nombre && (
                                                                <p className="text-white font-medium">{orden.cliente_nombre}</p>
                                                            )}
                                                            {orden.cliente_telefono && (
                                                                <p className="text-gray-400 text-sm">{orden.cliente_telefono}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Asignado a */}
                                                {orden.perfiles_asignado && (
                                                    <div className="flex items-center gap-2 text-gray-400 text-sm bg-[#0a0a0a] rounded-lg p-3">
                                                        <User className="w-4 h-4 text-[#0066FF] flex-shrink-0" />
                                                        <span>Asignado a: <span className="text-white">{orden.perfiles_asignado.nombre_completo}</span></span>
                                                    </div>
                                                )}

                                                {/* Motivo de Ingreso */}
                                                {orden.descripcion_ingreso && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> Motivo de Ingreso
                                                        </p>
                                                        <div className="bg-[#0a0a0a] rounded-lg p-3">
                                                            <p className="text-gray-200 text-sm whitespace-pre-wrap">{orden.descripcion_ingreso}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Detalle de Trabajos */}
                                                {(orden as any).detalle_trabajos && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                                                            <Wrench className="w-3 h-3" /> Trabajos Realizados
                                                        </p>
                                                        <div className="bg-[#0a0a0a] rounded-lg p-3">
                                                            <p className="text-gray-200 text-sm whitespace-pre-wrap">{(orden as any).detalle_trabajos}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Precio */}
                                                {orden.precio_total !== undefined && orden.precio_total !== null && (
                                                    <div className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-3">
                                                        <p className="text-gray-400 text-sm">Precio Total</p>
                                                        <p className="text-green-400 font-bold text-lg">
                                                            ${(orden.precio_total || 0).toLocaleString('es-CL')}
                                                        </p>
                                                    </div>
                                                )}

                                            </CardContent>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
