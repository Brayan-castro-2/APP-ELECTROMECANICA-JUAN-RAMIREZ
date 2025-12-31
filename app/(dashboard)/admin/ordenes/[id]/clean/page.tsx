'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { buscarVehiculoPorPatente, obtenerOrdenPorId, OrdenDB, VehiculoDB } from '@/lib/local-storage-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer } from 'lucide-react';
import Link from 'next/link';

export default function OrdenDetailCleanPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = Number(params.id);

    const { user, isLoading: authLoading } = useAuth();

    const [order, setOrder] = useState<OrdenDB | null>(null);
    const [vehiculo, setVehiculo] = useState<VehiculoDB | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (Number.isFinite(orderId)) {
            router.replace(`/admin/ordenes/clean?id=${orderId}`);
        }
    }, [authLoading, user, router, orderId]);

    useEffect(() => {
        const loadData = async () => {
            const ordenData = await obtenerOrdenPorId(orderId);
            setOrder(ordenData);
            if (ordenData) {
                const veh = await buscarVehiculoPorPatente(ordenData.patente_vehiculo);
                setVehiculo(veh);
            }
            setIsLoading(false);
        };
        loadData();
    }, [orderId]);

    const handlePrint = () => {
        window.open(`/print/orden/${orderId}`, '_blank');
    };

    const handleTicket = () => {
        window.open(`/print/ticket/${orderId}`, '_blank');
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400 mb-4">Orden no encontrada</p>
                <Link href="/admin/ordenes">
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                        Volver a órdenes
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">Orden #{order.id}</h1>
                    <p className="text-sm text-slate-400">{new Date(order.fecha_ingreso).toLocaleString('es-CL')}</p>
                </div>
                <div className="flex gap-2">
                    {user?.role === 'admin' ? (
                        <Button onClick={handleTicket} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                            <Printer className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Boleta/Ticket</span>
                        </Button>
                    ) : null}
                    <Button onClick={handlePrint} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Imprimir Orden</span>
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white">Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Patente</span>
                        <span className="font-mono font-bold text-white">{order.patente_vehiculo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Vehículo</span>
                        <span className="text-white">{vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Estado</span>
                        <Badge className="bg-slate-700/50 text-slate-200 border border-slate-600">{order.estado}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Precio Final</span>
                        <span className="text-white font-bold">${(order.precio_total || 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="pt-2">
                        <p className="text-slate-400 text-sm mb-1">Motivo</p>
                        <p className="text-white whitespace-pre-wrap">{order.descripcion_ingreso}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
