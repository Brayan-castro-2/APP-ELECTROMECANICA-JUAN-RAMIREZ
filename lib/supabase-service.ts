// Servicios de Supabase para operaciones de base de datos
import { supabase, supabaseAdmin, VehiculoDB, OrdenDB, PerfilDB, CitaDB, OrdenConDetallesDB } from './supabase';
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

// Crear nuevo vehículo (o actualizar si ya existe)
export async function crearVehiculo(vehiculo: Omit<VehiculoDB, 'fecha_creacion'>): Promise<VehiculoDB | null> {
    const patenteUpper = vehiculo.patente.toUpperCase();

    // Preparar datos limpios para Supabase (sin cliente_id porque no existe en la tabla)
    const vehiculoData = {
        patente: patenteUpper,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        motor: vehiculo.motor || null,
        color: vehiculo.color || '-',
    };

    console.log('📤 Enviando a Supabase:', vehiculoData);

    // Usar upsert para crear o actualizar
    const { data, error } = await supabase
        .from('vehiculos')
        .upsert([vehiculoData], {
            onConflict: 'patente',
            ignoreDuplicates: false
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error al crear/actualizar vehículo:', error);
        console.error('❌ Detalles del error:', JSON.stringify(error, null, 2));
        return null;
    }

    console.log('✅ Vehículo guardado:', data);
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

// Obtener todas las órdenes con JOINs (OPTIMIZADO)
// Obtener todas las órdenes (Manual Fetch para evitar errores de FK)
export async function obtenerOrdenes(options?: { limit?: number; offset?: number }): Promise<OrdenConDetallesDB[]> {
    const limit = options?.limit;
    const offset = options?.offset ?? 0;
    console.log(`⚡ Fetcheando órdenes (Manual Join${limit ? `, limit: ${limit}, offset: ${offset}` : ''})...`);

    // 1. Obtener órdenes con paginación opcional
    let query = supabase
        .from('ordenes')
        .select('*')
        .order('fecha_ingreso', { ascending: false });

    if (limit) {
        query = query.range(offset, offset + limit - 1);
    }

    const { data: ordenes, error: ordenesError } = await query;

    if (ordenesError) {
        console.error('Error al obtener órdenes:', ordenesError);
        return [];
    }

    if (!ordenes || ordenes.length === 0) return [];

    // 2. Obtener vehículos únicos y perfiles únicos
    const patentes = [...new Set(ordenes.map(o => o.patente_vehiculo))];
    const userIds = [...new Set([
        ...ordenes.map(o => o.creado_por),
        ...ordenes.map(o => o.asignado_a).filter(id => id) as string[]
    ])];

    // 3. Fetch paralelo de datos relacionados
    const [vehiculosRes, perfilesRes] = await Promise.all([
        supabase.from('vehiculos').select('*').in('patente', patentes),
        supabase.from('perfiles').select('*').in('id', userIds)
    ]);

    const vehiculosMap = new Map((vehiculosRes.data || []).map(v => [v.patente, v]));
    const perfilesMap = new Map((perfilesRes.data || []).map(p => [p.id, p]));

    // 4. Mapear resultados
    const ordenesCompletas = ordenes.map(orden => {
        const vehiculo = vehiculosMap.get(orden.patente_vehiculo);
        const creadoPor = perfilesMap.get(orden.creado_por);
        const asignadoA = orden.asignado_a ? perfilesMap.get(orden.asignado_a) : null;

        return {
            ...orden,
            vehiculos: vehiculo ? {
                patente: vehiculo.patente,
                marca: vehiculo.marca,
                modelo: vehiculo.modelo,
                anio: vehiculo.anio,
                motor: vehiculo.motor,
                color: vehiculo.color
            } : null,
            perfiles_creado: creadoPor ? {
                nombre_completo: creadoPor.nombre_completo,
                email: creadoPor.email
            } : null,
            perfiles_asignado: asignadoA ? {
                nombre_completo: asignadoA.nombre_completo,
                email: asignadoA.email
            } : null
        };
    }) as unknown as OrdenConDetallesDB[];

    return ordenesCompletas;
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

// Get total count of orders
export async function obtenerOrdenesCount(): Promise<number> {
    const { count, error } = await supabase
        .from('ordenes')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error al obtener count de órdenes:', error);
        return 0;
    }

    return count ?? 0;
}

// Crear nueva orden
export async function crearOrden(orden: {
    patente_vehiculo: string;
    descripcion_ingreso: string;
    creado_por: string;
    estado?: string;
    fotos?: string[];
    cliente_nombre?: string;
    cliente_telefono?: string;
    precio_total?: number;
    metodo_pago?: string;
    asignado_a?: string;
    detalles_vehiculo?: string;
    kilometraje?: number;
    kilometraje_salida?: number;
}): Promise<OrdenDB | null> {
    // IMPORTANTE: Primero verificar si el vehículo existe, si no, crearlo
    const patenteNormalizada = orden.patente_vehiculo.toUpperCase();

    // Buscar vehículo existente
    const { data: vehiculoExistente } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('patente', patenteNormalizada)
        .single();

    // Si no existe, crear un vehículo básico
    if (!vehiculoExistente) {
        console.log(`🚗 Creando vehículo ${patenteNormalizada} automáticamente...`);
        const { error: vehiculoError } = await supabase
            .from('vehiculos')
            .insert([{
                patente: patenteNormalizada,
                marca: 'Por definir',
                modelo: 'Por definir',
                anio: new Date().getFullYear().toString(),
                motor: '',
                color: ''
            }]);

        if (vehiculoError) {
            console.error('Error al crear vehículo:', vehiculoError);
            return null;
        }
    }

    // Ahora crear la orden
    const { data, error } = await supabase
        .from('ordenes')
        .insert([{
            patente_vehiculo: patenteNormalizada,
            descripcion_ingreso: orden.descripcion_ingreso,
            creado_por: orden.creado_por,
            asignado_a: orden.asignado_a || orden.creado_por,
            estado: orden.estado || 'pendiente',
            fotos: orden.fotos || [],
            cliente_nombre: orden.cliente_nombre,
            cliente_telefono: orden.cliente_telefono,
            precio_total: orden.precio_total || 0,
            metodo_pago: orden.metodo_pago,
            detalles_vehiculo: orden.detalles_vehiculo,
            kilometraje: orden.kilometraje,
            kilometraje_salida: orden.kilometraje_salida,
        }])
        .select()
        .single();

    if (error) {
        console.error('Error al crear orden:', error);
        return null;
    }

    console.log('✅ Orden creada exitosamente en Supabase:', data.id);
    return data;
}

// Actualizar orden
export async function actualizarOrden(
    id: number,
    updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>>
): Promise<OrdenDB | null> {
    console.log(`🔵 Actualizando orden ${id} en Supabase:`, updates);

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
        console.error('❌ Error al actualizar orden:', error);
        return null;
    }

    console.log('✅ Orden actualizada en Supabase:', data);
    return data;
}

// Eliminar orden
export async function eliminarOrden(id: number): Promise<boolean> {
    console.log(`🗑️ Eliminando orden ${id} de Supabase`);

    const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('❌ Error al eliminar orden:', error);
        return false;
    }

    console.log('✅ Orden eliminada de Supabase');
    return true;
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
    console.log('🔍 Buscando perfil con ID:', id);

    const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('❌ Error al obtener perfil:', error);
        console.error('❌ ID buscado:', id);
        return null;
    }

    console.log('✅ Perfil encontrado:', data);
    return data;
}

