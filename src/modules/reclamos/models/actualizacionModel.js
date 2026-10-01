const db = require('../../../config/db');

const ActualizacionModel = {
  /**
   * Agrega una nueva actualización al reclamo
   */
  async crear({ id_reclamo, id_usuario, tipo_autor, texto }) {
    const [result] = await db.query(
      `INSERT INTO reclamos_actualizaciones (id_reclamo, id_usuario, tipo_autor, texto, fecha_creacion)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_reclamo, id_usuario, tipo_autor, texto]
    );
    return result.insertId;
  },

  /**
   * Obtiene todas las actualizaciones de un reclamo
   */
  async getByReclamo(id_reclamo) {
    const [rows] = await db.query(
      `SELECT 
         a.id_actualizacion AS id,
         a.tipo_autor,
         a.texto,
         a.fecha_creacion,
         COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), inst.nombre, u.email) AS autorNombre,
         inst.nombre AS institucionNombre
       FROM reclamos_actualizaciones a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
       LEFT JOIN ciudadanos ci ON ci.id_usuario = u.id_usuario
       LEFT JOIN instituciones inst ON inst.id_usuario = u.id_usuario
       WHERE a.id_reclamo = ?
       ORDER BY a.fecha_creacion ASC`,
      [id_reclamo]
    );
    return rows;
  }
};

module.exports = ActualizacionModel;
