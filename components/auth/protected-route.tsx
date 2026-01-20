'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
            } else if (allowedRoles && !allowedRoles.includes(user.role)) {
                if (user.role === 'mecanico') {
                    router.push('/recepcion');
                } else {
                    router.push('/admin');
                }
            } else {
                // Usuario válido, mostrar contenido inmediatamente
                setShowContent(true);
            }
        }
    }, [user, isLoading, allowedRoles, router]);

    // Mostrar loading mientras se verifica la sesión
    if (isLoading || !showContent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#121212]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
                    <span className="text-gray-400 text-sm">Cargando...</span>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
