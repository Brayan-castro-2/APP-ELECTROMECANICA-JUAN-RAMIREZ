'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
    ClipboardList,
    LayoutDashboard,
    Users,
    FileText,
    Calendar,
    X,
    Menu,
    LogOut
} from 'lucide-react';
import { FEATURE_FLAGS } from '@/config/modules';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    roles: ('admin' | 'mecanico')[];
}

const navItems: NavItem[] = [
    {
        href: '/recepcion',
        label: 'Recepción',
        icon: <ClipboardList className="w-5 h-5" />,
        roles: ['mecanico', 'admin'],
    },
    {
        href: '/mecanico/ordenes',
        label: 'Mis Órdenes',
        icon: <FileText className="w-5 h-5" />,
        roles: ['mecanico'],
    },
    {
        href: '/admin',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        roles: ['admin'],
    },
    {
        href: '/admin/ordenes',
        label: 'Órdenes',
        icon: <FileText className="w-5 h-5" />,
        roles: ['admin'],
    },
    {
        href: '/admin/agenda',
        label: 'Agenda',
        icon: <Calendar className="w-5 h-5" />,
        roles: ['admin'],
    },
    {
        href: '/admin/usuarios',
        label: 'Usuarios',
        icon: <Users className="w-5 h-5" />,
        roles: ['admin'],
    },
];

// Componente que exporta el botón hamburguesa para usar en el Header
export function HamburgerButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-[#1a1a1a] hover:bg-[#242424] border border-[#333333] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 active:scale-95 touch-target"
            aria-label="Abrir menú"
        >
            <Menu className="w-5 h-5 text-white" />
        </button>
    );
}

// Estado global del drawer usando un simple event emitter
let drawerListeners: ((open: boolean) => void)[] = [];
export function openMobileDrawer() {
    drawerListeners.forEach(fn => fn(true));
}

export function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Registrar listener para abrir el drawer desde fuera
    useEffect(() => {
        const listener = (open: boolean) => setDrawerOpen(open);
        drawerListeners.push(listener);
        return () => {
            drawerListeners = drawerListeners.filter(fn => fn !== listener);
        };
    }, []);

    // Cerrar drawer al cambiar de ruta
    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    // Evitar scroll del body cuando el drawer está abierto
    useEffect(() => {
        if (drawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [drawerOpen]);

    if (!user) return null;

    const filteredItems = navItems.filter(item => item.roles.includes(user.role));

    const NavLinks = ({ onClickLink }: { onClickLink?: () => void }) => (
        <nav className="flex-1 p-4 space-y-1">
            {filteredItems.map((item) => {
                const isActive = pathname === item.href ||
                    (item.href !== '/admin' && item.href !== '/recepcion' && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        onClick={onClickLink}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150",
                            isActive
                                ? "bg-[#0066FF] text-white shadow-[0_0_15px_rgba(0,102,255,0.4)] border border-[#0066FF]/50"
                                : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
                        )}
                    >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <>
            {/* ===== DESKTOP SIDEBAR ===== */}
            <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-[#0a0a0a] border-r border-[#333333] flex-col">
                <NavLinks />
                <div className="p-4 border-t border-[#333333]">
                    <div className="px-4 py-3 rounded-xl bg-[#1a1a1a]">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Versión</p>
                        <p className="text-sm text-gray-300 font-medium">2.0</p>
                    </div>
                </div>
            </aside>

            {/* ===== MOBILE DRAWER ===== */}
            {/* Overlay / Backdrop */}
            <div
                className={cn(
                    "md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                    drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
            />

            {/* Drawer Panel */}
            <aside
                className={cn(
                    "md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0a0a0a] border-r border-[#333333] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out",
                    drawerOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between h-20 px-4 border-b border-[#333333] flex-shrink-0">
                    <div>
                        <p className="text-white font-bold text-lg leading-tight">ELECTROMECÁNICA <span className="text-[#0066FF]">JR</span></p>
                        <p className="text-xs text-gray-400 capitalize">{user.role} — {user.name}</p>
                    </div>
                    <button
                        onClick={() => setDrawerOpen(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1a1a1a] hover:bg-[#333] border border-[#333333] transition-colors active:scale-95"
                        aria-label="Cerrar menú"
                    >
                        <X className="w-5 h-5 text-gray-300" />
                    </button>
                </div>

                {/* Navigation Links */}
                <NavLinks onClickLink={() => setDrawerOpen(false)} />

                {/* Drawer Footer */}
                <div className="p-4 border-t border-[#333333] flex-shrink-0">
                    <button
                        onClick={async () => {
                            setDrawerOpen(false);
                            await logout();
                            window.location.href = '/login';
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors duration-150"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                    <div className="px-4 pt-3 mt-1">
                        <p className="text-xs text-gray-600">Versión 2.0</p>
                    </div>
                </div>
            </aside>
        </>
    );
}
