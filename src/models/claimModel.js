const db = require('../config/db');
const { CLAIM_STATUSES } = require('../constants/publication');

const CLAIM_FROM = `
  FROM reclamos r
  LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
`;

const CLAIM_FILTER = 'WHERE inst.id_usuario IS NULL';

const ClaimModel = {

  async getStats() {
    const countByStatus = async (status = null) => {
      const where = status ? `${CLAIM_FILTER} AND r.estado = ?` : CLAIM_FILTER;
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS total ${CLAIM_FROM} ${where}`,
        status ? [status] : []
      );
      return row.total;
    };

    const [total, recibidos, enProceso, resueltos, rechazados] = await Promise.all([
      countByStatus(),
      countByStatus(CLAIM_STATUSES.RECIBIDO),
      countByStatus(CLAIM_STATUSES.EN_PROCESO),
      countByStatus(CLAIM_STATUSES.RESUELTO),
      countByStatus(CLAIM_STATUSES.RECHAZADO),
    ]);
    return {
      total,
      recibidos,
      enProceso,
      resueltos,
      rechazados,
    };
  },

  async getUltimos(limite = 5) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.estado,
        r.direccion,
        r.prioridad,
        r.fecha_creacion,
        c.nombre         AS categoria
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      WHERE inst.id_usuario IS NULL
      ORDER BY r.fecha_creacion DESC
      LIMIT ?
    `, [limite]);
    return rows;
  },

  async getActividadMensual() {
    const [rows] = await db.query(`
      SELECT
        MONTH(r.fecha_creacion) AS mes,
        YEAR(r.fecha_creacion)  AS anio,
        COUNT(*)              AS total
      FROM reclamos r
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      WHERE inst.id_usuario IS NULL
        AND r.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(r.fecha_creacion), MONTH(r.fecha_creacion)
      ORDER BY anio ASC, mes ASC
    `);
    return rows;
  },

  async getPorCategoria() {
    const [rows] = await db.query(`
      SELECT
        c.nombre AS categoria,
        COUNT(*) AS cantidad
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      WHERE inst.id_usuario IS NULL
      GROUP BY r.id_categoria, c.nombre
      ORDER BY cantidad DESC
      LIMIT 6
    `);
    return rows;
  },

  async crear({ titulo, descripcion, id_categoria, id_usuario, direccion, latitud, longitud }) {
    const [result] = await db.query(
      `INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, direccion, latitud, longitud, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [titulo || null, descripcion || null, id_categoria, id_usuario, direccion || null, latitud || null, longitud || null, CLAIM_STATUSES.RECIBIDO]
    );
    return result.insertId;
  },

  async getByUsuario(idUsuario) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.direccion,
        r.fecha_creacion,
        c.nombre         AS categoriaNombre
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      WHERE r.id_usuario = ? AND inst.id_usuario IS NULL
      ORDER BY r.fecha_creacion DESC
    `, [idUsuario]);
    return rows;
  },

  async getLista({ estado = null, pagina = 1, limite = 20 } = {}) {
    const offset = (pagina - 1) * limite;
    const params = [];
    let where = 'WHERE inst.id_usuario IS NULL';
    if (estado) { where += ' AND r.estado = ?'; params.push(estado); }

    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.estado,
        r.direccion,
        r.fecha_creacion,
        c.nombre         AS categoriaNombre,
        COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), inst.nombre, u.email) AS autorNombre
      FROM reclamos r
      LEFT JOIN categorias   c    ON c.id_categoria  = r.id_categoria
      LEFT JOIN usuarios     u    ON u.id_usuario    = r.id_usuario
      LEFT JOIN ciudadanos   ci   ON ci.id_usuario   = r.id_usuario
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      ${where}
      ORDER BY r.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, limite, offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM reclamos r
       LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
       ${where}`,
      params
    );
    return { rows, total };
  },

  async getById(id) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.direccion,
        r.fecha_creacion,
        r.id_usuario,
        c.id_categoria   AS categoriaId,
        c.nombre         AS categoriaNombre,
        c.descripcion    AS categoriaDesc,
        COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), inst.nombre, u.email) AS autorNombre,
        u.email          AS autorEmail
      FROM reclamos r
      LEFT JOIN categorias   c    ON c.id_categoria  = r.id_categoria
      LEFT JOIN usuarios     u    ON u.id_usuario    = r.id_usuario
      LEFT JOIN ciudadanos   ci   ON ci.id_usuario   = r.id_usuario
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      WHERE r.id_reclamo = ? AND inst.id_usuario IS NULL
    `, [id]);
    return rows[0] || null;
  },

  async updateEstado(id, estado) {
    const [result] = await db.query(
      `UPDATE reclamos r
       LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
       SET r.estado = ?
       WHERE r.id_reclamo = ? AND inst.id_usuario IS NULL`,
      [estado, id]
    );
    return result.affectedRows;
  },

  async getParaMapa() {
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
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      WHERE r.latitud IS NOT NULL AND r.longitud IS NOT NULL
        AND inst.id_usuario IS NULL
      ORDER BY r.fecha_creacion DESC
    `);
    return rows;
  },

};

module.exports = ClaimModel;
