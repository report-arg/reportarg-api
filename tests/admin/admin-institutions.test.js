const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const emailService = require('../../src/services/emailService');
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
  enviarAprobacionInstitucion: jest.fn().mockResolvedValue(true),
  enviarRechazoInstitucion: jest.fn().mockResolvedValue(true),
  enviarBienvenida: jest.fn().mockResolvedValue(true),
}));

describe('Módulo de Administración de Instituciones y Solicitudes (ADMIN-01 — Etapa 4)', () => {
  const adminId = 1;
  const adminToken = generateTestToken(ROLES.ADMIN, adminId);
  const citizenToken = generateTestToken(ROLES.CIUDADANO, 2);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDbQuery = ({ authUser = null, instById = null, extra = () => [[]] } = {}) => {
    db.query.mockClear();
    db.query.mockImplementation(async (sql, params) => {
      // 1. Auth middleware token verification
      if (typeof sql === 'string' && sql.includes('i.id_institucion') && sql.includes('FROM usuarios u')) {
        const u = authUser || { id_usuario: adminId, email: 'admin@reportarg.gob.ar', activo: 1, tipo_usuario: 'admin' };
        return [[u]];
      }
      // 2. InstitutionModel.getById
      if (typeof sql === 'string' && sql.includes('FROM instituciones i') && sql.includes('WHERE i.id_institucion = ?')) {
        return [[instById]];
      }
      return extra(sql, params);
    });
  };

  describe('1. Seguridad y Control de Acceso', () => {
    test('solicitud sin token → 401', async () => {
      const res = await request(app).get('/api/admin/instituciones');
      expect(res.status).toBe(401);
    });

    test('solicitud con rol ciudadano → 403', async () => {
      mockDbQuery({
        authUser: { id_usuario: 2, email: 'ciudadano@test.com', activo: 1, tipo_usuario: 'ciudadano' },
      });
      const res = await request(app)
        .get('/api/admin/instituciones')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
    });

    test('solicitud con rol admin → 200 con estructura paginada', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) AS total')) {
            return [[{ total: 2 }]];
          }
          if (typeof sql === 'string' && sql.includes('SELECT') && sql.includes('FROM instituciones i')) {
            return [[
              {
                id: 1,
                nombre: 'Hospital Central',
                tipo: 'salud',
                ciudad_nombre: 'Viale',
                provincia: 'Entre Ríos',
                email: 'hospital@viale.gob.ar',
                verificada: 1,
              },
              {
                id: 2,
                nombre: 'Bomberos Voluntarios',
                tipo: 'emergencias',
                ciudad_nombre: 'Viale',
                provincia: 'Entre Ríos',
                email: 'bomberos@viale.gob.ar',
                verificada: 0,
              },
            ]];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .get('/api/admin/instituciones')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.pagina).toBe(1);
    });
  });

  describe('2. Estadísticas Institucionales (GET /api/admin/instituciones/stats)', () => {
    test('devuelve conteo total, verificadas y pendientes', async () => {
      mockDbQuery({
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('COUNT(*) AS total FROM instituciones WHERE verificada = 1')) {
            return [[{ total: 10 }]];
          }
          if (typeof sql === 'string' && sql.includes('COUNT(*) AS total FROM instituciones WHERE verificada = 0')) {
            return [[{ total: 3 }]];
          }
          if (typeof sql === 'string' && sql.includes('COUNT(*) AS total FROM instituciones')) {
            return [[{ total: 13 }]];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .get('/api/admin/instituciones/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual({
        total: 13,
        verificadas: 10,
        pendientes: 3,
      });
    });
  });

  describe('3. Detalle de Institución (GET /api/admin/instituciones/:id)', () => {
    test('institución existente → 200 con datos de entidad y ciudad', async () => {
      mockDbQuery({
        instById: {
          id: 5,
          nombre: 'Policía Comunal',
          tipo: 'seguridad',
          email: 'policia@test.gob.ar',
          ciudad_nombre: 'Viale',
          provincia: 'Entre Ríos',
          verificada: 1,
        },
      });

      const res = await request(app)
        .get('/api/admin/instituciones/5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.nombre).toBe('Policía Comunal');
      expect(res.body.data.ciudad_nombre).toBe('Viale');
    });

    test('institución inexistente → 404', async () => {
      mockDbQuery({
        instById: null,
      });

      const res = await request(app)
        .get('/api/admin/instituciones/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no encontrada/i);
    });
  });

  describe('4. Aprobación y Verificación (PUT /api/admin/instituciones/:id/verificar)', () => {
    test('institución pendiente existente → 200, actualiza estado y envía email de bienvenida institucional', async () => {
      mockDbQuery({
        instById: {
          id: 7,
          nombre: 'Defensa Civil',
          email: 'defensa@test.gob.ar',
          verificada: 0,
        },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('UPDATE instituciones')) {
            return [{ affectedRows: 1 }];
          }
          if (typeof sql === 'string' && sql.includes('UPDATE usuarios')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .put('/api/admin/instituciones/7/verificar')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/verificada correctamente/i);
      expect(emailService.enviarAprobacionInstitucion).toHaveBeenCalledWith(
        'defensa@test.gob.ar',
        'Defensa Civil'
      );
    });

    test('institución ya verificada → 409 conflicto', async () => {
      mockDbQuery({
        instById: {
          id: 7,
          nombre: 'Defensa Civil',
          email: 'defensa@test.gob.ar',
          verificada: 1,
        },
      });

      const res = await request(app)
        .put('/api/admin/instituciones/7/verificar')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/ya está verificada/i);
      expect(emailService.enviarAprobacionInstitucion).not.toHaveBeenCalled();
    });

    test('institución inexistente al verificar → 404', async () => {
      mockDbQuery({
        instById: null,
      });

      const res = await request(app)
        .put('/api/admin/instituciones/999/verificar')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no encontrada/i);
    });
  });

  describe('5. Rechazo con Motivo Obligatorio (PUT /api/admin/instituciones/:id/rechazar)', () => {
    test('rechazo sin motivo → 400', async () => {
      const res = await request(app)
        .put('/api/admin/instituciones/8/rechazar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/motivo de rechazo es obligatorio/i);
    });

    test('rechazo con motivo vacío/espacios → 400', async () => {
      const res = await request(app)
        .put('/api/admin/instituciones/8/rechazar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: '    ' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/motivo de rechazo es obligatorio/i);
    });

    test('rechazo de institución inexistente → 404', async () => {
      mockDbQuery({
        instById: null,
      });

      const res = await request(app)
        .put('/api/admin/instituciones/999/rechazar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'Documentación incompleta' });

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no encontrada/i);
    });

    test('rechazo válido con motivo → 200, desmarca verificación y envía email con motivo', async () => {
      mockDbQuery({
        instById: {
          id: 8,
          nombre: 'ONG Local',
          email: 'ong@test.org',
          verificada: 0,
        },
        extra: (sql) => {
          if (typeof sql === 'string' && sql.includes('UPDATE instituciones')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        },
      });

      const res = await request(app)
        .put('/api/admin/instituciones/8/rechazar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'No se adjuntó personería jurídica válida en el municipio' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/rechazada correctamente/i);
      expect(emailService.enviarRechazoInstitucion).toHaveBeenCalledWith(
        'ong@test.org',
        'ONG Local',
        'No se adjuntó personería jurídica válida en el municipio'
      );
    });
  });
});
