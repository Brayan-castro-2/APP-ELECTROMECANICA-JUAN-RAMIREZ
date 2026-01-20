'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [showOffline, setShowOffline] = useState(false);

    useEffect(() => {
        // Verificar estado inicial
        setIsOnline(navigator.onLine);

        // Listeners para cambios de conexión
        const handleOnline = () => {
            setIsOnline(true);
            setShowOffline(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Verificar conexión periódicamente
        const checkConnection = setInterval(async () => {
            try {
                // Intentar hacer una petición pequeña para verificar conectividad real
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                await fetch('/favicon.ico', { 
                    method: 'HEAD',
                    cache: 'no-cache',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!isOnline) {
                    setIsOnline(true);
                    setShowOffline(false);
                }
            } catch (error) {
                if (!showOffline) {
                    setIsOnline(false);
                    setShowOffline(true);
                }
            }
        }, 10000); // Verificar cada 10 segundos

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(checkConnection);
        };
    }, [isOnline, showOffline]);

    if (!showOffline) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 border-2 border-red-500 rounded-2xl p-8 shadow-2xl max-w-md mx-4 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <WifiOff className="w-20 h-20 text-red-500 animate-pulse" />
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Sin Conexión
                    </h2>
                    <p className="text-slate-300 mb-4">
                        No se puede conectar al servidor. Verifica tu conexión a internet.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>Intentando reconectar...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
