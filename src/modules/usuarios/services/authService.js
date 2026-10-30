const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../../../services/emailService');
const cityService = require('../../../services/ciudadService');
const UserModel = require('../models/usuarioModel');
const RefreshTokenModel = require('../models/refreshTokenModel');
const CiudadanoModel = require('../models/ciudadanoModel');
const InstitutionModel = require('../../instituciones/institucionModel');
const db = require('../../../config/db'); // Solo para connection.beginTransaction
const { ROLES, normalizeRole, getCanonicalRole } = require('../../../constants/roles');
const { BUSINESS_RULES } = require('../../../constants/businessRules');

const OTP_EXPIRATION_MINUTES = 15;
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
const RESET_TOKEN_EXPIRATION = '30m';
const ALLOWED_SOCIAL_PROVIDERS = new Set(['google', 'facebook']);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const getOtpExpirationDate = () => new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
const resolveUserId = (user) => user.id_usuario || user.id;

function throwError(status, message, codigo = undefined) {
  const err = new Error(message);
  err.status = status;
  if (codigo) err.codigo = codigo;
  throw err;
}

const authService = {
  async findUserByEmail(email) {
    return await UserModel.findByEmail(email);
  },

  async resolveUserRole(userId, defaultRole) {
    const raw = defaultRole ? String(defaultRole).trim().toLowerCase() : '';
    if (raw === 'admin') return ROLES.ADMIN;
    if (raw === 'institucion' || raw === 'institution') return ROLES.INSTITUCION;
    if (raw === 'ciudadano' || raw === 'citizen') return ROLES.CIUDADANO;

    const institution = await InstitutionModel.getByUserId(userId);
    if (institution) return ROLES.INSTITUCION;

    const citizen = await CiudadanoModel.getByUserId(userId);
    if (citizen) return ROLES.CIUDADANO;

    return ROLES.CIUDADANO;
  },

  /**
   * Valida criptográfica o remotamente la identidad del usuario contra el proveedor OAuth externo
   * antes de emitir credenciales locales. Nunca confía en email/nombre enviados por el cliente.
   */
  async verifyExternalProviderIdentity({ provider, providerToken, idToken, accessToken }) {
    const normalizedProvider = String(provider || '').trim().toLowerCase();
    if (!ALLOWED_SOCIAL_PROVIDERS.has(normalizedProvider)) {
      throwError(400, 'Proveedor de autenticación externo no soportado', 'PROVEEDOR_NO_SOPORTADO');
    }

    const tokenToVerify = idToken || providerToken || accessToken;
    if (!tokenToVerify || typeof tokenToVerify !== 'string' || !tokenToVerify.trim()) {
      throwError(401, 'Se requiere un token válido del proveedor externo para verificar la identidad', 'TOKEN_PROVEEDOR_REQUERIDO');
    }

    const cleanToken = tokenToVerify.trim();

    if (normalizedProvider === 'google') {
      const isJwtIdToken = Boolean(idToken) || cleanToken.split('.').length === 3;
      const url = isJwtIdToken
        ? `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(cleanToken)}`
        : 'https://www.googleapis.com/oauth2/v3/userinfo';
      const fetchOptions = isJwtIdToken
        ? { method: 'GET' }
        : { method: 'GET', headers: { Authorization: `Bearer ${cleanToken}` } };

      let response;
      try {
        response = await fetch(url, fetchOptions);
      } catch (_) {
        throwError(502, 'No se pudo contactar al proveedor de identidad Google');
      }

      if (!response || !response.ok) {
        throwError(401, 'Token de Google inválido o expirado', 'TOKEN_PROVEEDOR_INVALIDO');
      }

      const profile = await response.json();
      const emailVerified = profile?.email_verified === true || profile?.email_verified === 'true';
      if (!profile?.email || !emailVerified) {
        throwError(401, 'La cuenta de Google no posee un correo electrónico verificado válido', 'IDENTIDAD_EXTERNA_INVALIDA');
      }

      const expectedClientId = process.env.GOOGLE_CLIENT_ID;
      if (expectedClientId && expectedClientId !== 'mock-google-id' && profile.aud && profile.aud !== expectedClientId) {
        throwError(401, 'El token de Google no corresponde a esta aplicación', 'TOKEN_PROVEEDOR_INVALIDO');
      }

      return {
        provider: 'google',
        providerAccountId: String(profile.sub || profile.id || ''),
        email: String(profile.email).trim().toLowerCase(),
        name: profile.name ? String(profile.name).trim() : String(profile.email).trim().toLowerCase(),
      };
    }

    if (normalizedProvider === 'facebook') {
      const url = `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(cleanToken)}`;
      let response;
      try {
        response = await fetch(url, { method: 'GET' });
      } catch (_) {
        throwError(502, 'No se pudo contactar al proveedor de identidad Facebook');
      }

      if (!response || !response.ok) {
        throwError(401, 'Token de Facebook inválido o expirado', 'TOKEN_PROVEEDOR_INVALIDO');
      }

      const profile = await response.json();
      if (!profile || profile.error || !profile.id) {
        throwError(401, 'Token de Facebook inválido o expirado', 'TOKEN_PROVEEDOR_INVALIDO');
      }

      const resolvedEmail = profile.email
        ? String(profile.email).trim().toLowerCase()
        : `facebook-${String(profile.id).trim()}@reportarg.social`;

      return {
        provider: 'facebook',
        providerAccountId: String(profile.id).trim(),
        email: resolvedEmail,
        name: profile.name ? String(profile.name).trim() : resolvedEmail,
      };
    }

    throwError(400, 'Proveedor de autenticación externo no soportado', 'PROVEEDOR_NO_SOPORTADO');
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

    const nombreClean = String(nombre || '').trim();
    const apellidoClean = String(apellido || '').trim();
    const emailClean = String(email || '').trim();
    const provinciaClean = String(provincia || '').trim();
    const ciudadClean = String(ciudad || '').trim();
    const zonaClean = String(zona || '').trim();

    if (!nombreClean || !apellidoClean || !emailClean || !password || !provinciaClean || !ciudadClean || !zonaClean) {
      throwError(400, 'Todos los datos obligatorios de registro y residencia son requeridos');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiresAt = getOtpExpirationDate();

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const idCiudadActiva = await cityService.findActiveCity(ciudadClean, provinciaClean, connection);

      if (!idCiudadActiva) {
        const existeEnPadron = await cityService.existsCity(ciudadClean, provinciaClean, connection);
        if (!existeEnPadron) {
          throwError(
            400,
            'La ciudad seleccionada no existe o no es válida para la provincia indicada.',
            'CIUDAD_INEXISTENTE'
          );
        }
      }

      const userId = await UserModel.createAuthUser(connection, {
        email: emailClean,
        password: hashedPassword,
        email_verified: false,
        verification_code: otp,
        verification_expires: expiresAt,
        auth_provider: 'local',
        activo: true,
        id_ciudad: idCiudadActiva || null,
        tipo_usuario: ROLES.CIUDADANO
      });

      await CiudadanoModel.create(connection, {
        id_usuario: userId,
        nombre: nombreClean,
        apellido: apellidoClean,
        provincia: provinciaClean,
        ciudad: ciudadClean,
        zona: zonaClean
      });

      await connection.commit();
      await emailService.enviarCodigoVerificacion(emailClean, otp);

      return {
        id_usuario: userId,
        id_ciudad: idCiudadActiva || null,
        ciudad_activa: Boolean(idCiudadActiva),
        ciudad_residencia: {
          id: idCiudadActiva || null,
          nombre: ciudadClean,
          provincia: provinciaClean,
          activa: Boolean(idCiudadActiva),
        },
      };
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
        tipo_usuario: ROLES.INSTITUCION
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
    if (!email || !password) {
      throwError(400, 'Email y contraseña son requeridos');
    }

    const user = await this.findUserByEmail(String(email).trim());
    if (!user) throwError(401, 'Credenciales inválidas');
    if (!user.activo) throwError(403, 'Cuenta deshabilitada', 'CUENTA_DESHABILITADA');
    if (!user.email_verified) throwError(403, 'Debes verificar tu cuenta antes de iniciar sesión');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throwError(401, 'Credenciales inválidas');

    const canonicalDbRole = getCanonicalRole(user.tipo_usuario);
    if (!canonicalDbRole) {
      throwError(403, 'El rol asignado a la cuenta no es válido', 'ROL_NO_AUTORIZADO');
    }

    const userId = resolveUserId(user);
    let userType = await this.resolveUserRole(userId, user.tipo_usuario);
    const perfilRow = await UserModel.getProfileData(userId);

    if (perfilRow?.id_institucion && userType !== ROLES.ADMIN) {
      userType = ROLES.INSTITUCION;
    }

    const { accessToken, refreshToken } = this.createTokens(userId, user.email, userType);
    await this.saveRefreshToken(refreshToken, userId, userType);

    const institucionVerificada = perfilRow?.id_institucion
      ? Number(perfilRow.institucion_verificada) === 1
      : false;

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
        id_ciudad: user.id_ciudad || null,
        id_institucion: perfilRow?.id_institucion || null,
        institucion_verificada: institucionVerificada,
      }
    };
  },

  async socialLogin(payloadOrEmail, providerArg, nameArg, tokenArg) {
    const payload = typeof payloadOrEmail === 'object' && payloadOrEmail !== null
      ? payloadOrEmail
      : {
          email: payloadOrEmail,
          provider: providerArg,
          name: nameArg,
          providerToken: tokenArg,
        };

    const verifiedIdentity = await this.verifyExternalProviderIdentity({
      provider: payload.provider,
      providerToken: payload.providerToken,
      idToken: payload.idToken,
      accessToken: payload.accessToken,
    });

    // Si el cliente envió un email explícito y no coincide con el verificado por el proveedor, rechazar
    if (
      payload.email &&
      String(payload.email).trim().toLowerCase() !== verifiedIdentity.email
    ) {
      throwError(
        401,
        'La identidad enviada por el cliente no coincide con la validada por el proveedor externo',
        'IDENTIDAD_EXTERNA_INVALIDA'
      );
    }

    const verifiedEmail = verifiedIdentity.email;
    const verifiedName = verifiedIdentity.name;
    const normalizedProvider = verifiedIdentity.provider;

    let user = await this.findUserByEmail(verifiedEmail);
    if (!user) {
      const rawPassword = `${normalizedProvider}:${verifiedEmail}:${Date.now()}`;
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const insertId = await UserModel.createAuthUser(null, {
        email: verifiedEmail,
        password: hashedPassword,
        email_verified: true,
        verification_code: null,
        verification_expires: null,
        auth_provider: normalizedProvider,
        activo: true,
        id_ciudad: null,
        tipo_usuario: ROLES.CIUDADANO,
      });
      user = {
        id_usuario: insertId,
        email: verifiedEmail,
        activo: true,
        email_verified: true,
        tipo_usuario: ROLES.CIUDADANO,
      };
    } else {
      // Un usuario inhabilitado NUNCA puede iniciar sesión ni reactivarse mediante proveedor social
      if (!user.activo) {
        throwError(403, 'Cuenta deshabilitada', 'CUENTA_DESHABILITADA');
      }

      const canonicalRole = getCanonicalRole(user.tipo_usuario);
      if (!canonicalRole) {
        throwError(403, 'El rol asignado a la cuenta no es válido', 'ROL_NO_AUTORIZADO');
      }

      const userId = resolveUserId(user);
      await UserModel.updateSocialAuth(userId, {
        email_verified: true,
        auth_provider: normalizedProvider,
      });
      user = {
        ...user,
        id_usuario: userId,
        email_verified: true,
        tipo_usuario: user.tipo_usuario,
      };
    }

    const userId = resolveUserId(user);
    const userType = await this.resolveUserRole(userId, user.tipo_usuario);
    const { accessToken, refreshToken } = this.createTokens(userId, verifiedEmail, userType);

    await this.saveRefreshToken(refreshToken, userId, userType);

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: verifiedEmail,
        name: verifiedName,
        role: userType,
        email_verified: true,
      }
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

      // Verificar que el usuario exista, esté activo y conserve un rol válido en la BD
      const [rows] = await db.query(
        `SELECT u.activo, u.tipo_usuario, i.id_institucion, i.verificada AS institucion_verificada
         FROM usuarios u
         LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
         WHERE u.id_usuario = ?`,
        [user.id]
      );
      const userDb = rows && rows[0];
      if (!userDb || !userDb.activo) {
        await RefreshTokenModel.deleteByUserId(user.id);
        throwError(403, 'Cuenta deshabilitada', 'CUENTA_DESHABILITADA');
      }

      const canonicalDbRole = getCanonicalRole(userDb.tipo_usuario);
      if (!canonicalDbRole) {
        await RefreshTokenModel.deleteByUserId(user.id);
        throwError(403, 'El rol asignado a la cuenta ya no es válido', 'ROL_NO_AUTORIZADO');
      }

      let roleActual = await this.resolveUserRole(user.id, userDb.tipo_usuario);
      if (userDb.id_institucion && roleActual !== ROLES.ADMIN) {
        roleActual = ROLES.INSTITUCION;
      }

      // Si el rol de la cuenta cambió respecto al momento en que se emitió la sesión, revocar el refresh token
      const tokenRole = user.role ? normalizeRole(user.role) : null;
      if (tokenRole && tokenRole !== normalizeRole(roleActual)) {
        await RefreshTokenModel.deleteByUserId(user.id);
        throwError(403, 'Los permisos de la cuenta cambiaron. Iniciá sesión nuevamente.', 'ROL_NO_AUTORIZADO');
      }

      // Si es institución y fue des-verificada/inhabilitada, revocar la renovación de sesión
      if (roleActual === ROLES.INSTITUCION && Number(userDb.institucion_verificada) !== 1) {
        await RefreshTokenModel.deleteByUserId(user.id);
        throwError(
          403,
          'Institución pendiente de verificación o inhabilitada.',
          'INSTITUCION_NO_VERIFICADA'
        );
      }

      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email, role: normalizeRole(roleActual) },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return newAccessToken;
    } catch (err) {
      if (err.status) throw err;
      throwError(403, 'Refresh token no válido');
    }
  },

  async logout(token) {
    if (token) {
      await RefreshTokenModel.deleteByToken(token);
    }
  },

  async getCiudadesInteres(userId, role) {
    if (normalizeRole(role) !== ROLES.CIUDADANO) {
      throwError(403, 'La gestión de ciudades de interés es exclusiva para ciudadanos', 'ROL_NO_AUTORIZADO');
    }

    const lista = await CiudadanoModel.getCiudadesInteres(userId);
    const inactivas = lista.filter((c) => !c.activa);

    return {
      ciudades: lista,
      maximo: BUSINESS_RULES.CITIZEN_MAX_INTEREST_CITIES,
      disponibles: Math.max(0, BUSINESS_RULES.CITIZEN_MAX_INTEREST_CITIES - lista.length),
      hay_ciudades_inactivas: inactivas.length > 0,
      ciudades_inactivas: inactivas,
    };
  },

  async addCiudadInteres(userId, role, idCiudadInput, idCiudadResidencia = null) {
    if (normalizeRole(role) !== ROLES.CIUDADANO) {
      throwError(403, 'La gestión de ciudades de interés es exclusiva para ciudadanos', 'ROL_NO_AUTORIZADO');
    }

    const idCiudad = Number(idCiudadInput);
    if (!idCiudad || !Number.isSafeInteger(idCiudad) || idCiudad <= 0) {
      throwError(400, 'Debés seleccionar una ciudad válida', 'CIUDAD_INVALIDA');
    }

    if (idCiudadResidencia && Number(idCiudadResidencia) === idCiudad) {
      throwError(400, 'No podés agregar tu propia ciudad de residencia como ciudad de interés', 'CIUDAD_ES_RESIDENCIA');
    }

    const ciudad = await cityService.getById(idCiudad);
    if (!ciudad) {
      throwError(400, 'La ciudad seleccionada no existe', 'CIUDAD_INEXISTENTE');
    }
    if (!ciudad.activa) {
      throwError(
        400,
        'La ciudad seleccionada no está activa y no cumple los requisitos de disponibilidad',
        'CIUDAD_INACTIVA'
      );
    }

    const perfilCiudadano = await CiudadanoModel.getByUserId(userId);
    if (
      perfilCiudadano?.ciudad &&
      perfilCiudadano?.provincia &&
      String(perfilCiudadano.ciudad).trim().toLowerCase() === String(ciudad.nombre).trim().toLowerCase() &&
      String(perfilCiudadano.provincia).trim().toLowerCase() === String(ciudad.provincia).trim().toLowerCase()
    ) {
      throwError(400, 'No podés agregar tu propia ciudad de residencia como ciudad de interés', 'CIUDAD_ES_RESIDENCIA');
    }

    const yaExiste = await CiudadanoModel.hasCiudadInteres(userId, idCiudad);
    if (yaExiste) {
      throwError(400, 'Esta ciudad ya forma parte de tus ciudades de interés', 'CIUDAD_YA_AGREGADA');
    }

    const total = await CiudadanoModel.countCiudadesInteres(userId);
    if (total >= BUSINESS_RULES.CITIZEN_MAX_INTEREST_CITIES) {
      throwError(
        400,
        `Solo podés guardar hasta ${BUSINESS_RULES.CITIZEN_MAX_INTEREST_CITIES} ciudades adicionales de interés`,
        'LIMITE_CIUDADES_INTERES'
      );
    }

    await CiudadanoModel.addCiudadInteres(userId, idCiudad);
    return await this.getCiudadesInteres(userId, role);
  },

  async removeCiudadInteres(userId, role, idCiudadInput) {
    if (normalizeRole(role) !== ROLES.CIUDADANO) {
      throwError(403, 'La gestión de ciudades de interés es exclusiva para ciudadanos', 'ROL_NO_AUTORIZADO');
    }

    const idCiudad = Number(idCiudadInput);
    if (!idCiudad || !Number.isSafeInteger(idCiudad) || idCiudad <= 0) {
      throwError(400, 'ID de ciudad inválido', 'CIUDAD_INVALIDA');
    }

    const eliminadas = await CiudadanoModel.removeCiudadInteres(userId, idCiudad);
    if (eliminadas === 0) {
      throwError(404, 'La ciudad indicada no se encuentra en tus ciudades de interés', 'CIUDAD_NO_ENCONTRADA');
    }

    return await this.getCiudadesInteres(userId, role);
  },

  async cambiarContextoCiudad(userId, role, idCiudadInput, idCiudadResidencia = null) {
    if (normalizeRole(role) !== ROLES.CIUDADANO) {
      throwError(403, 'El cambio de contexto territorial es exclusivo para ciudadanos', 'ROL_NO_AUTORIZADO');
    }

    const idCiudad = Number(idCiudadInput);
    if (!idCiudad || !Number.isSafeInteger(idCiudad) || idCiudad <= 0) {
      throwError(400, 'Debés seleccionar una ciudad válida', 'CIUDAD_INVALIDA');
    }

    const ciudad = await cityService.getById(idCiudad);
    if (!ciudad) {
      throwError(404, 'La ciudad seleccionada no existe', 'CIUDAD_INEXISTENTE');
    }
    if (!ciudad.activa) {
      throwError(
        400,
        `La ciudad ${ciudad.nombre} dejó de estar activa en ReportARG. Se bloquearon las operaciones en esta localidad.`,
        'CIUDAD_INACTIVA'
      );
    }

    const esResidencia = Boolean(idCiudadResidencia) && Number(idCiudadResidencia) === Number(ciudad.id);

    return {
      ciudad_seleccionada: {
        id: ciudad.id,
        nombre: ciudad.nombre,
        provincia: ciudad.provincia,
        activa: true,
      },
      es_residencia: esResidencia,
      es_visitante: !esResidencia,
      id_ciudad_residencia: idCiudadResidencia || null,
      permisos_escritura: esResidencia,
    };
  }
};

module.exports = authService;
