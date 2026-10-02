jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(async () => ({
    query: jest.fn().mockResolvedValue([[]]),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  })),
}));

jest.mock('../../src/services/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

jest.mock('../../src/config/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const emailService = require('../../src/services/emailService');

const TEST_EMAIL = 'ciudadano@test.com';
const resetSecret = () => process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;

const mockUser = (overrides = {}) => ({
  id_usuario: 42,
  email: TEST_EMAIL,
  activo: true,
  email_verified: true,
  password: 'hash-anterior',
  ...overrides,
});

const signResetToken = (payload, options = { expiresIn: '30m' }) =>
  jwt.sign({ email: TEST_EMAIL, purpose: 'password-reset', ...payload }, resetSecret(), options);

describe('Recuperación de contraseña', () => {
  describe('POST /api/auth/forgot-password', () => {
    test('sin email → 400', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/requerido/i);
      expect(emailService.enviarRecuperacionPassword).not.toHaveBeenCalled();
    });

    test('email inválido → 400', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'no-es-un-email' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/formato/i);
      expect(emailService.enviarRecuperacionPassword).not.toHaveBeenCalled();
    });

    test('usuario inexistente → 404 y no envía mail', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/no existe/i);
      expect(emailService.enviarRecuperacionPassword).not.toHaveBeenCalled();
    });

    test('cuenta deshabilitada → 403 y no envía mail', async () => {
      db.query.mockResolvedValueOnce([[mockUser({ activo: false })]]);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/deshabilitada/i);
      expect(emailService.enviarRecuperacionPassword).not.toHaveBeenCalled();
    });

    test('usuario válido → 200 y envía mail con token de reset', async () => {
      db.query.mockResolvedValueOnce([[mockUser()]]);
      emailService.enviarRecuperacionPassword.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: `  ${TEST_EMAIL}  ` });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/enlace/i);
      expect(emailService.enviarRecuperacionPassword).toHaveBeenCalledTimes(1);

      const [destinatario, token] = emailService.enviarRecuperacionPassword.mock.calls[0];
      expect(destinatario).toBe(TEST_EMAIL);
      expect(typeof token).toBe('string');

      const payload = jwt.verify(token, resetSecret());
      expect(payload.email).toBe(TEST_EMAIL);
      expect(payload.purpose).toBe('password-reset');
    });

    test('si falla el envío de mail → 500', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      db.query.mockResolvedValueOnce([[mockUser()]]);
      emailService.enviarRecuperacionPassword.mockRejectedValueOnce(new Error('SMTP down'));

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/servidor/i);
      consoleSpy.mockRestore();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('sin token o contraseña → 400', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: '', newPassword: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/requeridos/i);
    });

    test('token inválido → 400', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'token-inventado', newPassword: 'NuevaClave123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inválido/i);
    });

    test('token expirado → 400', async () => {
      const token = signResetToken({}, { expiresIn: '-1s' });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'NuevaClave123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/expiró/i);
    });

    test('token de otro propósito → 400', async () => {
      const token = jwt.sign({ email: TEST_EMAIL, purpose: 'verify-email' }, resetSecret(), {
        expiresIn: '30m',
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'NuevaClave123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inválido/i);
    });

    test('token válido → 200, actualiza password y borra refresh tokens', async () => {
      const token = signResetToken();
      db.query
        .mockResolvedValueOnce([[mockUser()]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'NuevaClave123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/actualizada/i);

      const updateCall = db.query.mock.calls.find(([sql]) =>
        String(sql).includes('UPDATE usuarios SET password')
      );
      const deleteCall = db.query.mock.calls.find(([sql]) =>
        String(sql).includes('DELETE FROM refresh_tokens')
      );

      expect(updateCall[1]).toEqual([expect.any(String), 42]);
      expect(deleteCall[1]).toEqual([42]);
    });
  });
});
