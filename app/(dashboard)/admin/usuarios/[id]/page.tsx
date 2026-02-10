'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    obtenerPerfilPorId,
    actualizarPerfil,
    cambiarContrasenaUsuario,
    eliminarUsuario,
    type PerfilDB
} from '@/lib/storage-adapter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    User,
    Lock,
    Trash2,
    Loader2,
    CheckCircle,
    AlertCircle,
    Shield,
    Wrench
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const userId = params.id as string;

    const [usuario, setUsuario] = useState<PerfilDB | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [nombre, setNombre] = useState('');
    const [rol, setRol] = useState<'admin' | 'mecanico'>('mecanico');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI states
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        loadUsuario();
    }, [userId]);

    const loadUsuario = async () => {
        const perfil = await obtenerPerfilPorId(userId);
        if (!perfil) {
            router.push('/admin/usuarios');
            return;
        }
        setUsuario(perfil);
        setNombre(perfil.nombre_completo);
        setRol(perfil.rol);
        setIsLoading(false);
    };

    const handleUpdateProfile = async () => {
        if (!nombre.trim()) {
            setErrorMessage('El nombre no puede estar vacío');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        setSuccessMessage('');

        const result = await actualizarPerfil(userId, {
            nombre_completo: nombre,
            rol: rol,
        });

        if (result) {
            setSuccessMessage('Perfil actualizado correctamente');
            await loadUsuario();
        } else {
            setErrorMessage('Error al actualizar el perfil');
        }

        setIsSaving(false);
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            setErrorMessage('Completa ambos campos de contraseña');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMessage('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage('Las contraseñas no coinciden');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        setSuccessMessage('');

        const result = await cambiarContrasenaUsuario(userId, newPassword);

        if (result.success) {
            setSuccessMessage('Contraseña actualizada correctamente');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setErrorMessage(result.error || 'Error al cambiar la contraseña');
        }

        setIsSaving(false);
    };

    const handleDeleteUser = async () => {
        setIsSaving(true);
        setErrorMessage('');

        const result = await eliminarUsuario(userId);

        if (result.success) {
            router.push('/admin/usuarios');
        } else {
            setErrorMessage(result.error || 'Error al eliminar usuario');
            setDeleteDialogOpen(false);
        }

        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
            </div>
        );
    }

    if (!usuario) {
        return null;
    }

    // Prevenir que el usuario se elimine a sí mismo
    const canDelete = currentUser?.id !== userId;

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Breadcrumb */}
            <Link
                href="/admin/usuarios"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a Usuarios</span>
            </Link>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${usuario.rol === 'admin' ? 'bg-[#0066FF]/20' : 'bg-gray-700/50'
                    }`}>
                    {usuario.rol === 'admin' ? (
                        <Shield className="w-6 h-6 text-[#0066FF]" />
                    ) : (
                        <Wrench className="w-6 h-6 text-gray-400" />
                    )}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">{usuario.nombre_completo}</h1>
                    <p className="text-sm text-gray-400">{usuario.email}</p>
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-green-400">{successMessage}</p>
                </div>
            )}

            {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-400">{errorMessage}</p>
                </div>
            )}

            {/* Información del Perfil */}
            <Card className="bg-[#1a1a1a] border-[#333333]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <User className="w-5 h-5" />
                        Información del Perfil
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre" className="text-gray-400">Nombre Completo</Label>
                        <Input
                            id="nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="bg-[#242424] border-[#333333] text-white"
                            placeholder="Juan Pérez"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rol" className="text-gray-400">Rol</Label>
                        <Select value={rol} onValueChange={(value: 'admin' | 'mecanico') => setRol(value)}>
                            <SelectTrigger className="bg-[#242424] border-[#333333] text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-[#333333]">
                                <SelectItem value="mecanico">Mecánico</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={handleUpdateProfile}
                        disabled={isSaving}
                        className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            'Guardar Cambios'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Cambiar Contraseña */}
            <Card className="bg-[#1a1a1a] border-[#333333]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Lock className="w-5 h-5" />
                        Cambiar Contraseña
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-gray-400">Nueva Contraseña</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-[#242424] border-[#333333] text-white"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-gray-400">Confirmar Contraseña</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-[#242424] border-[#333333] text-white"
                            placeholder="Repite la contraseña"
                        />
                    </div>

                    <Button
                        onClick={handleChangePassword}
                        disabled={isSaving}
                        className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Cambiando...
                            </>
                        ) : (
                            'Cambiar Contraseña'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Eliminar Usuario */}
            {canDelete && (
                <Card className="bg-[#1a1a1a] border-red-500/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-400">
                            <Trash2 className="w-5 h-5" />
                            Zona Peligrosa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-400">
                            Eliminar este usuario lo marcará como inactivo. No podrá iniciar sesión pero
                            su historial de órdenes se mantendrá.
                        </p>
                        <Button
                            onClick={() => setDeleteDialogOpen(true)}
                            variant="outline"
                            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar Usuario
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-[#1a1a1a] border-[#333333] text-white">
                    <DialogHeader>
                        <DialogTitle>¿Eliminar Usuario?</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Esta acción marcará a <strong>{usuario.nombre_completo}</strong> como inactivo.
                            No podrá iniciar sesión pero su historial se mantendrá.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            className="border-[#333333] text-white hover:bg-[#242424]"
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDeleteUser}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                'Eliminar Usuario'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
