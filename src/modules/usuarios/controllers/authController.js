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
    const result = await authService.registerCitizen(req.body);
    return res.status(201).json({
      ok: true,
      message: 'Usuario registrado. Por favor verifica tu email.',
      ciudad_activa: result?.ciudad_activa ?? false,
      ciudad_residencia: result?.ciudad_residencia ?? null,
      data: result || null,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        ok: false,
        error: error.message,
        ...(error.codigo ? { codigo: error.codigo } : {}),
      });
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
  const { email, password } = req.body || {};

  if (!email || !password || !String(email).trim() || !String(password)) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const result = await authService.login(String(email).trim(), password);
    return res.status(200).json({
      message: 'Login exitoso',
      ...result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message, ...(error.codigo ? { codigo: error.codigo } : {}) });
    }
    next(error);
  }
};

const socialLogin = async (req, res, next) => {
  const { email, provider, name, providerToken, idToken, accessToken } = req.body || {};

  if (!provider || !String(provider).trim()) {
    return res.status(400).json({ error: 'El proveedor de autenticación es requerido' });
  }

  const resolvedToken = providerToken || idToken || accessToken;
  if (!resolvedToken || typeof resolvedToken !== 'string' || !resolvedToken.trim()) {
    return res.status(401).json({
      error: 'Se requiere un token válido del proveedor externo para verificar la identidad',
      codigo: 'TOKEN_PROVEEDOR_REQUERIDO',
    });
  }

  try {
    const result = await authService.socialLogin({
      provider: String(provider).trim(),
      providerToken: resolvedToken.trim(),
      idToken: idToken ? String(idToken).trim() : null,
      accessToken: accessToken ? String(accessToken).trim() : null,
      email: email ? String(email).trim() : null,
      name: name ? String(name).trim() : null,
    });
    return res.status(200).json({
      message: 'Login social exitoso',
      ...result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message, ...(error.codigo ? { codigo: error.codigo } : {}) });
    }
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(401).json({ error: 'Refresh token es requerido' });
  }

  try {
    const accessToken = await authService.refreshToken(token);
    return res.json({ accessToken });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message, ...(error.codigo ? { codigo: error.codigo } : {}) });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  const { token } = req.body || {};

  try {
    await authService.logout(token);
    return res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const UserModel = require('../models/usuarioModel');
    const CiudadanoModel = require('../models/ciudadanoModel');
    const usuario = await UserModel.getById(req.user.id);
    if (!usuario) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    const residenciaActiva =
      usuario.residencia_activa !== undefined && usuario.residencia_activa !== null
        ? Number(usuario.residencia_activa) === 1
        : Boolean(req.user.id_ciudad);

    const nombreResidencia = usuario.ciudad_declarada || usuario.ciudad_activa || usuario.ciudad || null;
    const provinciaResidencia = usuario.provincia_declarada || usuario.provincia_activa || usuario.provincia || null;

    let ciudadesInteres = [];
    if (req.user.role === 'ciudadano') {
      try {
        ciudadesInteres = await CiudadanoModel.getCiudadesInteres(req.user.id);
      } catch (_) {
        ciudadesInteres = [];
      }
    }

    return res.json({
      ok: true,
      data: {
        ...usuario,
        rol: req.user.role,
        id_ciudad: residenciaActiva ? (req.user.id_ciudad ?? usuario.id_ciudad ?? null) : null,
        residencia_activa: residenciaActiva,
        ciudad_residencia: {
          id: residenciaActiva ? (req.user.id_ciudad ?? usuario.id_ciudad ?? null) : null,
          nombre: nombreResidencia,
          provincia: provinciaResidencia,
          activa: residenciaActiva,
        },
        ciudades_interes: ciudadesInteres,
        id_institucion: req.user.id_institucion ?? usuario.id_institucion ?? null,
        institucion_verificada: req.user.institucion_verificada,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCiudadesInteres = async (req, res, next) => {
  try {
    const data = await authService.getCiudadesInteres(req.user.id, req.user.role);
    return res.json({ ok: true, data });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        ok: false,
        mensaje: error.message,
        error: error.message,
        ...(error.codigo ? { codigo: error.codigo } : {}),
      });
    }
    next(error);
  }
};

const addCiudadInteres = async (req, res, next) => {
  try {
    const idCiudad = req.body?.id_ciudad ?? req.body?.idCiudad;
    const data = await authService.addCiudadInteres(
      req.user.id,
      req.user.role,
      idCiudad,
      req.user.id_ciudad
    );
    return res.status(201).json({
      ok: true,
      mensaje: 'Ciudad de interés agregada correctamente.',
      data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        ok: false,
        mensaje: error.message,
        error: error.message,
        ...(error.codigo ? { codigo: error.codigo } : {}),
      });
    }
    next(error);
  }
};

const removeCiudadInteres = async (req, res, next) => {
  try {
    const { idCiudad } = req.params;
    const data = await authService.removeCiudadInteres(req.user.id, req.user.role, idCiudad);
    return res.json({
      ok: true,
      mensaje: 'Ciudad de interés eliminada correctamente.',
      data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        ok: false,
        mensaje: error.message,
        error: error.message,
        ...(error.codigo ? { codigo: error.codigo } : {}),
      });
    }
    next(error);
  }
};

const cambiarContextoCiudad = async (req, res, next) => {
  try {
    const idCiudad = req.body?.id_ciudad ?? req.body?.idCiudad;
    const data = await authService.cambiarContextoCiudad(
      req.user.id,
      req.user.role,
      idCiudad,
      req.user.id_ciudad
    );
    return res.json({
      ok: true,
      mensaje: 'Contexto de ciudad actualizado para consulta.',
      data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        ok: false,
        mensaje: error.message,
        error: error.message,
        ...(error.codigo ? { codigo: error.codigo } : {}),
      });
    }
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
  getCiudadesInteres,
  addCiudadInteres,
  removeCiudadInteres,
  cambiarContextoCiudad,
};
