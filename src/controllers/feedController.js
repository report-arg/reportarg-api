const FeedModel    = require('../models/feedModel');
const CategoryModel = require('../models/categoryModel');

const feedController = {

  async getFeed(req, res) {
    try {
      const pagina    = parseInt(req.query.pagina)  || 1;
      const limite    = parseInt(req.query.limite)  || 10;
      const categoria = req.query.categoria         || null;
      const tipo      = req.query.tipo              || null; // 'reclamo' | 'comunicado'

      // Resolver ciudad activa estrictamente desde el contexto del usuario autenticado
      const idCiudad  = req.user?.id_ciudad || null;

      const { items, total } = await FeedModel.getFeed({ idCiudad, idCategoria: categoria, tipo, pagina, limite });

      res.json({
        ok: true,
        data: items,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite) || 1,
        mensaje: !idCiudad 
          ? (req.user ? 'Tu ciudad declarada aún no cuenta con la plataforma ReportARG activa.' : 'Es necesario acceder con un contexto de ciudad activa para consultar las publicaciones.') 
          : undefined,
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
      const idCiudad = req.user?.id_ciudad || null;
      const data     = await FeedModel.getTendencias(idCiudad);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error tendencias:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener tendencias' });
    }
  },
};

module.exports = feedController;
