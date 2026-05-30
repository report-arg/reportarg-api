const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reclamoController');

router.get('/categorias',   ctrl.categoriasParaReclamo);
router.get('/mapa',         ctrl.reclamosParaMapa);
router.get('/mis-reclamos', ctrl.misReclamos);
router.post('/',            ctrl.crear);
router.delete('/comunicado/:id', ctrl.eliminarComunicado);

module.exports = router;
