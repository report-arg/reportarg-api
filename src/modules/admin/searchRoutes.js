const express = require('express');
const router  = express.Router();
const ctrl    = require('./searchController');

router.get('/', ctrl.buscar);

module.exports = router;
