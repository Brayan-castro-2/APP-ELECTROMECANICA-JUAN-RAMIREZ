-- Verificar si la columna 'motor' existe en la tabla vehiculos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehiculos';

-- Si la columna 'motor' NO existe, ejecuta esto para agregarla:
-- ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS motor TEXT;

-- Verificar datos actuales de vehículos
SELECT * FROM vehiculos;
