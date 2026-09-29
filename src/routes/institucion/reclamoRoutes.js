const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/institucion/reclamoController');
const { verifyToken, requireInstitucion } = require('../../middlewares/authMiddleware');

router.use(verifyToken, requireInstitucion);

router.get('/bandeja', ctrl.bandeja);
router.patch('/:id/estado', ctrl.avanzarEstado);
router.post('/:id/resolver', ctrl.resolver);
router.patch('/:id/cancelar', ctrl.cancelar);

module.exports = router;
