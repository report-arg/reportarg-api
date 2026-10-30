const FeedModel    = require('./feedModel');
const CategoryModel = require('../categorias/categoriaModel');
const cityService  = require('../../services/ciudadService');

const feedController = {

  async getFeed(req, res, next) {
    try {
      const pagina    = parseInt(req.query.pagina)  || 1;
      const limite    = parseInt(req.query.limite)  || 10;
      const categoria = req.query.categoria         || null;
      const tipo      = req.query.tipo              || null; // 'reclamo' | 'comunicado'
      const estado    = req.query.estado            || null;

      let idCiudad = req.user?.id_ciudad || null;
      const idUsuarioActual = req.user?.id || null;

      if (req.query.id_ciudad !== undefined && req.query.id_ciudad !== '') {
        const queryCiudadId = Number(req.query.id_ciudad);
        if (!Number.isSafeInteger(queryCiudadId) || queryCiudadId <= 0) {
          return res.status(400).json({ ok: false, mensaje: 'ID de ciudad inválido.' });
        }
        const ciudadConsultada = await cityService.getActiveById(queryCiudadId);
        if (!ciudadConsultada) {
          return res.json({
            ok: true,
            data: [],
            total: 0,
            pagina,
            totalPaginas: 1,
            ciudad_inactiva: true,
            mensaje: 'La ciudad seleccionada no se encuentra activa actualmente en ReportARG.',
          });
        }
        idCiudad = ciudadConsultada.id_ciudad || queryCiudadId;
      }

      const { items, total } = await FeedModel.getFeed({ idCiudad, idCategoria: categoria, tipo, estado, pagina, limite, idUsuarioActual });

      res.json({
        ok: true,
        data: items,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite) || 1,
        id_ciudad: idCiudad,
        es_visitante: Boolean(idCiudad && Number(req.user?.id_ciudad) !== Number(idCiudad)),
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
      let idCiudad = req.user?.id_ciudad || null;
      if (req.query.id_ciudad !== undefined && req.query.id_ciudad !== '') {
        const queryCiudadId = Number(req.query.id_ciudad);
        if (!Number.isSafeInteger(queryCiudadId) || queryCiudadId <= 0) {
          return res.status(400).json({ ok: false, mensaje: 'ID de ciudad inválido.' });
        }
        const ciudadConsultada = await cityService.getActiveById(queryCiudadId);
        if (!ciudadConsultada) {
          return res.json({
            ok: true,
            data: [],
            ciudad_inactiva: true,
            mensaje: 'La ciudad seleccionada no se encuentra activa actualmente en ReportARG.',
          });
        }
        idCiudad = ciudadConsultada.id_ciudad || queryCiudadId;
      }

      const data = await FeedModel.getTendencias(idCiudad);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = feedController;
