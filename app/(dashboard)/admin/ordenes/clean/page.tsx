'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { actualizarOrden, buscarVehiculoPorPatente, obtenerOrdenPorId, type OrdenDB, type VehiculoDB } from '@/lib/storage-adapter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, Download, Loader2, Printer } from 'lucide-react';
import Link from 'next/link';

export default function OrdenesCleanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();

    const orderIdParam = searchParams.get('id');
    const orderId = Number(orderIdParam);

    const [order, setOrder] = useState<OrdenDB | null>(null);
    const [vehiculo, setVehiculo] = useState<VehiculoDB | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [precioFinal, setPrecioFinal] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

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
            const ordenData = await obtenerOrdenPorId(orderId);
            setOrder(ordenData);
            if (ordenData) {
                setPrecioFinal(formatPrecio(ordenData.precio_total || 0));
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

    const handleGuardarPrecio = async () => {
        if (!order) return;
        if (user?.role !== 'admin') return;

        setIsSaving(true);
        const updated = await actualizarOrden(order.id, {
            precio_total: parsePrecio(precioFinal),
        });
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
                        <div className="flex items-center gap-2">
                            <Badge className="bg-slate-700/50 text-slate-200 border border-slate-600">{order.estado}</Badge>
                            {user?.role === 'admin' && order.estado !== 'completada' ? (
                                <Button
                                    size="sm"
                                    onClick={handleMarcarListo}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Listo'}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Precio Final</span>
                        {user?.role === 'admin' ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center">
                                    <span className="text-slate-300 mr-2">$</span>
                                    <Input
                                        value={precioFinal}
                                        onChange={(e) => setPrecioFinal(e.target.value)}
                                        onBlur={() => setPrecioFinal(formatPrecio(parsePrecio(precioFinal)))}
                                        inputMode="numeric"
                                        className="w-36 bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleGuardarPrecio}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                                </Button>
                            </div>
                        ) : (
                            <span className="text-white font-bold">${(order.precio_total || 0).toLocaleString('es-CL')}</span>
                        )}
                    </div>
                    <div className="pt-2">
                        <p className="text-slate-400 text-sm mb-1">Motivo</p>
                        <p className="text-white whitespace-pre-wrap">{order.descripcion_ingreso}</p>
                    </div>

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
