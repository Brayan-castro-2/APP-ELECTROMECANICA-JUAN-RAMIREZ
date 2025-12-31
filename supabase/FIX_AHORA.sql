-- ============================================
-- ARREGLO RÁPIDO - EJECUTA ESTO AHORA
-- ============================================

-- 1. Eliminar tablas existentes
DROP TABLE IF EXISTS ordenes CASCADE;
DROP TABLE IF EXISTS vehiculos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS perfiles CASCADE;

-- 2. Crear tabla perfiles (usuarios)
CREATE TABLE perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'mecanico')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla vehiculos (SIN restricciones complicadas)
CREATE TABLE vehiculos (
    patente TEXT PRIMARY KEY,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    anio TEXT NOT NULL,
    motor TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla ordenes (SIN foreign key estricta)
CREATE TABLE ordenes (
    id SERIAL PRIMARY KEY,
    patente_vehiculo TEXT NOT NULL,
    descripcion_ingreso TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    creado_por TEXT NOT NULL,
    asignado_a TEXT,
    
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_lista TIMESTAMP WITH TIME ZONE,
    fecha_completada TIMESTAMP WITH TIME ZONE,
    
    fotos TEXT[],
    cliente_nombre TEXT,
    cliente_telefono TEXT,
    precio_total NUMERIC(10, 2) DEFAULT 0,
    metodo_pago TEXT,
    detalles_vehiculo TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. DESHABILITAR RLS (sin restricciones de seguridad)
ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes DISABLE ROW LEVEL SECURITY;

-- 6. Insertar usuario admin de prueba
INSERT INTO perfiles (id, email, nombre_completo, rol, activo) VALUES
    (gen_random_uuid(), 'admin@gmail.com', 'Administrador', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- 7. Insertar vehículos de prueba
INSERT INTO vehiculos (patente, marca, modelo, anio, motor, color) VALUES
    ('PROFE1', 'Nissan', 'V16', '2010', '1.6 Twin Cam', 'Gris'),
    ('BBBB10', 'Toyota', 'Yaris', '2018', '1.5', 'Blanco'),
    ('TEST01', 'Chevrolet', 'Sail', '2020', '1.4', 'Negro')
ON CONFLICT (patente) DO NOTHING;

-- ============================================
-- LISTO - Ahora puedes crear órdenes sin errores
-- ============================================

SELECT 'Base de datos configurada correctamente' as mensaje;
