const db = require('../../config/db');

const searchController = {
  async buscar(req, res, next) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 1) {
        return res.json({ ok: true, data: [] });
      }

      const termino = `%${q.trim()}%`;

      // 1. Usuarios
      const [usuarios] = await db.query(
        `SELECT
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
         LIMIT 4`,
        [termino, termino, termino, termino, termino]
      );

      // 2. Instituciones
      const [instituciones] = await db.query(
        `SELECT
           i.id_institucion AS id,
           i.nombre AS label,
           CONCAT(COALESCE(ciud.nombre, i.ciudad, 'Sin localidad'), ' · ', COALESCE(i.tipo, 'Institución')) AS sub
         FROM instituciones i
         LEFT JOIN ciudades ciud ON ciud.id_ciudad = i.id_ciudad
         WHERE i.nombre LIKE ? OR i.cuit LIKE ? OR i.direccion LIKE ?
         LIMIT 4`,
        [termino, termino, termino]
      );

      // 3. Ciudades
      const [ciudades] = await db.query(
        `SELECT
           c.id_ciudad AS id,
           c.nombre AS label,
           CONCAT(c.provincia, ' · ', CASE WHEN c.activa = 1 THEN 'Activa' ELSE 'Inactiva' END) AS sub
         FROM ciudades c
         WHERE c.nombre LIKE ? OR c.provincia LIKE ?
         LIMIT 4`,
        [termino, termino]
      );

      // 4. Reclamos
      const [reclamos] = await db.query(
        `SELECT
           r.id_reclamo AS id,
           r.titulo     AS label,
           r.estado     AS sub,
           r.direccion
         FROM reclamos r
         WHERE r.titulo LIKE ? OR r.direccion LIKE ?
         LIMIT 4`,
        [termino, termino]
      );

      // 5. Categorías
      const [categorias] = await db.query(
        `SELECT
           id_categoria AS id,
           nombre       AS label,
           descripcion  AS sub
         FROM categorias
         WHERE nombre LIKE ?
         LIMIT 3`,
        [termino]
      );

      // Armar respuesta unificada con URLs corregidas
      const resultados = [
        ...usuarios.map((u) => ({
          tipo: 'Usuario',
          label: u.label,
          sub: u.sub,
          href: '/admin/users',
        })),
        ...instituciones.map((inst) => ({
          tipo: 'Institución',
          label: inst.label,
          sub: inst.sub,
          href: '/admin/institutions',
        })),
        ...ciudades.map((c) => ({
          tipo: 'Ciudad',
          label: c.label,
          sub: c.sub,
          href: '/admin/ciudades',
        })),
        ...reclamos.map((r) => ({
          tipo: 'Reporte',
          label: r.label,
          sub: `${r.sub} · ${r.direccion || ''}`.trim().replace(/·\s*$/, ''),
          href: '/admin/reclamos',
        })),
        ...categorias.map((c) => ({
          tipo: 'Categoría',
          label: c.label,
          sub: c.sub || 'Categoría de reporte',
          href: '/admin/categories',
        })),
      ];

      res.json({ ok: true, data: resultados });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = searchController;
