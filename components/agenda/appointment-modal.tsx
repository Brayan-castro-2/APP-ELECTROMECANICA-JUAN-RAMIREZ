'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, User, Phone, Car, FileText, Clock, Search, Wrench, Gauge, Trash2 } from 'lucide-react';
import { CitaDB } from '@/lib/supabase';
import { crearCita, actualizarCita, buscarVehiculoPorPatente, crearVehiculo } from '@/lib/storage-adapter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NewBadge } from '@/components/ui/new-badge';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    appointment?: CitaDB | null;
    defaultDate?: Date;
    userId?: string;
}

const STATUS_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente', color: 'bg-yellow-500' },
    { value: 'confirmada', label: 'Confirmada', color: 'bg-blue-500' },
    { value: 'completada', label: 'Completada', color: 'bg-green-500' },
    { value: 'cancelada', label: 'Cancelada', color: 'bg-red-500' },
] as const;

const COMMON_SERVICES = [
    { id: 'dpf_elec', label: 'DPF Electrónico' },
    { id: 'dpf_fis', label: 'DPF Físico' },
    { id: 'scanner', label: 'Scanner' },
    { id: 'adblue', label: 'AdBlue OFF' },
    { id: 'regen', label: 'Regeneración' },
    { id: 'egr', label: 'EGR OFF' },
    { id: 'potencia', label: 'Potenciamiento' },
];


const parsePrecio = (v: string) => {
    const cleaned = String(v || '').replace(/[^0-9]/g, '');
    return cleaned ? Number(cleaned) : 0;
};

const moneyCL = (n: number) => {
    return (Number.isFinite(n) ? n : 0).toLocaleString('es-CL');
};

