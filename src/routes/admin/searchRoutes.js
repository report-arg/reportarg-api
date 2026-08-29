const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/searchController');
const { verifyToken, requireRole } = require('../../middlewares/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/', ctrl.buscar);

module.exports = router;
