const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/comunicadoController');

router.get('/categorias',       ctrl.categorias);
router.get('/mis-comunicados',  ctrl.misComunicados);
router.post('/',                ctrl.crear);

module.exports = router;
