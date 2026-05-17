const db = require('../config/db');

const FeedModel = {

  async getFeed({ idCategoria = null, tipo = null, pagina = 1, limite = 10 } = {}) {
    const offset = (pagina - 1) * limite;
    const params = [];
    let where = `WHERE r.estado != 'rechazado'`;

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
        COALESCE(inst.verificada, 0)                    AS verificada
      FROM reclamos r
      LEFT JOIN categorias c       ON c.id_categoria   = r.id_categoria
      LEFT JOIN usuarios u         ON u.id_usuario     = r.id_usuario
      LEFT JOIN ciudadanos ci      ON ci.id_usuario    = r.id_usuario
      LEFT JOIN instituciones inst ON inst.id_usuario  = r.id_usuario
      ${where}
      ORDER BY r.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, limite, offset]);

    // COUNT también necesita el JOIN a instituciones cuando filtramos por tipo
    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM reclamos r
      LEFT JOIN instituciones inst ON inst.id_usuario = r.id_usuario
      ${where}
    `, params);

    return { items, total };
  },

  async getTendencias() {
    const [rows] = await db.query(`
      SELECT
        c.id_categoria AS id,
        c.nombre,
        COUNT(r.id_reclamo) AS cantidad
      FROM categorias c
      LEFT JOIN reclamos r ON r.id_categoria = c.id_categoria
        AND r.estado != 'rechazado'
      WHERE c.estado = 'activo'
      GROUP BY c.id_categoria, c.nombre
      ORDER BY cantidad DESC
      LIMIT 5
    `);
    return rows;
  },
};

module.exports = FeedModel;
