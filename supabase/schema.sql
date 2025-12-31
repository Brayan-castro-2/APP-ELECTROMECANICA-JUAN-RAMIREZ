-- ============================================
-- SCHEMA SQL PARA ELECTROMECÁNICA JR
-- Base de datos Supabase
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: perfiles (usuarios del sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'mecanico')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para perfiles
CREATE INDEX idx_perfiles_email ON perfiles(email);
CREATE INDEX idx_perfiles_rol ON perfiles(rol);
CREATE INDEX idx_perfiles_activo ON perfiles(activo);

-- ============================================
-- TABLA: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para clientes
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_email ON clientes(email);

-- ============================================
-- TABLA: vehiculos
-- ============================================
CREATE TABLE IF NOT EXISTS vehiculos (
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

-- Índices para vehículos
CREATE INDEX idx_vehiculos_cliente_id ON vehiculos(cliente_id);
CREATE INDEX idx_vehiculos_marca ON vehiculos(marca);

-- ============================================
-- TABLA: ordenes
-- ============================================
CREATE TABLE IF NOT EXISTS ordenes (
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

-- Índices para órdenes
CREATE INDEX idx_ordenes_patente ON ordenes(patente_vehiculo);
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_creado_por ON ordenes(creado_por);
CREATE INDEX idx_ordenes_asignado_a ON ordenes(asignado_a);
CREATE INDEX idx_ordenes_fecha_ingreso ON ordenes(fecha_ingreso DESC);
CREATE INDEX idx_ordenes_fecha_completada ON ordenes(fecha_completada DESC);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_perfiles_updated_at
    BEFORE UPDATE ON perfiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehiculos_updated_at
    BEFORE UPDATE ON vehiculos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordenes_updated_at
    BEFORE UPDATE ON ordenes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles (solo usuarios autenticados pueden ver)
CREATE POLICY "Usuarios autenticados pueden ver perfiles"
    ON perfiles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden insertar perfiles"
    ON perfiles FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden actualizar perfiles"
    ON perfiles FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Políticas para clientes (todos los usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden ver clientes"
    ON clientes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear clientes"
    ON clientes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar clientes"
    ON clientes FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Políticas para vehículos (todos los usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden ver vehiculos"
    ON vehiculos FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear vehiculos"
    ON vehiculos FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar vehiculos"
    ON vehiculos FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Políticas para órdenes (todos los usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden ver ordenes"
    ON ordenes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear ordenes"
    ON ordenes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar ordenes"
    ON ordenes FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar usuarios por defecto (CAMBIAR ESTOS IDs después de crear usuarios en Supabase Auth)
-- Nota: Estos son ejemplos, debes usar los UUIDs reales de Supabase Auth
INSERT INTO perfiles (id, email, nombre_completo, rol, activo) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@electromecanicajr.cl', 'Administrador', 'admin', true),
    ('00000000-0000-0000-0000-000000000002', 'mecanico@electromecanicajr.cl', 'Mecánico Principal', 'mecanico', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de órdenes con información completa
CREATE OR REPLACE VIEW ordenes_completas AS
SELECT 
    o.id,
    o.patente_vehiculo,
    v.marca,
    v.modelo,
    v.anio,
    v.motor,
    o.descripcion_ingreso,
    o.estado,
    o.precio_total,
    o.metodo_pago,
    o.fecha_ingreso,
    o.fecha_completada,
    o.detalles_vehiculo,
    o.fotos,
    o.cliente_nombre,
    o.cliente_telefono,
    p_creado.nombre_completo as creado_por_nombre,
    p_creado.email as creado_por_email,
    p_asignado.nombre_completo as asignado_a_nombre,
    p_asignado.email as asignado_a_email
FROM ordenes o
LEFT JOIN vehiculos v ON o.patente_vehiculo = v.patente
LEFT JOIN perfiles p_creado ON o.creado_por = p_creado.id
LEFT JOIN perfiles p_asignado ON o.asignado_a = p_asignado.id;

-- Vista de estadísticas diarias
CREATE OR REPLACE VIEW estadisticas_diarias AS
SELECT 
    DATE(fecha_ingreso) as fecha,
    COUNT(*) as total_ordenes,
    COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
    COUNT(*) FILTER (WHERE estado = 'en_progreso') as en_progreso,
    COUNT(*) FILTER (WHERE estado = 'completada') as completadas,
    COALESCE(SUM(precio_total), 0) as ingresos_total,
    COALESCE(SUM(precio_total) FILTER (WHERE estado = 'completada'), 0) as ingresos_completados
FROM ordenes
GROUP BY DATE(fecha_ingreso)
ORDER BY fecha DESC;

-- ============================================
-- COMENTARIOS EN TABLAS
-- ============================================

COMMENT ON TABLE perfiles IS 'Usuarios del sistema (admin y mecánicos)';
COMMENT ON TABLE clientes IS 'Clientes propietarios de vehículos';
COMMENT ON TABLE vehiculos IS 'Vehículos registrados en el taller';
COMMENT ON TABLE ordenes IS 'Órdenes de trabajo del taller';

COMMENT ON COLUMN ordenes.fotos IS 'Array de URLs de imágenes del vehículo';
COMMENT ON COLUMN ordenes.detalles_vehiculo IS 'Descripción libre del estado del vehículo';
COMMENT ON COLUMN ordenes.precio_total IS 'Precio final de la orden';
COMMENT ON COLUMN ordenes.metodo_pago IS 'Método de pago utilizado';
