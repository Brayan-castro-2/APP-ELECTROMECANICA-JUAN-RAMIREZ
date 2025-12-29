'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(email, password);
            if (result.success) {
                router.push('/');
            } else {
                setError(result.error || 'Credenciales incorrectas');
            }
        } catch {
            setError('Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col bg-[#121212]">
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="text-center mb-10">
                        <div className="relative w-32 h-32 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-[#0066FF] shadow-[0_0_30px_rgba(0,102,255,0.3)]">
                            <Image
                                src="/images/logo-negro.jpg"
                                alt="Electromecánica Juan Ramírez"
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            ELECTROMECÁNICA <br />
                            <span className="text-[#0066FF]">JUAN RAMÍREZ</span>
                        </h1>
                        <p className="text-gray-400">Sistema de Gestión de Taller</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                                Correo Electrónico
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    className="h-14 pl-12 bg-[#1a1a1a] border-[#333333] text-white placeholder:text-gray-500 rounded-xl text-base"
                                    autoComplete="email"
                                    autoFocus
                                    tabIndex={1}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                                Contraseña
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="h-14 pl-12 bg-[#1a1a1a] border-[#333333] text-white placeholder:text-gray-500 rounded-xl text-base"
                                    autoComplete="current-password"
                                    tabIndex={2}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-14 bg-[#0066FF] hover:bg-[#0052CC] text-white text-lg font-semibold rounded-xl shadow-xl shadow-[#0066FF]/25 transition-all duration-200 mt-2 touch-target"
                            disabled={isLoading}
                            tabIndex={3}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </Button>

                        {/* Help Text */}
                        <p className="text-center text-sm text-gray-500 mt-6">
                            Usa las credenciales proporcionadas por el administrador
                        </p>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <div className="py-6 text-center">
                <p className="text-xs text-gray-600">
                    © 2024 Electromecánica JR • v1.0.0
                </p>
            </div>
        </main>
    );
}
