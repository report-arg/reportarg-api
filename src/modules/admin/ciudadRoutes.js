const express = require('express');
const router = express.Router();
const ctrl = require('./ciudadController');

router.get('/', ctrl.listar);

module.exports = router;
