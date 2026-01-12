'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'electromecanica_v2_seen';

export function UpdateAnnouncement() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Verificar si ya vio el anuncio
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            // Pequeño delay para no chocar con render inicial
            const timer = setTimeout(() => setOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setOpen(false);
        localStorage.setItem(STORAGE_KEY, 'true');
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose();
        }}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl shadow-blue-500/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Rocket className="w-6 h-6 text-white" />
                        </div>
                        Actualización 2.0
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-base pt-2">
                        ¡Bienvenido a la nueva versión de Electromecánica JR!
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-6">
                    <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                        <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-1">Alertas de Morosidad</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Sistema automático que detecta y alerta sobre clientes con deuda pendiente.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                        <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
                            <Calendar className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-1">Nueva Agenda Visual</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Calendario interactivo para gestionar citas, bloqueos y disponibilidad.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                        <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-1">Analítica Avanzada</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Dashboard con métricas clave de ingresos, servicios y rendimiento.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between gap-4">
                    <p className="text-xs text-slate-500 self-center hidden sm:block">
                        Versión 2.0 - Enero 2026
                    </p>
                    <Button
                        onClick={handleClose}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-8"
                    >
                        ¡Entendido, vamos!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
