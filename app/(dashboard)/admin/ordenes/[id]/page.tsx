'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    obtenerOrdenPorId,
    actualizarOrden,
    obtenerPerfiles,
    buscarVehiculoPorPatente,
    OrdenDB, 
    PerfilDB, 
    VehiculoDB 
} from '@/lib/local-storage-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Printer, Save, Car, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function OrdenDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = Number(params.id);

    const [order, setOrder] = useState<OrdenDB | null>(null);
    const [vehiculo, setVehiculo] = useState<VehiculoDB | null>(null);
    const [perfiles, setPerfiles] = useState<PerfilDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Form state
    const [descripcion, setDescripcion] = useState('');
    const [estado, setEstado] = useState('pendiente');
    const [asignadoA, setAsignadoA] = useState<string>('');
    const [precioTotal, setPrecioTotal] = useState<string>('0');
    const [detalleTrabajos, setDetalleTrabajos] = useState('');
    const [kmIngreso, setKmIngreso] = useState<string>('');
    const [kmSalida, setKmSalida] = useState<string>('');

    useEffect(() => {
        if (Number.isFinite(orderId)) {
            router.replace(`/admin/ordenes/clean?id=${orderId}`);
        } else {
            router.replace('/admin/ordenes');
        }
    }, [router, orderId]);

    useEffect(() => {
        const loadData = async () => {
            const [ordenData, perfs] = await Promise.all([
                obtenerOrdenPorId(orderId),
                obtenerPerfiles()
            ]);

            if (ordenData) {
                setOrder(ordenData);
                setDescripcion(ordenData.descripcion_ingreso);
                setEstado(ordenData.estado);
                setAsignadoA(ordenData.asignado_a || '');
                setPrecioTotal(ordenData.precio_total?.toString() || '0');
                setDetalleTrabajos(ordenData.detalle_trabajos || '');
                
                const servicios = ordenData.descripcion_ingreso || '';
                const kmMatch = servicios.match(/KM:\s*(\d+\.?\d*)/);
                const kmSalidaMatch = servicios.match(/→\s*(\d+\.?\d*)/);
                if (kmMatch) setKmIngreso(kmMatch[1]);
                if (kmSalidaMatch) setKmSalida(kmSalidaMatch[1]);

                // Cargar datos del vehículo
                const veh = await buscarVehiculoPorPatente(ordenData.patente_vehiculo);
                setVehiculo(veh);
            }

            setPerfiles(perfs);
            setIsLoading(false);
        };

        loadData();
    }, [orderId]);

    const handleSave = async () => {
        if (!order) return;

        const precio = parseFloat(precioTotal) || 0;
        if (precio < 0) {
            alert('El precio no puede ser negativo');
            return;
        }

        const kmIn = parseFloat(kmIngreso) || 0;
        const kmOut = parseFloat(kmSalida) || 0;
        
        if (kmOut > 0 && kmOut < kmIn) {
            alert('El kilometraje de salida no puede ser menor al de ingreso');
            return;
        }

        let descripcionActualizada = descripcion;
        if (kmIngreso && kmSalida) {
            const kmDiff = kmOut - kmIn;
            const precioKm = precio > 0 ? precio : 15000;
            descripcionActualizada = `${descripcion}\n\nServicios:\n- KM: ${kmIngreso} KM → ${kmSalida} KM: $${precioKm.toLocaleString('es-CL')}`;
        }

        setIsSaving(true);

        const updated = await actualizarOrden(order.id, {
            descripcion_ingreso: descripcionActualizada,
            estado,
            asignado_a: asignadoA || null,
            precio_total: precio,
            detalle_trabajos: detalleTrabajos || null,
        } as any);

        if (updated) {
            setOrder(updated);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }

        setIsSaving(false);
    };

    const handlePrint = () => {
        window.open(`/print/orden/${orderId}`, '_blank');
    };

    const handleTicket = () => {
        window.open(`/print/ticket/${orderId}`, '_blank');
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

    if (isLoading) {
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
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Success Toast */}
            {saveSuccess && (
                <div className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Cambios guardados
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/ordenes">
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">
                            Orden #{order.id}
                        </h1>
                        <p className="text-sm text-slate-400">
                            {new Date(order.fecha_ingreso).toLocaleString('es-CL')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleTicket} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Ticket</span>
                    </Button>
                    <Button onClick={handlePrint} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Imprimir Orden</span>
                    </Button>
                </div>
            </div>

            {/* Vehicle Info */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Car className="w-5 h-5 text-blue-500" />
                        Datos del Vehículo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-slate-400">Patente</p>
                            <p className="text-xl font-mono font-bold text-white">{order.patente_vehiculo}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Marca</p>
                            <p className="text-white font-medium">{vehiculo?.marca || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Modelo</p>
                            <p className="text-white font-medium">{vehiculo?.modelo || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Año / Color</p>
                            <p className="text-white font-medium">
                                {vehiculo ? `${vehiculo.anio} - ${vehiculo.color}` : '-'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white">Detalles de la Orden</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Estado</Label>
                            <Select value={estado} onValueChange={setEstado}>
                                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="pendiente" className="text-slate-200">Pendiente</SelectItem>
                                    <SelectItem value="en_progreso" className="text-slate-200">En Progreso</SelectItem>
                                    <SelectItem value="completada" className="text-slate-200">Completada</SelectItem>
                                    <SelectItem value="cancelada" className="text-slate-200">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Asignado a</Label>
                            <Select value={asignadoA || 'none'} onValueChange={(v) => setAsignadoA(v === 'none' ? '' : v)}>
                                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl">
                                    <SelectValue placeholder="Seleccionar mecánico" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="none" className="text-slate-200">Sin asignar</SelectItem>
                                    {perfiles.filter(p => p.rol === 'mecanico' || p.rol === 'admin').map((perfil) => (
                                        <SelectItem key={perfil.id} value={perfil.id} className="text-slate-200">
                                            {perfil.nombre_completo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Motivo de Ingreso</Label>
                        <Textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className="min-h-[100px] bg-slate-700/50 border-slate-600 text-white rounded-xl"
                            placeholder="Describe el motivo de ingreso del vehículo..."
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">KM Ingreso</Label>
                            <Input
                                type="number"
                                value={kmIngreso}
                                onChange={(e) => setKmIngreso(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                placeholder="150000"
                                min="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">KM Salida</Label>
                            <Input
                                type="number"
                                value={kmSalida}
                                onChange={(e) => setKmSalida(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                placeholder="130000"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Detalle de Trabajos Realizados</Label>
                        <Textarea
                            value={detalleTrabajos}
                            onChange={(e) => setDetalleTrabajos(e.target.value)}
                            className="min-h-[100px] bg-slate-700/50 border-slate-600 text-white rounded-xl"
                            placeholder="Describe los trabajos realizados en el vehículo..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Precio Total ($)</Label>
                        <Input
                            type="number"
                            value={precioTotal}
                            onChange={(e) => setPrecioTotal(e.target.value)}
                            className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-lg font-semibold"
                            placeholder="15000"
                            min="0"
                        />
                        <p className="text-xs text-slate-400">Precio en pesos chilenos</p>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 rounded-xl"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Cambios
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
