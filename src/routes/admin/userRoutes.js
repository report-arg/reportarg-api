const express = require('express');
const router  = express.Router();
const ctrl = require('../../controllers/admin/userController');
const { verifyToken, requireRole } = require('../../middlewares/authMiddleware');

// Acciones del usuario autenticado: el ID se toma siempre del JWT.
router.patch('/me/perfil', verifyToken, ctrl.actualizarPerfil);
router.post('/me/cambiar-password', verifyToken, ctrl.cambiarPassword);

router.use(verifyToken, requireRole('admin'));

router.get('/',                        ctrl.listar);
router.get('/stats',                   ctrl.stats);
router.get('/:id',                     ctrl.obtener);
router.post('/',                       ctrl.crear);
router.put('/:id',                     ctrl.editar);
router.put('/:id/rol',                 ctrl.cambiarRol);
router.patch('/:id/perfil',            ctrl.actualizarPerfil);
router.post('/:id/cambiar-password',   ctrl.cambiarPassword);
router.delete('/:id',                  ctrl.eliminar);

module.exports = router;
