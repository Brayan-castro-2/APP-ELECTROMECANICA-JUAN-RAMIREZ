'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CitaDB } from '@/lib/supabase'; // Asegúrate de que este import sea correcto, o usa CitaDB de storage-adapter
import { obtenerCitasHoy } from '@/lib/storage-adapter';

// Ajustar interfaz si es necesario
interface CitaDisplay extends CitaDB {
    minutesUntil: number;
}

export function UpcomingAppointments() {
    const router = useRouter();
    const [upcoming, setUpcoming] = useState<CitaDisplay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUpcoming();
        // Refresh every minute
        const interval = setInterval(loadUpcoming, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadUpcoming = async () => {
        try {
            const citas = await obtenerCitasHoy();
            const now = new Date();

            // Filter pending appointments within next 4 hours
            const next = citas
                .filter(c => c.estado === 'pendiente')
                .map(c => {
                    const citaDate = new Date(c.fecha);
                    const diffMs = citaDate.getTime() - now.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    return { ...c, minutesUntil: diffMins };
                })
                .filter(c => c.minutesUntil >= -30 && c.minutesUntil <= 240) // Show from 30 mins ago up to 4 hours ahead
                .sort((a, b) => a.minutesUntil - b.minutesUntil);

            setUpcoming(next);
        } catch (error) {
            console.error('Error loading upcoming appointments', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || upcoming.length === 0) return null;

    return (
        <Card className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-500/30 p-4 mb-6 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-md">Próximas Citas</h3>
                <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {upcoming.length}
                </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((cita) => (
                    <div
                        key={cita.id}
                        className="bg-slate-900/60 border border-indigo-500/20 rounded-lg p-3 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-white font-semibold truncate block max-w-[120px]">
                                    {cita.cliente_nombre || 'Cliente sin nombre'}
                                </span>
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${cita.minutesUntil < 0 ? 'bg-red-900/50 text-red-300' :
                                    cita.minutesUntil < 30 ? 'bg-amber-900/50 text-amber-300' :
                                        'bg-slate-800 text-slate-400'
                                    }`}>
                                    {cita.minutesUntil < 0 ? 'Atrasada' :
                                        cita.minutesUntil === 0 ? 'Ahora' :
                                            `en ${cita.minutesUntil}m`}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                <span className="uppercase text-slate-500 font-bold">{cita.patente_vehiculo || '---'}</span>
                                <span>• {new Date(cita.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {cita.servicio_solicitado && (
                                <p className="text-xs text-indigo-200/80 truncate mb-3">
                                    {cita.servicio_solicitado}
                                </p>
                            )}
                        </div>

                        <Button
                            className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                            onClick={() => router.push(`/recepcion?citaId=${cita.id}`)}
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1.5" />
                            Confirmar Llegada
                        </Button>
                    </div>
                ))}
            </div>
        </Card>
    );
}
