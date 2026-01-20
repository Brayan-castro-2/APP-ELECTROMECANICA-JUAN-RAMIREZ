// Servicios de Supabase para operaciones de base de datos
import { supabase, VehiculoDB, OrdenDB, PerfilDB, CitaDB, OrdenConDetallesDB } from './supabase';
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
export async function obtenerOrdenes(): Promise<OrdenConDetallesDB[]> {
    console.log('⚡ Fetcheando órdenes con JOINs optimizados...');

    // Consulta con JOINs explícitos usando la sintaxis de Supabase
    // NOTA: Para que esto funcione, las FK deben estar bien definidas en Supabase
    const { data, error } = await supabase
        .from('ordenes')
        .select(`
            *,
            vehiculos (
                patente,
                marca,
                modelo,
                anio,
                motor,
                color
            ),
            perfiles_creado:perfiles!creado_por (
                nombre_completo,
                email
            ),
            perfiles_asignado:perfiles!asignado_a (
                nombre_completo,
                email
            )
        `)
        .order('fecha_ingreso', { ascending: false });

    if (error) {
        console.error('Error al obtener órdenes:', error);
        return [];
    }

    // Mapeo seguro para TypeScript
    const ordenesMapeadas = (data || []).map((item: any) => ({
        ...item,
        // Asegurar que vehiculos sea un objeto y no un array (por si acaso devuelve array)
        vehiculos: Array.isArray(item.vehiculos) ? item.vehiculos[0] : item.vehiculos,
        // Aplanar perfiles para facilitar uso
        perfiles_creado: Array.isArray(item.perfiles_creado) ? item.perfiles_creado[0] : item.perfiles_creado,
        perfiles_asignado: Array.isArray(item.perfiles_asignado) ? item.perfiles_asignado[0] : item.perfiles_asignado
    })) as OrdenConDetallesDB[];

    return ordenesMapeadas;
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
    cliente_nombre?: string;
    cliente_telefono?: string;
    precio_total?: number;
    metodo_pago?: string;
    asignado_a?: string;
    detalles_vehiculo?: string;
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
        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: undefined,
                data: {
                    nombre_completo: nombreCompleto,
                    rol: rol,
                }
            }
        });

        if (authError || !authData.user) {
            console.error('Error al crear usuario en Auth:', authError);
            return { success: false, error: authError?.message || 'Error al crear usuario' };
        }

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
            console.error('Error al crear perfil:', perfilError);
            // Intentar eliminar el usuario de Auth si falla la creación del perfil
            await supabase.auth.admin.deleteUser(authData.user.id);
            return { success: false, error: 'Error al crear perfil de usuario' };
        }

        console.log('✅ Usuario creado exitosamente:', perfilData);
        return { success: true, user: perfilData };
    } catch (error) {
        console.error('Error inesperado al crear usuario:', error);
        return { success: false, error: 'Error inesperado al crear usuario' };
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
