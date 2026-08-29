const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/institutionController');
const { verifyToken, requireRole } = require('../../middlewares/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/',           ctrl.listar);
router.get('/stats',      ctrl.stats);
router.get('/:id',        ctrl.obtener);
router.put('/:id/verificar', ctrl.verificar);
router.put('/:id/rechazar',  ctrl.rechazar);

module.exports = router;
