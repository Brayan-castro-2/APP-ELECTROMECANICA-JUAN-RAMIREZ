'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DateRangePickerProps {
    value?: { from?: Date; to?: Date };
    onChange: (range: { from?: Date; to?: Date } | undefined) => void;
    className?: string;
}

export function DateRangePicker({
    value,
    onChange,
    className,
}: DateRangePickerProps) {
    const [dateRange, setDateRange] = React.useState<{ from: string; to: string }>({
        from: value?.from ? value.from.toISOString().split('T')[0] : '',
        to: value?.to ? value.to.toISOString().split('T')[0] : '',
    });

    React.useEffect(() => {
        if (value?.from || value?.to) {
            setDateRange({
                from: value.from ? value.from.toISOString().split('T')[0] : '',
                to: value.to ? value.to.toISOString().split('T')[0] : '',
            });
        }
    }, [value]);

    const handleFromChange = (newFrom: string) => {
        const updated = { ...dateRange, from: newFrom };
        setDateRange(updated);
        onChange({
            from: newFrom ? new Date(newFrom) : undefined,
            to: updated.to ? new Date(updated.to) : undefined,
        });
    };

    const handleToChange = (newTo: string) => {
        const updated = { ...dateRange, to: newTo };
        setDateRange(updated);
        onChange({
            from: updated.from ? new Date(updated.from) : undefined,
            to: newTo ? new Date(newTo) : undefined,
        });
    };

    const handleQuickSelect = (from: string, to: string) => {
        setDateRange({ from, to });
        onChange({
            from: new Date(from),
            to: new Date(to),
        });
    };

    const handleClear = () => {
        setDateRange({ from: '', to: '' });
        onChange(undefined);
    };

    const formatDisplayDate = () => {
        if (dateRange.from && dateRange.to) {
            return `${dateRange.from} - ${dateRange.to}`;
        }
        if (dateRange.from) {
            return `Desde ${dateRange.from}`;
        }
        return 'Todas las fechas';
    };

    return (
        <div className={cn('space-y-1.5', className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9 w-full justify-between font-normal hover:bg-slate-700 hover:text-white"
                    >
                        <span className="truncate">{formatDisplayDate()}</span>
                        <CalendarIcon className="w-3.5 h-3.5 ml-2 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-auto p-4 bg-slate-800 border-slate-700" align="end">
                    <DropdownMenuLabel className="text-slate-200 mb-2">Filtrar por Rango</DropdownMenuLabel>
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Desde</label>
                                <Input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => handleFromChange(e.target.value)}
                                    className="bg-slate-900 border-slate-700 h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Hasta</label>
                                <Input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => handleToChange(e.target.value)}
                                    className="bg-slate-900 border-slate-700 h-8 text-xs"
                                />
                            </div>
                        </div>
                        {/* Botones rápidos */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-slate-600 hover:bg-slate-700 h-7"
                                onClick={() => {
                                    const today = new Date().toISOString().split('T')[0];
                                    handleQuickSelect(today, today);
                                }}
                            >
                                Hoy
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-slate-600 hover:bg-slate-700 h-7"
                                onClick={() => {
                                    const today = new Date();
                                    const prev = new Date(today);
                                    prev.setDate(prev.getDate() - 7);
                                    handleQuickSelect(
                                        prev.toISOString().split('T')[0],
                                        today.toISOString().split('T')[0]
                                    );
                                }}
                            >
                                7 Días
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-slate-600 hover:bg-slate-700 h-7"
                                onClick={() => {
                                    const today = new Date();
                                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                    handleQuickSelect(
                                        firstDay.toISOString().split('T')[0],
                                        today.toISOString().split('T')[0]
                                    );
                                }}
                            >
                                Este Mes
                            </Button>
                        </div>
                        {/* Botón limpiar */}
                        {(dateRange.from || dateRange.to) && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 mt-1 w-full"
                                onClick={handleClear}
                            >
                                <X className="w-3 h-3 mr-1" /> Limpiar Filtro
                            </Button>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
