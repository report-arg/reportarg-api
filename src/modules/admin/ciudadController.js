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

  async listarProvincias(req, res, next) {
    try {
      const provincias = cityService.getProvincias();
      res.json({ ok: true, data: provincias });
    } catch (err) {
      next(err);
    }
  },

  async listarLocalidades(req, res, next) {
    try {
      const { provincia, q, limit } = req.query;
      const localidades = await cityService.listLocalidades({ provincia, q, limit });
      res.json({ ok: true, data: localidades });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = cityController;
