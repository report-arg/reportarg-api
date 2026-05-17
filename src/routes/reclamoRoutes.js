const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reclamoController');

router.get('/categorias',   ctrl.categoriasParaReclamo);
router.get('/mis-reclamos', ctrl.misReclamos);
router.post('/',            ctrl.crear);

module.exports = router;
