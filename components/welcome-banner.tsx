'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WelcomeBanner() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-4 mb-6 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-1">
                        ¡Bienvenido a la Versión 2.0! 🎉
                    </h2>
                    <p className="text-white/90 text-sm">
                        Hemos mejorado la estabilidad del sistema y añadido nuevas herramientas de gestión: 
                        <span className="font-semibold"> Analíticas Avanzadas, Agendamiento de Citas, Alertas de Morosidad</span> y más.
                    </p>
                </div>
                <Button
                    onClick={() => setIsVisible(false)}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 rounded-full flex-shrink-0"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}