// Actualizar perfil
export async function actualizarPerfil(
    id: string,
    updates: Partial<Omit<PerfilDB, 'id'>>
): Promise<PerfilDB | null> {
    console.log(`🔵 Actualizando perfil ${id} en Supabase:`, updates);

    const { data, error } = await supabase
        .from('perfiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('❌ Error al actualizar perfil:', error);
        return null;
    }

    console.log('✅ Perfil actualizado en Supabase:', data);
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

// Crear nuevo usuario
export async function crearUsuario(
    email: string,
    password: string,
    nombreCompleto: string,
    rol: 'admin' | 'mecanico'
): Promise<{ success: boolean; error?: string; user?: PerfilDB }> {
    try {
        // Verificar que supabaseAdmin esté configurado
        console.log('🔍 Verificando configuración de supabaseAdmin...');
        console.log('🔍 supabaseAdmin es igual a supabase?', supabaseAdmin === supabase);

        console.log('🔵 Creando usuario con Admin API:', email);

        // 1. Crear usuario en Auth usando Admin API (bypasses signup restrictions)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                nombre_completo: nombreCompleto,
                rol: rol,
            }
        });

        if (authError || !authData.user) {
            console.error('❌ Error al crear usuario en Auth:', authError);
            console.error('❌ Detalles del error:', JSON.stringify(authError, null, 2));
            return { success: false, error: authError?.message || 'Error al crear usuario' };
        }

        console.log('✅ Usuario creado en Auth:', authData.user.id);

        // 2. Crear perfil en la tabla perfiles
        const { data: perfilData, error: perfilError } = await supabase
            .from('perfiles')
            .insert([{
                id: authData.user.id,
                email: email,
                nombre_completo: nombreCompleto,
                rol: rol,
                activo: true,
            }])
            .select()
            .single();

        if (perfilError) {
            console.error('❌ Error al crear perfil:', perfilError);
            // Intentar eliminar el usuario de Auth si falla la creación del perfil
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return { success: false, error: 'Error al crear perfil de usuario' };
        }

        console.log('✅ Usuario creado exitosamente:', perfilData);
        return { success: true, user: perfilData };
    } catch (error) {
        console.error('❌ Error inesperado al crear usuario:', error);
        return { success: false, error: 'Error inesperado al crear usuario' };
    }
}

