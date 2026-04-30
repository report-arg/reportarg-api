const express = require('express');
const router  = express.Router();
const ctrl = require('../../controllers/admin/userController');

router.get('/',           ctrl.listar);
router.get('/stats',      ctrl.stats);
router.get('/:id',        ctrl.obtener);
router.post('/',          ctrl.crear);
router.put('/:id',        ctrl.editar);
router.put('/:id/rol',    ctrl.cambiarRol);
router.delete('/:id',     ctrl.eliminar);

module.exports = router;