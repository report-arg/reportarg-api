const db = require('../../config/db');

const NotificationModel = {

  /**
   * Obtiene las notificaciones pertenecientes al usuario autenticado.
   * @param {number} idUsuario
   * @param {Object} [filtros]
   * @param {number} [filtros.limite=20]
   * @param {boolean} [filtros.soloNoLeidas=false]
   * @param {boolean} [filtros.soloLeidas=false]
   */
  async getByUsuario(idUsuario, { limite = 20, soloNoLeidas = false, soloLeidas = false } = {}) {
    const limitNum = Math.max(1, Math.min(Number(limite) || 20, 100));
    let whereClause = 'WHERE n.id_usuario = ?';
    const params = [Number(idUsuario)];

    if (soloNoLeidas) {
      whereClause += ' AND n.leida = 0';
    } else if (soloLeidas) {
      whereClause += ' AND n.leida = 1';
    }

    params.push(limitNum);

    const [rows] = await db.query(`
      SELECT
        n.id_notificacion AS id,
        n.id_notificacion,
        n.id_usuario,
        COALESCE(n.tipo, 'CLAIM_STATUS_CHANGED') AS tipo,
        COALESCE(n.titulo, 'Notificación') AS titulo,
        n.mensaje,
        n.id_reclamo,
        n.leida,
        COALESCE(n.fecha_creacion, n.fecha) AS fecha_creacion,
        COALESCE(n.fecha_creacion, n.fecha) AS fecha,
        n.fecha_lectura,
        r.titulo AS reclamo_titulo
      FROM notificaciones n
      LEFT JOIN reclamos r ON r.id_reclamo = n.id_reclamo
      ${whereClause}
      ORDER BY COALESCE(n.fecha_creacion, n.fecha) DESC
      LIMIT ?
    `, params);

    return rows.map(r => ({
      ...r,
      leida: Boolean(r.leida),
    }));
  },

  /**
   * Obtiene una notificación por su ID y valida destinatario si se provee idUsuario.
   */
  async getById(idNotificacion, idUsuario = null) {
    const params = [Number(idNotificacion)];
    let sql = 'SELECT * FROM notificaciones WHERE id_notificacion = ?';
    if (idUsuario !== null) {
      sql += ' AND id_usuario = ?';
      params.push(Number(idUsuario));
    }
    const [[row]] = await db.query(sql, params);
    return row || null;
  },

  /**
   * Marca una notificación específica como leída si pertenece al usuario.
   * @returns {number} Cantidad de filas afectadas (1 si fue actualizada, 0 si no existe o no pertenece al usuario)
   */
  async marcarLeida(idNotificacion, idUsuario) {
    const [result] = await db.query(`
      UPDATE notificaciones
      SET leida = 1, fecha_lectura = NOW()
      WHERE id_notificacion = ? AND id_usuario = ?
    `, [Number(idNotificacion), Number(idUsuario)]);
    return result.affectedRows;
  },

  /**
   * Marca todas las notificaciones pendientes del usuario como leídas.
   * @returns {number} Cantidad de notificaciones actualizadas
   */
  async marcarTodasLeidas(idUsuario) {
    const [result] = await db.query(`
      UPDATE notificaciones
      SET leida = 1, fecha_lectura = NOW()
      WHERE id_usuario = ? AND leida = 0
    `, [Number(idUsuario)]);
    return result.affectedRows;
  },

  /**
   * Cuenta las notificaciones no leídas de un usuario.
   */
  async countNoLeidas(idUsuario) {
    const [[row]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM notificaciones
      WHERE id_usuario = ? AND leida = 0
    `, [Number(idUsuario)]);
    return row ? Number(row.total) : 0;
  },

  /**
   * Registra una nueva notificación en la base de datos.
   * Soporta inyección de connection para operaciones transaccionales.
   */
  async crear({
    id_usuario,
    idUsuario,
    tipo = 'CLAIM_STATUS_CHANGED',
    titulo = 'Notificación',
    mensaje,
    id_reclamo = null,
    idReclamo = null,
  }, connection = db) {
    const uid = id_usuario !== undefined ? id_usuario : idUsuario;
    const cid = id_reclamo !== undefined ? id_reclamo : idReclamo;

    if (!uid) {
      throw new Error('id_usuario es obligatorio para crear una notificación');
    }
    if (!mensaje || !mensaje.trim()) {
      throw new Error('mensaje es obligatorio para crear una notificación');
    }

    const [result] = await connection.query(`
      INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, id_reclamo, leida, fecha_creacion)
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `, [Number(uid), tipo, titulo, mensaje.trim(), cid ? Number(cid) : null]);

    return result?.insertId || 1;
  },
};

module.exports = NotificationModel;