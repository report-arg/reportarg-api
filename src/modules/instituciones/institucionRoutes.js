const express = require('express');
const router  = express.Router();
const ctrl    = require('./institucionController');

router.get('/',                    ctrl.listar);
router.get('/stats',               ctrl.stats);
router.get('/:id',                 ctrl.obtener);
router.get('/:id/categorias',      ctrl.obtenerCategorias);
router.put('/:id/categorias',      ctrl.actualizarCategorias);
router.put('/:id/principal',       ctrl.designarPrincipal);
router.patch('/:id/estado',        ctrl.cambiarEstado);
router.put('/:id/verificar',       ctrl.verificar);
router.put('/:id/rechazar',        ctrl.rechazar);

module.exports = router;
