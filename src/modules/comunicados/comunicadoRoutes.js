const express = require('express');
const router  = express.Router();
const ctrl    = require('./comunicadoController');
const { verifyToken, requireInstitucion } = require('../../middlewares/authMiddleware');

router.get('/categorias',      ctrl.categorias);
router.get('/mis-comunicados', verifyToken, requireInstitucion, ctrl.misComunicados);
router.post('/',               verifyToken, requireInstitucion, ctrl.crear);
router.put('/:id',            verifyToken, requireInstitucion, ctrl.editar);
router.delete('/:id',          verifyToken, requireInstitucion, ctrl.eliminar);

module.exports = router;
