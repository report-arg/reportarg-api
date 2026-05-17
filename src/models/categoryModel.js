const db = require('../config/db');

const CategoryModel = {

  async getAll() {
    const [rows] = await db.query(`
      SELECT id_categoria AS id, codigo, nombre, descripcion, tipo, estado, orden
      FROM categorias
      ORDER BY orden ASC
    `);
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query(`
      SELECT id_categoria AS id, codigo, nombre, descripcion, tipo, estado, orden
      FROM categorias
      WHERE id_categoria = ?
    `, [id]);
    return rows[0] || null;
  },

  async create({ codigo, nombre, descripcion, tipo, estado = 'activo', orden = 0 }) {
    const [result] = await db.query(`
      INSERT INTO categorias (codigo, nombre, descripcion, tipo, estado, orden)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [codigo, nombre, descripcion, tipo, estado, orden]);
    return result.insertId;
  },

  async update(id, { nombre, descripcion, tipo, estado, orden }) {
    const [result] = await db.query(`
      UPDATE categorias 
      SET nombre = ?, descripcion = ?, tipo = ?, estado = ?, orden = ?
      WHERE id_categoria = ?
    `, [nombre, descripcion, tipo, estado, orden, id]);
    return result.affectedRows;
  },

  async bajaLogica(id) {
    const [result] = await db.query(`
      UPDATE categorias SET estado = 'inactivo'
      WHERE id_categoria = ?
    `, [id]);
    return result.affectedRows;
  },

  async nombreExiste(nombre, excludeId = null) {
    let query = `SELECT id_categoria FROM categorias WHERE nombre = ?`;
    const params = [nombre];
    if (excludeId) {
      query += ` AND id_categoria != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  async codigoExiste(codigo, excludeId = null) {
    let query = `SELECT id_categoria FROM categorias WHERE codigo = ?`;
    const params = [codigo];
    if (excludeId) {
      query += ` AND id_categoria != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  async getParaReclamo() {
    const [rows] = await db.query(`
      SELECT id_categoria AS id, nombre, descripcion, tipo, orden
      FROM categorias
      WHERE estado = 'activo' AND tipo IN ('reclamo', 'ambos')
      ORDER BY orden ASC
    `);
    return rows;
  },

};

module.exports = CategoryModel;