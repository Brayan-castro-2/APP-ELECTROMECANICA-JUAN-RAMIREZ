'use client';

import { Sparkles } from 'lucide-react';

export function NewBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-blue-500/50 animate-pulse">
            <Sparkles className="w-3 h-3" />
            NUEVO
        </span>
    );
}
