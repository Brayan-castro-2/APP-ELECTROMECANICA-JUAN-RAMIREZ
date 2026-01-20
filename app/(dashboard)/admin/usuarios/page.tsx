'use client';

import { useState, useEffect } from 'react';
import { obtenerPerfiles, actualizarPerfil, crearUsuario, type PerfilDB } from '@/lib/storage-adapter';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Users,
    Search,
    UserPlus,
    Shield,
    Wrench,
    CheckCircle,
    XCircle,
    ChevronRight,
    Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState<PerfilDB[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createError, setCreateError] = useState('');

    // New user form
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<'mecanico' | 'admin'>('mecanico');

    useEffect(() => {
        loadUsuarios();
    }, []);

    const loadUsuarios = async () => {
        const perfiles = await obtenerPerfiles();
        setUsuarios(perfiles);
        setIsLoading(false);
    };

    const handleToggleActive = async (usuario: PerfilDB) => {
        await actualizarPerfil(usuario.id, { activo: !usuario.activo });
        await loadUsuarios();
    };

    const handleCreateUser = async () => {
        if (!newEmail || !newPassword || !newName) {
            setCreateError('Completa todos los campos');
            return;
        }

        if (newPassword.length < 6) {
            setCreateError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsCreating(true);
        setCreateError('');

        const result = await crearUsuario(newEmail, newPassword, newName, newRole);

        if (result.success) {
            setCreateDialogOpen(false);
            setNewEmail('');
            setNewPassword('');
            setNewName('');
            setNewRole('mecanico');
            await loadUsuarios();
        } else {
            setCreateError(result.error || 'Error al crear usuario');
        }

        setIsCreating(false);
    };

    const filteredUsuarios = usuarios.filter(u =>
        (u.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0066FF] rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">Usuarios</h1>
                    <p className="text-sm text-gray-400">Gestión de mecánicos y administradores</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Buscar usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#1a1a1a] border-[#333333] text-white placeholder:text-gray-500 rounded-xl h-12"
                />
            </div>

            {/* Users List */}
            <div className="space-y-3">
                {filteredUsuarios.map((usuario) => (
                    <Card key={usuario.id} className="bg-[#1a1a1a] border-[#333333]">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${usuario.rol === 'admin' ? 'bg-[#0066FF]/20' : 'bg-gray-700/50'
                                    }`}>
                                    {usuario.rol === 'admin' ? (
                                        <Shield className="w-6 h-6 text-[#0066FF]" />
                                    ) : (
                                        <Wrench className="w-6 h-6 text-gray-400" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{usuario.nombre_completo}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className={`text-xs ${usuario.rol === 'admin'
                                            ? 'border-[#0066FF]/30 text-[#0066FF]'
                                            : 'border-gray-600 text-gray-400'
                                            }`}>
                                            {usuario.rol === 'admin' ? 'Administrador' : 'Mecánico'}
                                        </Badge>
                                        {usuario.activo ? (
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Activo
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                                <XCircle className="w-3 h-3 mr-1" />
                                                Bloqueado
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleActive(usuario)}
                                        className={`text-xs ${usuario.activo
                                            ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                                            : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                                            }`}
                                    >
                                        {usuario.activo ? 'Bloquear' : 'Activar'}
                                    </Button>
                                    <Link href={`/admin/usuarios/${usuario.id}`}>
                                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                            <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredUsuarios.length === 0 && (
                    <Card className="bg-[#1a1a1a] border-[#333333]">
                        <CardContent className="py-12 text-center">
                            <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                            <p className="text-gray-400">No se encontraron usuarios</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
