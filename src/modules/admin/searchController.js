const db = require('../../config/db');

const searchController = {

  async buscar(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 1) {
        return res.json({ ok: true, data: [] });
      }

      const termino = `%${q.trim()}%`;

      // Buscar usuarios
      const [usuarios] = await db.query(`
        SELECT
          u.id_usuario AS id,
          COALESCE(CONCAT(c.nombre, ' ', c.apellido), i.nombre, u.email) AS label,
          u.email AS sub,
          u.tipo_usuario AS tipo
        FROM usuarios u
        LEFT JOIN ciudadanos c ON c.id_usuario = u.id_usuario
        LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
        WHERE u.email LIKE ?
          OR c.nombre LIKE ?
          OR c.apellido LIKE ?
          OR CONCAT(c.nombre, ' ', c.apellido) LIKE ?
          OR i.nombre LIKE ?
        LIMIT 5
        `, [termino, termino, termino, termino, termino]);

      // Buscar reclamos
      const [reclamos] = await db.query(`
        SELECT
          r.id_reclamo AS id,
          r.titulo     AS label,
          r.estado     AS sub,
          r.direccion
        FROM reclamos r
        WHERE r.titulo LIKE ? OR r.direccion LIKE ?
        LIMIT 5
      `, [termino, termino]);

      // Buscar categorías
      const [categorias] = await db.query(`
        SELECT
          id_categoria AS id,
          nombre       AS label,
          descripcion  AS sub
        FROM categorias
        WHERE nombre LIKE ?
        LIMIT 3
      `, [termino]);

      // Armar respuesta unificada
      const resultados = [
        ...usuarios.map(u => ({
          tipo:  "Usuario",
          label: u.label,
          sub:   u.sub,
          href:  `/admin/users/${u.id}/edit`,
        })),
        ...reclamos.map(r => ({
          tipo:  "Reporte",
          label: r.label,
          sub:   `${r.sub} · ${r.direccion || ""}`.trim().replace(/·\s*$/, ""),
          href:  `/admin`,
        })),
        ...categorias.map(c => ({
          tipo:  "Categoría",
          label: c.label,
          sub:   c.sub || "Categoría de reporte",
          href:  `/admin/categories`,
        })),
      ];

      res.json({ ok: true, data: resultados });

    } catch (err) {
      console.error('Error búsqueda global:', err);
      res.status(500).json({ ok: false, mensaje: 'Error en la búsqueda' });
    }
  },
};

module.exports = searchController;