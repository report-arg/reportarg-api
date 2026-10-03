const express = require('express');
const router  = express.Router();
const ctrl    = require('./actividadController');
const { optionalToken } = require('../../middlewares/authMiddleware');

router.get('/resumen', optionalToken, ctrl.getResumen);

module.exports = router;
