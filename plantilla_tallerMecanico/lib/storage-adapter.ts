// Adaptador que detecta automáticamente si usar localStorage o Supabase
import * as localService from './local-storage-service';
import * as supabaseService from './supabase-service';
import type { OrdenDB, VehiculoDB, PerfilDB, CitaDB } from './local-storage-service';

// Detect storage mode
const getStorageMode = (): 'local' | 'supabase' => {
    const mode = process.env.NEXT_PUBLIC_STORAGE_MODE;
    console.log(`📦 Storage Mode: ${mode || 'local (default)'}`);
    return mode === 'supabase' ? 'supabase' : 'local';
};

const isSupabase = () => getStorageMode() === 'supabase';

// ============ VEHÍCULOS ============

export async function buscarVehiculoPorPatente(patente: string): Promise<VehiculoDB | null> {
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para buscar vehículo');
        return supabaseService.buscarVehiculoPorPatente(patente);
    }
    console.log('🟡 Usando localStorage para buscar vehículo');
    return localService.buscarVehiculoPorPatente(patente);
}

export async function crearVehiculo(vehiculo: Omit<VehiculoDB, 'fecha_creacion'>): Promise<VehiculoDB | null> {
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para crear vehículo');
        return supabaseService.crearVehiculo(vehiculo);
    }
    console.log('🟡 Usando localStorage para crear vehículo');
    return localService.crearVehiculo(vehiculo);
}

export async function obtenerVehiculos(): Promise<VehiculoDB[]> {
    if (isSupabase()) {
        return supabaseService.obtenerVehiculos();
    }
    return localService.obtenerVehiculos();
}

// ============ ÓRDENES ============

export async function obtenerOrdenes(): Promise<OrdenDB[]> {
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para obtener órdenes');
        return supabaseService.obtenerOrdenes();
    }
    console.log('🟡 Usando localStorage para obtener órdenes');
    return localService.obtenerOrdenes();
}

export async function obtenerOrdenesHoy(): Promise<OrdenDB[]> {
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para obtener órdenes de hoy');
        return supabaseService.obtenerOrdenesHoy();
    }
    console.log('🟡 Usando localStorage para obtener órdenes de hoy');
    return localService.obtenerOrdenesHoy();
}

export async function obtenerOrdenPorId(id: number): Promise<OrdenDB | null> {
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para obtener orden por ID');
        return supabaseService.obtenerOrdenPorId(id);
    }
    console.log('🟡 Usando localStorage para obtener orden por ID');
    return localService.obtenerOrdenPorId(id);
}

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
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para crear orden');
        return supabaseService.crearOrden(orden);
    }
    console.log('🟡 Usando localStorage para crear orden');
    return localService.crearOrden(orden);
}

export async function actualizarOrden(
    id: number,
    updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>>
): Promise<OrdenDB | null> {
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para actualizar orden');
        return supabaseService.actualizarOrden(id, updates);
    }
    console.log('🟡 Usando localStorage para actualizar orden');
    return localService.actualizarOrden(id, updates);
}

export async function eliminarOrden(id: number): Promise<boolean> {
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para eliminar orden');
        return supabaseService.eliminarOrden(id);
    }
    console.log('🟡 Usando localStorage para eliminar orden');
    return localService.eliminarOrden(id);
}

// ============ PERFILES/USUARIOS ============

export async function obtenerPerfiles(): Promise<PerfilDB[]> {
    if (isSupabase()) {
        return supabaseService.obtenerPerfiles();
    }
    return localService.obtenerPerfiles();
}

export async function obtenerPerfilPorId(id: string): Promise<PerfilDB | null> {
    if (isSupabase()) {
        return supabaseService.obtenerPerfilPorId(id);
    }
    return localService.obtenerPerfilPorId(id);
}

export async function actualizarPerfil(
    id: string,
    updates: Partial<Omit<PerfilDB, 'id'>>
): Promise<PerfilDB | null> {
    if (isSupabase()) {
        console.log('🔵 Usando Supabase para actualizar perfil');
        return supabaseService.actualizarPerfil(id, updates);
    }
    console.log('🟡 Usando localStorage para actualizar perfil');
    return localService.actualizarPerfil(id, updates);
}

export async function crearUsuario(
    email: string,
    password: string,
    nombreCompleto: string,
    rol: 'admin' | 'mecanico'
): Promise<{ success: boolean; error?: string; user?: PerfilDB }> {
    if (isSupabase()) {
        return supabaseService.crearUsuario(email, password, nombreCompleto, rol);
    }
    return localService.crearUsuario(email, password, nombreCompleto, rol);
}

// ============ AUTENTICACIÓN ============

export async function loginConCredenciales(email: string, password: string): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
    error: string | null;
}> {
    if (isSupabase()) {
        return supabaseService.loginConCredenciales(email, password);
    }
    return localService.loginConCredenciales(email, password);
}

export async function logout(): Promise<void> {
    if (isSupabase()) {
        return supabaseService.logout();
    }
    return localService.logout();
}

export async function obtenerSesionActual(): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
}> {
    if (isSupabase()) {
        return supabaseService.obtenerSesionActual();
    }
    return localService.obtenerSesionActual();
}

// ============ CITAS/AGENDAMIENTO ============

export async function obtenerCitas(): Promise<CitaDB[]> {
    if (isSupabase()) {
        return supabaseService.obtenerCitas();
    }
    return localService.obtenerCitas();
}

export async function obtenerCitasHoy(): Promise<CitaDB[]> {
    if (isSupabase()) {
        return supabaseService.obtenerCitasHoy();
    }
    return localService.obtenerCitasHoy();
}

export async function obtenerCitasSemana(startDate: Date, endDate: Date): Promise<CitaDB[]> {
    if (isSupabase()) {
        return supabaseService.obtenerCitasSemana(startDate, endDate);
    }
    return localService.obtenerCitasSemana(startDate, endDate);
}

export async function crearCita(cita: Omit<CitaDB, 'id' | 'creado_en' | 'actualizado_en'>): Promise<CitaDB | null> {
    if (isSupabase()) {
        return supabaseService.crearCita(cita);
    }
    return localService.crearCita(cita);
}

export async function actualizarCita(id: number, updates: Partial<Omit<CitaDB, 'id' | 'creado_en'>>): Promise<CitaDB | null> {
    if (isSupabase()) {
        return supabaseService.actualizarCita(id, updates);
    }
    return localService.actualizarCita(id, updates);
}

export async function eliminarCita(id: number): Promise<boolean> {
    if (isSupabase()) {
        return supabaseService.eliminarCita(id);
    }
    return localService.eliminarCita(id);
}

// ============ INICIALIZACIÓN ============

export function inicializarLocalStorage(): void {
    if (!isSupabase()) {
        localService.initializeLocalStorage();
    }
}

// Re-exportar tipos
export type { OrdenDB, VehiculoDB, PerfilDB, CitaDB };
