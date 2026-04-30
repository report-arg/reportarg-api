const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/institutionController');

router.get('/',           ctrl.listar);
router.get('/stats',      ctrl.stats);
router.get('/:id',        ctrl.obtener);
router.put('/:id/verificar', ctrl.verificar);
router.put('/:id/rechazar',  ctrl.rechazar);

module.exports = router;