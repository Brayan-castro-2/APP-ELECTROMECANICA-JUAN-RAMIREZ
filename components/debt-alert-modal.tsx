'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DebtAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    debtAmount: number;
    clientName?: string;
}

export function DebtAlertModal({ isOpen, onClose, onProceed, debtAmount, clientName }: DebtAlertModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-red-900/90 to-orange-900/90 border-2 border-red-500 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">⚠️ CLIENTE MOROSO</h2>
                            {clientName && <p className="text-sm text-red-200">{clientName}</p>}
                        </div>
                    </div>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-red-800/50 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="bg-black/30 rounded-xl p-4 mb-6">
                    <p className="text-white text-center mb-2">Posee una deuda pendiente de:</p>
                    <p className="text-4xl font-bold text-red-300 text-center">
                        ${debtAmount.toLocaleString('es-CL')}
                    </p>
                </div>

                <p className="text-white/90 text-sm mb-6 text-center">
                    Se recomienda gestionar el pago de la deuda anterior antes de proceder con un nuevo servicio.
                </p>

                <div className="flex gap-3">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onProceed}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                    >
                        Proceder de Todas Formas
                    </Button>
                </div>
            </div>
        </div>
    );
}
