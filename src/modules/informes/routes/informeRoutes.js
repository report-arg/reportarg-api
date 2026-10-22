const express = require('express');
const { verifyToken, requireInstitucion } = require('../../../middlewares/authMiddleware');
const { gestionReclamos } = require('../controllers/informeController');

const router = express.Router();
router.use(verifyToken, requireInstitucion);
router.get('/gestion-reclamos', gestionReclamos);

module.exports = router;
