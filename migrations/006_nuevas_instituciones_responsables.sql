-- =========================================================================
-- MIGRACIÓN 006: Nuevas instituciones responsables
-- Propósito: 
-- 1. Limpiar asignaciones erróneas (San Miguel, etc.) que interceptaban reclamos
-- 2. Crear las instituciones reales para Viale (ENERSA, Obras Sanitarias, Policía)
-- 3. Asignarles sus categorías correspondientes para activar el ruteo automático
-- =========================================================================

-- 1. Limpiamos todas las asignaciones de categorías actuales
-- Esto evita que instituciones de prueba creadas manualmente sigan capturando reclamos
DELETE FROM institucion_categorias;

-- (Opcional) Limpiar instituciones de prueba para no ensuciar la BD,
-- excepto la Municipalidad de Viale (id_institucion = 10) que es la principal.
-- NOTA: Lo dejamos comentado para que decidas si querés borrarlas o no.
-- DELETE FROM instituciones WHERE id_institucion != 10; 
-- DELETE FROM usuarios WHERE tipo_usuario = 'institucion' AND id_usuario != (SELECT id_usuario FROM instituciones WHERE id_institucion = 10);

-- =========================================================
-- 2. ENERSA Viale (Luz / Alumbrado)
-- =========================================================
INSERT INTO usuarios (email, password, tipo_usuario, id_ciudad, activo) 
VALUES ('enersa@viale.gob.ar', '$2b$10$g8rbuJjHXgIHle74Hfy4HeWUP5X2DSOG1BjclqFDwncQawrpXH21y', 'institucion', 1, 1);
SET @id_user_enersa = LAST_INSERT_ID();

INSERT INTO instituciones (id_usuario, nombre, tipo, direccion, telefono, provincia, ciudad, id_ciudad, es_principal)
VALUES (@id_user_enersa, 'ENERSA Viale', 'Servicios Públicos', '25 de Mayo 123', '0343 492-1111', 'Entre Ríos', 'Viale', 1, 0);
SET @id_inst_enersa = LAST_INSERT_ID();

-- Asignar: Cortes de luz (1) y Alumbrado público (7)
INSERT INTO institucion_categorias (id_institucion, id_categoria) VALUES (@id_inst_enersa, 1);
INSERT INTO institucion_categorias (id_institucion, id_categoria) VALUES (@id_inst_enersa, 7);


-- =========================================================
-- 3. Obras Sanitarias Viale (Agua)
-- =========================================================
INSERT INTO usuarios (email, password, tipo_usuario, id_ciudad, activo) 
VALUES ('obrassanitarias@viale.gob.ar', '$2b$10$g8rbuJjHXgIHle74Hfy4HeWUP5X2DSOG1BjclqFDwncQawrpXH21y', 'institucion', 1, 1);
SET @id_user_agua = LAST_INSERT_ID();

INSERT INTO instituciones (id_usuario, nombre, tipo, direccion, telefono, provincia, ciudad, id_ciudad, es_principal)
VALUES (@id_user_agua, 'Obras Sanitarias Viale', 'Servicios Públicos', 'San Martín 456', '0343 492-2222', 'Entre Ríos', 'Viale', 1, 0);
SET @id_inst_agua = LAST_INSERT_ID();

-- Asignar: Problemas de agua (2)
INSERT INTO institucion_categorias (id_institucion, id_categoria) VALUES (@id_inst_agua, 2);


-- =========================================================
-- 4. Policía de Entre Ríos (Seguridad)
-- =========================================================
INSERT INTO usuarios (email, password, tipo_usuario, id_ciudad, activo) 
VALUES ('policia@viale.gob.ar', '$2b$10$g8rbuJjHXgIHle74Hfy4HeWUP5X2DSOG1BjclqFDwncQawrpXH21y', 'institucion', 1, 1);
SET @id_user_policia = LAST_INSERT_ID();

INSERT INTO instituciones (id_usuario, nombre, tipo, direccion, telefono, provincia, ciudad, id_ciudad, es_principal)
VALUES (@id_user_policia, 'Policía - Comisaría Viale', 'Seguridad', 'Urquiza 789', '0343 492-3333', 'Entre Ríos', 'Viale', 1, 0);
SET @id_inst_policia = LAST_INSERT_ID();

-- Asignar: Seguridad (3)
INSERT INTO institucion_categorias (id_institucion, id_categoria) VALUES (@id_inst_policia, 3);

-- =========================================================
-- RESULTADO DE ASIGNACIÓN (Automático por el código)
-- - Reclamo de Luz/Alumbrado -> ENERSA
-- - Reclamo de Agua -> Obras Sanitarias
-- - Reclamo de Seguridad -> Policía
-- - Reclamo de Residuos, Calles, etc (sin asignación explícita) -> Municipalidad de Viale (es_principal=1)
-- =========================================================
