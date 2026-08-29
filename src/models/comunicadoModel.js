const db = require('../config/db');

// Actualmente los comunicados se almacenan en la tabla `reclamos`.
// La pertenencia a una institución evita mezclarlos con reclamos ciudadanos
// mientras se mantiene la estructura actual de la base de datos.
const ComunicadoModel = {
  async crear({ titulo, descripcion, idCategoria, idUsuario, imagen, estado }) {
    const [result] = await db.query(
      `INSERT INTO reclamos (titulo, descripcion, imagen, id_categoria, id_usuario, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [titulo || null, descripcion || null, imagen || null, idCategoria, idUsuario, estado]
    );
    return result.insertId;
  },

  async getByInstitucion(idUsuario) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.fecha_creacion,
        c.id_categoria   AS categoriaId,
        c.nombre         AS categoriaNombre,
        c.tipo           AS categoriaTipo
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      INNER JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      WHERE r.id_usuario = ?
      ORDER BY r.fecha_creacion DESC
    `, [idUsuario]);
    return rows;
  },

  async eliminar(idComunicado, idUsuario) {
    const [result] = await db.query(
      `DELETE FROM reclamos
       WHERE id_reclamo = ? AND id_usuario = ?
       AND id_usuario IN (SELECT id_usuario FROM instituciones WHERE id_usuario = ?)`,
      [idComunicado, idUsuario, idUsuario]
    );
    return result.affectedRows;
  },
};

module.exports = ComunicadoModel;
