const { consultarInforme } = require('../services/informeService');

async function gestionReclamos(req, res, next) {
  try {
    const data = await consultarInforme(req.user.id_institucion, req.query);
    res.json({ ok: true, data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ ok: false, mensaje: error.message });
    next(error);
  }
}

module.exports = { gestionReclamos };
