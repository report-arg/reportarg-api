const db = require('../config/db');

const FeedModel = {

  /**
   * Obtiene las publicaciones del feed combinando reclamos públicos y comunicados institucionales,
   * filtrados estrictamente por la ciudad activa y mapeados a un DTO común.
   */
  async getFeed({ idCiudad = null, idCategoria = null, tipo = null, pagina = 1, limite = 10 } = {}) {
    if (!idCiudad) {
      return { items: [], total: 0 };
    }

    const offset = (pagina - 1) * limite;
    const includeReclamos = !tipo || tipo === 'reclamo';
    const includeComunicados = !tipo || tipo === 'comunicado';

    const queries = [];
    const params = [];

    if (includeReclamos) {
      let reclamoWhere = `WHERE r.estado != 'Cancelado' AND r.estado != 'rechazado' 
                          AND r.visibilidad = 'publico' AND r.id_ciudad = ?`;
      const reclamoParams = [idCiudad];

      if (idCategoria) {
        reclamoWhere += ` AND r.id_categoria = ?`;
        reclamoParams.push(idCategoria);
      }

      queries.push(`
        SELECT
          r.id_reclamo                                    AS id,
          'reclamo'                                       AS tipo,
          r.id_usuario                                    AS id_usuario,
          r.titulo                                        AS titulo,
          r.descripcion                                   AS descripcion,
          r.estado                                        AS estado,
          r.direccion                                     AS direccion,
          r.fecha_creacion                                AS fecha_creacion,
          c.id_categoria                                  AS categoriaId,
          c.codigo                                        AS categoriaCodigo,
          c.nombre                                        AS categoriaNombre,
          c.tipo                                          AS categoriaTipo,
          COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), u.email) AS autorNombre,
          ci.foto_perfil                                  AS autorFoto,
          0                                               AS esInstitucion,
          0                                               AS verificada,
          r.imagen                                        AS imagen,
          0                                               AS cantidadComentarios
        FROM reclamos r
        LEFT JOIN categorias c  ON c.id_categoria = r.id_categoria
        LEFT JOIN usuarios u    ON u.id_usuario   = r.id_usuario
        LEFT JOIN ciudadanos ci ON ci.id_usuario  = r.id_usuario
        ${reclamoWhere}
      `);
      params.push(...reclamoParams);
    }

    if (includeComunicados) {
      let comunicadoWhere = `WHERE inst.id_ciudad = ?`;
      const comunicadoParams = [idCiudad];

      if (idCategoria) {
        comunicadoWhere += ` AND com.id_categoria = ?`;
        comunicadoParams.push(idCategoria);
      }

      queries.push(`
        SELECT
          com.id_comunicado                               AS id,
          'comunicado'                                    AS tipo,
          inst.id_usuario                                 AS id_usuario,
          com.titulo                                      AS titulo,
          com.contenido                                   AS descripcion,
          'Publicado'                                     AS estado,
          NULL                                            AS direccion,
          com.fecha_publicacion                           AS fecha_creacion,
          c.id_categoria                                  AS categoriaId,
          c.codigo                                        AS categoriaCodigo,
          c.nombre                                        AS categoriaNombre,
          c.tipo                                          AS categoriaTipo,
          inst.nombre                                     AS autorNombre,
          inst.foto_perfil                                AS autorFoto,
          1                                               AS esInstitucion,
          COALESCE(inst.verificada, 0)                    AS verificada,
          NULL                                            AS imagen,
          0                                               AS cantidadComentarios
        FROM comunicados com

        INNER JOIN instituciones inst ON inst.id_institucion = com.id_institucion
        LEFT JOIN categorias c        ON c.id_categoria   = com.id_categoria
        ${comunicadoWhere}
      `);
      params.push(...comunicadoParams);
    }

    if (queries.length === 0) {
      return { items: [], total: 0 };
    }

    const unionQuery = queries.join(' UNION ALL ');

    const [items] = await db.query(`
      SELECT * FROM (${unionQuery}) AS feed_combinado
      ORDER BY fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, limite, offset]);

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total FROM (${unionQuery}) AS feed_count
    `, params);

    return { items, total };
  },

  /**
   * Obtiene tendencias de categorías filtradas por la ciudad activa de ReportARG,
   * contabilizando reclamos reales y comunicados reales de sus respectivas tablas.
   */
  async getTendencias(idCiudad = null) {
    if (!idCiudad) return [];

    const [rows] = await db.query(`
      SELECT
        cat.id,
        cat.codigo,
        cat.nombre,
        CAST(COALESCE(r_cnt.total_reclamos, 0) AS UNSIGNED)    AS reclamos,
        CAST(COALESCE(com_cnt.total_comunicados, 0) AS UNSIGNED) AS comunicados,
        CAST((COALESCE(r_cnt.total_reclamos, 0) + COALESCE(com_cnt.total_comunicados, 0)) AS UNSIGNED) AS total
      FROM (
        SELECT id_categoria AS id, codigo, nombre FROM categorias WHERE estado = 'activo'
      ) AS cat
      LEFT JOIN (
        SELECT r.id_categoria, COUNT(*) AS total_reclamos
        FROM reclamos r
        WHERE r.estado != 'Cancelado' AND r.estado != 'rechazado'
          AND r.visibilidad = 'publico' AND r.id_ciudad = ?
        GROUP BY r.id_categoria
      ) AS r_cnt ON r_cnt.id_categoria = cat.id
      LEFT JOIN (
        SELECT com.id_categoria, COUNT(*) AS total_comunicados
        FROM comunicados com
        INNER JOIN instituciones inst ON inst.id_institucion = com.id_institucion
        WHERE inst.id_ciudad = ?
        GROUP BY com.id_categoria
      ) AS com_cnt ON com_cnt.id_categoria = cat.id
      HAVING total > 0
      ORDER BY total DESC
      LIMIT 5
    `, [idCiudad, idCiudad]);

    return rows;
  },
};

module.exports = FeedModel;
