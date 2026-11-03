-- ============================================================
-- SCRIPT DE MIGRACIÓN 013: AUDITORÍA ADMINISTRATIVA Y CICLO DE VIDA DE INSTITUCIONES (ADMIN-01)
-- ReportARG
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Ampliar tabla instituciones con campos para motivo/fecha de rechazo y datos de contacto/identificación
ALTER TABLE instituciones
  ADD COLUMN motivo_rechazo TEXT NULL DEFAULT NULL AFTER status,
  ADD COLUMN fecha_rechazo TIMESTAMP NULL DEFAULT NULL AFTER motivo_rechazo,
  ADD COLUMN cuit VARCHAR(20) NULL DEFAULT NULL AFTER tipo,
  ADD COLUMN nombre_contacto VARCHAR(150) NULL DEFAULT NULL AFTER cuit;

-- 2. Backfill: asegurar consistencia entre verificada = 1 y status = 'approved'
UPDATE instituciones
SET status = 'approved'
WHERE verificada = 1 AND status != 'approved';

-- 3. Permitir provincia y ciudad NULL en ciudadanos para altas administrativas o perfiles sin residencia aún definida
ALTER TABLE ciudadanos
  MODIFY COLUMN provincia VARCHAR(100) NULL DEFAULT NULL,
  MODIFY COLUMN ciudad VARCHAR(100) NULL DEFAULT NULL;

-- 4. Crear tabla de auditoría administrativa e institucional
CREATE TABLE IF NOT EXISTS admin_auditoria (
  id_auditoria INT NOT NULL AUTO_INCREMENT,
  id_actor INT NULL DEFAULT NULL,
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id INT NOT NULL,
  accion VARCHAR(80) NOT NULL,
  motivo TEXT NULL DEFAULT NULL,
  datos_previos JSON NULL DEFAULT NULL,
  datos_nuevos JSON NULL DEFAULT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_auditoria),
  KEY idx_admin_auditoria_entidad (entidad_tipo, entidad_id),
  KEY idx_admin_auditoria_actor (id_actor),
  KEY idx_admin_auditoria_fecha (fecha_creacion),
  CONSTRAINT fk_admin_auditoria_actor FOREIGN KEY (id_actor) REFERENCES usuarios (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;

