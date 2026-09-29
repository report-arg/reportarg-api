const db = require('../config/db');

const actividadController = {
  async getResumen(req, res) {
    try {
      const idCiudad = req.user?.id_ciudad || null;
      if (!idCiudad) {
        return res.json({ ok: true, data: { activos: 0, resueltos: 0, comunicados: 0, porEstado: [], resueltosRecientes: [] } });
      }

      // Reclamos activos (pendientes, en_proceso)
      const [[{ activos }]] = await db.query(
        `SELECT COUNT(*) AS activos FROM reclamos WHERE id_ciudad = ? AND estado IN ('pendiente', 'en_proceso', 'Pendiente', 'En proceso') AND visibilidad = 'publico'`,
        [idCiudad]
      );

      // Reclamos resueltos
      const [[{ resueltos }]] = await db.query(
        `SELECT COUNT(*) AS resueltos FROM reclamos WHERE id_ciudad = ? AND estado IN ('resuelto', 'Resuelto') AND visibilidad = 'publico'`,
        [idCiudad]
      );

      // Comunicados de la ciudad
      const [[{ comunicados }]] = await db.query(
        `SELECT COUNT(*) AS comunicados FROM comunicados com
         INNER JOIN instituciones inst ON inst.id_institucion = com.id_institucion
         WHERE inst.id_ciudad = ?`,
        [idCiudad]
      );

      // Por estado
      const [porEstado] = await db.query(
        `SELECT estado, COUNT(*) as cantidad FROM reclamos WHERE id_ciudad = ? AND visibilidad = 'publico' AND estado NOT IN ('Cancelado', 'rechazado') GROUP BY estado`,
        [idCiudad]
      );

      // Resueltos recientes
      const [resueltosRecientes] = await db.query(
        `SELECT r.id_reclamo as id, r.titulo, c.nombre as categoriaNombre, r.fecha_creacion
         FROM reclamos r
         LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
         WHERE r.id_ciudad = ? AND r.estado IN ('resuelto', 'Resuelto') AND r.visibilidad = 'publico'
         ORDER BY r.fecha_creacion DESC LIMIT 3`,
        [idCiudad]
      );

      res.json({
        ok: true,
        data: {
          activos,
          resueltos,
          comunicados,
          porEstado,
          resueltosRecientes
        }
      });
    } catch (err) {
      console.error('Error resumen actividad:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener el resumen de actividad' });
    }
  }
};

module.exports = actividadController;
