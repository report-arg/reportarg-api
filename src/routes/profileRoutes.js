const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin/userController');

router.patch('/perfil', ctrl.actualizarPerfil);
router.post('/cambiar-password', ctrl.cambiarPassword);

module.exports = router;
