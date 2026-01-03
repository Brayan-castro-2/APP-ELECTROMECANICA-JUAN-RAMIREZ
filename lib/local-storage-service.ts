// Servicio de almacenamiento local para reemplazar Supabase
// Todas las operaciones usan localStorage del navegador

// ============ TIPOS ============

export interface VehiculoDB {
    patente: string;
    marca: string;
    modelo: string;
    anio: string;
    motor?: string;
    color?: string;
    fecha_creacion?: string;
}

export interface OrdenDB {
    id: number;
    patente_vehiculo: string;
    descripcion_ingreso: string;
    estado: string;
    creado_por: string;
    asignado_a: string | null;
    fecha_ingreso: string;
    fecha_actualizacion: string;
    fotos?: string[];
    cliente_nombre?: string;
    cliente_telefono?: string;
    precio_total?: number;
    detalles_vehiculo?: string;
    detalle_trabajos?: string;
    fecha_lista?: string;
    fecha_completada?: string;
    cc?: string;
    metodo_pago?: string;
}

export interface PerfilDB {
    id: string;
    nombre_completo: string;
    rol: 'mecanico' | 'admin';
    activo: boolean;
    email?: string;
}

export interface ClienteDB {
    id: number;
    nombre: string;
    telefono: string;
    email: string;
    fecha_creacion: string;
}

// ============ HELPERS ============

const KEYS = {
    VEHICULOS: 'app_vehiculos',
    ORDENES: 'app_ordenes',
    PERFILES: 'app_perfiles',
    CLIENTES: 'app_clientes',
    CURRENT_USER: 'app_current_user',
    ORDER_COUNTER: 'app_order_counter',
};

function getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
}

function saveToStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function getNextOrderId(): number {
    const current = getFromStorage<number>(KEYS.ORDER_COUNTER, 0);
    const next = current + 1;
    saveToStorage(KEYS.ORDER_COUNTER, next);
    return next;
}

// ============ INICIALIZACIÓN ============

export function initializeLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    // Crear usuario admin por defecto si no existe
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
    if (perfiles.length === 0) {
        const defaultUsers: PerfilDB[] = [
            {
                id: 'admin-001',
                nombre_completo: 'Administrador',
                rol: 'admin',
                activo: true,
                email: 'admin@gmail.com',
            },
            {
                id: 'mecanico-001',
                nombre_completo: 'Mecánico Principal',
                rol: 'mecanico',
                activo: true,
                email: 'mecanico@gmail.com',
            },
        ];
        saveToStorage(KEYS.PERFILES, defaultUsers);
        console.log('✅ Usuarios por defecto creados');
    }

    // Inicializar arrays vacíos si no existen
    if (!localStorage.getItem(KEYS.VEHICULOS)) {
        saveToStorage(KEYS.VEHICULOS, []);
    }
    if (!localStorage.getItem(KEYS.ORDENES)) {
        saveToStorage(KEYS.ORDENES, []);
    }
    if (!localStorage.getItem(KEYS.CLIENTES)) {
        saveToStorage(KEYS.CLIENTES, []);
    }
    if (!localStorage.getItem(KEYS.ORDER_COUNTER)) {
        saveToStorage(KEYS.ORDER_COUNTER, 0);
    }
}

// ============ VEHÍCULOS ============

export async function buscarVehiculoPorPatente(patente: string): Promise<VehiculoDB | null> {
    const patenteNormalizada = patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const vehiculos = getFromStorage<VehiculoDB[]>(KEYS.VEHICULOS, []);
    const vehiculo = vehiculos.find(v => v.patente === patenteNormalizada);
    
    if (!vehiculo) {
        console.log('Vehículo no encontrado en localStorage');
        return null;
    }
    
    return vehiculo;
}

export async function crearVehiculo(vehiculo: Omit<VehiculoDB, 'fecha_creacion'>): Promise<VehiculoDB | null> {
    const vehiculos = getFromStorage<VehiculoDB[]>(KEYS.VEHICULOS, []);
    
    const nuevoVehiculo: VehiculoDB = {
        ...vehiculo,
        patente: vehiculo.patente.toUpperCase(),
        fecha_creacion: new Date().toISOString(),
    };
    
    vehiculos.push(nuevoVehiculo);
    saveToStorage(KEYS.VEHICULOS, vehiculos);
    
    console.log('✅ Vehículo creado:', nuevoVehiculo.patente);
    return nuevoVehiculo;
}

export async function obtenerVehiculos(): Promise<VehiculoDB[]> {
    return getFromStorage<VehiculoDB[]>(KEYS.VEHICULOS, []);
}

// ============ ÓRDENES ============

export async function obtenerOrdenes(): Promise<OrdenDB[]> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    return ordenes.sort((a, b) => 
        new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime()
    );
}

export async function obtenerOrdenesHoy(): Promise<OrdenDB[]> {
    const ordenes = await obtenerOrdenes();
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    
    return ordenes.filter(orden => {
        const fechaOrden = new Date(orden.fecha_ingreso);
        return fechaOrden >= inicioDelDia && fechaOrden <= finDelDia;
    });
}

