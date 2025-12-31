'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    loginConCredenciales, 
    logout as logoutService, 
    obtenerSesionActual,
    initializeLocalStorage,
    PerfilDB 
} from '@/lib/local-storage-service';

// Usuario del contexto
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'mecanico' | 'admin';
    isActive: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Inicializar sesión al cargar
    useEffect(() => {
        const initSession = async () => {
            try {
                // Inicializar localStorage con datos por defecto
                initializeLocalStorage();
                
                // Obtener sesión guardada
                const result = await obtenerSesionActual();

                if (result.user && result.perfil) {
                    const authUser: AuthUser = {
                        id: result.user.id,
                        email: result.user.email,
                        name: result.perfil.nombre_completo,
                        role: result.perfil.rol,
                        isActive: result.perfil.activo,
                    };
                    setUser(authUser);
                    console.log('Sesión restaurada:', authUser.name);
                }
            } catch (error) {
                console.error('Error inicializando sesión:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            console.log('Iniciando login para:', email);

            // Usar el servicio de localStorage
            const result = await loginConCredenciales(email.trim(), password);

            if (result.error || !result.user || !result.perfil) {
                return { success: false, error: result.error || 'Error de autenticación' };
            }

            // Convertir perfil a AuthUser
            const authUser: AuthUser = {
                id: result.user.id,
                email: result.user.email,
                name: result.perfil.nombre_completo,
                role: result.perfil.rol,
                isActive: result.perfil.activo,
            };

            setUser(authUser);
            console.log('Login completado:', authUser.name);

            return { success: true };
        } catch (error: any) {
            console.error('Excepción en login:', error);
            return { success: false, error: 'Error de conexión' };
        }
    };

    const logout = async () => {
        try {
            await logoutService();
            setUser(null);
            // Forzar recarga para limpiar estado
            window.location.href = '/login';
        } catch (e) {
            console.error('Error en logout:', e);
            setUser(null);
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
}
