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
};

module.exports = ClaimModel;