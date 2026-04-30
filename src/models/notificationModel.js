const db = require('../config/db');

const NotificationModel = {

  async getByUsuario(idUsuario, limite = 20) {
    const [rows] = await db.query(`
      SELECT
        id_notificacion AS id,
        mensaje,
        leida,
        fecha
      FROM notificaciones
      WHERE id_usuario = ?
      ORDER BY fecha DESC
      LIMIT ?
    `, [idUsuario, limite]);
    return rows;
  },

  async marcarLeida(idNotificacion, idUsuario) {
    const [result] = await db.query(`
      UPDATE notificaciones
      SET leida = 1
      WHERE id_notificacion = ? AND id_usuario = ?
    `, [idNotificacion, idUsuario]);
    return result.affectedRows;
  },

  async marcarTodasLeidas(idUsuario) {
    const [result] = await db.query(`
      UPDATE notificaciones
      SET leida = 1
      WHERE id_usuario = ? AND leida = 0
    `, [idUsuario]);
    return result.affectedRows;
  },

  async countNoLeidas(idUsuario) {
    const [[row]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM notificaciones
      WHERE id_usuario = ? AND leida = 0
    `, [idUsuario]);
    return row.total;
  },

  async crear({ idUsuario, mensaje }) {
    const [result] = await db.query(`
      INSERT INTO notificaciones (id_usuario, mensaje, leida)
      VALUES (?, ?, 0)
    `, [idUsuario, mensaje]);
    return result.insertId;
  },
};

module.exports = NotificationModel;