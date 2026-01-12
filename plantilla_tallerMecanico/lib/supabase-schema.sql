-- Tabla de Citas/Agendamiento
-- Ejecutar este SQL en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS citas (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    cliente_nombre VARCHAR(255),
    cliente_telefono VARCHAR(20),
    patente_vehiculo VARCHAR(10),
    servicio_solicitado TEXT,
    notas TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, confirmada, completada, cancelada
    creado_por UUID REFERENCES auth.users(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
CREATE INDEX IF NOT EXISTS idx_citas_patente ON citas(patente_vehiculo);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);

-- RLS (Row Level Security)
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden ver todas las citas
CREATE POLICY "Usuarios autenticados pueden ver citas"
    ON citas FOR SELECT
    TO authenticated
    USING (true);

-- Política: Todos los usuarios autenticados pueden crear citas
CREATE POLICY "Usuarios autenticados pueden crear citas"
    ON citas FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política: Todos los usuarios autenticados pueden actualizar citas
CREATE POLICY "Usuarios autenticados pueden actualizar citas"
    ON citas FOR UPDATE
    TO authenticated
    USING (true);

-- Política: Solo admins pueden eliminar citas
CREATE POLICY "Solo admins pueden eliminar citas"
    ON citas FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM perfiles
            WHERE perfiles.id = auth.uid()
            AND perfiles.rol = 'admin'
        )
    );
