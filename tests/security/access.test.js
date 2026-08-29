jest.mock('../../src/config/db', () => ({
  query: jest.fn(async (sql) => {
    if (typeof sql === 'string' && sql.includes('COUNT(*)')) {
      return [[{ total: 0 }]];
    }
    return [[]];
  }),
  getConnection: jest.fn(async () => ({
    query: jest.fn().mockResolvedValue([[]]),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  })),
}));

jest.mock('../../src/config/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { generateTestToken, ROLES } = require('../helpers/auth');

describe('Seguridad y control de acceso', () => {
  describe('GET /api/admin/usuarios', () => {
    test('sin token → 401', async () => {
      const res = await request(app).get('/api/admin/usuarios');
      expect(res.status).toBe(401);
    });

    test('token de ciudadano → 403', async () => {
      const token = generateTestToken(ROLES.CIUDADANO);
      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    test('token de administrador → 200', async () => {
      const token = generateTestToken(ROLES.ADMIN);
      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Rutas públicas', () => {
    test('GET /api/feed sin token → 200', async () => {
      const res = await request(app).get('/api/feed');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/reclamos', () => {
    test('sin token → 401', async () => {
      const res = await request(app).post('/api/reclamos').send({ titulo: 'Test' });
      expect(res.status).toBe(401);
    });

    test('token de institución → 403', async () => {
      const token = generateTestToken(ROLES.INSTITUCION);
      const res = await request(app)
        .post('/api/reclamos')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/reclamos/mis-reclamos', () => {
    test('ignora el id de usuario enviado por query y usa el id del JWT', async () => {
      const idUsuarioA = 7;
      const idUsuarioB = 11;
      db.query.mockClear();
      db.query.mockResolvedValueOnce([[
        { id: 101, titulo: 'Reclamo del usuario A', estado: 'recibido' },
      ]]);

      const token = generateTestToken(ROLES.CIUDADANO, idUsuarioA);
      const res = await request(app)
        .get(`/api/reclamos/mis-reclamos?usuario=${idUsuarioB}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { id: 101, titulo: 'Reclamo del usuario A', estado: 'recibido' },
      ]);

      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual([idUsuarioA]);
      expect(params).not.toContain(idUsuarioB);
    });
  });

  describe('POST /api/comunicados', () => {
    test('sin token → 401', async () => {
      const res = await request(app).post('/api/comunicados').send({ titulo: 'Test' });
      expect(res.status).toBe(401);
    });

    test('token de ciudadano → 403', async () => {
      const token = generateTestToken(ROLES.CIUDADANO);
      const res = await request(app)
        .post('/api/comunicados')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Test' });

      expect(res.status).toBe(403);
    });
  });
});
