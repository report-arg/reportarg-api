const defaultQueryMock = async (sql, params) => {
  if (typeof sql === 'string' && sql.includes('COUNT(*)')) {
    return [[{ total: 0 }]];
  }
  if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
    const userId = params ? Number(params[0]) : 1;
    return [[{
      id_usuario: userId,
      email: 'test@domain.com',
      activo: 1,
      tipo_usuario: userId === 3 ? 'admin' : (userId === 2 || userId === 44) ? 'institucion' : 'ciudadano',
      id_ciudad: 1,
      id_institucion: (userId === 2 || userId === 44) ? 10 : null,
      institucion_verificada: 1,
    }]];
  }
  if (typeof sql === 'string' && sql.includes('u.id_usuario AS id')) {
    const userId = params ? Number(params[0]) : 1;
    return [[{
      id: userId,
      email: 'test@domain.com',
      rol: userId === 3 ? 'admin' : 'ciudadano',
      tipo_usuario: userId === 3 ? 'admin' : 'ciudadano',
      estado: 'activo',
    }]];
  }
  return [[]];
};

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

jest.mock('../../src/config/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { generateTestToken, ROLES } = require('../helpers/auth');

describe('Seguridad y control de acceso', () => {
  beforeEach(() => {
    db.query.mockImplementation(defaultQueryMock);
  });
  describe('GET /api/admin/usuarios', () => {
    test('sin token → 401', async () => {
      const res = await request(app).get('/api/admin/usuarios');
      expect(res.status).toBe(401);
    });

    test('token de ciudadano → 403', async () => {
      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    test('token de administrador → 200', async () => {
      const token = generateTestToken(ROLES.ADMIN, 3);
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

    test('GET /api/docs es público', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/swagger/i);
    });
  });

  describe('POST /api/reclamos', () => {
    test('sin token → 401', async () => {
      const res = await request(app).post('/api/reclamos').send({ titulo: 'Test' });
      expect(res.status).toBe(401);
    });

    test('token de institución → 403', async () => {
      const token = generateTestToken(ROLES.INSTITUCION, 2);
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
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: params[0], email: 'user@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r')) {
          return [[{ id: 101, titulo: 'Reclamo del usuario A', estado: 'recibido' }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, idUsuarioA);
      const res = await request(app)
        .get(`/api/reclamos/mis-reclamos?usuario=${idUsuarioB}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Verificar que solo se devuelven los reclamos del usuario del JWT (id A),
      // independientemente del query param ?usuario=B
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 101, titulo: 'Reclamo del usuario A', estado: 'recibido' }),
        ])
      );
      expect(res.body.data).toHaveLength(1);
    });

    test('permite acceso a usuario con rol admin', async () => {
      db.query.mockClear();
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: params[0], email: 'admin@test.com', activo: 1, tipo_usuario: 'admin' }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r')) {
          return [[]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.ADMIN, 99);
      const res = await request(app)
        .get('/api/reclamos/mis-reclamos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    test('bloquea acceso a usuario con rol institución → 403', async () => {
      db.query.mockClear();
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: params[0], email: 'inst@test.com', activo: 1, tipo_usuario: 'institucion', id_institucion: 5 }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.INSTITUCION, 44);
      const res = await request(app)
        .get('/api/reclamos/mis-reclamos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/comunicados', () => {
    test('sin token → 401', async () => {
      const res = await request(app).post('/api/comunicados').send({ titulo: 'Test' });
      expect(res.status).toBe(401);
    });

    test('token de ciudadano → 403', async () => {
      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const res = await request(app)
        .post('/api/comunicados')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/comunicados/:id', () => {
    test('sin token → 401', async () => {
      const res = await request(app).put('/api/comunicados/1').send({ titulo: 'Test edit' });
      expect(res.status).toBe(401);
    });

    test('token de ciudadano → 403', async () => {
      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const res = await request(app)
        .put('/api/comunicados/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Test edit' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/comunicados/:id', () => {
    test('sin token → 401', async () => {
      const res = await request(app).delete('/api/comunicados/1');
      expect(res.status).toBe(401);
    });

    test('token de ciudadano → 403', async () => {
      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const res = await request(app)
        .delete('/api/comunicados/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/ciudades', () => {
    test('sin token → 401', async () => {
      const res = await request(app).get('/api/admin/ciudades');
      expect(res.status).toBe(401);
    });

    test('token de ciudadano → 403', async () => {
      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const res = await request(app)
        .get('/api/admin/ciudades')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    test('token de administrador → 200', async () => {
      const token = generateTestToken(ROLES.ADMIN, 3);
      const res = await request(app)
        .get('/api/admin/ciudades')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Protección contra auto-inhabilitación y auto-degradación de administradores', () => {
    test('admin intentando eliminarse/inhabilitarse a sí mismo → 400', async () => {
      const token = generateTestToken(ROLES.ADMIN, 3);
      const res = await request(app)
        .delete('/api/admin/usuarios/3')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no podés inhabilitar tu propia cuenta/i);
    });

    test('admin intentando cambiar su propio rol a ciudadano → 400', async () => {
      const token = generateTestToken(ROLES.ADMIN, 3);
      const res = await request(app)
        .put('/api/admin/usuarios/3/rol')
        .set('Authorization', `Bearer ${token}`)
        .send({ rol: 'ciudadano' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no podés cambiar el rol de tu propia cuenta/i);
    });

    test('admin intentando editarse a sí mismo poniendo estado inactivo → 400', async () => {
      const token = generateTestToken(ROLES.ADMIN, 3);
      const res = await request(app)
        .put('/api/admin/usuarios/3')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'test@domain.com', estado: 'inactivo' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no podés inhabilitar tu propia cuenta/i);
    });

    test('admin intentando editarse a sí mismo cambiando rol a institucion → 400', async () => {
      const token = generateTestToken(ROLES.ADMIN, 3);
      const res = await request(app)
        .put('/api/admin/usuarios/3')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'test@domain.com', rol: 'institucion' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no podés cambiar el rol de tu propia cuenta/i);
    });
  });
});

