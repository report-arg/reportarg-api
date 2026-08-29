const express = require('express');
const router  = express.Router();
const comentarioController = require('../controllers/comentarioController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/roles');

// GET  /api/comentarios/:idReclamo  — lista comentarios de un post
router.get('/:idReclamo', comentarioController.listar);

// POST /api/comentarios             — crear nuevo comentario
router.post('/', verifyToken, requireRole(ROLES.CIUDADANO, ROLES.INSTITUCION), comentarioController.crear);

// DELETE /api/comentarios/:id       — eliminar comentario propio
router.delete('/:id', verifyToken, requireRole(ROLES.CIUDADANO, ROLES.INSTITUCION), comentarioController.eliminar);

module.exports = router;
