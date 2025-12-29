// Servicios de Supabase para operaciones de base de datos
import { supabase, VehiculoDB, OrdenDB, PerfilDB } from './supabase';
import { createClient } from '@supabase/supabase-js';

// ============ VEHÍCULOS ============

// Buscar vehículo por patente (la función "mágica")
export async function buscarVehiculoPorPatente(patente: string): Promise<VehiculoDB | null> {
    const patenteNormalizada = patente.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('patente', patenteNormalizada)
        .single();

    if (error || !data) {
        console.log('Vehículo no encontrado:', error?.message);
        return null;
    }

    return data;
}

// Crear nuevo vehículo
export async function crearVehiculo(vehiculo: Omit<VehiculoDB, 'fecha_creacion'>): Promise<VehiculoDB | null> {
    const { data, error } = await supabase
        .from('vehiculos')
        .insert([{
            ...vehiculo,
            patente: vehiculo.patente.toUpperCase(),
        }])
        .select()
        .single();

    if (error) {
        console.error('Error al crear vehículo:', error);
        return null;
    }

    return data;
}

// Obtener todos los vehículos
export async function obtenerVehiculos(): Promise<VehiculoDB[]> {
    const { data, error } = await supabase
        .from('vehiculos')
        .select('*');

    if (error) {
        console.error('Error al obtener vehículos:', error);
        return [];
    }

    return data || [];
}

// Actualizar perfil de usuario
export async function actualizarPerfil(
    id: string,
    updates: Partial<Omit<PerfilDB, 'id'>>
): Promise<PerfilDB | null> {
    const { data, error } = await supabase
        .from('perfiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error al actualizar perfil:', error);
        return null;
    }

    return data;
}

// Crear nuevo usuario (solo admin)
export async function crearUsuario(
    email: string,
    password: string,
    nombreCompleto: string,
    rol: 'admin' | 'mecanico'
): Promise<{ success: boolean; error?: string }> {
    // Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Error al crear usuario' };
    }

    // Crear perfil
    const { error: perfilError } = await supabase
        .from('perfiles')
        .insert([{
            id: authData.user.id,
            nombre_completo: nombreCompleto,
            rol,
            activo: true,
        }]);

    if (perfilError) {
        return { success: false, error: perfilError.message };
    }

    return { success: true };
}

// ============ ALMACENAMIENTO ============

// Subir imagen al bucket
export async function subirImagen(file: File, carpeta: string = 'ordenes'): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${carpeta}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('imagenes')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error al subir imagen:', uploadError);
            return null;
        }

        const { data } = supabase.storage
            .from('imagenes')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error en subida de imagen:', error);
        return null;
    }
}

// ============ ÓRDENES ============

// Obtener todas las órdenes
export async function obtenerOrdenes(): Promise<OrdenDB[]> {
    const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .order('fecha_ingreso', { ascending: false });

    if (error) {
        console.error('Error al obtener órdenes:', error);
        return [];
    }

    return data || [];
}

// Obtener órdenes del día
export async function obtenerOrdenesHoy(): Promise<OrdenDB[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .gte('fecha_ingreso', hoy.toISOString())
        .order('fecha_ingreso', { ascending: false });

    if (error) {
        console.error('Error al obtener órdenes de hoy:', error);
        return [];
    }

    return data || [];
}

// Obtener orden por ID
export async function obtenerOrdenPorId(id: number): Promise<OrdenDB | null> {
    const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error al obtener orden:', error);
        return null;
    }

    return data;
}

// Crear nueva orden
export async function crearOrden(orden: {
    patente_vehiculo: string;
    descripcion_ingreso: string;
    creado_por: string;
    estado?: string;
    fotos?: string[];
}): Promise<OrdenDB | null> {
    const { data, error } = await supabase
        .from('ordenes')
        .insert([{
            patente_vehiculo: orden.patente_vehiculo.toUpperCase(),
            descripcion_ingreso: orden.descripcion_ingreso,
            creado_por: orden.creado_por,
            estado: orden.estado || 'pendiente',
            fotos: orden.fotos || [],
        }])
        .select()
        .single();

    if (error) {
        console.error('Error al crear orden:', error);
        return null;
    }

    return data;
}

// Actualizar orden
export async function actualizarOrden(
    id: number,
    updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>>
): Promise<OrdenDB | null> {
    const { data, error } = await supabase
        .from('ordenes')
        .update({
            ...updates,
            fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error al actualizar orden:', error);
        return null;
    }

    return data;
}

// ============ PERFILES/USUARIOS ============

// Obtener todos los perfiles
export async function obtenerPerfiles(): Promise<PerfilDB[]> {
    const { data, error } = await supabase
        .from('perfiles')
        .select('*');

    if (error) {
        console.error('Error al obtener perfiles:', error);
        return [];
    }

    return data || [];
}

// Obtener perfil por ID
export async function obtenerPerfilPorId(id: string): Promise<PerfilDB | null> {
    const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error al obtener perfil:', error);
        return null;
    }

    return data;
}

// Obtener órdenes de un usuario
export async function obtenerOrdenesPorUsuario(userId: string): Promise<{
    creadas: OrdenDB[];
    asignadas: OrdenDB[];
}> {
    const [creadasRes, asignadasRes] = await Promise.all([
        supabase.from('ordenes').select('*').eq('creado_por', userId),
        supabase.from('ordenes').select('*').eq('asignado_a', userId),
    ]);

    return {
        creadas: creadasRes.data || [],
        asignadas: asignadasRes.data || [],
    };
}

// ============ AUTENTICACIÓN ============

// Login con email/password
export async function loginConCredenciales(email: string, password: string): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
    error: string | null;
}> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error || !data.user) {
        return { user: null, perfil: null, error: error?.message || 'Error de autenticación' };
    }

    // Obtener el perfil del usuario
    const perfil = await obtenerPerfilPorId(data.user.id);

    if (!perfil) {
        return { user: null, perfil: null, error: 'Perfil no encontrado' };
    }

    if (!perfil.activo) {
        await supabase.auth.signOut();
        return { user: null, perfil: null, error: 'Usuario desactivado' };
    }

    return {
        user: { id: data.user.id, email: data.user.email! },
        perfil,
        error: null,
    };
}

// Logout
export async function logout(): Promise<void> {
    await supabase.auth.signOut();
}

// Obtener sesión actual
export async function obtenerSesionActual(): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
}> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        return { user: null, perfil: null };
    }

    const perfil = await obtenerPerfilPorId(session.user.id);

    return {
        user: { id: session.user.id, email: session.user.email! },
        perfil,
    };
}
