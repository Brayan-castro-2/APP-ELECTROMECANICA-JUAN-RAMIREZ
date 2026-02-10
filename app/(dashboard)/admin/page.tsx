'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDashboardOrders } from '@/hooks/use-dashboard';
import {
    type OrdenDB,
} from '@/lib/storage-adapter';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    Loader2,
    Users,
    DollarSign,
    ChevronDown,
    Calendar
} from 'lucide-react';
import Link from 'next/link';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { StatusChart } from '@/components/analytics/status-chart';
import { DebtSummaryCard } from '@/components/analytics/debt-summary-card';
import { FEATURE_FLAGS } from '@/config/modules';
// import { NewBadge } from '@/components/ui/new-badge';
import { UpcomingAppointments } from '@/components/agenda/upcoming-appointments';
import { DateRangeFilter } from '@/components/filters/date-range-filter';
import type { DateFilter } from '@/lib/types/filters';

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
    const { user } = useAuth();
    const { data: allOrders = [], isLoading: isLoadingOrders } = useDashboardOrders();
    // Ya no necesitamos cargar perfiles y vehículos por separado para el dashboard
    // const [perfiles, setPerfiles] = useState<PerfilDB[]>([]);
    // const [vehiculos, setVehiculos] = useState<VehiculoDB[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);

    const isLoading = isLoadingOrders;
    const canViewPrices = user?.name?.toLowerCase().includes('juan');

    // Filtrar órdenes según el filtro de fecha activo
    const filteredOrders = useMemo(() => {
        if (!dateFilter || !dateFilter.startDate || !dateFilter.endDate) {
            return allOrders;
        }
        return allOrders.filter((order: any) => {
            const orderDate = new Date(order.fecha_ingreso);
            return orderDate >= dateFilter.startDate! && orderDate <= dateFilter.endDate!;
        });
    }, [allOrders, dateFilter]);

    const todaysOrders = useMemo(() => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        return allOrders.filter((o: any) => {
            const fechaOrden = new Date(o.fecha_ingreso);
            fechaOrden.setHours(0, 0, 0, 0);
            return fechaOrden.getTime() === hoy.getTime();
        });
    }, [allOrders]);

    // loadData ya no es crítico para el renderizado inicial
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        // Invalidar query de react-query sería lo ideal aquí
        // Por ahora simulamos un delay
        setTimeout(() => setIsRefreshing(false), 1000);
    }, []);

    const stats = useMemo(() => {
        const orders = filteredOrders; // Usar órdenes filtradas en lugar de allOrders

        return {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((acc: number, o: any) => acc + (o.precio_total || 0), 0),
            pending: orders.filter((o: any) => o.estado === 'pendiente').length,
            completed: orders.filter((o: any) => o.estado === 'completada').length,
            inProgress: orders.filter((o: any) => o.estado === 'en_progreso').length,
        };
    }, [filteredOrders]);

    // Calcular rendimiento de mecánicos usando los datos anidados
    const mechanicPerformance = useMemo(() => {
        // Extraer mecánicos únicos de las órdenes
        const mechanicsMap = new Map();

        allOrders.forEach((order: any) => {
            if (order.asignado_a && order.perfiles_asignado) {
                if (!mechanicsMap.has(order.asignado_a)) {
                    mechanicsMap.set(order.asignado_a, {
                        id: order.asignado_a,
                        name: order.perfiles_asignado.nombre_completo,
                        ordersCount: 0,
                        totalRevenue: 0,
                        completedCount: 0,
                        completedOrders: [],
                    });
                }

                const mechanic = mechanicsMap.get(order.asignado_a);
                mechanic.ordersCount++;
                mechanic.totalRevenue += (order.precio_total || 0);

                if (order.estado === 'completada') {
                    mechanic.completedCount++;
                    mechanic.completedOrders.push(order);
                }
            }
        });

        return Array.from(mechanicsMap.values()).sort((a: any, b: any) => b.ordersCount - a.ordersCount);
    }, [allOrders]);

    // Helpers simplificados
    const getPerfilNombre = (order: any, type: 'creado' | 'asignado') => {
        if (type === 'creado' && order.perfiles_creado) return order.perfiles_creado.nombre_completo;
        if (type === 'asignado' && order.perfiles_asignado) return order.perfiles_asignado.nombre_completo;
        return 'Desconocido';
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

            {/* Filtro de Fechas */}
            <DateRangeFilter
                onFilterChange={setDateFilter}
                totalOrders={stats.totalOrders}
                totalRevenue={stats.totalRevenue}
            />

            {/* Stats Grid */}
            {isLoading ? (
                <StatsSkeleton />
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {canViewPrices && (
                        <Card className="bg-[#0066FF] border-0 shadow-xl shadow-[#0066FF]/20">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Car className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200" />
                                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-200" />
                                </div>
                                <p className="text-xl sm:text-3xl font-bold text-white">${stats.totalRevenue.toLocaleString('es-CL')}</p>
                                <p className="text-xs sm:text-sm text-blue-200">{dateFilter ? 'Ingresos Filtrados' : 'Ingresos Totales'}</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-amber-500 border-0 shadow-xl shadow-amber-500/20">
                        <CardContent className="p-3 sm:p-4">
                            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200 mb-2" />
                            <p className="text-xl sm:text-3xl font-bold text-white">{stats.pending}</p>
                            <p className="text-xs sm:text-sm text-amber-200">Pendientes</p>
                        </CardContent>
                    </Card>

                    {canViewPrices && (
                        <Card className="bg-[#0066FF]/80 border-0">
                            <CardContent className="p-3 sm:p-4">
                                <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200 mb-2" />
                                <p className="text-xl sm:text-3xl font-bold text-white">{stats.inProgress}</p>
                                <p className="text-xs sm:text-sm text-blue-200">En Progreso</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-green-600 border-0 shadow-xl shadow-green-500/20">
                        <CardContent className="p-3 sm:p-4">
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-200 mb-2" />
                            <p className="text-xl sm:text-3xl font-bold text-white">{stats.completed}</p>
                            <p className="text-xs sm:text-sm text-green-200">Completadas</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Upcoming Appointments Alert */}
            <UpcomingAppointments />

            {/* Analytics Section */}
            {
                FEATURE_FLAGS.showAnalytics && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-white">Analíticas</h2>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RevenueChart orders={allOrders} />
                            <StatusChart orders={allOrders} />
                        </div>

                        {/* Debt Summary */}
                        <DebtSummaryCard orders={allOrders} />
                    </div>
                )
            }

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
                        {todaysOrders.slice(0, 5).map((order: any) => {
                            const vehiculo = order.vehiculos;
                            return (
                                <Link key={order.id} href={`/admin/ordenes/clean?id=${order.id}`} prefetch>
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
                                                    {order.cliente_nombre && (
                                                        <p className="text-xs text-blue-400 truncate">
                                                            {order.cliente_nombre}
                                                        </p>
                                                    )}
                                                    {order.asignado_a && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Mecánico: {getPerfilNombre(order, 'asignado')}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="hidden sm:block">
                                                    {getStatusBadge(order.estado)}
                                                </div>

                                                <ChevronRight className="w-5 h-5 text-gray-500" />
                                            </div>

                                            <div className="mt-3 flex items-center justify-between sm:hidden">
                                                {getStatusBadge(order.estado)}
                                                <span className="text-xs text-gray-500">
                                                    {getPerfilNombre(order, 'creado')}
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

            {/* Mechanic Performance */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <Users className="w-5 h-5 text-[#0066FF]" />
                    <h2 className="text-lg font-semibold text-white">Rendimiento de Mecánicos</h2>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-[#1a1a1a] rounded-xl p-4 animate-pulse">
                                <div className="flex items-center justify-between">
                                    <div className="w-32 h-4 bg-[#333] rounded" />
                                    <div className="w-16 h-4 bg-[#333] rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : mechanicPerformance.length === 0 ? (
                    <Card className="bg-[#1a1a1a] border-[#333333]">
                        <CardContent className="py-8 text-center">
                            <Users className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                            <p className="text-gray-400 text-sm">No hay datos de mecánicos</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {mechanicPerformance.map((mechanic, index) => (
                            <Collapsible key={mechanic.id}>
                                <Card className="bg-[#1a1a1a] border-[#333333]">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    index === 1 ? 'bg-gray-400/20 text-gray-300' :
                                                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-[#333333] text-gray-400'
                                                    }`}>
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{mechanic.name}</p>
                                                    <p className="text-xs text-gray-400">{mechanic.completedCount} completadas</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold">{mechanic.ordersCount}</p>
                                                <p className="text-xs text-gray-400">órdenes</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            {canViewPrices && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <DollarSign className="w-4 h-4 text-green-400" />
                                                    <span className="text-green-400 font-semibold">
                                                        ${mechanic.totalRevenue.toLocaleString('es-CL')}
                                                    </span>
                                                    <span className="text-gray-500">generados</span>
                                                </div>
                                            )}
                                            {mechanic.completedOrders.length > 0 && (
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                                                        Ver órdenes
                                                        <ChevronDown className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </CollapsibleTrigger>
                                            )}
                                        </div>
                                        <CollapsibleContent className="mt-3">
                                            <div className="space-y-2 pt-3 border-t border-[#333333]">
                                                {mechanic.completedOrders.map((order: any) => {
                                                    // Usar datos anidados directamente
                                                    const vehiculo = order.vehiculos;
                                                    return (
                                                        <Link key={order.id} href={`/admin/ordenes/clean?id=${order.id}`}>
                                                            <div className="bg-[#242424] rounded-lg p-3 hover:bg-[#2a2a2a] transition-colors">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-white text-sm font-medium truncate">
                                                                            {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : order.patente_vehiculo}
                                                                        </p>
                                                                        <p className="text-xs text-gray-400 truncate">
                                                                            {order.descripcion_ingreso}
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right flex-shrink-0">
                                                                        {canViewPrices && (
                                                                            <p className="text-green-400 text-sm font-semibold whitespace-nowrap">
                                                                                ${(order.precio_total || 0).toLocaleString('es-CL')}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-xs text-gray-500">
                                                                            {order.patente_vehiculo}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </CollapsibleContent>
                                    </CardContent>
                                </Card>
                            </Collapsible>
                        ))}
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
        </div >
    );
}
