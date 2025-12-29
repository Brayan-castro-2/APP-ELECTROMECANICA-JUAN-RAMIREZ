'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { buscarVehiculoPorPatente, crearOrden, crearVehiculo } from '@/lib/supabase-service';
import { getVehicleData } from '@/lib/patent-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Car,
    Search,
    Camera,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles
} from 'lucide-react';

// Servicios disponibles según el formulario del cliente
const SERVICIOS = [
    { id: 'dpf_electronico', label: 'DPF ELECTRÓNICO', requiresValue: true },
    { id: 'dpf_fisico', label: 'DPF FÍSICO', requiresValue: true },
    { id: 'scaner', label: 'SCANER', requiresValue: true },
    { id: 'km', label: 'KM', requiresValue: true, requiresKmData: true },
    { id: 'adblue_off', label: 'ADBLUE OFF', requiresValue: true },
    { id: 'otro', label: 'OTRO', requiresValue: true, requiresDescription: true },
];

export default function RecepcionPage() {
    const { user } = useAuth();

    // Datos del cliente
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteTelefono, setClienteTelefono] = useState('');

    // Estado del vehículo
    const [patente, setPatente] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [cc, setCC] = useState(''); // Cilindrada
    const [anio, setAnio] = useState('');

    // Servicios seleccionados (checklist)
    const [serviciosSeleccionados, setServiciosSeleccionados] = useState<Record<string, boolean>>({});
    const [valoresServicios, setValoresServicios] = useState<Record<string, string>>({});
    
    // Campos condicionales
    const [kmActual, setKmActual] = useState('');
    const [kmNuevo, setKmNuevo] = useState('');
    const [otroDescripcion, setOtroDescripcion] = useState('');
    
    // Detalles del vehículo al ingreso
    const [detallesIngreso, setDetallesIngreso] = useState('');
    
    // Fotos
    const [fotos, setFotos] = useState<File[]>([]);

    // Estado de UI
    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePatenteLookup = async () => {
        if (!patente.trim()) return;

        setIsSearching(true);
        setSearchStatus('idle');

        try {
            // 1. Buscar en base de datos local
            const vehiculo = await buscarVehiculoPorPatente(patente);

            if (vehiculo) {
                setMarca(vehiculo.marca || '');
                setModelo(vehiculo.modelo || '');
                setAnio(vehiculo.anio || '');
                setSearchStatus('found');
            } else {
                // 2. Si no existe, buscar en API Externa
                const apiData = await getVehicleData(patente);
                
                if (apiData) {
                    setMarca(apiData.marca);
                    setModelo(apiData.modelo);
                    setAnio(apiData.anio);
                    setSearchStatus('found');
                } else {
                    setSearchStatus('not_found');
                }
            }
        } catch {
            setSearchStatus('not_found');
        } finally {
            setIsSearching(false);
        }
    };

    const handleServicioToggle = (servicioId: string, checked: boolean) => {
        setServiciosSeleccionados(prev => ({
            ...prev,
            [servicioId]: checked
        }));
        
        // Limpiar valores si se desmarca
        if (!checked) {
            setValoresServicios(prev => {
                const newValues = { ...prev };
                delete newValues[servicioId];
                return newValues;
            });
            
            if (servicioId === 'km') {
                setKmActual('');
                setKmNuevo('');
            }
            if (servicioId === 'otro') {
                setOtroDescripcion('');
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFotos(Array.from(e.target.files));
        }
    };

    const resetForm = () => {
        setClienteNombre('');
        setClienteTelefono('');
        setPatente('');
        setMarca('');
        setModelo('');
        setCC('');
        setAnio('');
        setServiciosSeleccionados({});
        setValoresServicios({});
        setKmActual('');
        setKmNuevo('');
        setOtroDescripcion('');
        setDetallesIngreso('');
        setFotos([]);
        setSearchStatus('idle');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!patente || !clienteNombre || !clienteTelefono) {
            alert('Por favor completa los datos del cliente y la patente');
            return;
        }

        const serviciosActivos = Object.keys(serviciosSeleccionados).filter(k => serviciosSeleccionados[k]);
        if (serviciosActivos.length === 0) {
            alert('Por favor selecciona al menos un servicio');
            return;
        }

        setIsSubmitting(true);

        try {
            // Crear vehículo si no existe
            if (searchStatus !== 'found') {
                await crearVehiculo({
                    patente: patente.toUpperCase(),
                    marca: marca || 'Sin datos',
                    modelo: modelo || 'Sin datos',
                    anio: anio || String(new Date().getFullYear()),
                    color: 'Sin datos',
                    cliente_id: null,
                });
            }

            // Construir descripción de servicios
            let descripcionServicios = 'SERVICIOS SOLICITADOS:\n';
            serviciosActivos.forEach(servicioId => {
                const servicio = SERVICIOS.find(s => s.id === servicioId);
                if (servicio) {
                    descripcionServicios += `- ${servicio.label}`;
                    if (valoresServicios[servicioId]) {
                        descripcionServicios += ` (Valor: $${valoresServicios[servicioId]})`;
                    }
                    descripcionServicios += '\n';
                }
            });

            if (serviciosSeleccionados['km']) {
                descripcionServicios += `  KM Actual: ${kmActual}, KM Nuevo: ${kmNuevo}\n`;
            }
            if (serviciosSeleccionados['otro']) {
                descripcionServicios += `  Descripción: ${otroDescripcion}\n`;
            }
            if (detallesIngreso) {
                descripcionServicios += `\nDETALLES AL INGRESO:\n${detallesIngreso}`;
            }

            const orden = await crearOrden({
                patente_vehiculo: patente.toUpperCase(),
                descripcion_ingreso: descripcionServicios,
                creado_por: user?.id || '',
                estado: 'pendiente',
                fotos: [],
                cliente_nombre: clienteNombre,
                cliente_telefono: clienteTelefono,
            });

            if (!orden) {
                throw new Error('Error al crear orden');
            }

            setCreatedOrderId(orden.id);
            setSubmitSuccess(true);
            resetForm();

            setTimeout(() => {
                setSubmitSuccess(false);
                setCreatedOrderId(null);
            }, 5000);
        } catch (error) {
            console.error('Error al registrar:', error);
            alert('Error al crear la orden. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Success Toast */}
            {submitSuccess && (
                <div className="fixed top-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50 animate-in fade-in slide-in-from-top-5 duration-300">
                    <div className="bg-[#1a1a1a] border border-[#0066FF]/30 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-[#0066FF]/20 flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#0066FF]/20 rounded-full flex items-center justify-center border border-[#0066FF]/50">
                            <CheckCircle2 className="w-6 h-6 text-[#0066FF]" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">¡Orden #{createdOrderId} Creada!</p>
                            <p className="text-sm text-gray-400">Vehículo ingresado exitosamente</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-[#0066FF] rounded-xl flex items-center justify-center">
                        <Car className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">Orden de Servicio</h1>
                        <p className="text-sm text-gray-400">Registro de ingreso de vehículos</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* DATOS CLIENTE */}
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#333333] p-5">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-[#333333] pb-2">DATOS CLIENTE</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-300 text-sm mb-2 block">NOMBRE: *</Label>
                            <Input
                                type="text"
                                value={clienteNombre}
                                onChange={(e) => setClienteNombre(e.target.value)}
                                placeholder="Nombre completo del cliente"
                                className="h-12 bg-[#121212] border-[#333333] text-white rounded-xl focus:border-[#0066FF] focus:shadow-[0_0_15px_rgba(0,102,255,0.2)] transition-all"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-gray-300 text-sm mb-2 block">TELÉFONO: *</Label>
                            <Input
                                type="tel"
                                value={clienteTelefono}
                                onChange={(e) => setClienteTelefono(e.target.value)}
                                placeholder="+56912345678"
                                className="h-12 bg-[#121212] border-[#333333] text-white rounded-xl focus:border-[#0066FF] focus:shadow-[0_0_15px_rgba(0,102,255,0.2)] transition-all"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* VEHÍCULO INGRESADO */}
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#333333] p-5">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-[#333333] pb-2">VEHÍCULO INGRESADO</h3>
                    
                    {/* Patente con búsqueda */}
                    <div className="mb-4">
                        <Label className="text-gray-300 text-sm mb-2 block">PATENTE *</Label>
                        <div className="flex gap-3">
                            <Input
                                type="text"
                                value={patente}
                                onChange={(e) => setPatente(e.target.value.toUpperCase())}
                                onBlur={handlePatenteLookup}
                                placeholder="ABCD12"
                                className="h-14 text-xl font-mono font-bold tracking-[0.3em] text-center bg-[#121212] border-[#333333] text-white rounded-xl focus:border-[#0066FF] focus:shadow-[0_0_20px_rgba(0,102,255,0.3)] transition-all"
                                maxLength={6}
                                required
                            />
                            <Button
                                type="button"
                                onClick={handlePatenteLookup}
                                disabled={isSearching || !patente}
                                className="h-14 w-14 bg-[#0066FF] hover:bg-[#0052CC] rounded-xl"
                            >
                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            </Button>
                        </div>
                        {searchStatus === 'found' && (
                            <p className="text-green-400 text-sm mt-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Vehículo encontrado en base de datos
                            </p>
                        )}
                        {searchStatus === 'not_found' && (
                            <p className="text-amber-400 text-sm mt-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> No encontrado - completa los datos manualmente
                            </p>
                        )}
                    </div>

                    {/* Datos del vehículo */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                            <Label className="text-gray-300 text-xs mb-1 block">MARCA</Label>
                            <Input
                                value={marca}
                                onChange={(e) => setMarca(e.target.value)}
                                className="h-10 bg-[#121212] border-[#333333] text-white rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-300 text-xs mb-1 block">MODELO</Label>
                            <Input
                                value={modelo}
                                onChange={(e) => setModelo(e.target.value)}
                                className="h-10 bg-[#121212] border-[#333333] text-white rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-300 text-xs mb-1 block">CC</Label>
                            <Input
                                value={cc}
                                onChange={(e) => setCC(e.target.value)}
                                placeholder="1600"
                                className="h-10 bg-[#121212] border-[#333333] text-white rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-300 text-xs mb-1 block">AÑO</Label>
                            <Input
                                value={anio}
                                onChange={(e) => setAnio(e.target.value)}
                                placeholder="2020"
                                className="h-10 bg-[#121212] border-[#333333] text-white rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-300 text-xs mb-1 block">FECHA INGRESO</Label>
                            <Input
                                value={new Date().toLocaleDateString('es-CL')}
                                disabled
                                className="h-10 bg-[#121212] border-[#333333] text-gray-400 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* CHECKLIST DE SERVICIOS */}
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#333333] p-5">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-[#333333] pb-2">SERVICIOS SOLICITADOS</h3>
                    <div className="space-y-4">
                        {SERVICIOS.map((servicio) => (
                            <div key={servicio.id} className="space-y-2">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id={servicio.id}
                                            checked={serviciosSeleccionados[servicio.id] || false}
                                            onCheckedChange={(checked) => handleServicioToggle(servicio.id, checked as boolean)}
                                            className="border-[#0066FF] data-[state=checked]:bg-[#0066FF]"
                                        />
                                        <Label htmlFor={servicio.id} className="text-white font-medium cursor-pointer">
                                            {servicio.label}
                                        </Label>
                                    </div>
                                    {servicio.requiresValue && serviciosSeleccionados[servicio.id] && (
                                        <Input
                                            type="number"
                                            placeholder="Valor $"
                                            value={valoresServicios[servicio.id] || ''}
                                            onChange={(e) => setValoresServicios(prev => ({
                                                ...prev,
                                                [servicio.id]: e.target.value
                                            }))}
                                            className="w-32 h-10 bg-[#121212] border-[#333333] text-white rounded-lg"
                                        />
                                    )}
                                </div>

                                {/* Campo condicional para KM */}
                                {servicio.id === 'km' && serviciosSeleccionados['km'] && (
                                    <div className="ml-8 grid grid-cols-2 gap-3 bg-[#121212] p-3 rounded-lg">
                                        <div>
                                            <Label className="text-gray-400 text-xs mb-1 block">KM Actual</Label>
                                            <Input
                                                type="number"
                                                value={kmActual}
                                                onChange={(e) => setKmActual(e.target.value)}
                                                placeholder="50000"
                                                className="h-10 bg-[#0a0a0a] border-[#333333] text-white rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-400 text-xs mb-1 block">KM Nuevo</Label>
                                            <Input
                                                type="number"
                                                value={kmNuevo}
                                                onChange={(e) => setKmNuevo(e.target.value)}
                                                placeholder="60000"
                                                className="h-10 bg-[#0a0a0a] border-[#333333] text-white rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Campo condicional para OTRO */}
                                {servicio.id === 'otro' && serviciosSeleccionados['otro'] && (
                                    <div className="ml-8 bg-[#121212] p-3 rounded-lg">
                                        <Label className="text-gray-400 text-xs mb-1 block">Descripción del servicio</Label>
                                        <Textarea
                                            value={otroDescripcion}
                                            onChange={(e) => setOtroDescripcion(e.target.value)}
                                            placeholder="Describe el servicio requerido..."
                                            className="min-h-[80px] bg-[#0a0a0a] border-[#333333] text-white rounded-lg resize-none"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* DETALLES DEL VEHÍCULO AL INGRESO */}
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#333333] p-5">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-[#333333] pb-2">DETALLES DEL VEHÍCULO AL INGRESO</h3>
                    <Textarea
                        value={detallesIngreso}
                        onChange={(e) => setDetallesIngreso(e.target.value)}
                        placeholder="Describe el estado del vehículo, observaciones, daños previos, etc..."
                        className="min-h-[120px] bg-[#121212] border-[#333333] text-white rounded-xl resize-none focus:border-[#0066FF] focus:shadow-[0_0_15px_rgba(0,102,255,0.2)] transition-all"
                    />
                </div>

                {/* FOTOS */}
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#333333] p-5">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-[#333333] pb-2">FOTOGRAFÍAS</h3>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="fotos"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-12 border-[#333333] bg-[#121212] text-gray-300 hover:bg-[#242424] rounded-xl"
                    >
                        <Camera className="w-5 h-5 mr-2" />
                        Agregar Fotos del Vehículo
                        {fotos.length > 0 && (
                            <Badge className="ml-2 bg-[#0066FF] text-white">{fotos.length}</Badge>
                        )}
                    </Button>
                </div>

                {/* BOTÓN GENERAR ORDEN */}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-16 bg-[#0066FF] hover:bg-[#0052CC] text-white text-lg font-bold rounded-2xl shadow-xl shadow-[#0066FF]/25 disabled:opacity-50 transition-all"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                            Generando Orden...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-6 h-6 mr-3" />
                            GENERAR ORDEN DE SERVICIO
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
