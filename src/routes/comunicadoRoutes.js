const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/comunicadoController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/categorias',       ctrl.categorias);
router.get('/mis-comunicados',  verifyToken, requireRole('institution', 'institucion'), ctrl.misComunicados);
router.post('/',                verifyToken, requireRole('institution', 'institucion'), ctrl.crear);

module.exports = router;
