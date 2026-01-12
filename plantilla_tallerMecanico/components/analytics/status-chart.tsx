'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { OrdenDB } from '@/lib/storage-adapter';
import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatusChartProps {
    orders: OrdenDB[];
}

const STATUS_CONFIG = {
    pendiente: { label: 'Pendientes', color: '#eab308' },
    lista: { label: 'Listas', color: '#3b82f6' },
    completada: { label: 'Completadas', color: '#22c55e' },
} as const;

export function StatusChart({ orders }: StatusChartProps) {
    const chartData = useMemo(() => {
        const statusCounts = orders.reduce((acc, order) => {
            const status = order.estado as keyof typeof STATUS_CONFIG;
            if (STATUS_CONFIG[status]) {
                acc[status] = (acc[status] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(STATUS_CONFIG).map(([key, config]) => ({
            name: config.label,
            value: statusCounts[key] || 0,
            color: config.color,
        })).filter(item => item.value > 0);
    }, [orders]);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card className="bg-slate-900/40 border-slate-700 p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Distribución de Órdenes
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                    Total: <span className="font-bold text-white">{total}</span> órdenes
                </p>
            </div>

            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            animationDuration={1000}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '14px' }}
                            iconType="circle"
                        />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                    No hay datos para mostrar
                </div>
            )}
        </Card>
    );
}
