const express = require('express');
const router = express.Router();
const ctrl = require('./cityController');

router.get('/', ctrl.listar);

module.exports = router;
