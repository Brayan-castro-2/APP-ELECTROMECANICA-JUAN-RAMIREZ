'use client';

import { Clock, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface VisitHistoryCardProps {
    lastVisitDate: string;
    lastService: string;
    totalVisits: number;
}

export function VisitHistoryCard({ lastVisitDate, lastService, totalVisits }: VisitHistoryCardProps) {
    return (
        <Card className="bg-blue-900/20 border-blue-500/30 mt-3">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-blue-300 mb-1">Historial del Vehículo</h3>
                        <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-slate-300">
                                <span className="text-slate-400">Última visita:</span>
                                <span className="font-medium">
                                    {new Date(lastVisitDate).toLocaleDateString('es-CL', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-start gap-2 text-slate-300">
                                <Wrench className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                                <span className="text-slate-400">Servicio:</span>
                                <span className="font-medium flex-1">{lastService}</span>
                            </div>
                            <div className="text-slate-400 pt-1">
                                Total de visitas: <span className="text-blue-400 font-semibold">{totalVisits}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
