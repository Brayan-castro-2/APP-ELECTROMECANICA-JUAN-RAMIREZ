'use client';

import { AlertTriangle, DollarSign, History, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrdenDB } from '@/lib/storage-adapter';
import { NewBadge } from '@/components/ui/new-badge';

interface DebtAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    patente: string;
    totalDebt: number;
    debtOrders: OrdenDB[];
    lastVisit?: {
        date: string;
        service: string;
    };
}

function formatCurrency(value: number): string {
    return `$${value.toLocaleString('es-CL')}`;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DebtAlertModal({
    isOpen,
    onClose,
    onProceed,
    patente,
    totalDebt,
    debtOrders,
    lastVisit,
}: DebtAlertModalProps) {
    if (!isOpen) return null;

    const hasDebt = totalDebt > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${hasDebt ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-900 border-slate-700'
                }`}>
                {/* Header */}
                <div className={`sticky top-0 ${hasDebt ? 'bg-red-900/40' : 'bg-slate-900'} border-b ${hasDebt ? 'border-red-500/30' : 'border-slate-700'
                    } p-6 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        {hasDebt ? (
                            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                        ) : (
                            <History className="w-6 h-6 text-blue-400" />
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-white">
                                    {hasDebt ? '⚠️ Alerta de Deuda' : 'Historial del Vehículo'}
                                </h2>
                                <NewBadge />
                            </div>
                            <p className="text-sm text-slate-400">
                                Patente: <span className="font-semibold text-white">{patente}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Debt Warning */}
                    {hasDebt && (
                        <div className="bg-red-500/10 border-2 border-red-500/50 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                                <DollarSign className="w-8 h-8 text-red-400 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-red-300 mb-2">
                                        Este vehículo tiene deudas pendientes
                                    </h3>
                                    <div className="text-3xl font-bold text-red-400 mb-3">
                                        {formatCurrency(totalDebt)}
                                    </div>
                                    <p className="text-sm text-red-200 mb-4">
                                        Se recomienda gestionar el pago antes de continuar con nuevos servicios.
                                    </p>

                                    {/* Debt Orders List */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-red-300 mb-2">
                                            ÓRDENES CON DEUDA:
                                        </p>
                                        {debtOrders.map((order) => {
                                            const debtAmount = order.metodos_pago
                                                ?.filter(mp => mp.metodo === 'debe')
                                                .reduce((acc, mp) => acc + mp.monto, 0) || 0;

                                            return (
                                                <div
                                                    key={order.id}
                                                    className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-sm"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-semibold text-white">Orden #{order.id}</span>
                                                            <span className="text-slate-400 ml-2">
                                                                {formatDate(order.fecha_ingreso)}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-red-300">{formatCurrency(debtAmount)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Last Visit Info */}
                    {lastVisit && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <History className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-white mb-1">Última Visita</h4>
                                    <p className="text-sm text-slate-300">
                                        <span className="text-blue-400 font-semibold">{formatDate(lastVisit.date)}</span>
                                        {' - '}
                                        {lastVisit.service}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!hasDebt && !lastVisit && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                            <p className="text-slate-400">
                                Este vehículo no tiene historial previo en el sistema.
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-6 flex gap-3">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => {
                            onProceed();
                            onClose();
                        }}
                        className={`flex-1 ${hasDebt
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {hasDebt ? 'Continuar de todas formas' : 'Continuar'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
