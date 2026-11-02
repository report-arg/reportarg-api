const express = require('express');
const router = express.Router();
const ctrl = require('./ciudadController');

router.get('/', ctrl.listar);
router.get('/provincias', ctrl.listarProvincias);
router.get('/localidades', ctrl.listarLocalidades);

module.exports = router;
