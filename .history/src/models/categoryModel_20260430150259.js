const db = require('../config/db');

const CategoryModel = {

  async getAll() {
  const [rows] = await db.query(`
    SELECT id_categoria AS id, nombre, descripcion
    FROM categorias
    ORDER BY nombre ASC
  `);
  return rows;
  },

  async getById(id) {
    const [rows] = await db.query(`
      SELECT id_categoria AS id, nombre, descripcion
      FROM categorias
      WHERE id_categoria = ?
    `, [id]);
    return rows[0] || null;
  },

  async create({ nombre, descripcion }) {
    const [result] = await db.query(`
      INSERT INTO categorias (nombre, descripcion)
      VALUES (?, ?)
    `, [nombre, descripcion]);
    return result.insertId;
  },

  async update(id, { nombre, descripcion }) {
    const [result] = await db.query(`
      UPDATE categorias SET nombre = ?, descripcion = ?
      WHERE id_categoria = ?
    `, [nombre, descripcion, id]);
    return result.affectedRows;
  },

  async delete(id) {
    const [reclamos] = await db.query(`
      SELECT COUNT(*) AS total FROM reclamos WHERE id_categoria = ?
    `, [id]);
    if (reclamos[0].total > 0) {
      throw new Error('No se puede eliminar una categoría con reclamos asociados');
    }
    const [result] = await db.query(`
      DELETE FROM categorias WHERE id_categoria = ?
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
};

module.exports = CategoryModel;