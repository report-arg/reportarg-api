const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/searchController');
const { verifyToken, requireAdmin } = require('../../middlewares/authMiddleware');

router.use(verifyToken, requireAdmin);

router.get('/', ctrl.buscar);

module.exports = router;
