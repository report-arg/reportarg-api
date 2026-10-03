const FeedModel    = require('./feedModel');
const CategoryModel = require('../categorias/categoryModel');

const feedController = {

  async getFeed(req, res, next) {
    try {
      const pagina    = parseInt(req.query.pagina)  || 1;
      const limite    = parseInt(req.query.limite)  || 10;
      const categoria = req.query.categoria         || null;
      const tipo      = req.query.tipo              || null; // 'reclamo' | 'comunicado'
      const estado    = req.query.estado            || null;

      // Resolver ciudad activa estrictamente desde el contexto del usuario autenticado
      const idCiudad  = req.user?.id_ciudad || null;
      const idUsuarioActual = req.user?.id || null;

      const { items, total } = await FeedModel.getFeed({ idCiudad, idCategoria: categoria, tipo, estado, pagina, limite, idUsuarioActual });

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
      next(err);
    }
  },

  async getCategorias(req, res, next) {
    try {
      const todas   = await CategoryModel.getAll();
      const activas = todas.filter(c => c.estado === 'activo');
      res.json({ ok: true, data: activas });
    } catch (err) {
      next(err);
    }
  },

  async getTendencias(req, res, next) {
    try {
      const idCiudad = req.user?.id_ciudad || null;
      const data     = await FeedModel.getTendencias(idCiudad);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = feedController;
