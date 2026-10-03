const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminReclamoController');
const cityService = require('../../../services/cityService');

router.get('/ciudades-activas', async (req, res, next) => {
  try { res.json({ ok: true, data: await cityService.listActive() }); }
  catch (error) { next(error); }
});

router.get('/stats',             ctrl.stats);
router.get('/ultimos',           ctrl.ultimos);
router.get('/actividad-mensual', ctrl.actividadMensual);
router.get('/por-categoria',     ctrl.porCategoria);
router.get('/lista',             ctrl.lista);
router.get('/:id',               ctrl.detalle);
router.patch('/:id/estado',      ctrl.actualizarEstado);
router.patch('/:id/institucion', ctrl.reasignarInstitucion);

module.exports = router;
