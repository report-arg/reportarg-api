const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminUserController');

router.patch('/perfil', ctrl.actualizarPerfil);
router.post('/cambiar-password', ctrl.cambiarPassword);

module.exports = router;
