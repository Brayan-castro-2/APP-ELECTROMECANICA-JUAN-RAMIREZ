'use client';

import { useState, useMemo, useCallback, Fragment } from 'react';
import { type OrdenDB, type PerfilDB, type VehiculoDB, actualizarOrden, eliminarCita } from '@/lib/storage-adapter';
import { useOrders, useDeleteOrder } from '@/hooks/use-orders';
import { useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY } from '@/hooks/use-orders';
import { usePerfiles } from '@/hooks/use-perfiles';
import { useVehiculos } from '@/hooks/use-vehiculos';
import { useAuth } from '@/contexts/auth-context';
import { useAppointments, APPOINTMENTS_QUERY_KEY } from '@/hooks/use-appointments';
import type { CitaDB } from '@/lib/supabase';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Search, FileText, ChevronRight, Loader2, Trash2, Edit, Download, ChevronDown, Calendar, User, Wrench, DollarSign, CheckCircle } from 'lucide-react';
import Link from 'next/link';
// import { NewBadge } from '@/components/ui/new-badge';

export default function OrdenesPage() {
    const { user } = useAuth();
    const { data: orders = [], isLoading: isLoadingOrders } = useOrders();
    const { data: appointments = [], isLoading: isLoadingAppointments } = useAppointments();
    const { data: perfiles = [], isLoading: isLoadingPerfiles } = usePerfiles();
    const { data: vehiculos = [], isLoading: isLoadingVehiculos } = useVehiculos();
    const deleteOrder = useDeleteOrder();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewFilter, setViewFilter] = useState<string>('orders'); // NEW: orders, appointments, nearby, all
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [mechanicFilter, setMechanicFilter] = useState<string>('all');
    const [debtFilter, setDebtFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

    const isAdmin = user?.role === 'admin';
    const canViewPrices = user?.name?.toLowerCase().includes('juan');
    const isLoading = isLoadingOrders || isLoadingPerfiles || isLoadingVehiculos;

    // Memoizar mapas para búsquedas O(1) en lugar de O(n)
    const perfilesMap = useMemo(() => {
        const map = new Map<string, string>();
        perfiles.forEach(p => map.set(p.id, p.nombre_completo));
        return map;
    }, [perfiles]);

    const vehiculosMap = useMemo(() => {
        const map = new Map<string, VehiculoDB>();
        vehiculos.forEach(v => map.set(v.patente, v));
        return map;
    }, [vehiculos]);

    const getPerfilNombre = useCallback((id: string) => {
        return perfilesMap.get(id) || 'Sin asignar';
    }, [perfilesMap]);

    const getVehiculo = useCallback((patente: string) => {
        return vehiculosMap.get(patente);
    }, [vehiculosMap]);

    const hasDebt = useCallback((order: OrdenDB) => {
        if (!order.metodos_pago || order.metodos_pago.length === 0) return false;
        return order.metodos_pago.some(mp => mp.metodo === 'debe');
    }, []);

    // Extraer el motivo limpio de la descripción, eliminando metadatos técnicos
    const getCleanMotivo = useCallback((descripcion: string) => {
        if (!descripcion) return '-';

        // Dividir por líneas para procesar
        const lines = descripcion.split('\n');
        const servicios: string[] = [];
        const cleanLines: string[] = [];
        let inServicios = false;

        for (const line of lines) {
            const trimmed = line.trim();

            // Detectar e ignorar líneas de metadatos conocidos
            if (trimmed.startsWith('Motor:') || trimmed.startsWith('KM:')) {
                continue;
            }

            // Detectar bloque de servicios
            if (trimmed === 'Servicios:') {
                inServicios = true;
                continue;
            }

            if (inServicios && trimmed.startsWith('-')) {
                // Es un ítem de servicio, lo guardamos si queremos mostrarlo formateado
                // O lo ignoramos si solo queremos el motivo original.
                // Aquí extraemos el nombre del servicio limpio:
                const match = line.match(/-\s*([^:]+)/);
                if (match) {
                    servicios.push(match[1].trim());
                }
            } else if (!inServicios && trimmed !== '') {
                // Es parte del motivo real (descripción del cliente)
                cleanLines.push(trimmed);
            }
        }

        // Si hay líneas de motivo limpio, devolverlas
        if (cleanLines.length > 0) {
            return cleanLines.join(' ');
        }

        // Si no hay motivo pero hay servicios, devolver los servicios formateados
        if (servicios.length > 0) {
            return servicios.join(', ');
        }

        return '-';
    }, []);

    const isToday = (date: string) => {
        const today = new Date();
        const orderDate = new Date(date);
        return orderDate.toDateString() === today.toDateString();
    };

    const isThisWeek = (date: string) => {
        const today = new Date();
        const orderDate = new Date(date);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo && orderDate <= today;
    };

    const isThisMonth = (date: string) => {
        const today = new Date();
        const orderDate = new Date(date);
        return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
    };

    // Helper to check if appointment is nearby (today or within 2 hours)
    const isAppointmentNearby = useCallback((appointmentDateTime: string) => {
        const now = new Date();
        const apptDate = new Date(appointmentDateTime);
        const diffMs = apptDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Nearby = today OR within next 2 hours
        const isToday = apptDate.toDateString() === now.toDateString();
        const isWithinTwoHours = diffHours >= 0 && diffHours <= 2;

        return isToday || isWithinTwoHours;
    }, []);

    // Convert appointment to order-like format for display
    const appointmentToOrderFormat = useCallback((appt: CitaDB): OrdenDB & { isAppointment: true } => {
        return {
            id: appt.id,
            patente_vehiculo: appt.patente_vehiculo || 'Sin patente',
            descripcion_ingreso: appt.servicio_solicitado || 'Cita agendada',
            estado: 'agendada',
            creado_por: appt.creado_por || '',
            asignado_a: null,
            fecha_ingreso: appt.fecha, // Using correct field 'fecha'
            fecha_actualizacion: appt.fecha,
            cliente_nombre: appt.cliente_nombre,
            cliente_telefono: appt.cliente_telefono,
            isAppointment: true,
            // Add other required fields with defaults
            detalle_trabajos: appt.notas,
        } as any;
    }, []);

    // Memoizar filtrado con soporte para citas
    const filteredOrders = useMemo(() => {
        let itemsToFilter: (OrdenDB | (OrdenDB & { isAppointment: true }))[] = [];

        // Decidir qué incluir según viewFilter
        if (viewFilter === 'orders') {
            itemsToFilter = orders;
        } else if (viewFilter === 'appointments') {
            itemsToFilter = appointments.map(appointmentToOrderFormat);
        } else if (viewFilter === 'nearby') {
            const nearbyAppointments = appointments
                .filter(appt => isAppointmentNearby(appt.fecha))
                .map(appointmentToOrderFormat);
            itemsToFilter = [...orders, ...nearbyAppointments];
        } else if (viewFilter === 'all') {
            const allAppointments = appointments.map(appointmentToOrderFormat);
            itemsToFilter = [...orders, ...allAppointments];
        }

        return itemsToFilter.filter(order => {
            const vehiculo = getVehiculo(order.patente_vehiculo);
            const matchesSearch =
                order.patente_vehiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (vehiculo?.marca?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (vehiculo?.modelo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                order.descripcion_ingreso.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.cliente_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.cliente_telefono?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.precio_total?.toString() || '').includes(searchTerm);

            const matchesStatus = statusFilter === 'all' || order.estado === statusFilter;
            const matchesMechanic = mechanicFilter === 'all' || order.asignado_a === mechanicFilter;
            const matchesDebt = debtFilter === 'all' ||
                (debtFilter === 'con_deuda' && hasDebt(order)) ||
                (debtFilter === 'sin_deuda' && !hasDebt(order));

            const matchesDate = dateFilter === 'all' ||
                (dateFilter === 'today' && isToday(order.fecha_ingreso)) ||
                (dateFilter === 'week' && isThisWeek(order.fecha_ingreso)) ||
                (dateFilter === 'month' && isThisMonth(order.fecha_ingreso));

            return matchesSearch && matchesStatus && matchesMechanic && matchesDebt && matchesDate;
        }).sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime());
    }, [orders, appointments, viewFilter, searchTerm, statusFilter, mechanicFilter, debtFilter, dateFilter, vehiculosMap, hasDebt, appointmentToOrderFormat, isAppointmentNearby]);

    const handleDeleteOrder = async (item: { id: number, isAppointment?: boolean }) => {
        try {
            if (item.isAppointment) {
                await eliminarCita(item.id);
                // Invalidar ambas queries por si acaso
                queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
                queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
            } else {
                await deleteOrder.mutateAsync(item.id);
            }
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar el elemento');
        }
    };

    // Cambiar estado de orden con auto-guardado
    const handleToggleStatus = useCallback(async (orderId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'completada' ? 'pendiente' : 'completada';

        try {
            const updateData: any = { estado: newStatus };

            // Si se marca como completada, establecer fecha de entrega
            if (newStatus === 'completada') {
                updateData.fecha_entrega = new Date().toISOString();
            }
            // Si se revierte a pendiente, limpiar fecha de entrega
            else if (newStatus === 'pendiente') {
                updateData.fecha_entrega = null;
            }

            await actualizarOrden(orderId, updateData);
            // Invalidar caché para refrescar la lista
            queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            alert('Error al cambiar el estado de la orden');
        }
    }, [queryClient]);

    const getStatusBadge = (status: string, orderId?: number, interactive: boolean = false) => {
        const config: Record<string, { class: string; label: string; icon: string }> = {
            pendiente: { class: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Pendiente', icon: '⏳' },
            en_progreso: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'En Progreso', icon: '⚙️' },
            lista: { class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Lista', icon: '✅' },
            completada: { class: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Completada', icon: '✓' },
            cancelada: { class: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'Cancelada', icon: '✖' },
            agendada: { class: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Agendada', icon: '📅' },
            debe: { class: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Debe', icon: '💳' },
        };
        const c = config[status] || config.pendiente;

        if (interactive && orderId) {
            return (
                <Badge
                    className={`${c.class} border cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleStatus(orderId, status);
                    }}
                >
                    {c.icon} {c.label}
                </Badge>
            );
        }

        return <Badge className={`${c.class} border`}>{c.icon} {c.label}</Badge>;
    };

    const handleExportPDF = () => {
        const printContent = filteredOrders.map(order => {
            const vehiculo = getVehiculo(order.patente_vehiculo);
            return {
                patente: order.patente_vehiculo,
                vehiculo: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-',
                descripcion: order.descripcion_ingreso,
                creado_por: getPerfilNombre(order.creado_por),
                asignado_a: order.asignado_a ? getPerfilNombre(order.asignado_a) : '-',
                estado: order.estado,
                precio: order.precio_total || 0
            };
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Órdenes de Trabajo</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
                    .header img { height: 60px; }
                    .header h1 { color: #333; margin: 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #0066FF; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="/images/LOGO ticket(fondo blanco).png" alt="Logo Electromecánica JR" style="height: 120px;" />
                    <div>
                        <h1>Órdenes de Trabajo - Electromecánica JR</h1>
                        <p>Total de órdenes: ${printContent.length}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Patente</th>
                            <th>Vehículo</th>
                            <th>Descripción</th>
                            <th>Creado por</th>
                            <th>Asignado a</th>
                            <th>Estado</th>
                            ${canViewPrices ? '<th>Precio</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${printContent.map(o => `
                            <tr>
                                <td>${o.patente}</td>
                                <td>${o.vehiculo}</td>
                                <td>${o.descripcion}</td>
                                <td>${o.creado_por}</td>
                                <td>${o.asignado_a}</td>
                                <td>${o.estado}</td>
                                ${canViewPrices ? `<td>$${o.precio.toLocaleString('es-CL')}</td>` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 px-4 md:px-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-white">Órdenes de Trabajo</h1>
                    <p className="text-xs md:text-sm text-slate-400">Gestión de órdenes del taller</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
                <CardContent className="pt-6 px-3 sm:px-6">
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 rounded-xl text-sm"
                            />
                        </div>
                        {/* View Type Filter */}
                        <div className="space-y-1.5">
                            <div className="flex items-center">
                                <label className="text-xs text-slate-400 font-medium px-1">Tipo de Vista</label>
                                <NewBadge />
                            </div>
                            <Select value={viewFilter} onValueChange={setViewFilter}>
                                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-sm h-10">
                                    <SelectValue placeholder="Solo Órdenes" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="orders" className="text-slate-200">Solo Órdenes</SelectItem>
                                    <SelectItem value="appointments" className="text-slate-200">Solo Citas</SelectItem>
                                    <SelectItem value="nearby" className="text-slate-200">Órdenes + Citas Próximas</SelectItem>
                                    <SelectItem value="all" className="text-slate-200">Todo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium px-1">Estado</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-slate-200">Todos</SelectItem>
                                        <SelectItem value="pendiente" className="text-slate-200">⏳ Pendientes</SelectItem>
                                        <SelectItem value="completada" className="text-slate-200">✓ Completadas</SelectItem>
                                        <SelectItem value="debe" className="text-slate-200">💳 Debe</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium px-1">Mecánico</label>
                                <Select value={mechanicFilter} onValueChange={setMechanicFilter}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-slate-200">Todos</SelectItem>
                                        {perfiles.filter(p => p.rol === 'mecanico' || p.rol === 'admin').map(perfil => (
                                            <SelectItem key={perfil.id} value={perfil.id} className="text-slate-200">
                                                {perfil.nombre_completo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center">
                                    <label className="text-xs text-slate-400 font-medium px-1">Deuda</label>
                                    <NewBadge />
                                </div>
                                <Select value={debtFilter} onValueChange={setDebtFilter}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-slate-200">Todas</SelectItem>
                                        <SelectItem value="con_deuda" className="text-slate-200">Con Deuda</SelectItem>
                                        <SelectItem value="sin_deuda" className="text-slate-200">Sin Deuda</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium px-1">Fecha</label>
                                <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-slate-200">Todas</SelectItem>
                                        <SelectItem value="today" className="text-slate-200">Hoy</SelectItem>
                                        <SelectItem value="week" className="text-slate-200">Semana</SelectItem>
                                        <SelectItem value="month" className="text-slate-200">Mes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={handleExportPDF}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl w-full sm:w-auto text-sm h-9"
                                disabled={filteredOrders.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar PDF
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table/List */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white">
                        {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''} encontrada{filteredOrders.length !== 1 ? 's' : ''}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-700 hover:bg-transparent">
                                    <TableHead className="text-slate-300">Patente</TableHead>
                                    <TableHead className="text-slate-300">Vehículo</TableHead>
                                    <TableHead className="text-slate-300">Motivo</TableHead>
                                    <TableHead className="text-slate-300">Mecánico</TableHead>
                                    <TableHead className="text-slate-300">Estado</TableHead>
                                    <TableHead className="text-slate-300 w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map((order) => {
                                    const vehiculo = getVehiculo(order.patente_vehiculo);
                                    const isExpanded = expandedOrderId === order.id;
                                    return (
                                        <Fragment key={order.id}>
                                            <TableRow
                                                className={`border-slate-700 hover:bg-slate-700/30 cursor-pointer ${hasDebt(order) ? 'bg-red-900/10 border-l-4 border-l-red-500' : ''} ${isExpanded ? 'bg-slate-700/50' : ''}`}
                                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                            >
                                                <TableCell className="font-mono text-white">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="font-bold text-sm">{order.patente_vehiculo}</div>
                                                        {hasDebt(order) && <span className="text-red-400 text-xs">💳</span>}
                                                    </div>
                                                    {order.cliente_nombre && (
                                                        <div className="text-xs text-slate-400 truncate max-w-[100px]">{order.cliente_nombre}</div>
                                                    )}
                                                    {order.cliente_telefono && (
                                                        <div className="text-xs text-slate-500 truncate max-w-[100px]">{order.cliente_telefono}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    <div className="text-sm truncate max-w-[140px]">
                                                        {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-300" title={getCleanMotivo(order.descripcion_ingreso)}>
                                                    <div className="text-sm truncate max-w-[180px]">
                                                        {getCleanMotivo(order.descripcion_ingreso)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    <div className="text-sm truncate max-w-[100px]">
                                                        {order.asignado_a ? getPerfilNombre(order.asignado_a) : getPerfilNombre(order.creado_por)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {getStatusBadge(order.estado, order.id, true)}
                                                    </div>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        {/* Confirm Appointment Button */}
                                                        {(order as any).isAppointment && (
                                                            <Link href={`/recepcion?citaId=${order.id}`} onClick={(e) => e.stopPropagation()}>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-purple-400 hover:text-purple-300 h-8 w-8 p-0"
                                                                    title="Confirmar Cita y Crear Orden"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-slate-400 hover:text-slate-300 h-8 w-8 p-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedOrderId(isExpanded ? null : order.id);
                                                            }}
                                                        >
                                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </Button>
                                                        <Link href={`/admin/ordenes/clean?id=${order.id}`} onClick={(e) => e.stopPropagation()}>
                                                            <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 h-8 w-8 p-0">
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </Link>
                                                        {isAdmin && (
                                                            deleteConfirm === order.id ? (
                                                                <div className="flex gap-0.5">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteOrder(order as any);
                                                                        }}
                                                                        disabled={deleteOrder.isPending}
                                                                    >
                                                                        ✓
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-slate-400 hover:text-slate-300 h-8 w-8 p-0"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDeleteConfirm(null);
                                                                        }}
                                                                    >
                                                                        ✕
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeleteConfirm(order.id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && (
                                                <TableRow key={`${order.id}-expanded`} className="border-slate-700">
                                                    <TableCell colSpan={6} className="bg-slate-800/80 p-0">
                                                        <div className="p-6 space-y-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Información del Vehículo */}
                                                                <div className="space-y-3">
                                                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                        <Wrench className="w-4 h-4" />
                                                                        Información del Vehículo
                                                                    </h3>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-400">Patente:</span>
                                                                            <span className="text-white font-mono font-bold">{order.patente_vehiculo}</span>
                                                                        </div>
                                                                        {vehiculo && (
                                                                            <>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Marca:</span>
                                                                                    <span className="text-white">{vehiculo.marca}</span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Modelo:</span>
                                                                                    <span className="text-white">{vehiculo.modelo}</span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Año:</span>
                                                                                    <span className="text-white">{vehiculo.anio}</span>
                                                                                </div>
                                                                                {vehiculo.motor && (
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-slate-400">Motor:</span>
                                                                                        <span className="text-white">{vehiculo.motor}</span>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Información del Cliente */}
                                                                <div className="space-y-3">
                                                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                        <User className="w-4 h-4" />
                                                                        Información del Cliente
                                                                    </h3>
                                                                    <div className="space-y-2 text-sm">
                                                                        {order.cliente_nombre && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-400">Nombre:</span>
                                                                                <span className="text-white">{order.cliente_nombre}</span>
                                                                            </div>
                                                                        )}
                                                                        {order.cliente_telefono && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-400">Teléfono:</span>
                                                                                <span className="text-white">{order.cliente_telefono}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Información de la Orden */}
                                                                <div className="space-y-3">
                                                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                        <Calendar className="w-4 h-4" />
                                                                        Detalles de la Orden
                                                                    </h3>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-400">Fecha Ingreso:</span>
                                                                            <span className="text-white">
                                                                                {new Date(order.fecha_ingreso).toLocaleString('es-CL', {
                                                                                    day: '2-digit',
                                                                                    month: '2-digit',
                                                                                    year: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                            </span>
                                                                        </div>
                                                                        {order.fecha_entrega && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-400">Fecha Entrega:</span>
                                                                                <span className="text-green-400 font-semibold">
                                                                                    {new Date(order.fecha_entrega).toLocaleString('es-CL', {
                                                                                        day: '2-digit',
                                                                                        month: '2-digit',
                                                                                        year: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    })}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-400">Creado por:</span>
                                                                            <span className="text-white">{getPerfilNombre(order.creado_por)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-400">Asignado a:</span>
                                                                            <span className="text-white">{order.asignado_a ? getPerfilNombre(order.asignado_a) : '-'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-400">Estado:</span>
                                                                            {getStatusBadge(order.estado, order.id, true)}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Información de Pago */}
                                                                {canViewPrices && (
                                                                    <div className="space-y-3">
                                                                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                            <DollarSign className="w-4 h-4" />
                                                                            Información de Pago
                                                                        </h3>
                                                                        <div className="space-y-2 text-sm">
                                                                            {order.precio_total && (
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Total:</span>
                                                                                    <span className="text-white font-semibold">${order.precio_total.toLocaleString('es-CL')}</span>
                                                                                </div>
                                                                            )}
                                                                            {order.metodos_pago && order.metodos_pago.length > 0 && (
                                                                                <div className="space-y-1">
                                                                                    <span className="text-slate-400">Métodos de pago:</span>
                                                                                    {order.metodos_pago.map((mp, idx) => (
                                                                                        <div key={idx} className="flex justify-between pl-4">
                                                                                            <span className="text-slate-500 capitalize">{mp.metodo}:</span>
                                                                                            <span className="text-white">${mp.monto.toLocaleString('es-CL')}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                            {hasDebt(order) && (
                                                                                <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
                                                                                    💳 Cliente tiene deuda pendiente
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Descripción Completa */}
                                                            <div className="space-y-2">
                                                                <h3 className="text-sm font-semibold text-slate-300">Descripción del Trabajo</h3>
                                                                <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap">
                                                                    {getCleanMotivo(order.descripcion_ingreso) || 'Sin descripción'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden space-y-3">
                        {filteredOrders.map((order) => {
                            const vehiculo = getVehiculo(order.patente_vehiculo);
                            return (
                                <Card key={order.id} className={`bg-slate-700/30 border-slate-600/50 ${hasDebt(order) ? 'border-l-4 border-l-red-500 bg-red-900/10' : ''}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-14 h-10 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="text-white font-mono font-bold text-xs">
                                                    {order.patente_vehiculo}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-white font-medium truncate text-sm flex-1">
                                                        {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : order.patente_vehiculo}
                                                    </p>
                                                    {hasDebt(order) && <span className="text-red-400 text-xs flex-shrink-0">💳</span>}
                                                </div>
                                                {order.cliente_nombre && (
                                                    <p className="text-xs text-blue-400 truncate">
                                                        {order.cliente_nombre}
                                                    </p>
                                                )}
                                                {order.cliente_telefono && (
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {order.cliente_telefono}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-500 truncate">
                                                    {new Date(order.fecha_ingreso).toLocaleDateString('es-CL', {
                                                        day: '2-digit',
                                                        month: '2-digit'
                                                    })} {new Date(order.fecha_ingreso).toLocaleTimeString('es-CL', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate mt-1">
                                                    {getCleanMotivo(order.descripcion_ingreso)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex-shrink-0">
                                                {getStatusBadge(order.estado, order.id, true)}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <Link href={`/admin/ordenes/clean?id=${order.id}`}>
                                                    <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-2">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                                {isAdmin && (
                                                    deleteConfirm === order.id ? (
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                                                                onClick={() => handleDeleteOrder(order as any)}
                                                                disabled={deleteOrder.isPending}
                                                            >
                                                                ✓
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-slate-400 hover:text-slate-300 h-8 px-2"
                                                                onClick={() => setDeleteConfirm(null)}
                                                            >
                                                                ✕
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                                                            onClick={() => setDeleteConfirm(order.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {filteredOrders.length === 0 && (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                            <p className="text-slate-400">No se encontraron órdenes</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
