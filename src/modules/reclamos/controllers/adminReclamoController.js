const ClaimModel = require('../models/reclamoModel');
const HistorialModel = require('../models/historialModel');
const { CLAIM_STATUSES } = require('../../../constants/publication');

const claimController = {

  async stats(req, res) {
    try {
      const data = await ClaimModel.getStats();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error stats reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener estadísticas' });
    }
  },

  async ultimos(req, res) {
    try {
      const data = await ClaimModel.getUltimos(5);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error ultimos reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener últimos reclamos' });
    }
  },

  async actividadMensual(req, res) {
    try {
      const data = await ClaimModel.getActividadMensual();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error actividad mensual:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener actividad mensual' });
    }
  },

  async porCategoria(req, res) {
    try {
      const data = await ClaimModel.getPorCategoria();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error reclamos por categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamos por categoría' });
    }
  },

  async lista(req, res) {
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
      console.error('Error lista reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamos' });
    }
  },

  async detalle(req, res) {
    try {
      const reclamo = await ClaimModel.getById(req.params.id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      const historial = await HistorialModel.getByReclamo(req.params.id);
      res.json({ ok: true, data: { ...reclamo, historial } });
    } catch (err) {
      console.error('Error detalle reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamo' });
    }
  },

  async actualizarEstado(req, res) {
    return res.status(403).json({ ok: false, mensaje: 'La gestión de estados corresponde a la institución responsable' });
  },

  async reasignarInstitucion(req, res) {
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
      // Propagar el status de negocio (404, 400) que establece el modelo
      const statusCode = (err.status && err.status >= 400 && err.status < 500) ? err.status : 500;
      const mensaje = statusCode < 500 ? err.message : 'Error interno al reasignar institución';
      res.status(statusCode).json({ ok: false, mensaje });
    }
  }
};

module.exports = claimController;
