'use client';

import { useState } from 'react';
import { crearUsuario } from '@/lib/local-storage-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Shield, UserPlus } from 'lucide-react';

export default function SetupPage() {
    const [step, setStep] = useState<'admin' | 'done'>('admin');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Admin form
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminName, setAdminName] = useState('');

    const createAdminUser = async () => {
        if (!adminEmail || !adminPassword || !adminName) {
            setError('Completa todos los campos');
            return;
        }

        if (adminPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Crear usuario en localStorage
            const result = await crearUsuario(adminEmail, adminPassword, adminName, 'admin');

            if (!result.success) {
                throw new Error(result.error || 'Error al crear usuario');
            }

            setSuccess(`Usuario admin "${adminEmail}" creado exitosamente`);
            setStep('done');

        } catch (err: any) {
            setError(err.message || 'Error al crear usuario');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/30">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
            </div>

            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-md">
                    {step === 'admin' && (
                        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm shadow-2xl">
                            <CardHeader className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-xl shadow-purple-500/30 mx-auto mb-4">
                                    <Shield className="w-8 h-8 text-white" />
                                </div>
                                <CardTitle className="text-2xl text-white">Configuración Inicial</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Crea el primer usuario administrador
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Nombre Completo</Label>
                                    <Input
                                        type="text"
                                        value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)}
                                        placeholder="Administrador del Taller"
                                        className="h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Correo Electrónico</Label>
                                    <Input
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        placeholder="admin@taller.com"
                                        className="h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Contraseña</Label>
                                    <Input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                                    />
                                </div>

                                <Button
                                    onClick={createAdminUser}
                                    disabled={isLoading}
                                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-lg font-semibold rounded-xl shadow-xl shadow-purple-500/25"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5 mr-2" />
                                            Crear Usuario Admin
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {step === 'done' && (
                        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm shadow-2xl">
                            <CardContent className="py-12 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-xl shadow-green-500/30 mx-auto mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">¡Listo!</h2>
                                <p className="text-slate-400 mb-6">{success}</p>

                                <div className="space-y-3">
                                    <a href="/login">
                                        <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl">
                                            Ir a Login
                                        </Button>
                                    </a>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setStep('admin');
                                            setAdminEmail('');
                                            setAdminPassword('');
                                            setAdminName('');
                                            setSuccess('');
                                        }}
                                        className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl"
                                    >
                                        Crear otro usuario
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="py-6 text-center relative z-10">
                <p className="text-xs text-slate-600">
                    Página de configuración inicial • Solo para administradores
                </p>
            </div>
        </main>
    );
}
