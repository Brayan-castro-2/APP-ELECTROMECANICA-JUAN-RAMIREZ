'use client';

import { useState, useEffect } from 'react';
import { obtenerOrdenes, obtenerPerfiles, obtenerVehiculos } from '@/lib/supabase-service';
import { OrdenDB, PerfilDB, VehiculoDB } from '@/lib/supabase';
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
import { Search, FileText, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function OrdenesPage() {
    const [orders, setOrders] = useState<OrdenDB[]>([]);
    const [perfiles, setPerfiles] = useState<PerfilDB[]>([]);
    const [vehiculos, setVehiculos] = useState<VehiculoDB[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const [ordenes, perfs, vehs] = await Promise.all([
                obtenerOrdenes(),
                obtenerPerfiles(),
                obtenerVehiculos()
            ]);
            setOrders(ordenes);
            setPerfiles(perfs);
            setVehiculos(vehs);
            setIsLoading(false);
        };
        loadData();
    }, []);

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

        return matchesSearch && matchesStatus;
    });

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
                                            <TableCell className="font-mono font-bold text-white">
                                                {order.patente_vehiculo}
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
                                                <Link href={`/admin/ordenes/${order.id}`}>
                                                    <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                </Link>
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
                                <Link key={order.id} href={`/admin/ordenes/${order.id}`}>
                                    <Card className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 transition-all">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-14 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                                                    <span className="text-white font-mono font-bold text-xs">
                                                        {order.patente_vehiculo}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate text-sm">
                                                        {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : order.patente_vehiculo}
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate">
                                                        {order.descripcion_ingreso}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-500" />
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
