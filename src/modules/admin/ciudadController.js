const cityService = require('../../services/ciudadService');

const cityController = {
  async listar(req, res, next) {
    try {
      const ciudades = await cityService.listActive();
      res.json({ ok: true, data: ciudades });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = cityController;
