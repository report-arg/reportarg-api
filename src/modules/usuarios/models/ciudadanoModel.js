const db = require('../../../config/db');

const CiudadanoModel = {
  async getByUserId(userId) {
    const [citizens] = await db.query('SELECT id_ciudadano FROM ciudadanos WHERE id_usuario = ?', [userId]);
    return citizens[0] || null;
  },
  async create(connection, { id_usuario, nombre, apellido, provincia, ciudad, zona }) {
    const executor = connection || db;
    await executor.query(
      `INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_usuario, nombre, apellido, provincia, ciudad, zona]
    );
  }
};

module.exports = CiudadanoModel;
