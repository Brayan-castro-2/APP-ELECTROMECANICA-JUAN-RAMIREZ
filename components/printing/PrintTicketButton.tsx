import { Button } from '@/components/ui/button';
import { Bluetooth, Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { usePrinter } from '@/hooks/use-printer';
import type { OrdenConDetallesDB } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface PrintTicketButtonProps {
    order: OrdenConDetallesDB;
    className?: string;
    showLabel?: boolean;
    size?: 'sm' | 'default' | 'icon';
}

export function PrintTicketButton({ order, className, showLabel = false, size = 'sm' }: PrintTicketButtonProps) {
    const { isBtPrinting, btStatus, btMessage, handleBluetoothPrint, setBtStatus } = usePrinter();

    return (
        <div className="relative inline-block">
            <Button
                size={size}
                variant="ghost"
                className={cn(
                    "transition-all duration-200",
                    btStatus === 'success' ? "text-green-400 hover:text-green-300 hover:bg-green-500/10" :
                    btStatus === 'error' ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" :
                    "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10",
                    className
                )}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBluetoothPrint(order);
                }}
                disabled={isBtPrinting}
                title="Imprimir Ticket JP80H"
            >
                {isBtPrinting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : btStatus === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                ) : btStatus === 'error' ? (
                    <XCircle className="w-3.5 h-3.5" />
                ) : (
                    <Bluetooth className="w-3.5 h-3.5" />
                )}
                {showLabel && (
                    <span className="ml-2 font-medium">
                        {isBtPrinting ? 'Imprimiendo...' : btStatus === 'success' ? '¡Impreso!' : btStatus === 'error' ? 'Error' : 'Imprimir'}
                    </span>
                )}
            </Button>

            {/* Floating Feedback Tooltip-like message for errors */}
            {btStatus === 'error' && btMessage && (
                <div 
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl text-sm font-medium flex flex-col gap-2 max-w-[90vw] animate-in fade-in zoom-in duration-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        setBtStatus('idle');
                    }}
                >
                   <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1 whitespace-pre-wrap">
                            {btMessage.split('[/downloads/Impresion-ElectromecanicaJR.zip]').map((part, i, arr) => (
                                <span key={i}>
                                    {part}
                                    {i < arr.length - 1 && (
                                        <a
                                            href="/downloads/Impresion-ElectromecanicaJR.zip"
                                            className="bg-white text-red-600 px-3 py-1 rounded-md font-bold inline-flex items-center mx-1 hover:bg-gray-100 transition-colors mt-2"
                                            onClick={(e) => e.stopPropagation()}
                                            download
                                        >
                                            <Download className="w-4 h-4 mr-1" />
                                            DESCARGAR AQUÍ
                                        </a>
                                    )}
                                </span>
                            ))}
                        </span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-white hover:bg-white/20 h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => setBtStatus('idle')}
                        >
                            ✕
                        </Button>
                   </div>
                </div>
            )}
        </div>
    );
}
