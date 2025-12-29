# 🗄️ INSTRUCCIONES SQL - ACTUALIZACIÓN BASE DE DATOS

## ⚠️ IMPORTANTE: EJECUTAR EN SUPABASE

Copia y pega este SQL en tu panel de Supabase (SQL Editor):

```sql
-- ============================================
-- ACTUALIZACIÓN TABLA ORDENES
-- ============================================

-- 1. Agregar nuevas columnas
ALTER TABLE ordenes 
ADD COLUMN IF NOT EXISTS cliente_nombre TEXT,
ADD COLUMN IF NOT EXISTS cliente_telefono TEXT,
ADD COLUMN IF NOT EXISTS cc TEXT, -- Cilindrada del vehículo
ADD COLUMN IF NOT EXISTS precio_total NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS detalle_trabajos TEXT,
ADD COLUMN IF NOT EXISTS fecha_lista TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fecha_completada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metodo_pago TEXT; -- 'efectivo', 'transferencia', 'tarjeta', etc.

-- 2. Actualizar constraint de estado para incluir 'lista'
ALTER TABLE ordenes 
DROP CONSTRAINT IF EXISTS ordenes_estado_check;

ALTER TABLE ordenes 
ADD CONSTRAINT ordenes_estado_check 
CHECK (estado IN ('pendiente', 'en_progreso', 'lista', 'completada', 'cancelada'));

-- 3. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_lista ON ordenes(fecha_lista) WHERE fecha_lista IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente_telefono ON ordenes(cliente_telefono);
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente_nombre ON ordenes(cliente_nombre);

-- 4. Comentarios para documentación
COMMENT ON COLUMN ordenes.cliente_nombre IS 'Nombre completo del cliente que trae el vehículo';
COMMENT ON COLUMN ordenes.cliente_telefono IS 'Teléfono de contacto del cliente';
COMMENT ON COLUMN ordenes.cc IS 'Cilindrada del motor del vehículo';
COMMENT ON COLUMN ordenes.precio_total IS 'Precio total del servicio en CLP';
COMMENT ON COLUMN ordenes.detalle_trabajos IS 'Descripción detallada de los trabajos realizados por el mecánico';
COMMENT ON COLUMN ordenes.fecha_lista IS 'Fecha cuando el mecánico marcó la orden como lista';
COMMENT ON COLUMN ordenes.fecha_completada IS 'Fecha cuando el admin completó la orden con precio y boleta';
COMMENT ON COLUMN ordenes.metodo_pago IS 'Método de pago utilizado por el cliente';

-- ============================================
-- ACTUALIZACIÓN TABLA VEHICULOS (opcional)
-- ============================================

-- Agregar campo CC si no existe
ALTER TABLE vehiculos 
ADD COLUMN IF NOT EXISTS cc TEXT;

COMMENT ON COLUMN vehiculos.cc IS 'Cilindrada del motor';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver estructura de la tabla ordenes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ordenes'
ORDER BY ordinal_position;
```

## ✅ DESPUÉS DE EJECUTAR EL SQL

1. Verifica que no haya errores
2. Refresca la página de Supabase
3. Ve a la tabla `ordenes` y confirma que las nuevas columnas aparecen
4. La aplicación ahora podrá guardar todos los datos del formulario

## 📋 NUEVOS CAMPOS AGREGADOS

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cliente_nombre` | TEXT | Nombre del cliente |
| `cliente_telefono` | TEXT | Teléfono del cliente |
| `cc` | TEXT | Cilindrada del vehículo |
| `precio_total` | NUMERIC | Precio total en CLP |
| `detalle_trabajos` | TEXT | Trabajos realizados |
| `fecha_lista` | TIMESTAMP | Cuando mecánico termina |
| `fecha_completada` | TIMESTAMP | Cuando admin genera boleta |
| `metodo_pago` | TEXT | Efectivo/Transferencia/Tarjeta |

## 🔄 FLUJO DE ESTADOS

```
pendiente → en_progreso → lista → completada
```

- **pendiente**: Orden recién creada
- **en_progreso**: Mecánico trabajando
- **lista**: Mecánico terminó, esperando admin
- **completada**: Admin agregó precio y generó boleta
- **cancelada**: Orden cancelada

## 🚀 PRÓXIMOS PASOS

1. ✅ Ejecutar SQL
2. ✅ Reiniciar servidor de desarrollo (`npm run dev`)
3. ✅ Probar crear una orden nueva
4. ✅ Verificar que los datos se guarden correctamente
