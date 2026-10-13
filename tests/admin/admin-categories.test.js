const request = require('supertest');
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

describe('Módulo Administrativo de Categorías (ADMIN-01 — Etapa 5)', () => {
  const adminToken = generateTestToken(ROLES.ADMIN, 1);
  const citizenToken = generateTestToken(ROLES.CIUDADANO, 2);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDbQuery = ({ authUser = null, catById = null, extra = () => [[]] } = {}) => {
    db.query.mockClear();
    db.query.mockImplementation(async (sql, params) => {
      // Auth middleware token verification
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        const u = authUser || { id_usuario: 1, email: 'admin@reportarg.gob.ar', activo: 1, tipo_usuario: 'admin' };
        return [[u]];
      }
      // CategoryModel.getById
      if (typeof sql === 'string' && sql.includes('FROM categorias') && sql.includes('WHERE id_categoria = ?') && !sql.includes('COUNT')) {
        return [[catById]];
      }
      return extra(sql, params);
    });
  };

  describe('1. Seguridad y Acceso', () => {
    test('solicitud sin token → 401', async () => {
      const res = await request(app).get('/api/admin/categorias');
      expect(res.status).toBe(401);
    });

    test('solicitud con rol ciudadano → 403', async () => {
      mockDbQuery({
        authUser: { id_usuario: 2, email: 'ciudadano@test.com', activo: 1, tipo_usuario: 'ciudadano' },
      });
      const res = await request(app)
        .get('/api/admin/categorias')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
    });

    test('solicitud con rol admin → 200 listado', async () => {
      mockDbQuery({
        extra: () => [[
          { id: 1, codigo: 'CAT-001', nombre: 'Alumbrado', tipo: 'reclamo', estado: 'activo', orden: 1 },
          { id: 2, codigo: 'CAT-002', nombre: 'Bacheo', tipo: 'reclamo', estado: 'activo', orden: 2 },
        ]],
      });

      const res = await request(app)
        .get('/api/admin/categorias')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('2. Creación de Categorías', () => {
    test('rechaza si falta nombre → 400', async () => {
      const res = await request(app)
        .post('/api/admin/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'reclamo' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/nombre es obligatorio/i);
    });

    test('rechaza si falta tipo o es inválido → 400', async () => {
      const res = await request(app)
        .post('/api/admin/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Espacios Verdes', tipo: 'invalido' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/tipo/i);
    });

    test('rechaza nombre duplicado → 409', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('WHERE nombre = ?')) {
            return [[{ id_categoria: 1 }]]; // Ya existe
          }
          return [[]];
        },
      });

      const res = await request(app)
        .post('/api/admin/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Alumbrado', tipo: 'reclamo' });

      expect(res.status).toBe(409);
      expect(res.body.mensaje).toMatch(/ya existe una categoría/i);
    });

    test('creación exitosa → 201 con ID y código generado', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('ORDER BY id_categoria DESC LIMIT 1')) {
            return [[{ id_categoria: 5 }]];
          }
          if (typeof sql === 'string' && sql.includes('INSERT INTO categorias')) {
            return [{ insertId: 6 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .post('/api/admin/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Espacios Verdes', tipo: 'ambos', descripcion: 'Mantenimiento de plazas', orden: 3 });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.id).toBe(6);
      expect(res.body.codigo).toBe('CAT-006');
    });
  });

  describe('3. Edición de Categorías', () => {
    test('rechaza si nombre duplicado en otra categoría → 409', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('WHERE nombre = ? AND id_categoria != ?')) {
            return [[{ id_categoria: 2 }]];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .put('/api/admin/categorias/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Bacheo', tipo: 'reclamo' });

      expect(res.status).toBe(409);
    });

    test('edición exitosa → 200', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('UPDATE categorias')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .put('/api/admin/categorias/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Alumbrado Público Modificado', tipo: 'reclamo', orden: 2 });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/actualizada correctamente/i);
    });
  });

  describe('4. Baja Lógica y Reactivación', () => {
    test('baja lógica exitosa → 200', async () => {
      mockDbQuery({
        catById: { id: 1, nombre: 'Alumbrado', estado: 'activo' },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('UPDATE categorias SET estado = \'inactivo\'')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .patch('/api/admin/categorias/1/baja')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/desactivada correctamente/i);
    });

    test('baja lógica rechaza si ya está inactiva → 409', async () => {
      mockDbQuery({
        catById: { id: 1, nombre: 'Alumbrado', estado: 'inactivo' },
      });

      const res = await request(app)
        .patch('/api/admin/categorias/1/baja')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.mensaje).toMatch(/ya está inactiva/i);
    });

    test('reactivar categoría inactiva → 200', async () => {
      mockDbQuery({
        catById: { id: 1, nombre: 'Alumbrado', estado: 'inactivo' },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('UPDATE categorias SET estado = \'activo\'')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .patch('/api/admin/categorias/1/reactivar')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/activada correctamente/i);
    });

    test('reactivar rechaza si ya está activa → 409', async () => {
      mockDbQuery({
        catById: { id: 1, nombre: 'Alumbrado', estado: 'activo' },
      });

      const res = await request(app)
        .patch('/api/admin/categorias/1/reactivar')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.mensaje).toMatch(/ya está activa/i);
    });
  });

  describe('5. Integridad Referencial y Eliminación', () => {
    test('rechaza eliminación física si tiene reclamos asociados → 409', async () => {
      mockDbQuery({
        catById: { id: 1, nombre: 'Alumbrado' },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('FROM reclamos WHERE id_categoria = ?')) {
            return [[{ total: 15 }]];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .delete('/api/admin/categorias/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.mensaje).toMatch(/reclamo\(s\) asociado\(s\)/i);
    });

    test('rechaza eliminación física si tiene comunicados asociados → 409', async () => {
      mockDbQuery({
        catById: { id: 2, nombre: 'Avisos' },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('FROM reclamos WHERE id_categoria = ?')) {
            return [[{ total: 0 }]];
          }
          if (typeof sql === 'string' && sql.includes('FROM comunicados WHERE id_categoria = ?')) {
            return [[{ total: 3 }]];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .delete('/api/admin/categorias/2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.mensaje).toMatch(/comunicado\(s\) asociado\(s\)/i);
    });

    test('eliminación física exitosa si no tiene dependencias → 200', async () => {
      mockDbQuery({
        catById: { id: 9, nombre: 'Prueba Sin Uso' },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('COUNT(*) AS total')) {
            return [[{ total: 0 }]];
          }
          if (typeof sql === 'string' && sql.includes('DELETE FROM categorias')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .delete('/api/admin/categorias/9')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/eliminada correctamente/i);
    });
  });
});
