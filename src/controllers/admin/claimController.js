const ClaimModel = require('../../models/claimModel');

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
      res.json({ ok: true, data: reclamo });
    } catch (err) {
      console.error('Error detalle reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamo' });
    }
  },

  async actualizarEstado(req, res) {
    try {
      const { estado } = req.body;
      const estados = ['recibido', 'en_proceso', 'resuelto', 'rechazado'];
      if (!estados.includes(estado))
        return res.status(400).json({ ok: false, mensaje: 'Estado inválido' });
      const affected = await ClaimModel.updateEstado(req.params.id, estado);
      if (!affected) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      res.json({ ok: true });
    } catch (err) {
      console.error('Error actualizar estado:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al actualizar estado' });
    }
  },
};

module.exports = claimController;
