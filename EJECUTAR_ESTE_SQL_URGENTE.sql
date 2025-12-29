-- ⚠️ EJECUTAR ESTE SQL EN SUPABASE URGENTEMENTE ⚠️
-- Sin esto, las órdenes NO se pueden crear

-- 1. Agregar columnas faltantes a la tabla ordenes
ALTER TABLE ordenes 
ADD COLUMN IF NOT EXISTS cliente_nombre TEXT,
ADD COLUMN IF NOT EXISTS cliente_telefono TEXT,
ADD COLUMN IF NOT EXISTS cc TEXT,
ADD COLUMN IF NOT EXISTS precio_total NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS detalle_trabajos TEXT,
ADD COLUMN IF NOT EXISTS fecha_lista TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fecha_completada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metodo_pago TEXT;

-- 2. Actualizar constraint de estados
ALTER TABLE ordenes DROP CONSTRAINT IF EXISTS ordenes_estado_check;
ALTER TABLE ordenes ADD CONSTRAINT ordenes_estado_check 
CHECK (estado IN ('pendiente', 'en_progreso', 'lista', 'completada', 'cancelada'));

-- 3. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente_telefono ON ordenes(cliente_telefono);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_ingreso ON ordenes(fecha_ingreso);

-- 4. Verificar que se crearon correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes'
ORDER BY ordinal_position;

-- ✅ Si ves las columnas cliente_nombre y cliente_telefono en el resultado, está listo
