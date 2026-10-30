const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const db = require('../../src/config/db');
const bcrypt = require('bcryptjs');

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

describe('Auth - Login, Social Login & Refresh Security', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  describe('POST /api/auth/login', () => {
    test('Rechaza login con credenciales incorrectas (usuario inexistente)', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noexiste@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Credenciales inválidas/i);
    });

    test('Rechaza login con contraseña incorrecta (401)', async () => {
      const hash = await bcrypt.hash('PasswordCorrecta123!', 10);
      db.query.mockResolvedValueOnce([[{
        id_usuario: 10,
        email: 'user@test.com',
        password: hash,
        activo: 1,
        email_verified: 1,
        tipo_usuario: 'ciudadano',
      }]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'PasswordIncorrecta!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Credenciales inválidas/i);
    });

    test('Rechaza login de usuario deshabilitado (activo = 0) con 403', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      db.query.mockResolvedValueOnce([[{
        id_usuario: 10,
        email: 'inhabilitado@test.com',
        password: hash,
        activo: 0,
        email_verified: 1,
        tipo_usuario: 'ciudadano',
      }]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inhabilitado@test.com', password: 'Password123!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Cuenta deshabilitada/i);
    });

    test('Login exitoso devuelve token y contexto del usuario', async () => {
      const hash = await bcrypt.hash('Password123!', 10);

      // 1. Buscar usuario por email
      db.query.mockResolvedValueOnce([[{
        id_usuario: 10,
        email: 'user@test.com',
        password: hash,
        activo: 1,
        email_verified: 1,
        tipo_usuario: 'ciudadano',
        id_ciudad: 1,
      }]]);

      // 2. getProfileData
      db.query.mockResolvedValueOnce([[{ nombre: 'User Test', foto: null, id_institucion: null, institucion_verificada: null }]]);

      // 3. saveRefreshToken
      db.query.mockResolvedValueOnce([{ insertId: 1 }]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('ciudadano');
      expect(res.body.user.id_ciudad).toBe(1);
    });

    test('Falla si el email no está verificado (403)', async () => {
      const hash = await bcrypt.hash('Password123!', 10);

      db.query.mockResolvedValueOnce([[{
        id_usuario: 10,
        email: 'user@test.com',
        password: hash,
        activo: 1,
        email_verified: 0,
        tipo_usuario: 'ciudadano',
      }]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'Password123!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/verificar tu cuenta/i);
    });
  });

  describe('POST /api/auth/social-login (Validación con proveedor externo)', () => {
    test('Bloquea intento de login social enviando solo datos del cliente sin token del proveedor (401)', async () => {
      const res = await request(app)
        .post('/api/auth/social-login')
        .send({
          email: 'admin@reportarg.gob.ar',
          provider: 'google',
          name: 'Suplantador',
        });

      expect(res.status).toBe(401);
      expect(res.body.codigo).toBe('TOKEN_PROVEEDOR_REQUERIDO');
      expect(db.query).not.toHaveBeenCalled();
    });

    test('Bloquea intento de login social con token falsificado o rechazado por el proveedor (401)', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_token' }),
      });

      const res = await request(app)
        .post('/api/auth/social-login')
        .send({
          email: 'admin@reportarg.gob.ar',
          provider: 'google',
          providerToken: 'header.payload.falsificado',
        });

      expect(res.status).toBe(401);
      expect(res.body.codigo).toBe('TOKEN_PROVEEDOR_INVALIDO');
      expect(db.query).not.toHaveBeenCalled();
    });

    test('Bloquea intento de suplantar otro email distinto al verificado por el proveedor (401)', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sub: 'google-123',
          email: 'atacante@gmail.com',
          email_verified: 'true',
          name: 'Atacante',
        }),
      });

      const res = await request(app)
        .post('/api/auth/social-login')
        .send({
          email: 'admin@reportarg.gob.ar', // Intenta autenticarse como admin usando su propio token de Google
          provider: 'google',
          providerToken: 'valid.google.jwt',
        });

      expect(res.status).toBe(401);
      expect(res.body.codigo).toBe('IDENTIDAD_EXTERNA_INVALIDA');
      expect(db.query).not.toHaveBeenCalled();
    });

    test('Impide que un usuario deshabilitado (activo = 0) inicie sesión o se reactive mediante login social (403)', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sub: 'google-999',
          email: 'suspendido@test.com',
          email_verified: true,
          name: 'Usuario Suspendido',
        }),
      });

      db.query.mockResolvedValueOnce([[{
        id_usuario: 55,
        email: 'suspendido@test.com',
        activo: 0, // Cuenta inhabilitada
        email_verified: 1,
        tipo_usuario: 'ciudadano',
      }]]);

      const res = await request(app)
        .post('/api/auth/social-login')
        .send({
          email: 'suspendido@test.com',
          provider: 'google',
          providerToken: 'valid.google.jwt',
        });

      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('CUENTA_DESHABILITADA');
      expect(res.body.error).toMatch(/Cuenta deshabilitada/i);
      // Solo se ejecutó el SELECT por email, jamás el UPDATE ni emisión de tokens
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    test('Permite login social cuando el proveedor externo valida el token y la cuenta está activa', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sub: 'google-777',
          email: 'vecino@test.com',
          email_verified: 'true',
          name: 'Vecino Verificado',
        }),
      });

      // 1. findUserByEmail
      db.query.mockResolvedValueOnce([[{
        id_usuario: 25,
        email: 'vecino@test.com',
        activo: 1,
        email_verified: 1,
        tipo_usuario: 'ciudadano',
      }]]);
      // 2. updateSocialAuth
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. saveRefreshToken
      db.query.mockResolvedValueOnce([{ insertId: 10 }]);

      const res = await request(app)
        .post('/api/auth/social-login')
        .send({
          email: 'vecino@test.com',
          provider: 'google',
          providerToken: 'valid.google.jwt',
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('vecino@test.com');
      expect(res.body.user.role).toBe('ciudadano');
    });
  });

  describe('POST /api/auth/refresh (Expiración, renovación y revocación de sesiones)', () => {
    test('Rechaza refresh token revocado o inexistente en base de datos (403)', async () => {
      db.query.mockResolvedValueOnce([[]]); // No existe en tabla refresh_tokens

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ token: 'token-revocado' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/inválido/i);
    });

    test('Rechaza refresh token cuando el usuario fue deshabilitado y revoca sus sesiones (403)', async () => {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
      process.env.JWT_REFRESH_SECRET = refreshSecret;
      const validRefreshJwt = jwt.sign({ id: 30, email: 'u@test.com', role: 'ciudadano' }, refreshSecret, { expiresIn: '7d' });

      // 1. findByToken en refresh_tokens
      db.query.mockResolvedValueOnce([[{
        id: 1,
        token: validRefreshJwt,
        id_usuario: 30,
        expires_at: new Date(Date.now() + 86400000),
      }]]);
      // 2. Consulta estado actual en usuarios -> activo = 0
      db.query.mockResolvedValueOnce([[{
        activo: 0,
        tipo_usuario: 'ciudadano',
        id_institucion: null,
        institucion_verificada: null,
      }]]);
      // 3. deleteByUserId
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ token: validRefreshJwt });

      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('CUENTA_DESHABILITADA');
    });

    test('Rechaza refresh token y revoca sesión si el rol del usuario cambió en BD después de emitir el token (403)', async () => {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
      process.env.JWT_REFRESH_SECRET = refreshSecret;
      // El refresh token fue emitido cuando era admin
      const staleAdminRefreshJwt = jwt.sign({ id: 31, email: 'exadmin@test.com', role: 'admin' }, refreshSecret, { expiresIn: '7d' });

      // 1. findByToken
      db.query.mockResolvedValueOnce([[{
        id: 2,
        token: staleAdminRefreshJwt,
        id_usuario: 31,
        expires_at: new Date(Date.now() + 86400000),
      }]]);
      // 2. En BD su rol actual ahora es ciudadano
      db.query.mockResolvedValueOnce([[{
        activo: 1,
        tipo_usuario: 'ciudadano',
        id_institucion: null,
        institucion_verificada: null,
      }]]);
      // 3. deleteByUserId (revoca todos los refresh tokens del usuario)
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ token: staleAdminRefreshJwt });

      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('ROL_NO_AUTORIZADO');
      expect(res.body.error).toMatch(/permisos de la cuenta cambiaron/i);
    });
  });
});
