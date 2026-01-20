'use client';

import { useMemo, useState } from 'react';
import { OrdenDB } from '@/lib/storage-adapter';
import { DollarSign, AlertTriangle, ChevronDown, ChevronRight, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
// import { NewBadge } from '@/components/ui/new-badge';
// import { FEATURE_FLAGS } from '@/config/modules';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface DebtSummaryCardProps {
    orders: OrdenDB[];
}

function formatCurrency(value: number): string {
    return `$${value.toLocaleString('es-CL')}`;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DebtSummaryCard({ orders }: DebtSummaryCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    const debtData = useMemo(() => {
        const pendingOrders = orders.filter(order => {
            // Órdenes con deuda son las que tienen método de pago "debe"
            return order.metodos_pago?.some(mp => mp.metodo === 'debe');
        });

        const ordersWithDebt = pendingOrders.map(order => {
            const debtAmount = order.metodos_pago
                ?.filter(mp => mp.metodo === 'debe')
                .reduce((acc, mp) => acc + mp.monto, 0) || 0;

            return {
                ...order,
                debtAmount,
            };
        }).sort((a, b) => b.debtAmount - a.debtAmount); // Sort by debt amount descending

        const totalDebt = ordersWithDebt.reduce((sum, order) => sum + order.debtAmount, 0);

        return {
            totalDebt,
            debtCount: ordersWithDebt.length,
            orders: ordersWithDebt,
        };
    }, [orders]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                <CollapsibleTrigger className="w-full p-6 text-left">
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                Total por Cobrar
                            </h3>
                            <div className="flex items-center gap-2">
                                {debtData.debtCount > 0 && (
                                    <span className="text-xs text-slate-400">
                                        Click para {isOpen ? 'ocultar' : 'ver'} detalles
                                    </span>
                                )}
                                {isOpen ? (
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Total Amount */}
                            <div>
                                <div className="text-4xl font-bold text-red-400 mb-1">
                                    {formatCurrency(debtData.totalDebt)}
                                </div>
                                <p className="text-sm text-slate-400">
                                    En {debtData.debtCount} {debtData.debtCount === 1 ? 'orden' : 'órdenes'}
                                </p>
                            </div>

                            {/* Warning Message */}
                            {debtData.totalDebt > 0 && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <DollarSign className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-red-200">
                                            Hay clientes con pagos pendientes. Revisa las órdenes marcadas con &quot;Debe&quot;.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {debtData.totalDebt === 0 && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                    <p className="text-xs text-green-200 text-center">
                                        ✓ No hay deudas pendientes
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="px-6 pb-6 pt-2">
                        <div className="border-t border-red-500/20 pt-4">
                            <h4 className="text-sm font-semibold text-white mb-3">Órdenes con Deuda</h4>

                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {debtData.orders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-semibold text-white">
                                                        Orden #{order.id}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {order.patente_vehiculo}
                                                    </span>
                                                </div>

                                                {order.cliente_nombre && (
                                                    <p className="text-xs text-slate-400 mb-1">
                                                        Cliente: {order.cliente_nombre}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span>{formatDate(order.fecha_ingreso)}</span>
                                                    <span>•</span>
                                                    <span className="font-semibold text-red-400">
                                                        Debe: {formatCurrency(order.debtAmount)}
                                                    </span>
                                                </div>
                                            </div>

                                            <Link href={`/admin/ordenes/clean?id=${order.id}`} prefetch>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-red-500/30 text-red-300 hover:bg-red-500/10 flex-shrink-0"
                                                >
                                                    <Edit className="w-3 h-3 mr-1" />
                                                    Editar
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
