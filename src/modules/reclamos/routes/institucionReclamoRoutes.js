const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/institucionReclamoController');
const { verifyToken, requireInstitucion } = require('../../../middlewares/authMiddleware');

const reclamoCtrl = require('../controllers/reclamoController');

router.use(verifyToken, requireInstitucion);

router.get('/bandeja', ctrl.bandeja);
router.get('/:id', reclamoCtrl.obtenerDetalle);
router.patch('/:id/estado', ctrl.avanzarEstado);
router.post('/:id/resolver', ctrl.resolver);
router.patch('/:id/cancelar', ctrl.cancelar);

module.exports = router;
