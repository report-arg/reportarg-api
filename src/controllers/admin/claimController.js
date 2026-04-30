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
};

module.exports = claimController;