-- Migración 009: Soporte de imagen en comunicados oficiales (Sprint 4)
-- Permite a las instituciones adjuntar evidencia fotográfica en sus publicaciones.

ALTER TABLE comunicados ADD COLUMN imagen VARCHAR(500) NULL AFTER contenido;
