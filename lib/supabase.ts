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
    fecha_creacion?: string;
}

export interface OrdenDB {
    id: number;
    patente_vehiculo: string;
    descripcion_ingreso: string;
    estado: string; // 'pendiente' | 'en_progreso' | 'lista' | 'completada' | 'cancelada'
    creado_por: string; // UUID
    asignado_a: string | null; // UUID
    fecha_ingreso: string;
    fecha_actualizacion: string;
    fotos?: string[]; // Array de URLs de fotos
    // Datos del cliente
    cliente_nombre?: string;
    cliente_telefono?: string;
    // Datos de facturación (cuando admin agrega precio)
    precio_total?: number;
    detalle_trabajos?: string; // Descripción de trabajos realizados
    fecha_lista?: string; // Cuando mecánico marca como lista
    fecha_completada?: string; // Cuando admin completa con boleta
}

export interface PerfilDB {
    id: string; // UUID (auth.users.id)
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
