const db = require('../config/db');

const FeedModel = {

  /**
   * Obtiene las publicaciones del feed filtradas estrictamente por la ciudad activa del usuario
   */
  async getFeed({ idCiudad = null, idCategoria = null, tipo = null, pagina = 1, limite = 10 } = {}) {
    // Si el usuario no pertenece a ninguna ciudad activa, retornar lista vacía (sin errores)
    if (!idCiudad) {
      return { items: [], total: 0 };
    }

    const offset = (pagina - 1) * limite;
    const params = [];

    let where = `WHERE r.estado != 'Cancelado' AND r.estado != 'rechazado' 
                 AND (r.visibilidad = 'publico' OR r.visibilidad IS NULL)
                 AND ((inst.id_usuario IS NULL AND r.id_ciudad = ?) OR (inst.id_usuario IS NOT NULL AND inst.id_ciudad = ?))`;
    params.push(idCiudad, idCiudad);

    if (idCategoria) {
      where += ` AND r.id_categoria = ?`;
      params.push(idCategoria);
    }

    if (tipo === 'comunicado') {
      where += ` AND inst.id_usuario IS NOT NULL`;
    } else if (tipo === 'reclamo') {
      where += ` AND inst.id_usuario IS NULL`;
    }

    const [items] = await db.query(`
      SELECT
        r.id_reclamo                                    AS id,
        r.id_usuario,
        r.titulo,
        r.descripcion,
        r.estado,
        r.direccion,
        r.fecha_creacion,
        c.id_categoria                                  AS categoriaId,
        c.nombre                                        AS categoriaNombre,
        c.tipo                                          AS categoriaTipo,
        COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), inst.nombre) AS autorNombre,
        COALESCE(ci.foto_perfil, inst.foto_perfil)      AS autorFoto,
        CASE WHEN inst.id_usuario IS NOT NULL THEN 1 ELSE 0 END AS esInstitucion,
        COALESCE(inst.verificada, 0)                    AS verificada,
        r.imagen                                        AS imagen,
        CAST((SELECT COUNT(*) FROM comentarios WHERE id_reclamo = r.id_reclamo) AS UNSIGNED) AS cantidadComentarios
      FROM reclamos r
      LEFT JOIN categorias c       ON c.id_categoria   = r.id_categoria
      LEFT JOIN usuarios u         ON u.id_usuario     = r.id_usuario
      LEFT JOIN ciudadanos ci      ON ci.id_usuario    = r.id_usuario
      LEFT JOIN instituciones inst ON inst.id_usuario  = r.id_usuario
      ${where}
      ORDER BY r.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, limite, offset]);

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM reclamos r
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      ${where}
    `, params);

    return { items, total };
  },

  /**
   * Obtiene tendencias de categorías filtradas estrictamente por la ciudad activa del usuario
   */
  async getTendencias(idCiudad = null) {
    if (!idCiudad) return [];

    const [rows] = await db.query(`
      SELECT
        c.id_categoria AS id,
        c.nombre,
        SUM(CASE WHEN inst.id_usuario IS NULL     THEN 1 ELSE 0 END) AS reclamos,
        SUM(CASE WHEN inst.id_usuario IS NOT NULL THEN 1 ELSE 0 END) AS comunicados,
        COUNT(r.id_reclamo) AS total
      FROM categorias c
      INNER JOIN reclamos r ON r.id_categoria = c.id_categoria
        AND r.estado != 'Cancelado' AND r.estado != 'rechazado'
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      WHERE c.estado = 'activo'
        AND ((inst.id_usuario IS NULL AND r.id_ciudad = ?) OR (inst.id_usuario IS NOT NULL AND inst.id_ciudad = ?))
      GROUP BY c.id_categoria, c.nombre
      HAVING total > 0
      ORDER BY total DESC
      LIMIT 5
    `, [idCiudad, idCiudad]);
    return rows;
  },

};

module.exports = FeedModel;
