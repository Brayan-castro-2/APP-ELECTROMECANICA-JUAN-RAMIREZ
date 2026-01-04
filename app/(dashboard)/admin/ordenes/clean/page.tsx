'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { actualizarOrden, buscarVehiculoPorPatente, obtenerOrdenPorId, obtenerPerfiles, type OrdenDB, type VehiculoDB, type PerfilDB } from '@/lib/storage-adapter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Download, Loader2, Printer, Save } from 'lucide-react';
import Link from 'next/link';

export default function OrdenesCleanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();

    const orderIdParam = searchParams.get('id');
    const orderId = Number(orderIdParam);

    const [order, setOrder] = useState<OrdenDB | null>(null);
    const [vehiculo, setVehiculo] = useState<VehiculoDB | null>(null);
    const [perfiles, setPerfiles] = useState<PerfilDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [precioFinal, setPrecioFinal] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    const [descripcion, setDescripcion] = useState('');
    const [estado, setEstado] = useState('pendiente');
    const [asignadoA, setAsignadoA] = useState<string>('');
    const [detalleTrabajos, setDetalleTrabajos] = useState('');
    const [kmIngreso, setKmIngreso] = useState<string>('');
    const [kmSalida, setKmSalida] = useState<string>('');

    const parsePrecio = (value: string) => {
        const digits = value.replace(/[^0-9]/g, '');
        return digits ? Number(digits) : 0;
    };

    const formatPrecio = (value: number) => {
        return value.toLocaleString('es-CL');
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!Number.isFinite(orderId)) {
            setIsLoading(false);
            setOrder(null);
            setVehiculo(null);
            return;
        }

        const loadData = async () => {
            const [ordenData, perfs] = await Promise.all([
                obtenerOrdenPorId(orderId),
                obtenerPerfiles()
            ]);
            
            setOrder(ordenData);
            setPerfiles(perfs);
            
            if (ordenData) {
                setPrecioFinal(formatPrecio(ordenData.precio_total || 0));
                setDescripcion(ordenData.descripcion_ingreso);
                setEstado(ordenData.estado);
                setAsignadoA(ordenData.asignado_a || '');
                setDetalleTrabajos(ordenData.detalle_trabajos || '');
                
                const servicios = ordenData.descripcion_ingreso || '';
                const kmMatch = servicios.match(/KM:\s*(\d+\.?\d*)/);
                const kmSalidaMatch = servicios.match(/→\s*(\d+\.?\d*)/);
                if (kmMatch) setKmIngreso(kmMatch[1]);
                if (kmSalidaMatch) setKmSalida(kmSalidaMatch[1]);
                
                const veh = await buscarVehiculoPorPatente(ordenData.patente_vehiculo);
                setVehiculo(veh);
            }
            setIsLoading(false);
        };

        setIsLoading(true);
        loadData();
    }, [orderId]);

    const handlePrint = () => {
        if (!Number.isFinite(orderId)) return;
        window.open(`/print/orden/${orderId}`, '_blank');
    };

    const handleTicket = () => {
        if (!Number.isFinite(orderId)) return;
        window.open(`/print/ticket/${orderId}`, '_blank');
    };

    const handleDownloadPDF = async () => {
        if (!order) return;

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const content = document.createElement('div');
            content.style.width = '800px';
            content.style.padding = '40px';
            content.style.backgroundColor = '#ffffff';
            content.style.color = '#000000';
            content.style.fontFamily = 'Arial, sans-serif';

            content.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">ELECTROMECÁNICA JR</h1>
                    <p style="font-size: 14px; color: #666;">Orden de Trabajo #${order.id}</p>
                    <p style="font-size: 12px; color: #666;">${new Date(order.fecha_ingreso).toLocaleString('es-CL')}</p>
                </div>

                <div style="border: 2px solid #333; padding: 20px; margin-bottom: 20px;">
                    <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMACIÓN DEL VEHÍCULO</h2>
                    <div style="margin-bottom: 10px;">
                        <strong>Patente:</strong> ${order.patente_vehiculo}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Vehículo:</strong> ${vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-'}
                    </div>
                    ${vehiculo?.anio ? `<div style="margin-bottom: 10px;"><strong>Año:</strong> ${vehiculo.anio}</div>` : ''}
                    ${vehiculo?.motor ? `<div style="margin-bottom: 10px;"><strong>Motor:</strong> ${vehiculo.motor}</div>` : ''}
                </div>

                <div style="border: 2px solid #333; padding: 20px; margin-bottom: 20px;">
                    <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px;">DETALLES DE LA ORDEN</h2>
                    <div style="margin-bottom: 10px;">
                        <strong>Estado:</strong> ${order.estado}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Precio Final:</strong> $${(order.precio_total || 0).toLocaleString('es-CL')}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Motivo:</strong>
                        <div style="margin-top: 5px; white-space: pre-wrap;">${order.descripcion_ingreso}</div>
                    </div>
                    ${order.detalles_vehiculo ? `
                    <div style="margin-bottom: 10px;">
                        <strong>Detalles del Vehículo:</strong>
                        <div style="margin-top: 5px; white-space: pre-wrap;">${order.detalles_vehiculo}</div>
                    </div>
                    ` : ''}
                </div>

                ${order.fotos?.length ? `
                <div style="border: 2px solid #333; padding: 20px; margin-bottom: 20px;">
                    <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px;">IMÁGENES</h2>
                    <div id="images-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        ${order.fotos.map((src, idx) => `
                            <div style="border: 1px solid #ddd; padding: 10px;">
                                <img src="${src}" alt="Foto ${idx + 1}" style="width: 100%; height: auto; max-height: 300px; object-fit: contain;" crossorigin="anonymous" />
                                <p style="text-align: center; margin-top: 5px; font-size: 12px; color: #666;">Foto ${idx + 1}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            `;

            document.body.appendChild(content);

            const canvas = await html2canvas(content, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
            });

            document.body.removeChild(content);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`Orden_${order.id}_${order.patente_vehiculo}.pdf`);
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Por favor intenta nuevamente.');
        }
    };

    const handleGuardarTodo = async () => {
        if (!order) return;
        if (user?.role !== 'admin') return;

        const precio = parsePrecio(precioFinal);
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
            setPrecioFinal(formatPrecio(updated.precio_total || 0));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        }
        setIsSaving(false);
    };

    const handleMarcarListo = async () => {
        if (!order) return;
        if (user?.role !== 'admin') return;

        setIsSaving(true);
        const now = new Date().toISOString();
        const updated = await actualizarOrden(order.id, {
            estado: 'completada',
            fecha_lista: now,
            fecha_completada: now,
        });
        if (updated) {
            console.log('✅ Orden actualizada:', updated);
            setOrder(updated);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } else {
            console.error('❌ Error: No se pudo actualizar la orden');
            alert('Error al actualizar el estado. Por favor intenta de nuevo.');
        }
        setIsSaving(false);
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!Number.isFinite(orderId)) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400 mb-4">Selecciona una orden</p>
                <Link href="/admin/ordenes">
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                        Volver a órdenes
                    </Button>
                </Link>
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
            {saveSuccess && (
                <div className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Cambios guardados
                    </div>
                </div>
            )}
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
                    <Button onClick={handleDownloadPDF} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                        <Download className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">PDF</span>
                    </Button>
                    <Button onClick={handlePrint} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Imprimir Orden</span>
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white">Detalles de la Orden</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Patente</span>
                        <span className="font-mono font-bold text-white">{order.patente_vehiculo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Vehículo</span>
                        <span className="text-white">{vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-'}</span>
                    </div>
                    {user?.role === 'admin' ? (
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
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Estado</span>
                            <Badge className="bg-slate-700/50 text-slate-200 border border-slate-600">{order.estado}</Badge>
                        </div>
                    )}
                    {user?.role === 'admin' ? (
                        <>
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
                                    value={precioFinal}
                                    onChange={(e) => setPrecioFinal(e.target.value)}
                                    onBlur={() => setPrecioFinal(formatPrecio(parsePrecio(precioFinal)))}
                                    inputMode="numeric"
                                    className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-lg font-semibold"
                                    placeholder="15000"
                                />
                                <p className="text-xs text-slate-400">Precio en pesos chilenos</p>
                            </div>

                            <Button
                                onClick={handleGuardarTodo}
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
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Precio Final</span>
                                <span className="text-white font-bold">${(order.precio_total || 0).toLocaleString('es-CL')}</span>
                            </div>
                            <div className="pt-2">
                                <p className="text-slate-400 text-sm mb-1">Motivo</p>
                                <p className="text-white whitespace-pre-wrap">{order.descripcion_ingreso}</p>
                            </div>
                        </>
                    )}

                    {order.detalles_vehiculo ? (
                        <div className="pt-2">
                            <p className="text-slate-400 text-sm mb-1">Detalles del Vehículo</p>
                            <p className="text-white whitespace-pre-wrap">{order.detalles_vehiculo}</p>
                        </div>
                    ) : null}

                    {order.fotos?.length ? (
                        <div className="pt-2">
                            <p className="text-slate-400 text-sm mb-2">Imágenes</p>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {order.fotos.map((src, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => window.open(src, '_blank')}
                                        className="rounded-xl border border-slate-700 bg-slate-800/30 p-2 hover:bg-slate-800/50"
                                    >
                                        <img src={src} alt={`foto-${idx}`} className="h-28 w-full rounded-lg object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
