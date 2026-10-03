const express = require('express');
const router = express.Router();
const ctrl = require('./notificationController');

// Obtener notificaciones del usuario autenticado
router.get('/', ctrl.listar);

// Obtener contador de notificaciones no leídas
router.get('/unread-count', ctrl.countNoLeidas);

// Marcar todas las notificaciones como leídas
router.patch('/leidas', ctrl.marcarTodasLeidas);
router.patch('/leer-todas', ctrl.marcarTodasLeidas);
router.put('/leer-todas', ctrl.marcarTodasLeidas);

// Marcar una notificación específica como leída
router.patch('/:id/leida', ctrl.marcarLeida);
router.put('/:id/leer', ctrl.marcarLeida);

module.exports = router;
