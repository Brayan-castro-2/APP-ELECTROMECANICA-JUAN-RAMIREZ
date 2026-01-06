'use client';

import { useState, useEffect } from 'react';
import { obtenerPerfiles, obtenerVehiculos, type OrdenDB, type PerfilDB, type VehiculoDB } from '@/lib/storage-adapter';
import { useOrders, useDeleteOrder } from '@/hooks/use-orders';
import { useAuth } from '@/contexts/auth-context';

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
import { Search, FileText, ChevronRight, Loader2, Trash2, Edit, Download } from 'lucide-react';
import Link from 'next/link';

export default function OrdenesPage() {
    const { user } = useAuth();
    const { data: orders = [], isLoading: isLoadingOrders } = useOrders();
    const deleteOrder = useDeleteOrder();
    const [perfiles, setPerfiles] = useState<PerfilDB[]>([]);
    const [vehiculos, setVehiculos] = useState<VehiculoDB[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [mechanicFilter, setMechanicFilter] = useState<string>('all');
    const [isLoadingOther, setIsLoadingOther] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const isAdmin = user?.role === 'admin';
    const canViewPrices = user?.name?.toLowerCase().includes('juan');

    useEffect(() => {
        const loadData = async () => {
            const [perfs, vehs] = await Promise.all([
                obtenerPerfiles(),
                obtenerVehiculos()
            ]);
            setPerfiles(perfs);
            setVehiculos(vehs);
            setIsLoadingOther(false);
        };
        loadData();
    }, []);

    const isLoading = isLoadingOrders || isLoadingOther;

    const getPerfilNombre = (id: string) => {
        const perfil = perfiles.find(p => p.id === id);
        return perfil?.nombre_completo || 'Sin asignar';
    };

    const getVehiculo = (patente: string) => {
        return vehiculos.find(v => v.patente === patente);
    };

    const filteredOrders = orders.filter(order => {
        const vehiculo = getVehiculo(order.patente_vehiculo);
        const matchesSearch =
            order.patente_vehiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vehiculo?.marca?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (vehiculo?.modelo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            order.descripcion_ingreso.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || order.estado === statusFilter;
        const matchesMechanic = mechanicFilter === 'all' || order.asignado_a === mechanicFilter;

        return matchesSearch && matchesStatus && matchesMechanic;
    });

    const handleDeleteOrder = async (orderId: number) => {
        try {
            await deleteOrder.mutateAsync(orderId);
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error al eliminar orden:', error);
            alert('Error al eliminar la orden');
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { class: string; label: string }> = {
            pendiente: { class: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Pendiente' },
            en_progreso: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'En Progreso' },
            completada: { class: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Completada' },
            cancelada: { class: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelada' },
        };
        const c = config[status] || config.pendiente;
        return <Badge className={`${c.class} border`}>{c.label}</Badge>;
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
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">Órdenes de Trabajo</h1>
                    <p className="text-sm text-slate-400">Gestión de órdenes del taller</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar por patente, marca, modelo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 rounded-xl"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-48 bg-slate-700/50 border-slate-600 text-white rounded-xl">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="all" className="text-slate-200">Todos</SelectItem>
                                    <SelectItem value="pendiente" className="text-slate-200">Pendientes</SelectItem>
                                    <SelectItem value="en_progreso" className="text-slate-200">En Progreso</SelectItem>
                                    <SelectItem value="completada" className="text-slate-200">Completadas</SelectItem>
                                    <SelectItem value="cancelada" className="text-slate-200">Canceladas</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={mechanicFilter} onValueChange={setMechanicFilter}>
                                <SelectTrigger className="w-full sm:w-48 bg-slate-700/50 border-slate-600 text-white rounded-xl">
                                    <SelectValue placeholder="Mecánico" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="all" className="text-slate-200">Todos los mecánicos</SelectItem>
                                    {perfiles.filter(p => p.rol === 'mecanico' || p.rol === 'admin').map(perfil => (
                                        <SelectItem key={perfil.id} value={perfil.id} className="text-slate-200">
                                            {perfil.nombre_completo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={handleExportPDF}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={filteredOrders.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar a PDF
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
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-700 hover:bg-transparent">
                                    <TableHead className="text-slate-300">Patente</TableHead>
                                    <TableHead className="text-slate-300">Vehículo</TableHead>
                                    <TableHead className="text-slate-300">Motivo</TableHead>
                                    <TableHead className="text-slate-300">Creado por</TableHead>
                                    <TableHead className="text-slate-300">Asignado a</TableHead>
                                    <TableHead className="text-slate-300">Estado</TableHead>
                                    <TableHead className="text-slate-300"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map((order) => {
                                    const vehiculo = getVehiculo(order.patente_vehiculo);
                                    return (
                                        <TableRow key={order.id} className="border-slate-700 hover:bg-slate-700/30">
                                            <TableCell className="font-mono text-white">
                                                <div className="font-bold">{order.patente_vehiculo}</div>
                                                {order.cliente_nombre && (
                                                    <div className="text-xs text-slate-400 mt-1">{order.cliente_nombre}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-300">
                                                {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-slate-300 max-w-xs truncate">
                                                {order.descripcion_ingreso}
                                            </TableCell>
                                            <TableCell className="text-slate-300">
                                                {getPerfilNombre(order.creado_por)}
                                            </TableCell>
                                            <TableCell className="text-slate-300">
                                                {order.asignado_a ? getPerfilNombre(order.asignado_a) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(order.estado)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/admin/ordenes/clean?id=${order.id}`}>
                                                        <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    {isAdmin && (
                                                        deleteConfirm === order.id ? (
                                                            <div className="flex gap-1">
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost" 
                                                                    className="text-red-400 hover:text-red-300"
                                                                    onClick={() => handleDeleteOrder(order.id)}
                                                                    disabled={deleteOrder.isPending}
                                                                >
                                                                    Confirmar
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost" 
                                                                    className="text-slate-400 hover:text-slate-300"
                                                                    onClick={() => setDeleteConfirm(null)}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                className="text-red-400 hover:text-red-300"
                                                                onClick={() => setDeleteConfirm(order.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
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
                                <Link key={order.id} href={`/admin/ordenes/clean?id=${order.id}`}>
                                    <Card className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 transition-all">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-14 h-10 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white font-mono font-bold text-xs">
                                                        {order.patente_vehiculo}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate text-sm">
                                                        {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : order.patente_vehiculo}
                                                    </p>
                                                    {order.cliente_nombre && (
                                                        <p className="text-xs text-blue-400 truncate">
                                                            {order.cliente_nombre}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400 truncate">
                                                        {order.descripcion_ingreso}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between">
                                                {getStatusBadge(order.estado)}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
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
