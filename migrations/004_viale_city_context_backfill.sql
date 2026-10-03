-- ============================================================
-- SCRIPT DE MIGRACIÓN: CONTEXTO DE CIUDAD VIALE, BACKFILL TERRITORIAL & ESQUEMA ESTRICTO
-- ============================================================

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

-- 5. Aplicación de restricciones estrictas según el modelo de datos
-- usuarios.id_ciudad → NULL permitido (para ciudadanos en ciudades no activadas aún)
ALTER TABLE usuarios MODIFY COLUMN id_ciudad INT NULL DEFAULT NULL;

-- 5.1 Redefinición de FKs de ciudad a ON DELETE RESTRICT para poder aplicar la restricción NOT NULL
ALTER TABLE instituciones DROP FOREIGN KEY fk_instituciones_ciudad;
ALTER TABLE instituciones ADD CONSTRAINT fk_instituciones_ciudad FOREIGN KEY (id_ciudad) REFERENCES ciudades (id_ciudad) ON DELETE RESTRICT;

ALTER TABLE reclamos DROP FOREIGN KEY fk_reclamos_ciudad;
ALTER TABLE reclamos ADD CONSTRAINT fk_reclamos_ciudad FOREIGN KEY (id_ciudad) REFERENCES ciudades (id_ciudad) ON DELETE RESTRICT;

-- instituciones.id_ciudad → NOT NULL (toda institución operativa pertenece a una ciudad activa)
ALTER TABLE instituciones MODIFY COLUMN id_ciudad INT NOT NULL;

-- reclamos.id_ciudad → NOT NULL (todo reclamo pertenece a una ciudad activa)
ALTER TABLE reclamos MODIFY COLUMN id_ciudad INT NOT NULL;



