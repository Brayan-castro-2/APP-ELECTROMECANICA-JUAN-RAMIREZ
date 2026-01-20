import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://juyskcnwdpfnchytjfjq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1eXNrY253ZHBmbmNoeXRqZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MTQ0MjAsImV4cCI6MjA4MjA5MDQyMH0.g2ltE7bxoatObkNe17_A7niU2moUvZq9tsx-wV6DMe0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para las tablas de Supabase
export interface VehiculoDB {
    patente: string;
    marca: string;
    modelo: string;
    anio: string;
    motor?: string;
    color?: string;
    cliente_id?: number | null; // Agregado cliente_id
    fecha_creacion?: string;
}

export interface OrdenDB {
    id: number;
    patente_vehiculo: string;
    descripcion_ingreso: string;
    estado: 'pendiente' | 'en_progreso' | 'lista' | 'completada' | 'cancelada' | 'agendada' | 'debe';
    creado_por: string; // UUID
    asignado_a: string | null; // UUID
    fecha_ingreso: string;
    fecha_actualizacion: string;
    fotos?: string[];
    cliente_nombre?: string | null;
    cliente_telefono?: string | null;
    precio_total?: number;
    detalle_trabajos?: string | null;
    fecha_lista?: string | null;
    fecha_completada?: string | null;
    fecha_entrega?: string | null;
    metodos_pago?: Array<{ metodo: string; monto: number }> | null;
}

export interface OrdenConDetallesDB extends OrdenDB {
    vehiculos: VehiculoDB | null;
    perfiles_creado?: { nombre_completo: string; email: string } | null;
    perfiles_asignado?: { nombre_completo: string; email: string } | null;
}

export interface PerfilDB {
    id: string; // UUID (auth.users.id)
    email?: string;
    nombre_completo: string;
    rol: 'mecanico' | 'admin';
    activo: boolean;
}

export interface ClienteDB {
    id: number;
    nombre: string;
    telefono: string;
    email: string;
    fecha_creacion: string;
}

export interface CitaDB {
    id: number;
    fecha: string;
    cliente_nombre?: string | null;
    cliente_telefono?: string | null;
    patente_vehiculo?: string | null;
    servicio_solicitado?: string | null;
    notas?: string | null;
    estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
    creado_por?: string | null;
    creado_en: string;
    actualizado_en: string;
}
