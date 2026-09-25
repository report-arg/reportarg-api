const db = require('../config/db');
const { CLAIM_STATUSES } = require('../constants/publication');

const ClaimModel = {

  /**
   * Cuenta la cantidad de reclamos en estado 'Pendiente' creados por un ciudadano. (HU-01 CA 8: Máx 3 reclamos pendientes)
   * @param {number} idUsuario
   */
  async countPendientesByUsuario(idUsuario) {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS total FROM reclamos WHERE id_usuario = ? AND estado = ?`,
      [idUsuario, CLAIM_STATUSES.PENDIENTE]
    );
    return row.total;
  },

  /**
   * Crea un nuevo reclamo público o privado (HU-01, HU-02, HU-03)
   */
  async crear({ titulo, descripcion, id_categoria, id_usuario, id_ciudad = 1, id_institucion = null, direccion, latitud, longitud, visibilidad = 'publico' }) {
    const [result] = await db.query(
      `INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, id_ciudad, id_institucion, direccion, latitud, longitud, visibilidad, estado, fecha_creacion, fecha_ultimo_cambio_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        titulo || null,
        descripcion || null,
        id_categoria,
        id_usuario,
        id_ciudad,
        id_institucion,
        direccion || null,
        latitud || null,
        longitud || null,
        visibilidad,
        CLAIM_STATUSES.PENDIENTE
      ]
    );
    return result.insertId;
  },

  /**
   * Obtiene todos los reclamos propios del ciudadano autenticado (HU-06)
   */
  async getByUsuario(idUsuario) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.visibilidad,
        r.editado,
        r.direccion,
        r.latitud,
        r.longitud,
        r.fecha_creacion,
        c.id_categoria   AS categoriaId,
        c.nombre         AS categoriaNombre,
        inst.id_institucion AS institucionId,
        inst.nombre      AS institucionNombre
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      LEFT JOIN instituciones inst ON inst.id_institucion = r.id_institucion
      WHERE r.id_usuario = ?
      ORDER BY r.fecha_creacion DESC
    `, [idUsuario]);
    return rows;
  },

  /**
   * Obtiene únicamente los reclamos públicos de una ciudad determinada (HU-07)
   */
  async getPublicosPorCiudad(idCiudad = 1) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.visibilidad,
        r.editado,
        r.direccion,
        r.latitud,
        r.longitud,
        r.fecha_creacion,
        c.id_categoria   AS categoriaId,
        c.nombre         AS categoriaNombre,
        inst.id_institucion AS institucionId,
        inst.nombre      AS institucionNombre,
        (SELECT COUNT(*) FROM reclamos_afectados ra WHERE ra.id_reclamo = r.id_reclamo) AS afectadosCount
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      LEFT JOIN instituciones inst ON inst.id_institucion = r.id_institucion
      WHERE r.visibilidad = 'publico' AND (r.id_ciudad = ? OR r.id_ciudad IS NULL)
      ORDER BY r.fecha_creacion DESC
    `, [idCiudad]);
    return rows;
  },

  /**
   * Obtiene el detalle completo de un reclamo por su ID (HU-08)
   */
  async getById(id) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.visibilidad,
        r.editado,
        r.id_ciudad,
        r.id_institucion,
        r.direccion,
        r.latitud,
        r.longitud,
        r.motivo_cancelacion,
        r.cancelado_por_tipo,
        r.mensaje_resolucion,
        r.fecha_resolucion,
        r.fecha_ultimo_cambio_estado,
        r.fecha_creacion,
        r.id_usuario,
        c.id_categoria   AS categoriaId,
        c.nombre         AS categoriaNombre,
        c.descripcion    AS categoriaDesc,
        inst.id_institucion AS institucionId,
        inst.nombre      AS institucionNombre,
        COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), u.email) AS autorNombre,
        u.email          AS autorEmail,
        (SELECT COUNT(*) FROM reclamos_afectados ra WHERE ra.id_reclamo = r.id_reclamo) AS afectadosCount
      FROM reclamos r
      LEFT JOIN categorias   c    ON c.id_categoria   = r.id_categoria
      LEFT JOIN usuarios     u    ON u.id_usuario     = r.id_usuario
      LEFT JOIN ciudadanos   ci   ON ci.id_usuario    = r.id_usuario
      LEFT JOIN instituciones inst ON inst.id_institucion = r.id_institucion
      WHERE r.id_reclamo = ?
    `, [id]);
    return rows[0] || null;
  },

  /**
   * Actualiza el estado de un reclamo
   */
  async updateEstado(id, estado) {
    const [result] = await db.query(
      `UPDATE reclamos
       SET estado = ?, fecha_ultimo_cambio_estado = NOW()
       WHERE id_reclamo = ?`,
      [estado, id]
    );
    return result.affectedRows;
  },

  /**
   * Obtiene los reclamos con ubicación para el mapa público (excluyendo reclamos privados HU-02)
   */
  async getParaMapa(idCiudad = 1) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo AS id,
        r.titulo,
        r.estado,
        r.direccion,
        r.latitud,
        r.longitud,
        c.nombre AS categoriaNombre
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      WHERE r.latitud IS NOT NULL AND r.longitud IS NOT NULL
        AND r.visibilidad = 'publico'
        AND (r.id_ciudad = ? OR r.id_ciudad IS NULL)
      ORDER BY r.fecha_creacion DESC
    `, [idCiudad]);
    return rows;
  }
};

module.exports = ClaimModel;
