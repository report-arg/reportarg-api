const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reclamoController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/categorias',   ctrl.categoriasParaReclamo);
router.get('/mapa',         ctrl.reclamosParaMapa);
router.get('/mis-reclamos', verifyToken, ctrl.misReclamos);
router.post('/',            verifyToken, ctrl.crear);
router.delete('/comunicado/:id', verifyToken, ctrl.eliminarComunicado);

module.exports = router;
