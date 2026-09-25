-- ============================================================
-- SCRIPT DE MIGRACIÓN: CONTEXTO DE CIUDAD VIALE & BACKFILL LEGACY (ReportARG)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Obtener/Verificar la existencia de Viale (Entre Ríos) como ciudad activa
INSERT INTO ciudades (nombre, provincia, activa)
SELECT 'Viale', 'Entre Ríos', 1
WHERE NOT EXISTS (
    SELECT 1 FROM ciudades WHERE LOWER(nombre) = 'viale' AND LOWER(provincia) = 'entre ríos'
);

-- Variable temporal para almacenar el ID dinámico de Viale (sin hardcodear id_ciudad = 1)
SET @viale_id := (
    SELECT id_ciudad FROM ciudades 
    WHERE LOWER(nombre) = 'viale' AND LOWER(provincia) = 'entre ríos' 
    LIMIT 1
);

-- 2. Backfill idempotente de usuarios legacy existentes sin ciudad -> Viale (@viale_id)
UPDATE usuarios 
SET id_ciudad = @viale_id 
WHERE id_ciudad IS NULL;

-- 3. Backfill idempotente de instituciones legacy existentes sin ciudad -> Viale (@viale_id)
UPDATE instituciones 
SET id_ciudad = @viale_id 
WHERE id_ciudad IS NULL;

-- 4. Backfill idempotente de reclamos legacy existentes sin ciudad -> Viale (@viale_id)
UPDATE reclamos 
SET id_ciudad = @viale_id 
WHERE id_ciudad IS NULL;

-- 5. Eliminar DEFAULT 1 peligrosos de la estructura permitiendo DEFAULT NULL
ALTER TABLE usuarios MODIFY COLUMN id_ciudad INT NULL DEFAULT NULL;
ALTER TABLE instituciones MODIFY COLUMN id_ciudad INT NULL DEFAULT NULL;
ALTER TABLE reclamos MODIFY COLUMN id_ciudad INT NULL DEFAULT NULL;

SET FOREIGN_KEY_CHECKS = 1;
