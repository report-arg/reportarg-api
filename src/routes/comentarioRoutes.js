const express = require('express');
const router  = express.Router();
const comentarioController = require('../controllers/comentarioController');

// GET  /api/comentarios/:idReclamo  — lista comentarios de un post
router.get('/:idReclamo', comentarioController.listar);

// POST /api/comentarios             — crear nuevo comentario
router.post('/', comentarioController.crear);

// DELETE /api/comentarios/:id       — eliminar comentario propio
router.delete('/:id', comentarioController.eliminar);

module.exports = router;
