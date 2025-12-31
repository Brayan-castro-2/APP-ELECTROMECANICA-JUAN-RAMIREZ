'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
    ClipboardList,
    LayoutDashboard,
    Users,
    FileText
} from 'lucide-react';

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
        href: '/admin/usuarios',
        label: 'Usuarios',
        icon: <Users className="w-5 h-5" />,
        roles: ['admin'],
    },
];

export function Sidebar() {
    const { user } = useAuth();
    const pathname = usePathname();

    if (!user) return null;

    const filteredItems = navItems.filter(item => item.roles.includes(user.role));

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-[#0a0a0a] border-r border-[#333333] flex-col">
                <nav className="flex-1 p-4 space-y-1">
                    {filteredItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/admin' && item.href !== '/recepcion' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
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

                {/* Footer */}
                <div className="p-4 border-t border-[#333333]">
                    <div className="px-4 py-3 rounded-xl bg-[#1a1a1a]">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Versión</p>
                        <p className="text-sm text-gray-300 font-medium">1.0.0 MVP</p>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation - Solo para admin */}
            {user.role === 'admin' && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-[#333333] safe-area-inset-bottom">
                    <div className="flex items-center justify-around py-2 px-2">
                        {filteredItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/admin' && item.href !== '/recepcion' && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch={true}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-colors duration-150 min-w-[72px] touch-target",
                                        isActive
                                            ? "bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30"
                                            : "text-gray-500 hover:text-gray-300 active:scale-95"
                                    )}
                                >
                                    {item.icon}
                                    <span className={cn(
                                        "text-[10px] font-medium mt-1",
                                        isActive ? "opacity-100" : "opacity-70"
                                    )}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}
        </>
    );
}
