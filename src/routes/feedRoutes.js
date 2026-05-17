const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/feedController');

router.get('/',           ctrl.getFeed);
router.get('/categorias', ctrl.getCategorias);
router.get('/tendencias', ctrl.getTendencias);

module.exports = router;
