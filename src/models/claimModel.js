const db = require('../config/db');

const ClaimModel = {

  async getStats() {
    const [[total]]      = await db.query(`SELECT COUNT(*) AS total FROM reclamos`);
    const [[recibidos]]  = await db.query(`SELECT COUNT(*) AS total FROM reclamos WHERE estado = 'recibido'`);
    const [[enProceso]]  = await db.query(`SELECT COUNT(*) AS total FROM reclamos WHERE estado = 'en_proceso'`);
    const [[resueltos]]  = await db.query(`SELECT COUNT(*) AS total FROM reclamos WHERE estado = 'resuelto'`);
    const [[rechazados]] = await db.query(`SELECT COUNT(*) AS total FROM reclamos WHERE estado = 'rechazado'`);
    return {
      total:      total.total,
      recibidos:  recibidos.total,
      enProceso:  enProceso.total,
      resueltos:  resueltos.total,
      rechazados: rechazados.total,
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
      ORDER BY r.fecha_creacion DESC
      LIMIT ?
    `, [limite]);
    return rows;
  },

  async getActividadMensual() {
    const [rows] = await db.query(`
      SELECT
        MONTH(fecha_creacion) AS mes,
        YEAR(fecha_creacion)  AS anio,
        COUNT(*)              AS total
      FROM reclamos
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(fecha_creacion), MONTH(fecha_creacion)
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
      GROUP BY r.id_categoria, c.nombre
      ORDER BY cantidad DESC
      LIMIT 6
    `);
    return rows;
  },

  async crear({ titulo, descripcion, id_categoria, id_usuario, direccion }) {
    const [result] = await db.query(
      `INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, direccion, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, 'recibido', NOW())`,
      [titulo || null, descripcion || null, id_categoria, id_usuario, direccion || null]
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
      WHERE r.id_usuario = ?
      ORDER BY r.fecha_creacion DESC
    `, [idUsuario]);
    return rows;
  },

  async getLista({ estado = null, pagina = 1, limite = 20 } = {}) {
    const offset = (pagina - 1) * limite;
    const params = [];
    let where = 'WHERE 1=1';
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
      `SELECT COUNT(*) AS total FROM reclamos r ${where}`, params
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
      WHERE r.id_reclamo = ?
    `, [id]);
    return rows[0] || null;
  },

  async updateEstado(id, estado) {
    const [result] = await db.query(
      `UPDATE reclamos SET estado = ? WHERE id_reclamo = ?`,
      [estado, id]
    );
    return result.affectedRows;
  },
};

module.exports = ClaimModel;