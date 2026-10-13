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
      const { estado, busqueda, categoria, ciudad, pagina = 1, limite = 20 } = req.query;
      if (
        (estado && estado !== 'Todos' && !Object.values(CLAIM_STATUSES).includes(estado)) ||
        !/^\d+$/.test(String(pagina)) ||
        !/^\d+$/.test(String(limite)) ||
        Number(pagina) < 1 ||
        Number(limite) < 1 ||
        Number(limite) > 100
      ) {
        return res.status(400).json({ ok: false, mensaje: 'Filtros o paginación inválidos' });
      }

      const result = await ClaimModel.getLista({
        estado: estado || null,
        busqueda: busqueda || null,
        categoria: categoria || null,
        ciudad: ciudad || null,
        pagina: parseInt(pagina, 10),
        limite: parseInt(limite, 10),
      });

      res.json({
        ok: true,
        data: result.rows,
        total: result.total,
        pagina: parseInt(pagina, 10),
        limite: parseInt(limite, 10),
        totalPaginas: Math.ceil(result.total / parseInt(limite, 10)) || 1,
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
      const { id_institucion, motivo } = req.body;
      const idUsuarioAdmin = req.user.id;
      
      if (!id_institucion) {
        return res.status(400).json({ ok: false, mensaje: 'La institución destino es obligatoria' });
      }

      if (motivo !== undefined && (!motivo || !String(motivo).trim())) {
        return res.status(400).json({ ok: false, mensaje: 'El motivo de reasignación es obligatorio' });
      }

      if (!Number.isSafeInteger(Number(id_institucion)) || Number(id_institucion) <= 0 || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({ ok: false, mensaje: 'Identificador inválido' });
      }

      const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : '';
      await ClaimModel.reasignarInstitucion(id, Number(id_institucion), idUsuarioAdmin, motivoLimpio);

      res.json({ ok: true, mensaje: 'Reclamo reasignado exitosamente' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = claimController;
