const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../config/emailService');

const OTP_EXPIRATION_MINUTES = 15;
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
const RESET_TOKEN_EXPIRATION = '30m';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getOtpExpirationDate = () => new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

const resolveUserId = (user) => user.id_usuario || user.id;

const findMissingFields = (payload, fields) => fields.filter((field) => {
  const value = payload[field];

  if (typeof value === 'boolean') {
    return false;
  }

  return value === undefined || value === null || String(value).trim() === '';
});

const findUserByEmail = async (email) => {
  const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return users[0] || null;
};

const createUserRecord = async (connection, email, hashedPassword, otp, expiresAt) => {
  const [userResult] = await connection.query(
    `INSERT INTO usuarios (email, password, email_verified, verification_code, verification_expires, auth_provider, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [email, hashedPassword, false, otp, expiresAt, 'local', true]
  );

  return userResult.insertId;
};

const resolveUserRole = async (userId, defaultRole) => {
  if (defaultRole && defaultRole !== 'usuario') {
    return defaultRole;
  }

  const [citizens] = await db.query('SELECT id_ciudadano FROM ciudadanos WHERE id_usuario = ?', [userId]);
  if (citizens.length > 0) {
    return 'citizen';
  }

  const [institutions] = await db.query('SELECT id_institucion FROM instituciones WHERE id_usuario = ?', [userId]);
  if (institutions.length > 0) {
    return 'institution';
  }

  return defaultRole || 'usuario';
};

const generateSocialPassword = async (provider, email) => {
  const rawPassword = `${provider}:${email}:${Date.now()}`;
  return bcrypt.hash(rawPassword, 10);
};

const createTokens = (userId, email, role) => {
  const accessToken = jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId, email, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const saveRefreshToken = async (refreshToken, userId, userType) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);

  await db.query(
    'INSERT INTO refresh_tokens (token, id_usuario, user_type, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
    [refreshToken, userId, userType, expiresAt]
  );
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);

    // Respuesta genérica para no exponer si el email existe o no.
    if (!user || !user.activo) {
      return res.status(200).json({ message: 'Si el correo existe, recibirás un enlace para restablecer la contraseña.' });
    }

    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;
    if (!resetSecret) {
      return res.status(500).json({ error: 'Configuración de seguridad incompleta para recuperación de contraseña' });
    }

    const token = jwt.sign(
      { email: user.email, purpose: 'password-reset' },
      resetSecret,
      { expiresIn: RESET_TOKEN_EXPIRATION }
    );

    await emailService.enviarRecuperacionPassword(user.email, token);

    return res.status(200).json({ message: 'Si el correo existe, recibirás un enlace para restablecer la contraseña.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor al solicitar recuperación de contraseña' });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
  }

  try {
    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;
    if (!resetSecret) {
      return res.status(500).json({ error: 'Configuración de seguridad incompleta para recuperación de contraseña' });
    }

    const payload = jwt.verify(token, resetSecret);

    if (payload.purpose !== 'password-reset' || !payload.email) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    const user = await findUserByEmail(payload.email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userId = resolveUserId(user);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [hashedPassword, userId]);
    await db.query('DELETE FROM refresh_tokens WHERE id_usuario = ?', [userId]);

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'El enlace de recuperación expiró' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Token inválido' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor al restablecer la contraseña' });
  }
};

const registerCitizen = async (req, res) => {
  const { nombre, apellido, email, password, provincia, ciudad, zona } = req.body;

  const missingFields = findMissingFields(req.body, ['nombre', 'apellido', 'email', 'password', 'provincia', 'ciudad', 'zona']);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Faltan campos requeridos: ${missingFields.join(', ')}` });
  }

  if (!emailRegex.test(String(email).trim())) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiresAt = getOtpExpirationDate();

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const userId = await createUserRecord(connection, email, hashedPassword, otp, expiresAt);

      await connection.query(
        `INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, nombre, apellido, provincia, ciudad, zona]
      );

      await connection.commit();
      await emailService.enviarCodigoVerificacion(email, otp);

      return res.status(201).json({ message: 'Usuario registrado. Por favor verifica tu email.' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor al registrar ciudadano' });
  }
};

const registerInstitution = async (req, res) => {
  const { contactName, email, password, institutionName, cuit, institutionType, phone, provincia, ciudad, zona, address } = req.body;

  const missingFields = findMissingFields(req.body, ['contactName', 'email', 'password', 'institutionName', 'cuit', 'institutionType', 'phone', 'provincia', 'ciudad', 'zona', 'address']);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Faltan campos requeridos: ${missingFields.join(', ')}` });
  }

  if (!emailRegex.test(String(email).trim())) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiresAt = getOtpExpirationDate();

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const userId = await createUserRecord(connection, email, hashedPassword, otp, expiresAt);

      await connection.query(
        `INSERT INTO instituciones (id_usuario, nombre, tipo, telefono, provincia, ciudad, zona, direccion, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          institutionName,
          institutionType,
          phone,
          provincia,
          ciudad,
          zona,
          address,
          'pending',
        ]
      );

      await connection.commit();
      await emailService.enviarCodigoVerificacion(email, otp);

      return res.status(201).json({ message: 'Institución registrada. Por favor verifica el email.' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor al registrar institución' });
  }
};

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'El email ya está verificado' });
    }

    if (String(user.verification_code) !== String(code)) {
      return res.status(400).json({ error: 'Código inválido' });
    }

    if (new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({ error: 'El código ha expirado' });
    }

    const userId = resolveUserId(user);

    await db.query(
      'UPDATE usuarios SET email_verified = ?, verification_code = NULL, verification_expires = NULL WHERE id_usuario = ?',
      [true, userId]
    );

    return res.status(200).json({ message: 'Email verificado correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor al verificar email' });
  }
};

const resendCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'El email ya está verificado' });
    }

    const otp = generateOTP();
    const expiresAt = getOtpExpirationDate();
    const userId = resolveUserId(user);

    await db.query(
      'UPDATE usuarios SET verification_code = ?, verification_expires = ? WHERE id_usuario = ?',
      [otp, expiresAt, userId]
    );

    await emailService.enviarCodigoVerificacion(email, otp);

    return res.status(200).json({ message: 'Nuevo código enviado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor al reenviar código' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.activo) {
      return res.status(403).json({ error: 'Cuenta deshabilitada' });
    }

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Debes verificar tu cuenta antes de iniciar sesión' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const userId = resolveUserId(user);
    const userType = await resolveUserRole(userId, user.tipo_usuario);
    const { accessToken, refreshToken } = createTokens(userId, user.email, userType);

    await saveRefreshToken(refreshToken, userId, userType);

    return res.status(200).json({
      message: 'Login exitoso',
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: user.email,
        role: userType,
        email_verified: user.email_verified,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor al intentar iniciar sesión' });
  }
};

const socialLogin = async (req, res) => {
  const { email, provider, name } = req.body;

  if (!email || !provider) {
    return res.status(400).json({ error: 'Email y provider son requeridos' });
  }

  try {
    let user = await findUserByEmail(email);

    if (!user) {
      const hashedPassword = await generateSocialPassword(provider, email);
      const [result] = await db.query(
        `INSERT INTO usuarios (email, password, email_verified, verification_code, verification_expires, auth_provider, activo, tipo_usuario)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, true, null, null, provider, true, 'usuario']
      );

      user = {
        id_usuario: result.insertId,
        email,
        activo: true,
        email_verified: true,
        tipo_usuario: 'usuario',
      };
    } else {
      const userId = resolveUserId(user);
      await db.query(
        `UPDATE usuarios
         SET email_verified = ?, auth_provider = COALESCE(auth_provider, ?), activo = ?
         WHERE id_usuario = ?`,
        [true, provider, true, userId]
      );

      user = {
        ...user,
        id_usuario: userId,
        email_verified: true,
        activo: true,
        tipo_usuario: user.tipo_usuario || 'usuario',
      };
    }

    const userId = resolveUserId(user);
    const userType = await resolveUserRole(userId, user.tipo_usuario || 'usuario');
    const { accessToken, refreshToken } = createTokens(userId, email, userType);

    await saveRefreshToken(refreshToken, userId, userType);

    return res.status(200).json({
      message: 'Login social exitoso',
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        name: name || email,
        role: userType,
        email_verified: true,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor al iniciar sesión con proveedor externo' });
  }
};

const refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ error: 'Refresh token es requerido' });
  }

  try {
    const [tokens] = await db.query('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
    if (tokens.length === 0) {
      return res.status(403).json({ error: 'Refresh token inválido' });
    }

    const dbToken = tokens[0];
    if (new Date() > new Date(dbToken.expires_at)) {
      await db.query('DELETE FROM refresh_tokens WHERE id = ?', [dbToken.id]);
      return res.status(403).json({ error: 'Refresh token expirado' });
    }

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Refresh token no válido' });
      }

      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al refrescar token' });
  }
};

const logout = async (req, res) => {
  const { token } = req.body;

  try {
    if (token) {
      await db.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
    }

    return res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al cerrar sesión' });
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
};
