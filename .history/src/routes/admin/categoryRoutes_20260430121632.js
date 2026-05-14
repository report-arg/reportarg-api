const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/categoryController');

router.get('/',      ctrl.listar);
router.get('/:id',   ctrl.obtener);
router.post('/',     ctrl.crear);
router.put('/:id',   ctrl.editar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;