const FeedModel    = require('../models/feedModel');
const CategoryModel = require('../models/categoryModel');
const db            = require('../config/db');

const feedController = {

  async getFeed(req, res) {
    try {
      const pagina    = parseInt(req.query.pagina)  || 1;
      const limite    = parseInt(req.query.limite)  || 10;
      const categoria = req.query.categoria         || null;
      const tipo      = req.query.tipo              || null; // 'reclamo' | 'comunicado'

      let idCiudad = null;

      if (req.user) {
        // Usuario autenticado: usar su id_ciudad (puede ser null si pertenece a una ciudad no activa)
        idCiudad = req.user.id_ciudad;
      } else {
        // Usuario no autenticado / público: fallback dinámico a la ciudad activa de ReportARG
        const [activeCities] = await db.query('SELECT id_ciudad FROM ciudades WHERE activa = 1 LIMIT 1');
        idCiudad = activeCities[0]?.id_ciudad || null;
      }

      const { items, total } = await FeedModel.getFeed({ idCiudad, idCategoria: categoria, tipo, pagina, limite });

      res.json({
        ok: true,
        data: items,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite) || 1,
        mensaje: !idCiudad ? 'Tu ciudad declarada aún no cuenta con la plataforma ReportARG activa.' : undefined,
      });
    } catch (err) {
      console.error('Error feed:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener el feed' });
    }
  },

  async getCategorias(req, res) {
    try {
      const todas   = await CategoryModel.getAll();
      const activas = todas.filter(c => c.estado === 'activo');
      res.json({ ok: true, data: activas });
    } catch (err) {
      console.error('Error categorías públicas:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener categorías' });
    }
  },

  async getTendencias(req, res) {
    try {
      let idCiudad = null;

      if (req.user) {
        idCiudad = req.user.id_ciudad;
      } else {
        const [activeCities] = await db.query('SELECT id_ciudad FROM ciudades WHERE activa = 1 LIMIT 1');
        idCiudad = activeCities[0]?.id_ciudad || null;
      }

      const data = await FeedModel.getTendencias(idCiudad);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error tendencias:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener tendencias' });
    }
  },
};

module.exports = feedController;

