const authService = require('../services/authService');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const findMissingFields = (payload, fields) => fields.filter((field) => {
  const value = payload[field];
  if (typeof value === 'boolean') {
    return false;
  }
  return value === undefined || value === null || String(value).trim() === '';
});

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'El correo electrónico es requerido' });
  }

  if (!emailRegex.test(String(email).trim())) {
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido' });
  }

  try {
    await authService.forgotPassword(String(email).trim());
    return res.status(200).json({ message: 'Te enviamos un enlace para restablecer tu contraseña.' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
  }

  try {
    await authService.resetPassword(token, newPassword);
    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

const registerCitizen = async (req, res, next) => {
  const missingFields = findMissingFields(req.body, ['nombre', 'apellido', 'email', 'password', 'provincia', 'ciudad', 'zona']);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Faltan campos requeridos: ${missingFields.join(', ')}` });
  }

  if (!emailRegex.test(String(req.body.email).trim())) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  if (String(req.body.password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    await authService.registerCitizen(req.body);
    return res.status(201).json({ message: 'Usuario registrado. Por favor verifica tu email.' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

const registerInstitution = async (req, res, next) => {
  const missingFields = findMissingFields(req.body, ['contactName', 'email', 'password', 'institutionName', 'cuit', 'institutionType', 'phone', 'provincia', 'ciudad', 'zona', 'address']);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Faltan campos requeridos: ${missingFields.join(', ')}` });
  }

  if (!emailRegex.test(String(req.body.email).trim())) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  if (String(req.body.password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    await authService.registerInstitution(req.body);
    return res.status(201).json({ message: 'Institución registrada. Por favor verifica el email.' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};


const verifyEmail = async (req, res, next) => {
  const { email, code } = req.body;

  try {
    await authService.verifyEmail(email, code);
    return res.status(200).json({ message: 'Email verificado correctamente' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

const resendCode = async (req, res, next) => {
  const { email } = req.body;

  try {
    await authService.resendCode(email);
    return res.status(200).json({ message: 'Nuevo código enviado' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const result = await authService.login(email, password);
    return res.status(200).json({
      message: 'Login exitoso',
      ...result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

const socialLogin = async (req, res, next) => {
  const { email, provider, name } = req.body;

  if (!email || !provider) {
    return res.status(400).json({ error: 'Email y provider son requeridos' });
  }

  try {
    const result = await authService.socialLogin(email, provider, name);
    return res.status(200).json({
      message: 'Login social exitoso',
      ...result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ error: 'Refresh token es requerido' });
  }

  try {
    const accessToken = await authService.refreshToken(token);
    return res.json({ accessToken });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  const { token } = req.body;

  try {
    await authService.logout(token);
    return res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const UserModel = require('../models/userModel');
    const usuario = await UserModel.getById(req.user.id);
    if (!usuario) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    return res.json({ ok: true, data: usuario });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerCitizen,
  registerInstitution,
  verifyEmail,
  resendCode,
  forgotPassword,
  resetPassword,
  login,
  socialLogin,
  refreshToken,
  logout,
  me,
};
