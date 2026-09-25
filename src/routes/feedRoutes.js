const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/feedController');
const { optionalToken } = require('../middlewares/authMiddleware');

router.get('/',           optionalToken, ctrl.getFeed);
router.get('/categorias', ctrl.getCategorias);
router.get('/tendencias', optionalToken, ctrl.getTendencias);

module.exports = router;

