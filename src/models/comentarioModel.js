const db = require('../config/db');

const ComentarioModel = {

  async getByReclamo(idReclamo) {
    const [rows] = await db.query(`
      SELECT
        c.id_comentario   AS id,
        c.texto,
        c.fecha_creacion,
        c.id_usuario,
        COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), inst.nombre, u.email) AS autorNombre,
        COALESCE(ci.foto_perfil, inst.foto_perfil)                          AS autorFoto
      FROM comentarios c
      INNER JOIN usuarios     u    ON u.id_usuario   = c.id_usuario
      LEFT JOIN  ciudadanos   ci   ON ci.id_usuario  = c.id_usuario
      LEFT JOIN  instituciones inst ON inst.id_usuario = c.id_usuario
      WHERE c.id_reclamo = ?
      ORDER BY c.fecha_creacion ASC
    `, [idReclamo]);
    return rows;
  },

  async crear({ id_reclamo, id_usuario, texto }) {
    const [result] = await db.query(
      `INSERT INTO comentarios (id_reclamo, id_usuario, texto) VALUES (?, ?, ?)`,
      [id_reclamo, id_usuario, texto]
    );
    return result.insertId;
  },

  async countByReclamo(idReclamo) {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM comentarios WHERE id_reclamo = ?`,
      [idReclamo]
    );
    return total;
  },

  async eliminar(idComentario, idUsuario) {
    const [result] = await db.query(
      `DELETE FROM comentarios WHERE id_comentario = ? AND id_usuario = ?`,
      [idComentario, idUsuario]
    );
    return result.affectedRows;
  },
};

module.exports = ComentarioModel;
