// Datos mock para modo offline/demo
import { VehiculoDB, OrdenDB, PerfilDB } from './supabase';

// Flag para detectar si estamos en modo offline
export let isOfflineMode = false;

export function setOfflineMode(offline: boolean) {
    isOfflineMode = offline;
    if (offline) {
        console.log('🔌 Modo OFFLINE activado - Usando datos mock');
    }
}

// Perfiles/Usuarios mock
export const mockPerfiles: PerfilDB[] = [
    {
        id: 'admin-juan',
        nombre_completo: 'Juan',
        rol: 'admin',
        activo: true,
        email: 'juan@taller.cl',
    },
    {
        id: 'admin-rodrigo',
        nombre_completo: 'Rodrigo',
        rol: 'admin',
        activo: true,
        email: 'rodrigo@taller.cl',
    },
    {
        id: 'mecanico-francisco',
        nombre_completo: 'Francisco',
        rol: 'mecanico',
        activo: true,
        email: 'francisco@taller.cl',
    },
    {
        id: 'mecanico-javier',
        nombre_completo: 'Javier',
        rol: 'mecanico',
        activo: true,
        email: 'javier@taller.cl',
    },
];

// Base de datos de vehículos para buscar por patente
export const mockVehiculos: VehiculoDB[] = [
    { patente: 'ABCD12', marca: 'Toyota', modelo: 'Corolla', anio: '2020', color: 'Blanco', fecha_creacion: '2024-01-01T00:00:00Z' },
    { patente: 'WXYZ99', marca: 'Chevrolet', modelo: 'Spark', anio: '2019', color: 'Rojo', fecha_creacion: '2024-01-15T00:00:00Z' },
    { patente: 'JKLM45', marca: 'Hyundai', modelo: 'Accent', anio: '2021', color: 'Gris', fecha_creacion: '2024-02-01T00:00:00Z' },
    { patente: 'PQRS78', marca: 'Kia', modelo: 'Rio', anio: '2022', color: 'Negro', fecha_creacion: '2024-03-01T00:00:00Z' },
    { patente: 'DEFG34', marca: 'Nissan', modelo: 'Versa', anio: '2018', color: 'Azul', fecha_creacion: '2024-03-15T00:00:00Z' },
    { patente: 'HIJK56', marca: 'Mazda', modelo: '3', anio: '2023', color: 'Blanco', fecha_creacion: '2024-04-01T00:00:00Z' },
    { patente: 'LMNO89', marca: 'Ford', modelo: 'Fiesta', anio: '2017', color: 'Plata', fecha_creacion: '2024-04-15T00:00:00Z' },
    { patente: 'QRST12', marca: 'Honda', modelo: 'Civic', anio: '2021', color: 'Gris', fecha_creacion: '2024-05-01T00:00:00Z' },
];

// Órdenes de trabajo mock
export let mockOrdenes: OrdenDB[] = [
    {
        id: 1,
        patente_vehiculo: 'ABCD12',
        descripcion_ingreso: 'Cambio de aceite y filtros. El cliente menciona ruido en frenos.',
        estado: 'en_progreso',
        creado_por: 'mecanico-1-id',
        asignado_a: 'mecanico-2-id',
        fecha_ingreso: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        fotos: [],
        cliente_nombre: 'Carlos González',
        cliente_telefono: '+56912345678',
    },
    {
        id: 2,
        patente_vehiculo: 'WXYZ99',
        descripcion_ingreso: 'Revisión general por kilometraje. 50.000 km.',
        estado: 'pendiente',
        creado_por: 'mecanico-1-id',
        asignado_a: null,
        fecha_ingreso: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        fecha_actualizacion: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        fotos: [],
        cliente_nombre: 'María López',
        cliente_telefono: '+56987654321',
    },
    {
        id: 3,
        patente_vehiculo: 'JKLM45',
        descripcion_ingreso: 'Reparación de sistema eléctrico. Luces intermitentes no funcionan.',
        estado: 'completada',
        creado_por: 'admin-mock-id',
        asignado_a: 'mecanico-2-id',
        fecha_ingreso: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        fecha_actualizacion: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        fecha_completada: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        fotos: [],
        cliente_nombre: 'Pedro Ramírez',
        cliente_telefono: '+56956781234',
        detalle_trabajos: 'Reparación de fusibles y cableado de luces intermitentes',
        precio_total: 45000,
    },
    {
        id: 4,
        patente_vehiculo: 'PQRS78',
        descripcion_ingreso: 'Cambio de pastillas de freno delanteras y revisión de discos.',
        estado: 'lista',
        creado_por: 'mecanico-1-id',
        asignado_a: 'mecanico-1-id',
        fecha_ingreso: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        fecha_actualizacion: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        fecha_lista: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        fotos: [],
        cliente_nombre: 'Ana Torres',
        cliente_telefono: '+56923456789',
        detalle_trabajos: 'Cambio de pastillas de freno delanteras, revisión de discos (en buen estado)',
    },
];

// Simulador de delay para API
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API Mock: Buscar vehículo por patente
export async function mockBuscarVehiculoPorPatente(patente: string): Promise<VehiculoDB | null> {
    await delay(300);
    const normalized = patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return mockVehiculos.find(v => v.patente === normalized) || null;
}

