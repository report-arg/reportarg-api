const express = require('express');
const router  = express.Router();
const ctrl = require('../controllers/adminUsuarioController');

router.get('/',                        ctrl.listar);
router.get('/stats',                   ctrl.stats);
router.get('/:id',                     ctrl.obtener);
router.post('/',                       ctrl.crear);
router.put('/:id',                     ctrl.editar);
router.put('/:id/rol',                 ctrl.cambiarRol);
router.patch('/:id/estado',              ctrl.cambiarEstado);
router.patch('/:id/perfil',            ctrl.actualizarPerfil);
router.post('/:id/cambiar-password',   ctrl.cambiarPassword);
router.delete('/:id',                  ctrl.eliminar);

module.exports = router;
