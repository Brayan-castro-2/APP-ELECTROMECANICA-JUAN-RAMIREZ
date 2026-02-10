'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, X, DollarSign, FileText } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateFilter } from '@/lib/types/filters';

interface DateRangeFilterProps {
    onFilterChange: (filter: DateFilter | null) => void;
    totalOrders: number;
    totalRevenue: number;
}

export function DateRangeFilter({ onFilterChange, totalOrders, totalRevenue }: DateRangeFilterProps) {
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
    const [isFilterActive, setIsFilterActive] = useState(false);

    const handleApplyFilter = () => {
        if (!dateRange?.from || !dateRange?.to) return;

        const filter: DateFilter = {
            startDate: dateRange.from,
            endDate: new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59),
        };

        onFilterChange(filter);
        setIsFilterActive(true);
    };

    const handleClearFilter = () => {
        setDateRange(undefined);
        onFilterChange(null);
        setIsFilterActive(false);
    };

    const handleDateChange = (range: { from?: Date; to?: Date } | undefined) => {
        setDateRange(range);
        // Auto-aplicar filtro cuando se selecciona un rango completo
        if (range?.from && range?.to) {
            const filter: DateFilter = {
                startDate: range.from,
                endDate: new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate(), 23, 59, 59),
            };
            onFilterChange(filter);
            setIsFilterActive(true);
        }
    };

    return (
        <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardContent className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#0066FF]" />
                        <h3 className="text-white font-semibold">Filtrar por Fecha</h3>
                    </div>
                    {isFilterActive && (
                        <Button
                            onClick={handleClearFilter}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white h-8"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Limpiar
                        </Button>
                    )}
                </div>

                {/* Selector de Rango con Calendario */}
                <div className="space-y-3">
                    <label className="text-xs text-gray-400 block">Selecciona un rango de fechas</label>
                    <DateRangePicker
                        value={dateRange}
                        onChange={handleDateChange}
                    />
                </div>

                {/* Resumen de Resultados */}
                <div className="pt-3 border-t border-[#333333] space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <FileText className="w-4 h-4" />
                            <span>Total Órdenes:</span>
                        </div>
                        <span className="text-white font-semibold">{totalOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <DollarSign className="w-4 h-4" />
                            <span>Monto Total:</span>
                        </div>
                        <span className="text-green-400 font-semibold">
                            ${totalRevenue.toLocaleString('es-CL')}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
