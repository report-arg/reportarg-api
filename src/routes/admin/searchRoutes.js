const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/searchController');

router.get('/', ctrl.buscar);

module.exports = router;