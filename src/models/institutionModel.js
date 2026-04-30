const db = require('../config/db');

const InstitutionModel = {

  async getAll({ estado } = {}) {
    let query = `
      SELECT
        i.id_institucion AS id,
        i.nombre,
        i.tipo,
        i.direccion,
        i.telefono,
        i.verificada,
        i.fecha_verificacion,
        u.email,
        u.activo
      FROM instituciones i
      INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
      WHERE 1=1
    `;

    if (estado === 'pendiente') {
      query += ` AND i.verificada = 0`;
    } else if (estado === 'verificada') {
      query += ` AND i.verificada = 1`;
    }

    query += ` ORDER BY i.id_institucion DESC`;
    const [rows] = await db.query(query);
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query(`
      SELECT
        i.id_institucion AS id,
        i.nombre,
        i.tipo,
        i.direccion,
        i.telefono,
        i.verificada,
        i.fecha_verificacion,
        u.email,
        u.activo,
        u.id_usuario
      FROM instituciones i
      INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
      WHERE i.id_institucion = ?
    `, [id]);
    return rows[0] || null;
  },

  async verificar(id) {
    const [result] = await db.query(`
      UPDATE instituciones
      SET verificada = 1, fecha_verificacion = NOW()
      WHERE id_institucion = ?
    `, [id]);
    return result.affectedRows;
  },

  async rechazar(id) {
    const [result] = await db.query(`
      UPDATE instituciones
      SET verificada = 0, fecha_verificacion = NULL
      WHERE id_institucion = ?
    `, [id]);
    return result.affectedRows;
  },

  async getStats() {
    const [[total]]       = await db.query(`SELECT COUNT(*) AS total FROM instituciones`);
    const [[verificadas]] = await db.query(`SELECT COUNT(*) AS total FROM instituciones WHERE verificada = 1`);
    const [[pendientes]]  = await db.query(`SELECT COUNT(*) AS total FROM instituciones WHERE verificada = 0`);
    return {
      total:       total.total,
      verificadas: verificadas.total,
      pendientes:  pendientes.total,
    };
  },
};

module.exports = InstitutionModel;