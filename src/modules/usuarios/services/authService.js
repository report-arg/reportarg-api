const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../../../services/emailService');
const cityService = require('../../../services/cityService');
const UserModel = require('../models/userModel');
const RefreshTokenModel = require('../models/refreshTokenModel');
const CiudadanoModel = require('../models/ciudadanoModel');
const InstitutionModel = require('../../instituciones/institutionModel');
const db = require('../../../config/db'); // Solo para connection.beginTransaction
const { ROLES, normalizeRole } = require('../../../constants/roles');

const OTP_EXPIRATION_MINUTES = 15;
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
const RESET_TOKEN_EXPIRATION = '30m';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const getOtpExpirationDate = () => new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
const resolveUserId = (user) => user.id_usuario || user.id;

function throwError(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

const authService = {
  async findUserByEmail(email) {
    return await UserModel.findByEmail(email);
  },

  async resolveUserRole(userId, defaultRole) {
    const raw = defaultRole ? String(defaultRole).trim().toLowerCase() : '';
    if (raw === 'admin') return ROLES.ADMIN;
    if (raw === 'ciudadano' || raw === 'citizen') return ROLES.CIUDADANO;
    if (raw === 'institucion' || raw === 'institution') return ROLES.INSTITUCION;

    const citizen = await CiudadanoModel.getByUserId(userId);
    if (citizen) return ROLES.CIUDADANO;

    const institution = await InstitutionModel.getByUserId(userId);
    if (institution) return ROLES.INSTITUCION;

    return ROLES.CIUDADANO;
  },

  createTokens(userId, email, role) {
    const normalizedRole = normalizeRole(role);
    const accessToken = jwt.sign(
      { id: userId, email, role: normalizedRole },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const refreshToken = jwt.sign(
      { id: userId, email, role: normalizedRole },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
  },

  async saveRefreshToken(refreshToken, userId, userType) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);
    const normalizedUserType = normalizeRole(userType);
    await RefreshTokenModel.create({
      token: refreshToken,
      id_usuario: userId,
      user_type: normalizedUserType,
      expires_at: expiresAt
    });
  },

  async forgotPassword(email) {
    const user = await this.findUserByEmail(email);
    if (!user) throwError(404, 'No existe una cuenta registrada con ese correo');
    if (!user.activo) throwError(403, 'La cuenta está deshabilitada');

    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;
    if (!resetSecret) throwError(500, 'Configuración de seguridad incompleta para recuperación de contraseña');

    const token = jwt.sign(
      { email: user.email, purpose: 'password-reset' },
      resetSecret,
      { expiresIn: RESET_TOKEN_EXPIRATION }
    );

    await emailService.enviarRecuperacionPassword(user.email, token);
  },

  async resetPassword(token, newPassword) {
    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;
    if (!resetSecret) throwError(500, 'Configuración de seguridad incompleta para recuperación de contraseña');

    let payload;
    try {
      payload = jwt.verify(token, resetSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') throwError(400, 'El enlace de recuperación expiró');
      if (error.name === 'JsonWebTokenError') throwError(400, 'Token inválido');
      throw error;
    }

    if (payload.purpose !== 'password-reset' || !payload.email) {
      throwError(400, 'Token inválido');
    }

    const user = await this.findUserByEmail(payload.email);
    if (!user) throwError(404, 'Usuario no encontrado');

    const userId = resolveUserId(user);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await UserModel.updatePassword(userId, hashedPassword);
    await RefreshTokenModel.deleteByUserId(userId);
  },

  async registerCitizen({ nombre, apellido, email, password, provincia, ciudad, zona }) {
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) throwError(400, 'El email ya está registrado');

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiresAt = getOtpExpirationDate();

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const idCiudadActiva = await cityService.findActiveCity(ciudad, provincia, connection);

      const userId = await UserModel.createAuthUser(connection, {
        email,
        password: hashedPassword,
        email_verified: false,
        verification_code: otp,
        verification_expires: expiresAt,
        auth_provider: 'local',
        activo: true,
        id_ciudad: idCiudadActiva,
        tipo_usuario: 'usuario'
      });

      await CiudadanoModel.create(connection, {
        id_usuario: userId,
        nombre,
        apellido,
        provincia,
        ciudad,
        zona
      });

      await connection.commit();
      await emailService.enviarCodigoVerificacion(email, otp);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async registerInstitution({ contactName, email, password, institutionName, cuit, institutionType, phone, provincia, ciudad, zona, address }) {
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) throwError(400, 'El email ya está registrado');

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiresAt = getOtpExpirationDate();

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const idCiudadActiva = await cityService.findActiveCity(ciudad, provincia, connection);

      if (!idCiudadActiva) {
        await connection.rollback();
        throwError(400, 'La ciudad o localidad indicada no cuenta actualmente con la plataforma ReportARG activa para dar de alta instituciones.');
      }

      const userId = await UserModel.createAuthUser(connection, {
        email,
        password: hashedPassword,
        email_verified: false,
        verification_code: otp,
        verification_expires: expiresAt,
        auth_provider: 'local',
        activo: true,
        id_ciudad: idCiudadActiva,
        tipo_usuario: 'usuario'
      });

      await InstitutionModel.create(connection, {
        id_usuario: userId,
        nombre: institutionName,
        tipo: institutionType,
        telefono: phone,
        provincia,
        ciudad,
        zona,
        direccion: address,
        status: 'pending',
        id_ciudad: idCiudadActiva
      });

      await connection.commit();
      await emailService.enviarCodigoVerificacion(email, otp);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async verifyEmail(email, code) {
    const user = await this.findUserByEmail(email);
    if (!user) throwError(404, 'Usuario no encontrado');
    if (user.email_verified) throwError(400, 'El email ya está verificado');
    if (String(user.verification_code) !== String(code)) throwError(400, 'Código inválido');
    if (new Date() > new Date(user.verification_expires)) throwError(400, 'El código ha expirado');

    const userId = resolveUserId(user);
    await UserModel.updateVerification(userId, {
      email_verified: true,
      verification_code: null,
      verification_expires: null
    });
  },

  async resendCode(email) {
    const user = await this.findUserByEmail(email);
    if (!user) throwError(404, 'Usuario no encontrado');
    if (user.email_verified) throwError(400, 'El email ya está verificado');

    const otp = generateOTP();
    const expiresAt = getOtpExpirationDate();
    const userId = resolveUserId(user);

    await UserModel.updateVerification(userId, {
      email_verified: false, // Remains false
      verification_code: otp,
      verification_expires: expiresAt
    });

    await emailService.enviarCodigoVerificacion(email, otp);
  },

  async login(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) throwError(401, 'Credenciales inválidas');
    if (!user.activo) throwError(403, 'Cuenta deshabilitada');
    if (!user.email_verified) throwError(403, 'Debes verificar tu cuenta antes de iniciar sesión');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throwError(401, 'Credenciales inválidas');

    const userId = resolveUserId(user);
    const userType = await this.resolveUserRole(userId, user.tipo_usuario);
    const { accessToken, refreshToken } = this.createTokens(userId, user.email, userType);

    await this.saveRefreshToken(refreshToken, userId, userType);

    const perfilRow = await UserModel.getProfileData(userId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: user.email,
        role: userType,
        nombre: perfilRow?.nombre || null,
        foto: perfilRow?.foto || null,
        email_verified: user.email_verified,
      }
    };
  },

  async socialLogin(email, provider, name) {
    let user = await this.findUserByEmail(email);
    if (!user) {
      const rawPassword = `${provider}:${email}:${Date.now()}`;
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      
      const insertId = await UserModel.createAuthUser(null, {
        email,
        password: hashedPassword,
        email_verified: true,
        verification_code: null,
        verification_expires: null,
        auth_provider: provider,
        activo: true,
        tipo_usuario: 'usuario'
      });
      user = { id_usuario: insertId, email, activo: true, email_verified: true, tipo_usuario: 'usuario' };
    } else {
      const userId = resolveUserId(user);
      await UserModel.updateSocialAuth(userId, {
        email_verified: true,
        auth_provider: provider,
        activo: true
      });
      user = { ...user, id_usuario: userId, email_verified: true, activo: true, tipo_usuario: user.tipo_usuario || 'usuario' };
    }

    const userId = resolveUserId(user);
    const userType = await this.resolveUserRole(userId, user.tipo_usuario || 'usuario');
    const { accessToken, refreshToken } = this.createTokens(userId, email, userType);

    await this.saveRefreshToken(refreshToken, userId, userType);

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, name: name || email, role: userType, email_verified: true }
    };
  },

  async refreshToken(token) {
    const dbToken = await RefreshTokenModel.findByToken(token);
    if (!dbToken) throwError(403, 'Refresh token inválido');

    if (new Date() > new Date(dbToken.expires_at)) {
      await RefreshTokenModel.deleteById(dbToken.id);
      throwError(403, 'Refresh token expirado');
    }

    try {
      const user = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email, role: normalizeRole(user.role) },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return newAccessToken;
    } catch (err) {
      throwError(403, 'Refresh token no válido');
    }
  },

  async logout(token) {
    if (token) {
      await RefreshTokenModel.deleteByToken(token);
    }
  }
};

module.exports = authService;
