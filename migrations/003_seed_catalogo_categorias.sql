-- ============================================================
-- SCRIPT DE MIGRACIÓN: SEED CATÁLOGO DE CATEGORÍAS INICIAL (11 CATEGORÍAS)
-- ============================================================

INSERT INTO categorias (id_categoria, codigo, nombre, descripcion, tipo, estado, orden) VALUES
(1, 'LUZ', 'Cortes de luz', 'Problemas de suministro eléctrico, cortes o fallas en el servicio', 'ambos', 'activo', 3),
(2, 'AGUA', 'Problemas de agua', 'Falta de agua, baja presión o problemas de calidad', 'ambos', 'activo', 4),
(3, 'SEG', 'Seguridad', 'Robos, vandalismo o situaciones que representen riesgo', 'ambos', 'activo', 1),
(4, 'TRANS', 'Transporte público', 'Problemas en colectivos, paradas o frecuencia del servicio', 'ambos', 'activo', 5),
(5, 'RES', 'Residuos', 'Recolección de basura, acumulación o limpieza urbana', 'reclamo', 'activo', 7),
(6, 'OBR', 'Obras viales', 'Calles en mal estado, veredas rotas o trabajos inconclusos', 'reclamo', 'activo', 8),
(7, 'ALUM', 'Alumbrado público', 'Luminarias apagadas, rotas o con mal funcionamiento', 'reclamo', 'activo', 6),
(8, 'ESP', 'Espacios públicos', 'Problemas en plazas, parques o espacios comunitarios', 'reclamo', 'activo', 9),
(9, 'ALERT', 'Alertas', 'Avisos importantes como cortes programados o emergencias', 'comunicado', 'activo', 2),
(10, 'INFO', 'Información general', 'Comunicaciones informativas de interés general', 'comunicado', 'activo', 11),
(11, 'SALUD', 'Salud', 'Campañas de vacunación u otras iniciativas sanitarias', 'comunicado', 'activo', 10)
ON DUPLICATE KEY UPDATE
  codigo = VALUES(codigo),
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  tipo = VALUES(tipo),
  estado = 'activo',
  orden = VALUES(orden);

-- Asignar las categorías a la institución principal si no están vinculadas
INSERT IGNORE INTO institucion_categorias (id_institucion, id_categoria)
SELECT i.id_institucion, c.id_categoria
FROM instituciones i
CROSS JOIN categorias c;
