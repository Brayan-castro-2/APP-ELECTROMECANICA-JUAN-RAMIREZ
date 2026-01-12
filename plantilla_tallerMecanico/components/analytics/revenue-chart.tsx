'use client';

import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { OrdenDB } from '@/lib/storage-adapter';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RevenueChartProps {
    orders: OrdenDB[];
}

type Period = 'days' | 'weeks' | 'months';

const PERIOD_CONFIG = {
    days: { label: '7 Días', count: 7 },
    weeks: { label: '4 Semanas', count: 4 },
    months: { label: '3 Meses', count: 3 },
};

function getDateRanges(period: Period, count: number, offset: number = 0) {
    const ranges = [];

    if (period === 'days') {
        // Daily ranges
        for (let i = count - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i - offset);
            date.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            ranges.push({
                label: date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
                start: date,
                end: endDate,
            });
        }
    } else if (period === 'weeks') {
        // Weekly ranges
        for (let i = count - 1; i >= 0; i--) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - (i * 7) - (offset * 7));
            endDate.setHours(23, 59, 59, 999);

            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);

            // Calculate week number in the month
            const firstDayOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            const weekOfMonth = Math.ceil((endDate.getDate() + firstDayOfMonth.getDay()) / 7);

            // Format: "Sem 2: 5-11 ENE"
            const startDay = startDate.getDate();
            const endDay = endDate.getDate();
            const monthName = endDate.toLocaleDateString('es-CL', { month: 'short' }).toUpperCase();

            ranges.push({
                label: `Sem ${weekOfMonth}: ${startDay}-${endDay} ${monthName}`,
                start: startDate,
                end: endDate,
            });
        }
    } else if (period === 'months') {
        // Monthly ranges
        for (let i = count - 1; i >= 0; i--) {
            const today = new Date();
            const targetMonth = new Date(today.getFullYear(), today.getMonth() - i - offset, 1);

            const startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);

            ranges.push({
                label: startDate.toLocaleDateString('es-CL', { month: 'short' }).toUpperCase(),
                start: startDate,
                end: endDate,
            });
        }
    }

    return ranges;
}

function formatCurrency(value: number): string {
    return `$${value.toLocaleString('es-CL')}`;
}

export function RevenueChart({ orders }: RevenueChartProps) {
    const [period, setPeriod] = useState<Period>('days');
    const [offset, setOffset] = useState(0);

    const chartData = useMemo(() => {
        const count = PERIOD_CONFIG[period].count;
        const ranges = getDateRanges(period, count, offset);

        return ranges.map((range) => {
            const rangeRevenue = orders
                .filter(order => {
                    if (order.estado !== 'completada') return false;

                    // Use fecha_completada if available, otherwise fecha_ingreso
                    const dateToCheck = order.fecha_completada || order.fecha_ingreso;
                    if (!dateToCheck) return false;

                    const orderDate = new Date(dateToCheck);
                    return orderDate >= range.start && orderDate <= range.end;
                })
                .reduce((sum, order) => sum + (order.precio_total || 0), 0);

            return {
                label: range.label,
                revenue: rangeRevenue,
            };
        });
    }, [orders, period, offset]);

    const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);

    const handlePrevious = () => {
        setOffset(offset + 1);
    };

    const handleNext = () => {
        if (offset > 0) {
            setOffset(offset - 1);
        }
    };

    const handleToday = () => {
        setOffset(0);
    };

    return (
        <Card className="bg-slate-900/40 border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Ingresos por Período
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Total: <span className="font-bold text-green-400">{formatCurrency(totalRevenue)}</span>
                    </p>
                </div>
            </div>

            {/* Period selector and navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                {/* Period buttons */}
                <div className="flex gap-2">
                    {(Object.keys(PERIOD_CONFIG) as Period[]).map((p) => (
                        <Button
                            key={p}
                            onClick={() => {
                                setPeriod(p);
                                setOffset(0);
                            }}
                            variant={period === p ? 'default' : 'outline'}
                            size="sm"
                            className={period === p ? 'bg-blue-600 text-white' : 'border-slate-600 text-slate-300'}
                        >
                            {PERIOD_CONFIG[p].label}
                        </Button>
                    ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handlePrevious}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        onClick={handleToday}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300"
                        disabled={offset === 0}
                    >
                        Hoy
                    </Button>
                    <Button
                        onClick={handleNext}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300"
                        disabled={offset === 0}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            color: '#fff',
                        }}
                        formatter={(value: number | undefined) => (value !== undefined ? [formatCurrency(value), 'Ingresos'] : ['-', 'Ingresos'])}
                        labelStyle={{ color: '#94a3b8' }}
                    />
                    <Bar
                        dataKey="revenue"
                        fill="#3b82f6"
                        radius={[8, 8, 0, 0]}
                        animationDuration={1000}
                    />
                </BarChart>
            </ResponsiveContainer>
        </Card>
    );
}
