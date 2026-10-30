const db = require('../../../config/db');

const CiudadanoModel = {
  async getByUserId(userId) {
    const [citizens] = await db.query(
      'SELECT id_ciudadano, nombre, apellido, provincia, ciudad, zona FROM ciudadanos WHERE id_usuario = ?',
      [userId]
    );
    return citizens[0] || null;
  },

  async create(connection, { id_usuario, nombre, apellido, provincia, ciudad, zona }) {
    const executor = connection || db;
    await executor.query(
      `INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_usuario, nombre, apellido, provincia, ciudad, zona]
    );
  },

  /**
   * Obtiene las ciudades de interés guardadas por el ciudadano junto con su estado actual de activación.
   */
  async getCiudadesInteres(userId) {
    const [rows] = await db.query(
      `SELECT
         c.id_ciudad AS id,
         c.nombre,
         c.provincia,
         c.activa,
         cci.fecha_creacion
       FROM ciudadano_ciudades_interes cci
       INNER JOIN ciudades c ON c.id_ciudad = cci.id_ciudad
       WHERE cci.id_usuario = ?
       ORDER BY cci.fecha_creacion ASC`,
      [userId]
    );

    return (rows || []).map((row) => {
      const activa = Number(row.activa) === 1;
      return {
        id: row.id,
        nombre: row.nombre,
        provincia: row.provincia,
        activa,
        estado: activa ? 'activa' : 'inactiva',
        aviso_inactiva: activa
          ? null
          : `La ciudad ${row.nombre} dejó de estar activa en ReportARG. No se permiten operaciones en esta localidad.`,
        fecha_creacion: row.fecha_creacion || null,
      };
    });
  },

  async countCiudadesInteres(userId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS total FROM ciudadano_ciudades_interes WHERE id_usuario = ?',
      [userId]
    );
    return Number(rows?.[0]?.total || 0);
  },

  async hasCiudadInteres(userId, idCiudad) {
    const [rows] = await db.query(
      'SELECT 1 FROM ciudadano_ciudades_interes WHERE id_usuario = ? AND id_ciudad = ? LIMIT 1',
      [userId, idCiudad]
    );
    return Boolean(rows && rows[0]);
  },

  async addCiudadInteres(userId, idCiudad) {
    await db.query(
      'INSERT INTO ciudadano_ciudades_interes (id_usuario, id_ciudad) VALUES (?, ?)',
      [userId, idCiudad]
    );
  },

  async removeCiudadInteres(userId, idCiudad) {
    const [result] = await db.query(
      'DELETE FROM ciudadano_ciudades_interes WHERE id_usuario = ? AND id_ciudad = ?',
      [userId, idCiudad]
    );
    return Number(result?.affectedRows || 0);
  },
};

module.exports = CiudadanoModel;