export async function obtenerOrdenPorId(id: number): Promise<OrdenDB | null> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    return ordenes.find(o => o.id === id) || null;
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
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    
    const nuevaOrden: OrdenDB = {
        id: getNextOrderId(),
        patente_vehiculo: orden.patente_vehiculo.toUpperCase(),
        descripcion_ingreso: orden.descripcion_ingreso,
        creado_por: orden.creado_por,
        estado: orden.estado || 'pendiente',
        asignado_a: orden.asignado_a || orden.creado_por, // Asignar al especificado o al creador
        fecha_ingreso: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        fotos: orden.fotos || [],
        cliente_nombre: orden.cliente_nombre,
        cliente_telefono: orden.cliente_telefono,
        precio_total: orden.precio_total,
        metodo_pago: orden.metodo_pago,
        detalles_vehiculo: orden.detalles_vehiculo,
    };
    
    ordenes.push(nuevaOrden);
    saveToStorage(KEYS.ORDENES, ordenes);
    
    console.log('✅ Orden creada:', nuevaOrden.id);
    return nuevaOrden;
}

export async function actualizarOrden(
    id: number,
    updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>>
): Promise<OrdenDB | null> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    const index = ordenes.findIndex(o => o.id === id);
    
    if (index === -1) {
        console.error('Orden no encontrada:', id);
        return null;
    }
    
    ordenes[index] = {
        ...ordenes[index],
        ...updates,
        fecha_actualizacion: new Date().toISOString(),
    };
    
    saveToStorage(KEYS.ORDENES, ordenes);
    console.log('✅ Orden actualizada:', id);
    return ordenes[index];
}

// ============ PERFILES/USUARIOS ============

export async function obtenerPerfiles(): Promise<PerfilDB[]> {
    return getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
}

export async function obtenerPerfilPorId(id: string): Promise<PerfilDB | null> {
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
    return perfiles.find(p => p.id === id) || null;
}

export async function actualizarPerfil(
    id: string,
    updates: Partial<Omit<PerfilDB, 'id'>>
): Promise<PerfilDB | null> {
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
    const index = perfiles.findIndex(p => p.id === id);
    
    if (index === -1) {
        console.error('Perfil no encontrado:', id);
        return null;
    }
    
    perfiles[index] = {
        ...perfiles[index],
        ...updates,
    };
    
    saveToStorage(KEYS.PERFILES, perfiles);
    return perfiles[index];
}

export async function crearUsuario(
    email: string,
    password: string,
    nombreCompleto: string,
    rol: 'admin' | 'mecanico'
): Promise<{ success: boolean; error?: string }> {
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
    
    // Verificar si el email ya existe
    if (perfiles.some(p => p.email === email)) {
        return { success: false, error: 'El email ya está registrado' };
    }
    
    const nuevoPerfil: PerfilDB = {
        id: `user-${Date.now()}`,
        nombre_completo: nombreCompleto,
        rol,
        activo: true,
        email,
    };
    
    perfiles.push(nuevoPerfil);
    saveToStorage(KEYS.PERFILES, perfiles);
    
    console.log('✅ Usuario creado:', email);
    return { success: true };
}

export async function obtenerOrdenesPorUsuario(userId: string): Promise<{
    creadas: OrdenDB[];
    asignadas: OrdenDB[];
}> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    
    return {
        creadas: ordenes.filter(o => o.creado_por === userId),
        asignadas: ordenes.filter(o => o.asignado_a === userId),
    };
}

// ============ AUTENTICACIÓN ============

export async function loginConCredenciales(email: string, password: string): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
    error: string | null;
}> {
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
    
    // Buscar usuario por email (en local no verificamos password, solo simulamos)
    const perfil = perfiles.find(p => p.email === email);
    
    if (!perfil) {
        return { user: null, perfil: null, error: 'Usuario no encontrado' };
    }
    
    if (!perfil.activo) {
        return { user: null, perfil: null, error: 'Usuario desactivado' };
    }
    
    // Guardar sesión actual
    const user = { id: perfil.id, email: email };
    saveToStorage(KEYS.CURRENT_USER, { user, perfil });
    
    console.log('✅ Login exitoso:', email);
    return { user, perfil, error: null };
}

export async function logout(): Promise<void> {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(KEYS.CURRENT_USER);
    }
    console.log('✅ Logout exitoso');
}

export async function obtenerSesionActual(): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
}> {
    const session = getFromStorage<{ user: { id: string; email: string }; perfil: PerfilDB } | null>(
        KEYS.CURRENT_USER,
        null
    );
    
    if (!session) {
        return { user: null, perfil: null };
    }
    
    return { user: session.user, perfil: session.perfil };
}

// ============ ALMACENAMIENTO DE IMÁGENES ============

export async function subirImagen(file: File, carpeta: string = 'ordenes'): Promise<string | null> {
    // En localStorage, convertimos la imagen a base64
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            console.log('✅ Imagen guardada en base64');
            resolve(base64);
        };
        reader.onerror = () => {
            console.error('Error al leer imagen');
            resolve(null);
        };
        reader.readAsDataURL(file);
    });
}
