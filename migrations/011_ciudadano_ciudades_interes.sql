-- ============================================================
-- SCRIPT DE MIGRACIÓN 011: CIUDADES DE INTERÉS DEL CIUDADANO (CITY-02)
-- ReportARG
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Asegurar que usuarios.id_ciudad permita NULL sin valor por defecto forzado
ALTER TABLE usuarios MODIFY COLUMN id_ciudad INT NULL DEFAULT NULL;

-- 2. Tabla de relación entre ciudadanos y sus ciudades adicionales de interés (máximo 3 por regla de negocio)
CREATE TABLE IF NOT EXISTS ciudadano_ciudades_interes (
  id_usuario INT NOT NULL,
  id_ciudad INT NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_ciudad),
  KEY idx_ciudades_interes_ciudad (id_ciudad),
  CONSTRAINT fk_ciudades_interes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_ciudades_interes_ciudad FOREIGN KEY (id_ciudad) REFERENCES ciudades (id_ciudad) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
