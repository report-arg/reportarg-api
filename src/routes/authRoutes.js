const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register-citizen', authController.registerCitizen);
router.post('/register-institution', authController.registerInstitution);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-code', authController.resendCode);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
