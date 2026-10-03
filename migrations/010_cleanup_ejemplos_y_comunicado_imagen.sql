-- Migración 010: Limpieza de reclamos de ejemplo para demo y remoción de imagen errónea en comunicado

-- 1. Eliminar dependencias en tablas hijas asociadas a los reclamos de prueba
DELETE FROM notificaciones 
WHERE id_reclamo IN (
  SELECT id_reclamo FROM (
    SELECT id_reclamo FROM reclamos 
    WHERE titulo IN ('Ejemplooooo', 'prueba de edición 2', 'Reclamo prueba')
  ) AS tmp
);

DELETE FROM reclamos_afectados 
WHERE id_reclamo IN (
  SELECT id_reclamo FROM (
    SELECT id_reclamo FROM reclamos 
    WHERE titulo IN ('Ejemplooooo', 'prueba de edición 2', 'Reclamo prueba')
  ) AS tmp
);

DELETE FROM reclamos_actualizaciones 
WHERE id_reclamo IN (
  SELECT id_reclamo FROM (
    SELECT id_reclamo FROM reclamos 
    WHERE titulo IN ('Ejemplooooo', 'prueba de edición 2', 'Reclamo prueba')
  ) AS tmp
);

DELETE FROM reclamos_historial 
WHERE id_reclamo IN (
  SELECT id_reclamo FROM (
    SELECT id_reclamo FROM reclamos 
    WHERE titulo IN ('Ejemplooooo', 'prueba de edición 2', 'Reclamo prueba')
  ) AS tmp
);

-- 2. Eliminar los reclamos de prueba
DELETE FROM reclamos 
WHERE titulo IN ('Ejemplooooo', 'prueba de edición 2', 'Reclamo prueba');

-- 3. Eliminar la imagen del comunicado 'Corte programado de agua potable'
UPDATE comunicados 
SET imagen = NULL 
WHERE titulo = 'Corte programado de agua potable';

-- 4. Asociar imagen de Cloudinary al comunicado 'Campaña de descacharrización contra el Dengue'
UPDATE comunicados 
SET imagen = 'https://res.cloudinary.com/dbozxsigi/image/upload/v1790999947/reportarg/comunicados/he0il4f01eoes0nsxeym.jpg' 
WHERE titulo = 'Campaña de descacharrización contra el Dengue';
