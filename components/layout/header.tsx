'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // Detectar si estamos en modo offline revisando la consola
        const checkOfflineMode = () => {
            // Verificar si hay logs de modo offline en la consola
            const originalLog = console.log;
            const originalWarn = console.warn;
            
            console.log = function(...args) {
                if (args[0]?.includes?.('OFFLINE') || args[0]?.includes?.('offline')) {
                    setIsOffline(true);
                }
                originalLog.apply(console, args);
            };
            
            console.warn = function(...args) {
                if (args[0]?.includes?.('OFFLINE') || args[0]?.includes?.('offline')) {
                    setIsOffline(true);
                }
                originalWarn.apply(console, args);
            };
        };
        
        checkOfflineMode();
        
        // También verificar periódicamente
        const interval = setInterval(() => {
            // Si hay errores de red, activar modo offline
            if (!navigator.onLine) {
                setIsOffline(true);
            }
        }, 5000);
        
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header className="sticky top-0 z-50 h-20 bg-[#0a0a0a] border-b border-[#333333] shadow-lg shadow-black/50">
            <div className="h-full px-6 flex items-center justify-between max-w-7xl mx-auto">
                {/* Logo Electromecánica JR */}
                <div className="flex items-center gap-4">
                    {/* Indicador de modo offline */}
                    {isOffline && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <WifiOff className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-medium text-amber-400 hidden sm:inline">Modo Demo</span>
                        </div>
                    )}
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-[#0066FF] shadow-[0_0_15px_rgba(0,102,255,0.3)]">
                        <Image
                            src="/images/logo-negro.jpg"
                            alt="Logo"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                    <div className="hidden md:block">
                        <h1 className="text-xl font-bold text-white leading-none tracking-tight">
                            ELECTROMECÁNICA <span className="text-[#0066FF]">JR</span>
                        </h1>
                    </div>
                </div>

                {/* User Menu */}
                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#242424] border border-[#333333] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 touch-target">
                                <Avatar className="h-8 w-8 ring-2 ring-[#0066FF]/30">
                                    <AvatarFallback className="bg-[#0066FF] text-white text-sm font-semibold">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-left hidden sm:block pr-1">
                                    <p className="text-sm font-medium text-white leading-tight">{user.name}</p>
                                    <p className="text-[10px] text-[#0066FF] capitalize">{user.role}</p>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-[#333333] shadow-xl shadow-black/50">
                            <div className="px-3 py-2 border-b border-[#333333]">
                                <p className="text-sm font-medium text-white">{user.name}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                            >
                                <LogOut className="mr-3 h-4 w-4" />
                                Cerrar Sesión
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
