import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, X, DollarSign, FileText } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { DateFilter } from '@/lib/types/filters';

interface DateRangeFilterProps {
    onFilterChange: (filter: DateFilter | null) => void;
    totalOrders: number;
    totalRevenue: number;
}

const MONTHS = [
    { value: '0', label: 'Enero' },
    { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' },
    { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' },
    { value: '11', label: 'Diciembre' },
];

export function DateRangeFilter({ onFilterChange, totalOrders, totalRevenue }: DateRangeFilterProps) {
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string | undefined>();

    const handleClearFilter = () => {
        setDateRange(undefined);
        setSelectedMonth(undefined);
        onFilterChange(null);
        setIsFilterActive(false);
    };

    const handleDateChange = (range: { from?: Date; to?: Date } | undefined) => {
        setDateRange(range);
        setSelectedMonth(undefined); // Reset month selector if manual range is picked

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

    const handleMonthChange = (monthValue: string) => {
        const year = new Date().getFullYear();
        const month = parseInt(monthValue);

        // Calcular primer y último día del mes
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0, 23, 59, 59); // Último día del mes

        setSelectedMonth(monthValue);
        setDateRange({ from: firstDay, to: lastDay });

        const filter: DateFilter = {
            startDate: firstDay,
            endDate: lastDay,
        };

        onFilterChange(filter);
        setIsFilterActive(true);
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

                <div className="space-y-4">
                    {/* Selector de Mes Rápido */}
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 block">Selección Rápida</label>
                        <Select value={selectedMonth} onValueChange={handleMonthChange}>
                            <SelectTrigger className="w-full bg-[#0a0a0a] border-[#333333] text-white">
                                <SelectValue placeholder="Seleccionar Mes" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-[#333333] text-white">
                                {MONTHS.map((month) => (
                                    <SelectItem key={month.value} value={month.value} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Selector de Rango Manual */}
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 block">O rango personalizado</label>
                        <DateRangePicker
                            value={dateRange}
                            onChange={handleDateChange}
                        />
                    </div>
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
