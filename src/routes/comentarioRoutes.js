const express = require('express');
const router  = express.Router();
const comentarioController = require('../controllers/comentarioController');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET  /api/comentarios/:idReclamo  — lista comentarios de un post
router.get('/:idReclamo', comentarioController.listar);

// POST /api/comentarios             — crear nuevo comentario
router.post('/', verifyToken, comentarioController.crear);

// DELETE /api/comentarios/:id       — eliminar comentario propio
router.delete('/:id', verifyToken, comentarioController.eliminar);

module.exports = router;