// API Mock: Crear vehículo
export async function mockCrearVehiculo(vehiculo: Omit<VehiculoDB, 'fecha_creacion'>): Promise<VehiculoDB | null> {
    await delay(200);
    const newVehiculo: VehiculoDB = {
        ...vehiculo,
        fecha_creacion: new Date().toISOString(),
    };
    mockVehiculos.push(newVehiculo);
    return newVehiculo;
}

// API Mock: Obtener vehículos
export async function mockObtenerVehiculos(): Promise<VehiculoDB[]> {
    await delay(200);
    return [...mockVehiculos];
}

// API Mock: Obtener órdenes
export async function mockObtenerOrdenes(): Promise<OrdenDB[]> {
    await delay(300);
    return [...mockOrdenes];
}

// API Mock: Obtener órdenes de hoy
export async function mockObtenerOrdenesHoy(): Promise<OrdenDB[]> {
    await delay(300);
    const today = new Date().toDateString();
    return mockOrdenes.filter(o => new Date(o.fecha_ingreso).toDateString() === today);
}

// API Mock: Obtener orden por ID
export async function mockObtenerOrdenPorId(id: number): Promise<OrdenDB | null> {
    await delay(200);
    return mockOrdenes.find(o => o.id === id) || null;
}

// API Mock: Crear orden
export async function mockCrearOrden(orden: {
    patente_vehiculo: string;
    descripcion_ingreso: string;
    creado_por: string;
    estado?: string;
    fotos?: string[];
    cliente_nombre?: string;
    cliente_telefono?: string;
}): Promise<OrdenDB | null> {
    await delay(300);
    const newOrden: OrdenDB = {
        id: Math.max(...mockOrdenes.map(o => o.id), 0) + 1,
        patente_vehiculo: orden.patente_vehiculo.toUpperCase(),
        descripcion_ingreso: orden.descripcion_ingreso,
        creado_por: orden.creado_por,
        asignado_a: null,
        estado: orden.estado || 'pendiente',
        fotos: orden.fotos || [],
        cliente_nombre: orden.cliente_nombre,
        cliente_telefono: orden.cliente_telefono,
        fecha_ingreso: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
    };
    mockOrdenes.push(newOrden);
    return newOrden;
}

// API Mock: Actualizar orden
export async function mockActualizarOrden(
    id: number,
    updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>>
): Promise<OrdenDB | null> {
    await delay(200);
    const index = mockOrdenes.findIndex(o => o.id === id);
    if (index === -1) return null;

    mockOrdenes[index] = {
        ...mockOrdenes[index],
        ...updates,
        fecha_actualizacion: new Date().toISOString(),
    };
    return mockOrdenes[index];
}

// API Mock: Obtener perfiles
export async function mockObtenerPerfiles(): Promise<PerfilDB[]> {
    await delay(200);
    return [...mockPerfiles];
}

// API Mock: Obtener perfil por ID
export async function mockObtenerPerfilPorId(id: string): Promise<PerfilDB | null> {
    await delay(200);
    return mockPerfiles.find(p => p.id === id) || null;
}

// API Mock: Actualizar perfil
export async function mockActualizarPerfil(
    id: string,
    updates: Partial<Omit<PerfilDB, 'id'>>
): Promise<PerfilDB | null> {
    await delay(200);
    const index = mockPerfiles.findIndex(p => p.id === id);
    if (index === -1) return null;

    mockPerfiles[index] = {
        ...mockPerfiles[index],
        ...updates,
    };
    return mockPerfiles[index];
}

// API Mock: Crear usuario
export async function mockCrearUsuario(
    email: string,
    password: string,
    nombreCompleto: string,
    rol: 'admin' | 'mecanico'
): Promise<{ success: boolean; error?: string }> {
    await delay(300);
    const newPerfil: PerfilDB = {
        id: `mock-user-${Date.now()}`,
        nombre_completo: nombreCompleto,
        rol,
        activo: true,
    };
    mockPerfiles.push(newPerfil);
    return { success: true };
}

// API Mock: Login
export async function mockLoginConCredenciales(email: string, password: string): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
    error: string | null;
}> {
    await delay(300);
    // En modo demo, cualquier credencial funciona y devuelve el admin
    const perfil = mockPerfiles[0]; // Admin
    return {
        user: { id: perfil.id, email: email },
        perfil,
        error: null,
    };
}

// API Mock: Obtener sesión actual
export async function mockObtenerSesionActual(): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
}> {
    await delay(100);
    // En modo demo, siempre hay sesión activa (admin)
    const perfil = mockPerfiles[0];
    return {
        user: { id: perfil.id, email: 'admin@demo.com' },
        perfil,
    };
}

// API Mock: Obtener órdenes por usuario
export async function mockObtenerOrdenesPorUsuario(userId: string): Promise<{
    creadas: OrdenDB[];
    asignadas: OrdenDB[];
}> {
    await delay(200);
    return {
        creadas: mockOrdenes.filter(o => o.creado_por === userId),
        asignadas: mockOrdenes.filter(o => o.asignado_a === userId),
    };
}
