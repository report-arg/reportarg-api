-- ============================================================
-- SCRIPT DE MIGRACIÓN 005: LIMPIEZA DE RECLAMOS LEGACY DE INSTITUCIONES (DATOS DE PRUEBA)
-- ============================================================
-- PROPÓSITO:
-- Eliminar de forma controlada los datos de prueba creados incorrectamente dentro de la tabla `reclamos`
-- por usuarios de tipo `institucion` antes de la separación estructural del módulo de Comunicados.
--
-- NOTA IMPORTANTE:
-- ReportARG se encuentra en desarrollo académico y los datos preexistentes son exclusivamente ficticios/prueba.
-- No se realiza migración hacia la tabla `comunicados`. Los nuevos comunicados se crearán
-- mediante sus endpoints correspondientes.
--
-- IDENTIFICACIÓN ESTRUCTURAL:
-- Los registros a eliminar corresponden estrictamente a reclamos cuyo `id_usuario` pertenece a una `institucion`.
-- ============================================================

-- 1. Eliminar adjuntos asociados a reclamos de prueba de instituciones
DELETE FROM adjuntos_reclamos 
WHERE id_reclamo IN (
    SELECT r.id_reclamo 
    FROM reclamos r 
    INNER JOIN instituciones i ON i.id_usuario = r.id_usuario
);

-- 2. Eliminar comentarios asociados a reclamos de prueba de instituciones
DELETE FROM comentarios 
WHERE id_reclamo IN (
    SELECT r.id_reclamo 
    FROM reclamos r 
    INNER JOIN instituciones i ON i.id_usuario = r.id_usuario
);

-- 3. Eliminar historial de estado legacy asociado a reclamos de prueba de instituciones
DELETE FROM historial_estado_reclamo 
WHERE id_reclamo IN (
    SELECT r.id_reclamo 
    FROM reclamos r 
    INNER JOIN instituciones i ON i.id_usuario = r.id_usuario
);

-- 4. Eliminar historial de eventos del Sprint 4 asociado a reclamos de prueba de instituciones
DELETE FROM reclamos_historial 
WHERE id_reclamo IN (
    SELECT r.id_reclamo 
    FROM reclamos r 
    INNER JOIN instituciones i ON i.id_usuario = r.id_usuario
);

-- 5. Eliminar actualizaciones del Sprint 4 asociadas a reclamos de prueba de instituciones
DELETE FROM reclamos_actualizaciones 
WHERE id_reclamo IN (
    SELECT r.id_reclamo 
    FROM reclamos r 
    INNER JOIN instituciones i ON i.id_usuario = r.id_usuario
);

-- 6. Eliminar registros de afectación ("A mí también me pasa") asociados a reclamos de prueba de instituciones
DELETE FROM reclamos_afectados 
WHERE id_reclamo IN (
    SELECT r.id_reclamo 
    FROM reclamos r 
    INNER JOIN instituciones i ON i.id_usuario = r.id_usuario
);

-- 7. Eliminar finalmente los reclamos de prueba creados por usuarios de tipo institución
DELETE r FROM reclamos r
INNER JOIN instituciones i ON i.id_usuario = r.id_usuario;
