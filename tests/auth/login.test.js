const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const bcrypt = require('bcryptjs');

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

describe('Auth - Login & Refresh', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('Rechaza login con credenciales incorrectas', async () => {
      // Mock para buscar el usuario por email
      db.query.mockResolvedValueOnce([[]]); // No se encontró usuario

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noexiste@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Credenciales inválidas/i);
    });

    test('Login exitoso devuelve token', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      
      // Mock para buscar usuario
      db.query.mockResolvedValueOnce([[{
        id_usuario: 10,
        email: 'user@test.com',
        password: hash,
        activo: 1,
        email_verified: 1,
        tipo_usuario: 'ciudadano'
      }]]);

      // Mock para getProfileData
      db.query.mockResolvedValueOnce([[{ nombre: 'User Test', foto: null }]]);

      // Mock para refresh_tokens (buscar existente y eliminar, o insertar)
      db.query.mockResolvedValueOnce([[{ affectedRows: 1 }]]); // delete old
      db.query.mockResolvedValueOnce([[{ insertId: 1 }]]); // insert new

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('ciudadano');
    });

    test('Falla si el email no está verificado', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      
      db.query.mockResolvedValueOnce([[{
        id_usuario: 10,
        email: 'user@test.com',
        password: hash,
        activo: 1,
        email_verified: 0,
        tipo_usuario: 'ciudadano'
      }]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'Password123!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/verificar tu cuenta/i);
    });
  });
});
