const express = require('express');
const router = express.Router();
const ctrl = require('./ciudadController');
const { verifyToken, requireAdmin } = require('../../middlewares/authMiddleware');

router.get('/', ctrl.listar);
router.get('/stats', verifyToken, requireAdmin, ctrl.obtenerStats);
router.get('/provincias', ctrl.listarProvincias);
router.get('/localidades', ctrl.listarLocalidades);

router.post('/', verifyToken, requireAdmin, ctrl.registrarCiudad);
router.patch('/:id/estado', verifyToken, requireAdmin, ctrl.cambiarEstado);
router.put('/:id/institucion-principal', verifyToken, requireAdmin, ctrl.designarInstitucionPrincipal);

module.exports = router;
