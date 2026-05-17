const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/claimController');

router.get('/stats',             ctrl.stats);
router.get('/ultimos',           ctrl.ultimos);
router.get('/actividad-mensual', ctrl.actividadMensual);
router.get('/por-categoria',     ctrl.porCategoria);
router.get('/lista',             ctrl.lista);
router.get('/:id',               ctrl.detalle);
router.patch('/:id/estado',      ctrl.actualizarEstado);

module.exports = router;