'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    obtenerOrdenes,
    obtenerOrdenesHoy,
    obtenerPerfiles,
    obtenerVehiculos
} from '@/lib/supabase-service';
import { OrdenDB, PerfilDB, VehiculoDB } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    LayoutDashboard,
    Car,
    Clock,
    Wrench,
    CheckCircle,
    RefreshCw,
    ChevronRight,
    TrendingUp,
    Loader2
} from 'lucide-react';
import Link from 'next/link';

// Skeleton loader para stats
function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#1a1a1a] rounded-xl p-4 animate-pulse">
                    <div className="w-8 h-8 bg-[#333] rounded mb-2" />
                    <div className="w-12 h-8 bg-[#333] rounded mb-1" />
                    <div className="w-20 h-4 bg-[#333] rounded" />
                </div>
            ))}
        </div>
    );
}

export default function AdminPage() {
    const [todaysOrders, setTodaysOrders] = useState<OrdenDB[]>([]);
    const [allOrders, setAllOrders] = useState<OrdenDB[]>([]);
    const [perfiles, setPerfiles] = useState<PerfilDB[]>([]);
    const [vehiculos, setVehiculos] = useState<VehiculoDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = async () => {
        try {
            // Timeout de 10 segundos para evitar carga infinita
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
            );

            const dataPromise = Promise.all([
                obtenerOrdenesHoy(),
                obtenerOrdenes(),
                obtenerPerfiles(),
                obtenerVehiculos()
            ]);

            const [ordenesHoy, ordenes, perfs, vehs] = await Promise.race([
                dataPromise,
                timeoutPromise
            ]) as [OrdenDB[], OrdenDB[], PerfilDB[], VehiculoDB[]];

            setTodaysOrders(ordenesHoy || []);
            setAllOrders(ordenes || []);
            setPerfiles(perfs || []);
            setVehiculos(vehs || []);
        } catch (e: any) {
            console.error('Error cargando datos:', e);
            // Establecer arrays vacíos en caso de error
            setTodaysOrders([]);
            setAllOrders([]);
            setPerfiles([]);
            setVehiculos([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    };

    const stats = useMemo(() => ({
        today: todaysOrders.length,
        pending: allOrders.filter(o => o.estado === 'pendiente').length,
        inProgress: allOrders.filter(o => o.estado === 'en_progreso').length,
        completed: allOrders.filter(o => o.estado === 'completada').length,
    }), [todaysOrders, allOrders]);

    const getPerfilNombre = (id: string) => {
        const perfil = perfiles.find(p => p.id === id);
        return perfil?.nombre_completo || 'Sin asignar';
    };

    const getVehiculo = (patente: string) => {
        return vehiculos.find(v => v.patente === patente);
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { class: string; label: string }> = {
            pendiente: { class: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Pendiente' },
            en_progreso: { class: 'bg-[#0066FF]/20 text-[#0066FF] border-[#0066FF]/30', label: 'En Progreso' },
            completada: { class: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Completada' },
            cancelada: { class: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelada' },
        };
        const c = config[status] || config.pendiente;
        return <Badge className={`${c.class} border`}>{c.label}</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0066FF] rounded-xl flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
                        <p className="text-sm text-gray-400">Resumen del taller</p>
                    </div>
                </div>
                <Button
                    onClick={handleRefresh}
                    size="icon"
                    variant="ghost"
                    disabled={isLoading || isRefreshing}
                    className="w-10 h-10 rounded-xl text-gray-400 hover:text-white hover:bg-[#242424]"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Stats Grid */}
            {isLoading ? (
                <StatsSkeleton />
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-[#0066FF] border-0 shadow-xl shadow-[#0066FF]/20">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <Car className="w-6 h-6 text-blue-200" />
                                <TrendingUp className="w-4 h-4 text-blue-200" />
                            </div>
                            <p className="text-3xl font-bold text-white">{stats.today}</p>
                            <p className="text-sm text-blue-200">Ingresos Hoy</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-500 border-0 shadow-xl shadow-amber-500/20">
                        <CardContent className="p-4">
                            <Clock className="w-6 h-6 text-amber-200 mb-2" />
                            <p className="text-3xl font-bold text-white">{stats.pending}</p>
                            <p className="text-sm text-amber-200">Pendientes</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#1a1a1a] border border-[#333333]">
                        <CardContent className="p-4">
                            <Wrench className="w-6 h-6 text-gray-400 mb-2" />
                            <p className="text-3xl font-bold text-white">{stats.inProgress}</p>
                            <p className="text-sm text-gray-400">En Progreso</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-600 border-0 shadow-xl shadow-green-500/20">
                        <CardContent className="p-4">
                            <CheckCircle className="w-6 h-6 text-green-200 mb-2" />
                            <p className="text-3xl font-bold text-white">{stats.completed}</p>
                            <p className="text-sm text-green-200">Completadas</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Today's Orders */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Órdenes de Hoy</h2>
                    <Link href="/admin/ordenes" prefetch>
                        <Button variant="ghost" size="sm" className="text-[#0066FF] hover:text-blue-300 hover:bg-[#0066FF]/10">
                            Ver todas
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-[#1a1a1a] rounded-xl p-4 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-12 bg-[#333] rounded-lg" />
                                    <div className="flex-1">
                                        <div className="w-32 h-4 bg-[#333] rounded mb-2" />
                                        <div className="w-48 h-3 bg-[#333] rounded" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : todaysOrders.length === 0 ? (
                    <Card className="bg-[#1a1a1a] border-[#333333]">
                        <CardContent className="py-12 text-center">
                            <Car className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                            <p className="text-gray-400">No hay órdenes registradas hoy</p>
                            <Link href="/recepcion" prefetch>
                                <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]">
                                    Registrar vehículo
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {todaysOrders.slice(0, 5).map((order) => {
                            const vehiculo = getVehiculo(order.patente_vehiculo);
                            return (
                                <Link key={order.id} href={`/admin/ordenes/${order.id}`} prefetch>
                                    <Card className="bg-[#1a1a1a] border-[#333333] hover:bg-[#242424] transition-colors duration-150 active:scale-[0.99]">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-12 bg-[#333333] rounded-lg flex items-center justify-center">
                                                    <span className="text-white font-mono font-bold text-sm">
                                                        {order.patente_vehiculo}
                                                    </span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate">
                                                        {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : order.patente_vehiculo}
                                                    </p>
                                                    <p className="text-sm text-gray-400 truncate">
                                                        {order.descripcion_ingreso}
                                                    </p>
                                                </div>

                                                <div className="hidden sm:block">
                                                    {getStatusBadge(order.estado)}
                                                </div>

                                                <ChevronRight className="w-5 h-5 text-gray-500" />
                                            </div>

                                            <div className="mt-3 flex items-center justify-between sm:hidden">
                                                {getStatusBadge(order.estado)}
                                                <span className="text-xs text-gray-500">
                                                    {getPerfilNombre(order.creado_por)}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
                <Link href="/admin/ordenes" prefetch>
                    <Card className="bg-[#1a1a1a] border-[#333333] hover:bg-[#242424] transition-colors duration-150 active:scale-[0.98]">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#0066FF]/20 rounded-xl flex items-center justify-center">
                                <Car className="w-5 h-5 text-[#0066FF]" />
                            </div>
                            <div>
                                <p className="text-white font-medium">Órdenes</p>
                                <p className="text-xs text-gray-400">Gestionar</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/usuarios" prefetch>
                    <Card className="bg-[#1a1a1a] border-[#333333] hover:bg-[#242424] transition-colors duration-150 active:scale-[0.98]">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#0066FF]/20 rounded-xl flex items-center justify-center">
                                <Wrench className="w-5 h-5 text-[#0066FF]" />
                            </div>
                            <div>
                                <p className="text-white font-medium">Usuarios</p>
                                <p className="text-xs text-gray-400">Gestionar</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
