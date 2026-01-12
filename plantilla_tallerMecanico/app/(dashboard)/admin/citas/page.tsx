'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase, CitaDB } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, User, Phone, Car, Wrench, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NewBadge } from '@/components/new-badge';
import { FEATURE_FLAGS } from '@/config/modules';

export default function CitasPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [fecha, setFecha] = useState('');
    const [hora, setHora] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteTelefono, setClienteTelefono] = useState('');
    const [patente, setPatente] = useState('');
    const [servicio, setServicio] = useState('');
    const [notas, setNotas] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch citas
    const { data: citas = [], isLoading } = useQuery({
        queryKey: ['citas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('citas')
                .select('*')
                .order('fecha', { ascending: true });
            
            if (error) throw error;
            return data as CitaDB[];
        },
    });

    // Create cita mutation
    const createCita = useMutation({
        mutationFn: async (newCita: Partial<CitaDB>) => {
            const { data, error } = await supabase
                .from('citas')
                .insert([newCita])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['citas'] });
            resetForm();
        },
    });

    const resetForm = () => {
        setFecha('');
        setHora('');
        setClienteNombre('');
        setClienteTelefono('');
        setPatente('');
        setServicio('');
        setNotas('');
    };

    const handleGuardar = async () => {
        if (!fecha || !hora) {
            alert('Por favor ingresa fecha y hora');
            return;
        }

        setIsSaving(true);
        try {
            const fechaCompleta = `${fecha}T${hora}:00`;
            await createCita.mutateAsync({
                fecha: fechaCompleta,
                cliente_nombre: clienteNombre || null,
                cliente_telefono: clienteTelefono || null,
                patente_vehiculo: patente || null,
                servicio_solicitado: servicio || null,
                notas: notas || null,
                estado: 'pendiente',
                creado_por: user?.id,
            });
            alert('✅ Cita agendada exitosamente');
        } catch (error) {
            console.error('Error al crear cita:', error);
            alert('Error al agendar cita');
        } finally {
            setIsSaving(false);
        }
    };

    const citasPendientes = citas.filter(c => c.estado === 'pendiente');
    const citasHoy = citasPendientes.filter(c => {
        const citaDate = new Date(c.fecha);
        const today = new Date();
        return citaDate.toDateString() === today.toDateString();
    });

    return (
        <div className="space-y-6 px-4 md:px-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-700 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg md:text-2xl font-bold text-white">Agendamiento de Citas</h1>
                        {FEATURE_FLAGS.showNewBadges && <NewBadge />}
                    </div>
                    <p className="text-xs md:text-sm text-slate-400">Gestiona las citas programadas</p>
                </div>
            </div>

            {/* Nueva Cita Form */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-white mb-4">📅 Nueva Cita</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Fecha
                            </label>
                            <Input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Hora
                            </label>
                            <Input
                                type="time"
                                value={hora}
                                onChange={(e) => setHora(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Cliente
                            </label>
                            <Input
                                value={clienteNombre}
                                onChange={(e) => setClienteNombre(e.target.value)}
                                placeholder="Nombre del cliente"
                                className="bg-slate-700/50 border-slate-600 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Teléfono
                            </label>
                            <Input
                                value={clienteTelefono}
                                onChange={(e) => setClienteTelefono(e.target.value)}
                                placeholder="+56912345678"
                                className="bg-slate-700/50 border-slate-600 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Car className="w-4 h-4" />
                                Patente
                            </label>
                            <Input
                                value={patente}
                                onChange={(e) => setPatente(e.target.value.toUpperCase())}
                                placeholder="ABCD12"
                                maxLength={6}
                                className="bg-slate-700/50 border-slate-600 text-white font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Wrench className="w-4 h-4" />
                                Servicio
                            </label>
                            <Input
                                value={servicio}
                                onChange={(e) => setServicio(e.target.value)}
                                placeholder="Ej: Cambio de aceite"
                                className="bg-slate-700/50 border-slate-600 text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-slate-300 mb-2">Notas</label>
                            <textarea
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                placeholder="Notas adicionales..."
                                rows={3}
                                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleGuardar}
                        disabled={isSaving}
                        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white w-full md:w-auto"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Agendar Cita
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Citas de Hoy */}
            {citasHoy.length > 0 && (
                <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30">
                    <CardContent className="pt-6">
                        <h2 className="text-lg font-semibold text-white mb-4">📅 Citas de Hoy ({citasHoy.length})</h2>
                        <div className="space-y-3">
                            {citasHoy.map((cita) => (
                                <div key={cita.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock className="w-4 h-4 text-blue-400" />
                                                <span className="text-white font-semibold">
                                                    {new Date(cita.fecha).toLocaleTimeString('es-CL', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            {cita.cliente_nombre && (
                                                <p className="text-sm text-slate-300">👤 {cita.cliente_nombre}</p>
                                            )}
                                            {cita.patente_vehiculo && (
                                                <p className="text-sm text-slate-400">🚗 {cita.patente_vehiculo}</p>
                                            )}
                                            {cita.servicio_solicitado && (
                                                <p className="text-sm text-slate-400">🔧 {cita.servicio_solicitado}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Todas las Citas Pendientes */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Próximas Citas ({citasPendientes.length})</h2>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : citasPendientes.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No hay citas pendientes</p>
                    ) : (
                        <div className="space-y-3">
                            {citasPendientes.map((cita) => (
                                <div key={cita.id} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar className="w-4 h-4 text-purple-400" />
                                                <span className="text-white font-semibold">
                                                    {new Date(cita.fecha).toLocaleDateString('es-CL', {
                                                        weekday: 'long',
                                                        day: '2-digit',
                                                        month: 'long',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            {cita.cliente_nombre && (
                                                <p className="text-sm text-slate-300">👤 {cita.cliente_nombre}</p>
                                            )}
                                            {cita.cliente_telefono && (
                                                <p className="text-sm text-slate-400">📞 {cita.cliente_telefono}</p>
                                            )}
                                            {cita.patente_vehiculo && (
                                                <p className="text-sm text-slate-400">🚗 {cita.patente_vehiculo}</p>
                                            )}
                                            {cita.servicio_solicitado && (
                                                <p className="text-sm text-slate-400">🔧 {cita.servicio_solicitado}</p>
                                            )}
                                            {cita.notas && (
                                                <p className="text-xs text-slate-500 mt-2">💬 {cita.notas}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
