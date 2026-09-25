const db = require('../config/db');

const HistorialModel = {
  /**
   * Registra un evento inmutable en el historial de auditoría de un reclamo.
   * @param {Object} params
   * @param {number} params.id_reclamo
   * @param {number} params.id_usuario
   * @param {string} params.tipo_evento ('CREACION', 'EDICION', 'CAMBIO_ESTADO', 'CANCELACION', 'RESOLUCION', 'REAPERTURA', 'REASIGNACION')
   * @param {string} [params.detalle]
   * @param {string} [params.estado_anterior]
   * @param {string} [params.estado_nuevo]
   */
  async registrar({ id_reclamo, id_usuario, tipo_evento, detalle = null, estado_anterior = null, estado_nuevo = null }) {
    const [result] = await db.query(
      `INSERT INTO reclamos_historial (id_reclamo, id_usuario, tipo_evento, detalle, estado_anterior, estado_nuevo, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id_reclamo, id_usuario, tipo_evento, detalle, estado_anterior, estado_nuevo]
    );
    return result.insertId;
  },

  /**
   * Obtiene la cronología completa e inmutable de eventos de un reclamo.
   * @param {number} idReclamo
   */
  async getByReclamo(idReclamo) {
    const [rows] = await db.query(
      `SELECT
        h.id_historial AS id,
        h.id_reclamo,
        h.id_usuario,
        h.tipo_evento,
        h.detalle,
        h.estado_anterior,
        h.estado_nuevo,
        h.fecha_creacion,
        COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), inst.nombre, u.email) AS autorNombre,
        u.rol AS autorRol
       FROM reclamos_historial h
       LEFT JOIN usuarios u ON u.id_usuario = h.id_usuario
       LEFT JOIN ciudadanos ci ON ci.id_usuario = h.id_usuario
       LEFT JOIN instituciones inst ON inst.id_usuario = h.id_usuario
       WHERE h.id_reclamo = ?
       ORDER BY h.fecha_creacion ASC`,
      [idReclamo]
    );
    return rows;
  }
};

module.exports = HistorialModel;
