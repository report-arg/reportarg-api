const express = require('express');
const router = express.Router();
const ctrl = require('./auditoriaController');

router.get('/', ctrl.lista);
router.get('/:tipo/:id', ctrl.porEntidad);

module.exports = router;

