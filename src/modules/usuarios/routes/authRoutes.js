const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../../../middlewares/authMiddleware');
const profileController = require('../controllers/adminUsuarioController');

router.get('/me', verifyToken, authController.me);
router.patch('/me/perfil', verifyToken, profileController.actualizarPerfil);
router.post('/me/cambiar-password', verifyToken, profileController.cambiarPassword);
router.get('/me/ciudades-interes', verifyToken, authController.getCiudadesInteres);
router.post('/me/ciudades-interes', verifyToken, authController.addCiudadInteres);
router.delete('/me/ciudades-interes/:idCiudad', verifyToken, authController.removeCiudadInteres);
router.post('/me/contexto-ciudad', verifyToken, authController.cambiarContextoCiudad);

router.post('/register-citizen', authController.registerCitizen);
router.post('/register-institution', authController.registerInstitution);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-code', authController.resendCode);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.post('/login', authController.login);
router.post('/social-login', authController.socialLogin);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
