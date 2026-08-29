const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reclamoController');
const { verifyToken, requireCiudadano } = require('../middlewares/authMiddleware');

router.get('/categorias',   ctrl.categoriasParaReclamo);
router.get('/mapa',         ctrl.reclamosParaMapa);
router.get('/mis-reclamos', verifyToken, requireCiudadano, ctrl.misReclamos);
router.post('/',            verifyToken, requireCiudadano, ctrl.crear);

module.exports = router;
