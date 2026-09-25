const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reclamoController');
const { verifyToken, requireRole, requireCiudadano } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/roles');

// Categorías para reclamo
router.get('/categorias',   ctrl.categoriasParaReclamo);

// Reclamos públicos de la ciudad
router.get('/publicos',     verifyToken, ctrl.reclamosPublicos);

// Reclamos personales del ciudadano (HU-06)
router.get('/mis-reclamos', verifyToken, requireCiudadano, ctrl.misReclamos);

// Datos para mapa público
router.get('/mapa',         verifyToken, ctrl.reclamosParaMapa);

// Detalle completo del reclamo (HU-08)
router.get('/:id',          verifyToken, ctrl.obtenerDetalle);

// Crear nuevo reclamo (solo Ciudadanos y Admin) (HU-01, HU-02, HU-03)
router.post('/',            verifyToken, requireRole(ROLES.CIUDADANO, ROLES.ADMIN), ctrl.crear);

module.exports = router;