// Cambiar contraseña de un usuario (Admin only)
export async function cambiarContrasenaUsuario(
    userId: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`🔐 Cambiando contraseña para usuario: ${userId}`);

        // Usar Supabase Admin API para actualizar contraseña
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (error) {
            console.error('❌ Error al cambiar contraseña:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Contraseña actualizada exitosamente');
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error inesperado al cambiar contraseña:', error);
        return { success: false, error: 'Error inesperado al cambiar contraseña' };
    }
}

// Eliminar usuario (soft delete - marcar como inactivo)
export async function eliminarUsuario(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`🗑️ Eliminando usuario (soft delete): ${userId}`);

        // Marcar perfil como inactivo en lugar de eliminar
        const { error } = await supabase
            .from('perfiles')
            .update({ activo: false })
            .eq('id', userId);

        if (error) {
            console.error('❌ Error al eliminar usuario:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Usuario marcado como inactivo');
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error inesperado al eliminar usuario:', error);
        return { success: false, error: 'Error inesperado al eliminar usuario' };
    }
}

// ============ CITAS/AGENDAMIENTO ============

export async function obtenerCitas(): Promise<CitaDB[]> {
    const { data, error } = await supabase
        .from('citas')
        .select('*')
        .order('fecha', { ascending: true });

    if (error) {
        console.error('Error al obtener citas:', error);
        return [];
    }

    return data || [];
}

export async function obtenerCitasHoy(): Promise<CitaDB[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
        .from('citas')
        .select('*')
        .gte('fecha', today.toISOString())
        .lt('fecha', tomorrow.toISOString())
        .order('fecha', { ascending: true });

    if (error) {
        console.error('Error al obtener citas de hoy:', error);
        return [];
    }

    return data || [];
}

export async function obtenerCitasSemana(startDate: Date, endDate: Date): Promise<CitaDB[]> {
    const { data, error } = await supabase
        .from('citas')
        .select('*')
        .gte('fecha', startDate.toISOString())
        .lte('fecha', endDate.toISOString())
        .order('fecha', { ascending: true });

    if (error) {
        console.error('Error al obtener citas de la semana:', error);
        return [];
    }

    return data || [];
}

export async function crearCita(cita: Omit<CitaDB, 'id' | 'creado_en' | 'actualizado_en'>): Promise<CitaDB | null> {
    const { data, error } = await supabase
        .from('citas')
        .insert([cita])
        .select()
        .single();

    if (error) {
        console.error('Error al crear cita:', error);
        return null;
    }

    return data;
}

export async function actualizarCita(id: number, updates: Partial<Omit<CitaDB, 'id' | 'creado_en'>>): Promise<CitaDB | null> {
    const { data, error } = await supabase
        .from('citas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error al actualizar cita:', error);
        return null;
    }

    return data;
}

