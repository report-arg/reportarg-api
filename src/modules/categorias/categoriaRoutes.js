const express = require('express');
const router  = express.Router();
const ctrl    = require('./categoriaController');

router.get('/',           ctrl.listar);
router.get('/:id',        ctrl.obtener);
router.post('/',          ctrl.crear);
router.put('/:id',        ctrl.editar);
router.patch('/:id/baja',      ctrl.bajaLogica);
router.patch('/:id/reactivar', ctrl.reactivar);
router.delete('/:id',          ctrl.eliminar);

module.exports = router;
