-- ============================================
-- CONFIGURACIÓN SIMPLE DE SUPABASE
-- Para desarrollo - Permisos permisivos
-- ============================================

-- Eliminar tablas existentes si existen
DROP TABLE IF EXISTS ordenes CASCADE;
DROP TABLE IF EXISTS vehiculos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS perfiles CASCADE;

-- ============================================
-- TABLA: perfiles (usuarios del sistema)
-- ============================================
CREATE TABLE perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'mecanico')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: clientes
-- ============================================
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: vehiculos
-- ============================================
CREATE TABLE vehiculos (
    patente TEXT PRIMARY KEY,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    anio TEXT NOT NULL,
    motor TEXT,
    color TEXT,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: ordenes
-- ============================================
CREATE TABLE ordenes (
    id SERIAL PRIMARY KEY,
    patente_vehiculo TEXT NOT NULL REFERENCES vehiculos(patente) ON DELETE CASCADE,
    descripcion_ingreso TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),
    creado_por UUID NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
    asignado_a UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    
    -- Campos de fechas
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_lista TIMESTAMP WITH TIME ZONE,
    fecha_completada TIMESTAMP WITH TIME ZONE,
    
    -- Campos adicionales
    fotos TEXT[],
    cliente_nombre TEXT,
    cliente_telefono TEXT,
    precio_total NUMERIC(10, 2) DEFAULT 0,
    metodo_pago TEXT,
    detalles_vehiculo TEXT,
    detalle_trabajos TEXT,
    cc TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_ordenes_patente ON ordenes(patente_vehiculo);
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_fecha_ingreso ON ordenes(fecha_ingreso DESC);

-- ============================================
-- DESHABILITAR RLS (Para desarrollo)
-- ============================================
ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DATOS DE PRUEBA
-- ============================================

-- Insertar perfiles de ejemplo (Reemplaza los UUIDs después de crear usuarios en Auth)
INSERT INTO perfiles (id, email, nombre_completo, rol, activo) VALUES
    (gen_random_uuid(), 'admin@electromecanicajr.cl', 'Administrador', 'admin', true),
    (gen_random_uuid(), 'mecanico@electromecanicajr.cl', 'Mecánico Principal', 'mecanico', true)
ON CONFLICT (email) DO NOTHING;

-- Insertar vehículos de prueba
INSERT INTO vehiculos (patente, marca, modelo, anio, motor, color) VALUES
    ('PROFE1', 'Nissan', 'V16', '2010', '1.6 Twin Cam', 'Gris'),
    ('BBBB10', 'Toyota', 'Yaris', '2018', '1.5', 'Blanco'),
    ('TEST01', 'Chevrolet', 'Sail', '2020', '1.4', 'Negro'),
    ('XH6640', 'Toyota', 'Corolla', '2019', '1.8', 'Plata')
ON CONFLICT (patente) DO NOTHING;

-- ============================================
-- MENSAJE DE ÉXITO
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos configurada correctamente';
    RAISE NOTICE '⚠️ RLS DESHABILITADO - Solo para desarrollo';
    RAISE NOTICE '📝 Próximo paso: Crear usuarios en Authentication';
END $$;