export async function eliminarCita(id: number): Promise<boolean> {
    const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error al eliminar cita:', error);
        return false;
    }

    return true;
}

// Obtener órdenes "ligeras" para el dashboard (sin campos pesados, pero con relaciones)
export async function obtenerOrdenesLight(): Promise<OrdenConDetallesDB[]> {
    console.log('⚡ Fetcheando órdenes Light (Dashboard)...');

    // 1. Fetch de órdenes (solo columnas necesarias)
    const { data: ordenes, error } = await supabase
        .from('ordenes')
        .select(`
            id,
            fecha_ingreso,
            estado,
            precio_total,
            cliente_nombre,
            patente_vehiculo,
            creado_por,
            asignado_a,
            descripcion_ingreso,
            metodos_pago,
            fecha_completada
        `)
        .order('fecha_ingreso', { ascending: false });

    if (error) {
        console.error('Error al obtener órdenes light:', error);
        return [];
    }

    if (!ordenes || ordenes.length === 0) return [];

    // 2. Obtener IDs únicos para relaciones
    const patentes = [...new Set(ordenes.map(o => o.patente_vehiculo))];
    const userIds = [...new Set([
        ...ordenes.map(o => o.creado_por),
        ...ordenes.map(o => o.asignado_a).filter(id => id) as string[]
    ])];

    // 3. Fetch paralelo de datos relacionados (solo columnas necesarias de vehículos)
    const [vehiculosRes, perfilesRes] = await Promise.all([
        supabase.from('vehiculos').select('patente, marca, modelo, anio').in('patente', patentes),
        supabase.from('perfiles').select('id, nombre_completo, email').in('id', userIds)
    ]);

    const vehiculosMap = new Map((vehiculosRes.data || []).map(v => [v.patente, v]));
    const perfilesMap = new Map((perfilesRes.data || []).map(p => [p.id, p]));

    // 4. Mapear resultados (Hydration)
    const ordenesCompletas = ordenes.map(orden => {
        const vehiculo = vehiculosMap.get(orden.patente_vehiculo);
        const creadoPor = perfilesMap.get(orden.creado_por);
        const asignadoA = orden.asignado_a ? perfilesMap.get(orden.asignado_a) : null;

        return {
            ...orden,
            vehiculos: vehiculo ? {
                patente: vehiculo.patente,
                marca: vehiculo.marca,
                modelo: vehiculo.modelo,
                anio: vehiculo.anio,
                // Motor y color omitidos para ahorrar
            } : null,
            perfiles_creado: creadoPor ? {
                nombre_completo: creadoPor.nombre_completo,
                email: creadoPor.email
            } : null,
            perfiles_asignado: asignadoA ? {
                nombre_completo: asignadoA.nombre_completo,
                email: asignadoA.email
            } : null
        };
    }) as unknown as OrdenConDetallesDB[];

    return ordenesCompletas;
}

// ============ FILTROS DE FECHA ============

// Obtener órdenes por rango de fechas
export async function obtenerOrdenesPorRangoFechas(
    startDate: Date,
    endDate: Date
): Promise<OrdenConDetallesDB[]> {
    console.log('🔵 Obteniendo órdenes por rango:', { startDate, endDate });

    const { data: ordenes, error } = await supabase
        .from('ordenes')
        .select('*')
        .gte('fecha_ingreso', startDate.toISOString())
        .lte('fecha_ingreso', endDate.toISOString())
        .order('fecha_ingreso', { ascending: false });

    if (error) {
        console.error('❌ Error al obtener órdenes por rango:', error);
        return [];
    }

    if (!ordenes || ordenes.length === 0) return [];

    // Obtener datos relacionados
    const patentes = [...new Set(ordenes.map(o => o.patente_vehiculo))];
    const userIds = [...new Set([
        ...ordenes.map(o => o.creado_por),
        ...ordenes.map(o => o.asignado_a).filter(id => id) as string[]
    ])];

    const [vehiculosRes, perfilesRes] = await Promise.all([
        supabase.from('vehiculos').select('*').in('patente', patentes),
        supabase.from('perfiles').select('*').in('id', userIds)
    ]);

    const vehiculosMap = new Map((vehiculosRes.data || []).map(v => [v.patente, v]));
    const perfilesMap = new Map((perfilesRes.data || []).map(p => [p.id, p]));

    const ordenesCompletas = ordenes.map(orden => {
        const vehiculo = vehiculosMap.get(orden.patente_vehiculo);
        const creadoPor = perfilesMap.get(orden.creado_por);
        const asignadoA = orden.asignado_a ? perfilesMap.get(orden.asignado_a) : null;

        return {
            ...orden,
            vehiculos: vehiculo ? {
                patente: vehiculo.patente,
                marca: vehiculo.marca,
                modelo: vehiculo.modelo,
                anio: vehiculo.anio,
                motor: vehiculo.motor,
                color: vehiculo.color
            } : null,
            perfiles_creado: creadoPor ? {
                nombre_completo: creadoPor.nombre_completo,
                email: creadoPor.email
            } : null,
            perfiles_asignado: asignadoA ? {
                nombre_completo: asignadoA.nombre_completo,
                email: asignadoA.email
            } : null
        };
    }) as unknown as OrdenConDetallesDB[];

    return ordenesCompletas;
}

