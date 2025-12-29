'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { obtenerPerfilPorId, obtenerOrdenesPorUsuario, actualizarPerfil } from '@/lib/supabase-service';
import { PerfilDB, OrdenDB } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    Shield,
    Wrench,
    CheckCircle,
    XCircle,
    FileText,
    Loader2,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function UsuarioDetailPage() {
    const params = useParams();
    const userId = params.id as string;

    const [usuario, setUsuario] = useState<PerfilDB | null>(null);
    const [ordenes, setOrdenes] = useState<{ creadas: OrdenDB[]; asignadas: OrdenDB[] }>({ creadas: [], asignadas: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const [perfil, ordenesData] = await Promise.all([
                obtenerPerfilPorId(userId),
                obtenerOrdenesPorUsuario(userId)
            ]);
            setUsuario(perfil);
            setOrdenes(ordenesData);
            setIsLoading(false);
        };
        loadData();
    }, [userId]);

    const handleToggleActive = async () => {
        if (!usuario) return;
        const updated = await actualizarPerfil(usuario.id, { activo: !usuario.activo });
        if (updated) setUsuario(updated);
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { class: string; label: string }> = {
            pendiente: { class: 'bg-amber-500/20 text-amber-400', label: 'Pendiente' },
            en_progreso: { class: 'bg-[#0066FF]/20 text-[#0066FF]', label: 'En Progreso' },
            completada: { class: 'bg-green-500/20 text-green-400', label: 'Completada' },
            cancelada: { class: 'bg-red-500/20 text-red-400', label: 'Cancelada' },
        };
        const c = config[status] || config.pendiente;
        return <Badge className={c.class}>{c.label}</Badge>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
            </div>
        );
    }

    if (!usuario) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400 mb-4">Usuario no encontrado</p>
                <Link href="/admin/usuarios">
                    <Button variant="outline" className="border-[#333333] text-gray-300">
                        Volver
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/usuarios">
                    <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-[#242424] rounded-xl">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-bold text-white">{usuario.nombre_completo}</h1>
                    <p className="text-sm text-gray-400 capitalize">{usuario.rol}</p>
                </div>
            </div>

            {/* User Profile Card */}
            <Card className="bg-[#1a1a1a] border-[#333333]">
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${usuario.rol === 'admin' ? 'bg-[#0066FF]/20' : 'bg-gray-700/50'
                            }`}>
                            {usuario.rol === 'admin' ? (
                                <Shield className="w-10 h-10 text-[#0066FF]" />
                            ) : (
                                <Wrench className="w-10 h-10 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white mb-2">{usuario.nombre_completo}</h2>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={
                                    usuario.rol === 'admin'
                                        ? 'border-[#0066FF]/30 text-[#0066FF]'
                                        : 'border-gray-600 text-gray-400'
                                }>
                                    {usuario.rol === 'admin' ? 'Administrador' : 'Mecánico'}
                                </Badge>
                                {usuario.activo ? (
                                    <Badge className="bg-green-500/20 text-green-400">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Activo
                                    </Badge>
                                ) : (
                                    <Badge className="bg-red-500/20 text-red-400">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Bloqueado
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={handleToggleActive}
                            variant="outline"
                            className={`rounded-xl ${usuario.activo
                                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                    : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                }`}
                        >
                            {usuario.activo ? 'Bloquear' : 'Activar'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Tabs */}
            <Tabs defaultValue="creadas" className="w-full">
                <TabsList className="bg-[#1a1a1a] border border-[#333333] p-1 rounded-xl">
                    <TabsTrigger value="creadas" className="rounded-lg data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">
                        Órdenes Creadas ({ordenes.creadas.length})
                    </TabsTrigger>
                    <TabsTrigger value="asignadas" className="rounded-lg data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">
                        Órdenes Asignadas ({ordenes.asignadas.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="creadas" className="mt-4">
                    <Card className="bg-[#1a1a1a] border-[#333333]">
                        <CardContent className="p-4">
                            {ordenes.creadas.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                    <p className="text-gray-400">No ha creado órdenes</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {ordenes.creadas.map((orden) => (
                                        <Link key={orden.id} href={`/admin/ordenes/${orden.id}`}>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#121212] hover:bg-[#242424] transition-all">
                                                <div className="w-12 h-9 bg-[#333333] rounded-lg flex items-center justify-center">
                                                    <span className="text-white font-mono text-xs font-bold">
                                                        {orden.patente_vehiculo}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm truncate">{orden.descripcion_ingreso}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(orden.fecha_ingreso).toLocaleDateString('es-CL')}
                                                    </p>
                                                </div>
                                                {getStatusBadge(orden.estado)}
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="asignadas" className="mt-4">
                    <Card className="bg-[#1a1a1a] border-[#333333]">
                        <CardContent className="p-4">
                            {ordenes.asignadas.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                    <p className="text-gray-400">No tiene órdenes asignadas</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {ordenes.asignadas.map((orden) => (
                                        <Link key={orden.id} href={`/admin/ordenes/${orden.id}`}>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#121212] hover:bg-[#242424] transition-all">
                                                <div className="w-12 h-9 bg-[#333333] rounded-lg flex items-center justify-center">
                                                    <span className="text-white font-mono text-xs font-bold">
                                                        {orden.patente_vehiculo}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm truncate">{orden.descripcion_ingreso}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(orden.fecha_ingreso).toLocaleDateString('es-CL')}
                                                    </p>
                                                </div>
                                                {getStatusBadge(orden.estado)}
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
