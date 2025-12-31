-- ============================================
-- DATOS DE PRUEBA PARA ELECTROMECÁNICA JR
-- Ejecutar DESPUÉS de crear usuarios en Supabase Auth
-- ============================================

-- IMPORTANTE: Reemplaza estos UUIDs con los UUIDs reales de tus usuarios de Supabase Auth
-- Para obtener los UUIDs:
-- 1. Ve a Supabase Dashboard > Authentication > Users
-- 2. Copia el UUID de cada usuario
-- 3. Reemplaza los valores aquí

-- Ejemplo de vehículos de prueba
INSERT INTO vehiculos (patente, marca, modelo, anio, motor, color) VALUES
    ('PROFE1', 'Nissan', 'V16', '2010', '1.6 Twin Cam', 'Gris'),
    ('BBBB10', 'Toyota', 'Yaris', '2018', '1.5', 'Blanco'),
    ('TEST01', 'Chevrolet', 'Sail', '2020', '1.4', 'Negro')
ON CONFLICT (patente) DO NOTHING;

-- Nota: Para crear órdenes de prueba, necesitas primero tener usuarios en la tabla perfiles
-- Ejemplo (reemplaza los UUIDs con los reales):
-- INSERT INTO ordenes (patente_vehiculo, descripcion_ingreso, estado, creado_por, asignado_a, precio_total) VALUES
--     ('PROFE1', 'Motor: 1.6 Twin Cam\n\nServicios:\n- Scanner: $50.000', 'pendiente', 'tu-uuid-admin', 'tu-uuid-mecanico', 50000);
