const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { ROLES } = require('../../src/constants/roles');
const { generateTestToken } = require('../helpers/auth');

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn((cb) => {
    if (cb) cb(null, { release: jest.fn() });
    return Promise.resolve({
      query: jest.fn().mockResolvedValue([[]]),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    });
  }),
}));
jest.mock('../../src/services/emailService', () => ({
  enviarBienvenida: jest.fn().mockResolvedValue(true),
  enviarCodigoVerificacion: jest.fn().mockResolvedValue(true),
}));

describe('Módulo de Administración de Usuarios (ADMIN-01 — Etapa 3)', () => {
  const adminId = 1;
  const adminToken = generateTestToken(ROLES.ADMIN, adminId);
  const citizenToken = generateTestToken(ROLES.CIUDADANO, 2);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper para simular autenticación y queries
  const mockDbQuery = ({ authUser = null, userById = null, extra = () => [[]] } = {}) => {
    db.query.mockClear();
    db.query.mockImplementation(async (sql, params) => {
      // 1. Consulta de autenticación en getUserFromToken
      if (typeof sql === 'string' && sql.includes('i.id_institucion') && sql.includes('FROM usuarios u')) {
        const u = authUser || { id_usuario: adminId, email: 'admin@reportarg.gob.ar', activo: 1, tipo_usuario: 'admin' };
        return [[u]];
      }
      // 2. Consulta de UserModel.getById
      if (typeof sql === 'string' && sql.includes('u.id_usuario AS id')) {
        return [[userById || { id: 1, rol: 'admin', tipo_usuario: 'admin', estado: 'activo' }]];
      }
      return extra(sql, params);
    });
  };

  describe('1. Seguridad y Acceso al Listado', () => {
    test('sin token → 401', async () => {
      const res = await request(app).get('/api/admin/usuarios');
      expect(res.status).toBe(401);
    });

    test('con token de ciudadano → 403', async () => {
      mockDbQuery({
        authUser: { id_usuario: 2, email: 'ciudadano@test.com', activo: 1, tipo_usuario: 'ciudadano' },
      });
      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
    });

    test('con token de admin → 200 y estructura paginada', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) AS total')) {
            return [[{ total: 2 }]];
          }
          if (typeof sql === 'string' && sql.includes('u.id_usuario AS id')) {
            return [[
              { id: 1, email: 'admin@reportarg.gob.ar', rol: 'admin', estado: 'activo', nombre: 'Admin General' },
              { id: 2, email: 'juan@test.com', rol: 'ciudadano', estado: 'activo', nombre: 'Juan Pérez' },
            ]];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .get('/api/admin/usuarios?pagina=1&limite=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBe(2);
      expect(res.body.pagina).toBe(1);
      expect(res.body.totalPaginas).toBe(1);
    });
  });

  describe('2. Creación de Usuarios y Validaciones', () => {
    test('rechaza si falta email o password → 400', async () => {
      mockDbQuery();
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/email y contraseña son obligatorios/i);
    });

    test('rechaza contraseña menor a 6 caracteres → 400', async () => {
      mockDbQuery();
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'nuevo@test.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/al menos 6 caracteres/i);
    });

    test('rechaza email con formato inválido → 400', async () => {
      mockDbQuery();
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'formato-invalido', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/email inválido/i);
    });

    test('crea usuario exitosamente → 201', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('SELECT id_usuario FROM usuarios WHERE email = ?')) {
            return [[]]; // No existe
          }
          if (typeof sql === 'string' && sql.includes('INSERT INTO usuarios')) {
            return [{ insertId: 10 }];
          }
          if (typeof sql === 'string' && sql.includes('INSERT INTO ciudadanos')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'María López',
          email: 'maria@test.com',
          password: 'password123',
          rol: 'ciudadano',
          estado: 'activo',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.id).toBe(10);
    });

    test('intento de alta con rol institucion → 400 y orienta al registro institucional formal', async () => {
      mockDbQuery({
        extra: () => [[]],
      });

      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Hospital Central',
          email: 'hospital@test.com',
          password: 'password123',
          rol: 'institucion',
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/registro institucional/i);
    });
  });

  describe('3. Inhabilitación y Rehabilitación (PATCH /:id/estado)', () => {
    test('inhabilitar usuario ajeno → 200 y estado inactivo', async () => {
      mockDbQuery({
        userById: { id: 5, email: 'user@test.com', rol: 'ciudadano', estado: 'activo' },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('UPDATE usuarios SET activo = ?')) {
            return [{ affectedRows: 1 }];
          }
          if (typeof sql === 'string' && sql.includes('DELETE FROM refresh_tokens')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .patch('/api/admin/usuarios/5/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'inactivo' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/inhabilitado/i);
      expect(res.body.data.estado).toBe('inactivo');
    });

    test('rehabilitar usuario inactivo → 200 y estado activo', async () => {
      mockDbQuery({
        userById: { id: 5, email: 'user@test.com', rol: 'ciudadano', estado: 'inactivo' },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('UPDATE usuarios SET activo = ?')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .patch('/api/admin/usuarios/5/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'activo' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/rehabilitado/i);
      expect(res.body.data.estado).toBe('activo');
    });

    test('rechaza auto-inhabilitación administrativa → 400', async () => {
      mockDbQuery();
      const res = await request(app)
        .patch(`/api/admin/usuarios/${adminId}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'inactivo' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/no podés inhabilitar tu propia cuenta/i);
    });
  });

  describe('4. Restricciones de Cambio de Rol', () => {
    test('rechaza convertir una institución en ciudadano → 400', async () => {
      mockDbQuery({
        userById: { id: 8, email: 'muni@viale.gob.ar', rol: 'institucion', estado: 'activo' },
      });

      const res = await request(app)
        .put('/api/admin/usuarios/8/rol')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rol: 'ciudadano' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/cuenta institucional/i);
    });

    test('rechaza convertir un ciudadano directamente a institución → 400', async () => {
      mockDbQuery({
        userById: { id: 9, email: 'ciudadano@test.com', rol: 'ciudadano', estado: 'activo' },
      });

      const res = await request(app)
        .put('/api/admin/usuarios/9/rol')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rol: 'institucion' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/transformar una cuenta directamente a institución/i);
    });

    test('permite promover ciudadano a admin → 200', async () => {
      mockDbQuery({
        userById: { id: 9, email: 'ciudadano@test.com', rol: 'ciudadano', estado: 'activo' },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('UPDATE usuarios SET tipo_usuario = ?')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .put('/api/admin/usuarios/9/rol')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rol: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/actualizado correctamente a admin/i);
    });
  });

  describe('5. Comportamiento de Tokens con Usuarios Inactivos', () => {
    test('usuario inactivo rechazado en verifyToken con token preexistente → 401', async () => {
      // Simular que el usuario existe en DB pero tiene activo = 0
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u WHERE u.id_usuario = ?')) {
          return [[{ id_usuario: 50, email: 'inactivo@test.com', activo: 0, tipo_usuario: 'ciudadano' }]];
        }
        return [[]];
      });

      const tokenInactivo = generateTestToken(ROLES.CIUDADANO, 50);
      const res = await request(app)
        .get('/api/reclamos/mis-reclamos')
        .set('Authorization', `Bearer ${tokenInactivo}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/acceso denegado/i);
    });
  });
});