const formatMilesConPunto = (val: string) => {
    return val.replace(/\D/g, '')
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export function AppointmentModal({
    isOpen,
    onClose,
    onSave,
    appointment,
    defaultDate,
    userId,
}: AppointmentModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [fecha, setFecha] = useState(
        appointment?.fecha || defaultDate?.toISOString().slice(0, 16) || ''
    );
    const [clienteNombre, setClienteNombre] = useState(appointment?.cliente_nombre || '');
    const [clienteTelefono, setClienteTelefono] = useState(appointment?.cliente_telefono ? appointment.cliente_telefono.replace('+569', '') : '');

    // Vehicle State (Full inputs like Reception)
    const [patenteVehiculo, setPatenteVehiculo] = useState(appointment?.patente_vehiculo || '');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [anio, setAnio] = useState('');
    const [motor, setMotor] = useState(''); // Added motor
    const [isSearchingVehiculo, setIsSearchingVehiculo] = useState(false);
    const [vehiculoSearchStatus, setVehiculoSearchStatus] = useState('');

    const [notas, setNotas] = useState(appointment?.notas || '');
    const [estado, setEstado] = useState<CitaDB['estado']>(appointment?.estado || 'pendiente');

    // Services Table State
    const [servicios, setServicios] = useState<{ descripcion: string; precio: string }[]>([
        { descripcion: '', precio: '' }
    ]);
    const [kmEnabled, setKmEnabled] = useState(false);
    const [kmActual, setKmActual] = useState('');
    const [kmNuevo, setKmNuevo] = useState('');
    const [kmServiceIndex, setKmServiceIndex] = useState<number | null>(null);

    // Initialize state
    useEffect(() => {
        if (appointment) {
            // Recover services from string (basic)
            if (appointment.servicio_solicitado) {
                const parts = appointment.servicio_solicitado.split(', ');
                if (parts.length > 0) {
                    setServicios(parts.map(p => ({ descripcion: p, precio: '' })));
                } else {
                    setServicios([{ descripcion: appointment.servicio_solicitado, precio: '' }]);
                }
            }
            // Trigger search to fill vehicle details if existing
            if (appointment.patente_vehiculo) {
                buscarVehiculoPorPatente(appointment.patente_vehiculo).then(v => {
                    if (v) {
                        setMarca(v.marca);
                        setModelo(v.modelo);
                        setAnio(v.anio);
                        setMotor(v.motor || '');
                    }
                });
            }
        }
    }, [appointment]);

    // Update KM service row
    useEffect(() => {
        if (kmEnabled && kmActual && kmNuevo) {
            const descripcionKM = `KM: ${formatMilesConPunto(kmActual)} KM -> ${formatMilesConPunto(kmNuevo)} KM`;
            setServicios(prev => {
                const newServicios = [...prev];
                if (kmServiceIndex !== null && newServicios[kmServiceIndex]) {
                    newServicios[kmServiceIndex] = { ...newServicios[kmServiceIndex], descripcion: descripcionKM };
                } else {
                    const emptyIdx = newServicios.findIndex(s => !s.descripcion);
                    if (emptyIdx >= 0) {
                        newServicios[emptyIdx] = { descripcion: descripcionKM, precio: '' };
                        setKmServiceIndex(emptyIdx);
                    } else {
                        newServicios.push({ descripcion: descripcionKM, precio: '' });
                        setKmServiceIndex(newServicios.length - 1);
                    }
                }
                return newServicios;
            });
        }
    }, [kmEnabled, kmActual, kmNuevo, kmServiceIndex]);

    const handleBuscarPatente = async () => {
        if (patenteVehiculo.length < 5) return;
        setIsSearchingVehiculo(true);
        setVehiculoSearchStatus('Buscando...');
        try {
            const vehiculo = await buscarVehiculoPorPatente(patenteVehiculo);
            if (vehiculo) {
                setMarca(vehiculo.marca);
                setModelo(vehiculo.modelo);
                setAnio(vehiculo.anio);
                setMotor(vehiculo.motor || '');
                setVehiculoSearchStatus('✓ Vehículo encontrado');
            } else {
                setVehiculoSearchStatus('No encontrado (se creará nuevo)');
                // Keep fields empty or let user fill
                setMarca(''); setModelo(''); setAnio(''); setMotor('');
            }
        } catch (error) {
            console.error('Error buscando vehículo:', error);
            setVehiculoSearchStatus('Error en búsqueda');
        } finally {
            setIsSearchingVehiculo(false);
        }
    };

    const agregarServicioFrecuente = (nombre: string) => {
        setServicios(prev => {
            const lastIdx = prev.length - 1;
            if (prev[lastIdx].descripcion === '') {
                const newS = [...prev];
                newS[lastIdx] = { ...newS[lastIdx], descripcion: nombre };
                return newS;
            }
            return [...prev, { descripcion: nombre, precio: '' }];
        });
    };

    const updateServicio = (index: number, field: keyof typeof servicios[0], value: string) => {
        setServicios(prev => {
            const newS = [...prev];
            newS[index] = { ...newS[index], [field]: value };
            return newS;
        });
    };

    const eliminarFila = (index: number) => {
        if (index === kmServiceIndex) {
            setKmEnabled(false);
            setKmServiceIndex(null);
        }
        setServicios(prev => prev.filter((_, i) => i !== index));
    };

    const agregarFila = () => {
        setServicios(prev => [...prev, { descripcion: '', precio: '' }]);
    };

    const desactivarServicioKm = () => {
        setKmEnabled(false);
        setKmServiceIndex(null);
        // Remove the row logic handled by effect or manual? 
        // Effect handles update but removing row needs to be manual if we want immediate feedback
        // Or simpler: just standard delete row behavior
        // But for toggle:
        if (kmServiceIndex !== null) {
            eliminarFila(kmServiceIndex);
        }
    };

    const activarServicioKm = () => {
        setKmEnabled(true);
        // Will trigger effect to add row
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fecha) {
            alert('La fecha es obligatoria');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Guardar/Actualizar Vehículo (Upsert-like via API or helper)
            // Necesitamos guardar el vehículo para que los datos (Marca, Motor) persistan
            if (patenteVehiculo && marca) {
                await crearVehiculo({
                    patente: patenteVehiculo,
                    marca,
                    modelo,
                    anio,
                    motor,
                    color: '-'
                });
            }

            // 2. Preparar Datos Cita
            const validServices = servicios.filter(s => s.descripcion.trim());
            const shortSummaries = validServices.map(s => {
                const d = (s.descripcion || '').toUpperCase();
                if (d.includes('KM') || d.includes('KILOMETRAJE')) return 'KM';
                if (d.includes('DPF')) return 'DPF';
                if (d.includes('SCANNER')) return 'Scanner';
                if (d.includes('ADBLUE')) return 'AdBlue';
                if (d.includes('EGR')) return 'EGR';
                if (d.includes('REGENERACION') || d.includes('REGENERACIÓN')) return 'Regeneración';
                if (d.includes('POTENCIAMIENTO')) return 'Potenciamiento';
                return s.descripcion;
            });
            const servicioSolicitado = shortSummaries.join(', ');

            // Limpiar bloque previo y añadir detalle
            let cleanNotes = notas.replace(/Servicios Solicitados:[\s\S]*?(\n\n|$)/g, '').trim();
            // Also clean vehicle info if we are regenerating it
            cleanNotes = cleanNotes.replace(/\[Vehículo:[\s\S]*?\](\n|$)/g, '').trim();

            let finalNotas = cleanNotes;

            const detallesFinancieros = validServices.map(s => {
                return `- ${s.descripcion}${s.precio ? `: $${formatMilesConPunto(s.precio)}` : ''}`;
            }).join('\n');

            if (detallesFinancieros) {
                finalNotas = `Servicios Solicitados:\n${detallesFinancieros}\n\n${finalNotas}`;
            }

            if (marca || modelo) {
                const vehiculoInfo = `[Vehículo: ${marca} ${modelo} ${anio} ${motor ? '- ' + motor : ''}]`;
                finalNotas = `${vehiculoInfo}\n${finalNotas}`;
            }

            const whatsappCompleto = clienteTelefono ? `+569${clienteTelefono}` : null;

            const data = {
                fecha,
                cliente_nombre: clienteNombre || null,
                cliente_telefono: whatsappCompleto, // Store full format
                patente_vehiculo: patenteVehiculo || null,
                servicio_solicitado: servicioSolicitado || null,
                notas: finalNotas || null,
                estado,
            };

            if (appointment) {
                await actualizarCita(appointment.id, data);
            } else {
                await crearCita({
                    ...data,
                    creado_por: userId || null,
                });
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error al guardar la cita');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalEstimado = servicios.reduce((acc, curr) => acc + parsePrecio(curr.precio), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-slate-900/95 backdrop-blur border-b border-slate-800 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-blue-500" />
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {appointment ? 'Editar Cita' : 'Nueva Cita'}
                            </h2>
                            <p className="text-xs text-slate-400">Complete los datos igual que en recepción</p>
                        </div>
                        {!appointment && <NewBadge />}
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Fecha */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            Fecha de Cita
                        </label>
                        <input
                            type="datetime-local"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            required
                            className="w-full md:w-auto rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    {/* CLIENTE BLOCK */}
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                        <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200 uppercase">Cliente</div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-semibold text-slate-200">Nombre</label>
                                <input
                                    value={clienteNombre}
                                    onChange={(e) => setClienteNombre(e.target.value)}
                                    placeholder="Nombre del cliente"
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-200">WhatsApp</label>
                                <div className="relative mt-2">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                        <span className="text-slate-400">+569</span>
                                    </div>
                                    <input
                                        value={clienteTelefono}
                                        onChange={(e) => setClienteTelefono(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                                        placeholder="12345678"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-16 pr-4 text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* VEHICULO BLOCK */}
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                        <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200 uppercase">Vehículo</div>

                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end mb-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-200">Patente</label>
                                <input
                                    value={patenteVehiculo}
                                    onChange={(e) => setPatenteVehiculo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                    onBlur={handleBuscarPatente}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleBuscarPatente())}
                                    placeholder="AA-BB-11"
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 md:py-4 text-center font-mono text-xl md:text-2xl font-bold uppercase tracking-widest text-white"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleBuscarPatente}
                                disabled={isSearchingVehiculo}
                                className="h-[50px] md:h-[54px] rounded-xl bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSearchingVehiculo ? '...' : '🔍 Buscar'}
                            </button>
                        </div>
                        {vehiculoSearchStatus && <div className="text-sm text-slate-400 mb-4">{vehiculoSearchStatus}</div>}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-semibold text-slate-200">Marca</label>
                                <input value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ej: Toyota" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-200">Modelo</label>
                                <input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ej: Corolla" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-200">Año</label>
                                <input value={anio} onChange={e => setAnio(e.target.value)} placeholder="Ej: 2020" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-200">Motor</label>
                                <input value={motor} onChange={e => setMotor(e.target.value)} placeholder="Ej: 1.6" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* SERVICIOS BLOCK */}
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                        <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200 uppercase">Servicios</div>

                        <div className="mb-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => (kmEnabled ? desactivarServicioKm() : activarServicioKm())}
                                className={kmEnabled
                                    ? 'rounded-full border border-blue-500 bg-blue-600/30 px-3 py-2 text-sm font-semibold text-blue-100'
                                    : 'rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700'
                                }
                            >
                                🔘 KM
                            </button>
                            {COMMON_SERVICES.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => agregarServicioFrecuente(s.label)}
                                    className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                                >
                                    🔘 {s.label}
                                </button>
                            ))}
                        </div>

                        {kmEnabled && (
                            <div className="mb-4 grid gap-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4 md:grid-cols-2 animate-in slide-in-from-top-2">
                                <div>
                                    <label className="text-sm font-semibold text-slate-200">KM actual</label>
                                    <input
                                        value={formatMilesConPunto(kmActual)}
                                        onChange={(e) => setKmActual(e.target.value)}
                                        placeholder="Ej: 200.000"
                                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl font-bold font-mono tracking-wide text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-200">KM nuevo</label>
                                    <input
                                        value={formatMilesConPunto(kmNuevo)}
                                        onChange={(e) => setKmNuevo(e.target.value)}
                                        placeholder="Ej: 120.000"
                                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl font-bold font-mono tracking-wide text-white"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="overflow-hidden rounded-xl border border-slate-700 mb-4">
                            <table className="w-full">
                                <thead className="bg-slate-800/70">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-semibold tracking-widest text-slate-300">DESCRIPCIÓN</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold tracking-widest text-slate-300 w-[140px]">PRECIO ($)</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold tracking-widest text-slate-300 w-[100px]">ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {servicios.map((s, idx) => (
                                        <tr key={idx} className="bg-slate-900/40">
                                            <td className="px-3 py-3">
                                                <input
                                                    value={s.descripcion}
                                                    onChange={(e) => updateServicio(idx, 'descripcion', e.target.value)}
                                                    placeholder="Ej: Scanner"
                                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3 text-white"
                                                />
                                            </td>
                                            <td className="px-3 py-3">
                                                <input
                                                    value={s.precio}
                                                    onChange={(e) => updateServicio(idx, 'precio', e.target.value.replace(/\D/g, '').slice(0, 9))}
                                                    placeholder="0"
                                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3 text-white"
                                                />
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarFila(idx)}
                                                    className="rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white hover:bg-red-700"
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="text-xs font-semibold tracking-widest text-slate-300">TOTAL ESTIMADO</div>
                                <div className="text-2xl font-extrabold text-white">${moneyCL(totalEstimado)}</div>
                            </div>
                            <button
                                type="button"
                                onClick={agregarFila}
                                className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                            >
                                + Agregar Servicio
                            </button>
                        </div>
                    </div>

                    {/* NOTAS BLOCK */}
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                        <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200 uppercase">Información Adicional</div>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            placeholder="Notas internas..."
                            rows={3}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-500 resize-none"
                        />
                    </div>

                    {/* STATUS (Only if Editing) */}
                    {appointment && (
                        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                            <label className="text-sm font-semibold text-slate-200 mb-2 block">Estado</label>
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setEstado(option.value)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${estado === option.value
                                            ? `${option.color} text-white shadow-lg`
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 py-6"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 py-6 font-bold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : appointment ? 'Actualizar Cita' : 'Crear Cita'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
