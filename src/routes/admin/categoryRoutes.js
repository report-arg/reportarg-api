const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/categoryController');

router.get('/',           ctrl.listar);
router.get('/:id',        ctrl.obtener);
router.post('/',          ctrl.crear);
router.put('/:id',        ctrl.editar);
router.patch('/:id/baja', ctrl.bajaLogica);
router.delete('/:id',     ctrl.eliminar);

module.exports = router;