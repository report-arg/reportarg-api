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
      beginTransaction: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn(),
    });
  }),
}));

describe('Módulo de Supervisión de Reclamos (ADMIN-01 — Etapa 5)', () => {
  const adminToken = generateTestToken(ROLES.ADMIN, 1);
  const citizenToken = generateTestToken(ROLES.CIUDADANO, 2);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDbQuery = ({ authUser = null, extra = () => [[]] } = {}) => {
    db.query.mockClear();
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        const u = authUser || { id_usuario: 1, email: 'admin@reportarg.gob.ar', activo: 1, tipo_usuario: 'admin' };
        return [[u]];
      }
      return extra(sql, params);
    });
  };

  describe('1. Seguridad y Acceso', () => {
    test('solicitud sin token → 401', async () => {
      const res = await request(app).get('/api/admin/reclamos/lista');
      expect(res.status).toBe(401);
    });

    test('solicitud con rol ciudadano → 403', async () => {
      mockDbQuery({
        authUser: { id_usuario: 2, email: 'ciudadano@test.com', activo: 1, tipo_usuario: 'ciudadano' },
      });
      const res = await request(app)
        .get('/api/admin/reclamos/lista')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
    });

    test('solicitud con rol admin → 200 con estructura paginada', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('COUNT(*) AS total')) {
            return [[{ total: 1 }]];
          }
          if (typeof sql === 'string' && sql.includes('FROM reclamos r')) {
            return [[{
              id: 10,
              titulo: 'Luminaria rota en Plaza San Martín',
              estado: 'Pendiente',
              categoriaNombre: 'Alumbrado',
              institucionNombre: 'Municipalidad de Viale',
              autorNombre: 'ciudadano@test.com',
              ciudadNombre: 'Viale',
            }]];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .get('/api/admin/reclamos/lista?pagina=1&limite=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.totalPaginas).toBe(1);
    });
  });

  describe('2. Detalle de Reclamo e Historial', () => {
    test('reclamo existente → 200 con datos principales e historial', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('r.id_reclamo = ?')) {
            return [[{
              id: 10,
              titulo: 'Luminaria rota',
              estado: 'En proceso',
              descripcion: 'No funciona el farol central',
              id_ciudad: 1,
              id_institucion: 5,
            }]];
          }
          if (typeof sql === 'string' && sql.includes('FROM reclamos_historial')) {
            return [[
              { id: 1, tipo_evento: 'CREACION', detalle: 'Reclamo creado', fecha_creacion: new Date() },
              { id: 2, tipo_evento: 'ASIGNACION', detalle: 'Asignado a Alumbrado', fecha_creacion: new Date() },
            ]];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .get('/api/admin/reclamos/10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.titulo).toBe('Luminaria rota');
      expect(Array.isArray(res.body.data.historial)).toBe(true);
      expect(res.body.data.historial).toHaveLength(2);
    });

    test('reclamo inexistente → 404', async () => {
      mockDbQuery({
        extra: () => [[]],
      });

      const res = await request(app)
        .get('/api/admin/reclamos/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no encontrado/i);
    });
  });

  describe('3. Restricción de Modificación de Estados', () => {
    test('intento administrativo de cambiar estado directo → 403 reservado a la institución', async () => {
      mockDbQuery({});

      const res = await request(app)
        .patch('/api/admin/reclamos/10/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'Resuelto' });

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/institución responsable/i);
    });
  });

  describe('4. Reasignación con Motivo y Auditoría', () => {
    test('rechaza si falta institución destino → 400', async () => {
      mockDbQuery({});

      const res = await request(app)
        .patch('/api/admin/reclamos/10/institucion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'Reasignación de prueba' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/institución destino es obligatoria/i);
    });

    test('rechaza si motivo no se envía (undefined) → 400', async () => {
      mockDbQuery({});

      const res = await request(app)
        .patch('/api/admin/reclamos/10/institucion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id_institucion: 5 });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/motivo de reasignación es obligatorio/i);
    });

    test('rechaza si motivo está vacío/espacios → 400', async () => {
      mockDbQuery({});

      const res = await request(app)
        .patch('/api/admin/reclamos/10/institucion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id_institucion: 5, motivo: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/motivo de reasignación es obligatorio/i);
    });

    test('rechaza si los identificadores no son números enteros positivos → 400', async () => {
      mockDbQuery({});

      const res = await request(app)
        .patch('/api/admin/reclamos/abc/institucion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id_institucion: -5, motivo: 'Cambio de área' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/identificador inválido/i);
    });
  });
});
