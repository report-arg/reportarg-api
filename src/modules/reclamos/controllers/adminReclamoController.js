const ClaimModel = require('../models/reclamoModel');
const HistorialModel = require('../models/historialModel');
const { CLAIM_STATUSES } = require('../../../constants/publication');

const claimController = {

  async stats(req, res, next) {
    try {
      const data = await ClaimModel.getStats();
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async ultimos(req, res, next) {
    try {
      const data = await ClaimModel.getUltimos(5);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async actividadMensual(req, res, next) {
    try {
      const data = await ClaimModel.getActividadMensual();
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async porCategoria(req, res, next) {
    try {
      const data = await ClaimModel.getPorCategoria();
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async lista(req, res, next) {
    try {
      const { estado, pagina = 1, limite = 20 } = req.query;
      if ((estado && !Object.values(CLAIM_STATUSES).includes(estado)) || !/^\d+$/.test(String(pagina)) || !/^\d+$/.test(String(limite)) || Number(pagina) < 1 || Number(limite) < 1 || Number(limite) > 100) return res.status(400).json({ ok: false, mensaje: 'Filtros o paginaci?n inválidos' });
      const result = await ClaimModel.getLista({
        estado: estado || null,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
      });
      res.json({
        ok: true,
        data: result.rows,
        total: result.total,
        totalPaginas: Math.ceil(result.total / parseInt(limite)),
      });
    } catch (err) {
      next(err);
    }
  },

  async detalle(req, res, next) {
    try {
      const reclamo = await ClaimModel.getById(req.params.id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      const historial = await HistorialModel.getByReclamo(req.params.id);
      res.json({ ok: true, data: { ...reclamo, historial } });
    } catch (err) {
      next(err);
    }
  },

  async actualizarEstado(req, res) {
    return res.status(403).json({ ok: false, mensaje: 'La gestión de estados corresponde a la institución responsable' });
  },

  async reasignarInstitucion(req, res, next) {
    try {
      const { id } = req.params;
      const { id_institucion } = req.body;
      const idUsuarioAdmin = req.user.id;
      
      if (!id_institucion) {
        return res.status(400).json({ ok: false, mensaje: 'La institución destino es obligatoria' });
      }

      if (!Number.isSafeInteger(Number(id_institucion)) || Number(id_institucion) <= 0 || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({ ok: false, mensaje: 'Identificador inválido' });
      }
      await ClaimModel.reasignarInstitucion(id, Number(id_institucion), idUsuarioAdmin, typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '');

      res.json({ ok: true, mensaje: 'Reclamo reasignado exitosamente' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = claimController;
