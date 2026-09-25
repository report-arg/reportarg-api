const db = require('../config/db');

const ComunicadoModel = {
  /**
   * Crea un nuevo comunicado emitido por una institución (almacenado en la tabla `comunicados`)
   */
  async crear({ idInstitucion, titulo, contenido, idCategoria, imagen = null }) {
    const [result] = await db.query(
      `INSERT INTO comunicados (id_institucion, titulo, contenido, id_categoria, imagen, fecha_publicacion)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [idInstitucion, titulo || null, contenido || null, idCategoria, imagen || null]
    );
    return result.insertId;
  },

  /**
   * Obtiene los comunicados publicados por una institución
   */
  async getByInstitucion(idInstitucion) {
    const [rows] = await db.query(`
      SELECT
        com.id_comunicado  AS id,
        com.titulo,
        com.contenido      AS descripcion,
        com.imagen,
        com.fecha_publicacion AS fecha_creacion,
        c.id_categoria     AS categoriaId,
        c.nombre           AS categoriaNombre,
        c.tipo             AS categoriaTipo,
        inst.nombre        AS autorNombre,
        inst.foto_perfil   AS autorFoto
      FROM comunicados com
      LEFT JOIN categorias c ON c.id_categoria = com.id_categoria
      INNER JOIN instituciones inst ON inst.id_institucion = com.id_institucion
      WHERE com.id_institucion = ?
      ORDER BY com.fecha_publicacion DESC
    `, [idInstitucion]);
    return rows;
  },

  /**
   * Elimina un comunicado perteneciente a la institución
   */
  async eliminar(idComunicado, idInstitucion) {
    const [result] = await db.query(
      `DELETE FROM comunicados
       WHERE id_comunicado = ? AND id_institucion = ?`,
      [idComunicado, idInstitucion]
    );
    return result.affectedRows;
  },
};

module.exports = ComunicadoModel;
