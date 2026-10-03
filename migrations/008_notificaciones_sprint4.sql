-- ============================================================
-- SCRIPT DE MIGRACIÓN 008: NOTIFICACIONES INTERNAS (HU-22)
-- SPRINT 4 - ReportARG
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CREACIÓN DE TABLA NOTIFICACIONES (Idempotente)
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'CLAIM_STATUS_CHANGED',
  titulo VARCHAR(150) NOT NULL DEFAULT 'Notificación',
  mensaje TEXT NOT NULL,
  id_reclamo INT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_lectura TIMESTAMP NULL DEFAULT NULL,
  KEY idx_notif_usuario_fecha (id_usuario, fecha_creacion DESC),
  KEY idx_notif_usuario_leida (id_usuario, leida),
  KEY idx_notif_reclamo (id_reclamo),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_notificaciones_reclamo FOREIGN KEY (id_reclamo) REFERENCES reclamos (id_reclamo) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. PROCEDIMIENTO SEGURO PARA ENTORNOS CON ESQUEMA HISTÓRICO
DROP PROCEDURE IF EXISTS upgrade_notificaciones_schema;
DELIMITER $$
CREATE PROCEDURE upgrade_notificaciones_schema()
BEGIN
  -- Columna tipo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'tipo'
  ) THEN
    ALTER TABLE notificaciones ADD COLUMN tipo VARCHAR(50) NOT NULL DEFAULT 'CLAIM_STATUS_CHANGED';
  END IF;

  -- Columna titulo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'titulo'
  ) THEN
    ALTER TABLE notificaciones ADD COLUMN titulo VARCHAR(150) NOT NULL DEFAULT 'Notificación';
  END IF;

  -- Columna id_reclamo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'id_reclamo'
  ) THEN
    ALTER TABLE notificaciones ADD COLUMN id_reclamo INT NULL;
    ALTER TABLE notificaciones ADD CONSTRAINT fk_notificaciones_reclamo FOREIGN KEY (id_reclamo) REFERENCES reclamos (id_reclamo) ON DELETE SET NULL;
  END IF;

  -- Columna fecha_creacion
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'fecha_creacion'
  ) THEN
    ALTER TABLE notificaciones ADD COLUMN fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- Columna fecha_lectura
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'fecha_lectura'
  ) THEN
    ALTER TABLE notificaciones ADD COLUMN fecha_lectura TIMESTAMP NULL DEFAULT NULL;
  END IF;

  -- Índices
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND INDEX_NAME = 'idx_notif_usuario_fecha'
  ) THEN
    CREATE INDEX idx_notif_usuario_fecha ON notificaciones (id_usuario, fecha_creacion DESC);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND INDEX_NAME = 'idx_notif_usuario_leida'
  ) THEN
    CREATE INDEX idx_notif_usuario_leida ON notificaciones (id_usuario, leida);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND INDEX_NAME = 'idx_notif_reclamo'
  ) THEN
    CREATE INDEX idx_notif_reclamo ON notificaciones (id_reclamo);
  END IF;
END $$
DELIMITER ;

CALL upgrade_notificaciones_schema();
DROP PROCEDURE IF EXISTS upgrade_notificaciones_schema;

SET FOREIGN_KEY_CHECKS = 1;