// Obtener órdenes de un año específico
export async function obtenerOrdenesPorAnio(year: number): Promise<OrdenConDetallesDB[]> {
    const startDate = new Date(year, 0, 1); // 1 de enero
    const endDate = new Date(year, 11, 31, 23, 59, 59); // 31 de diciembre
    return obtenerOrdenesPorRangoFechas(startDate, endDate);
}

// Obtener órdenes de un mes específico
export async function obtenerOrdenesPorMes(
    year: number,
    month: number // 1-12
): Promise<OrdenConDetallesDB[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Último día del mes
    return obtenerOrdenesPorRangoFechas(startDate, endDate);
}

// ============ ACCESO LIMITADO PARA MECÁNICOS ============

// Obtener órdenes creadas por un mecánico (excluyendo completadas)
export async function obtenerOrdenesPorMecanico(
    userId: string
): Promise<OrdenConDetallesDB[]> {
    console.log(`🔵 Obteniendo órdenes del mecánico: ${userId}`);

    const { data: ordenes, error } = await supabase
        .from('ordenes')
        .select('*')
        .or(`creado_por.eq.${userId},asignado_a.eq.${userId}`)
        .order('fecha_ingreso', { ascending: false });

    if (error) {
        console.error('❌ Error al obtener órdenes del mecánico:', error);
        return [];
    }

    if (!ordenes || ordenes.length === 0) return [];

    // Obtener datos relacionados
    const patentes = [...new Set(ordenes.map(o => o.patente_vehiculo))];
    const userIds = [...new Set([
        ...ordenes.map(o => o.creado_por),
        ...ordenes.map(o => o.asignado_a).filter(id => id) as string[]
    ])];

    const [vehiculosRes, perfilesRes] = await Promise.all([
        supabase.from('vehiculos').select('*').in('patente', patentes),
        supabase.from('perfiles').select('*').in('id', userIds)
    ]);

    const vehiculosMap = new Map((vehiculosRes.data || []).map(v => [v.patente, v]));
    const perfilesMap = new Map((perfilesRes.data || []).map(p => [p.id, p]));

    const ordenesCompletas = ordenes.map(orden => {
        const vehiculo = vehiculosMap.get(orden.patente_vehiculo);
        const creadoPor = perfilesMap.get(orden.creado_por);
        const asignadoA = orden.asignado_a ? perfilesMap.get(orden.asignado_a) : null;

        return {
            ...orden,
            vehiculos: vehiculo ? {
                patente: vehiculo.patente,
                marca: vehiculo.marca,
                modelo: vehiculo.modelo,
                anio: vehiculo.anio,
                motor: vehiculo.motor,
                color: vehiculo.color
            } : null,
            perfiles_creado: creadoPor ? {
                nombre_completo: creadoPor.nombre_completo,
                email: creadoPor.email
            } : null,
            perfiles_asignado: asignadoA ? {
                nombre_completo: asignadoA.nombre_completo,
                email: asignadoA.email
            } : null
        };
    }) as unknown as OrdenConDetallesDB[];

    return ordenesCompletas;
}
