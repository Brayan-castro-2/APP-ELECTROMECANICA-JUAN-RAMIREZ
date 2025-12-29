'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, PerfilDB } from '@/lib/supabase';
import { loginConCredenciales, logout as logoutService, obtenerSesionActual } from '@/lib/supabase-service';

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

    // Función para cargar perfil del usuario
    const loadUserProfile = async (userId: string, email: string): Promise<AuthUser | null> => {
        try {
            const { data: perfil, error } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle(); // Usa maybeSingle para evitar error si no existe

            if (error) {
                console.error('Error cargando perfil:', error.message);
                return null;
            }

            if (!perfil) {
                console.log('Perfil no encontrado, creando perfil por defecto...');
                // Si no existe perfil, crear uno por defecto como admin (solo para el primer usuario)
                const { data: newPerfil, error: createError } = await supabase
                    .from('perfiles')
                    .insert({
                        id: userId,
                        nombre_completo: email.split('@')[0],
                        rol: 'admin',
                        activo: true
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Error creando perfil:', createError.message);
                    return null;
                }

                return {
                    id: userId,
                    email: email,
                    name: newPerfil.nombre_completo,
                    role: newPerfil.rol,
                    isActive: newPerfil.activo,
                };
            }

            if (!perfil.activo) {
                console.log('Usuario desactivado');
                return null;
            }

            return {
                id: userId,
                email: email,
                name: perfil.nombre_completo,
                role: perfil.rol,
                isActive: perfil.activo,
            };
        } catch (e) {
            console.error('Excepción cargando perfil:', e);
            return null;
        }
    };

    // Inicializar sesión al cargar
    useEffect(() => {
        const initSession = async () => {
            try {
                // Usar servicio que maneja offline
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
                }
            } catch (error) {
                console.error('Error inicializando sesión:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();

        // Escuchar cambios de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event);

            if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
                const authUser = await loadUserProfile(session.user.id, session.user.email!);
                if (authUser) {
                    setUser(authUser);
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            console.log('Iniciando login para:', email);

            // Usar el servicio que maneja modo offline automáticamente
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
