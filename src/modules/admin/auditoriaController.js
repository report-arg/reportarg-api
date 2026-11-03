const AuditoriaModel = require('./auditoriaModel');

const auditoriaController = {
  async lista(req, res, next) {
    try {
      const { entidad_tipo, entidad_id, accion, pagina = 1, limite = 25 } = req.query;
      const result = await AuditoriaModel.getAll({
        entidadTipo: entidad_tipo || null,
        entidadId: entidad_id || null,
        accion: accion || null,
        pagina,
        limite,
      });

      res.json({
        ok: true,
        data: result.rows,
        total: result.total,
        pagina: result.pagina,
        limite: result.limite,
        totalPaginas: result.totalPaginas,
      });
    } catch (err) {
      next(err);
    }
  },

  async porEntidad(req, res, next) {
    try {
      const { tipo, id } = req.params;
      if (!tipo || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({ ok: false, mensaje: 'Parámetros de entidad inválidos' });
      }

      const data = await AuditoriaModel.getByEntidad(tipo, Number(id));
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = auditoriaController;

