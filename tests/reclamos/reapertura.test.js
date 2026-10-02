// Mock emailService
jest.mock('../../src/config/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

// Mock db
jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(async () => ({
    query: jest.fn().mockResolvedValue([{ affectedRows: 1, insertId: 10 }]),
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  })),
}));

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { generateTestToken, ROLES } = require('../helpers/auth');
const { CLAIM_STATUSES } = require('../../src/constants/publication');

const citizenToken = generateTestToken(ROLES.CIUDADANO, 1);
const otherCitizenToken = generateTestToken(ROLES.CIUDADANO, 5);
const institutionToken = generateTestToken(ROLES.INSTITUCION, 2);

describe('HU-15 y HU-16: Reapertura de Reclamos y Participación Comunitaria', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BUG: Reapertura de reclamos (HU-15)', () => {

    test('Reclamo cancelado por ciudadano desde Pendiente vuelve a estado Pendiente', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: '1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 10,
            id_reclamo: 10,
            id_usuario: 1,
            titulo: 'Bache grande',
            estado: CLAIM_STATUSES.CANCELADO,
            cancelado_por_tipo: 'ciudadano',
            fecha_ultimo_cambio_estado: new Date().toISOString(),
          }]];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE reclamos')) {
          expect(params[0]).toBe(CLAIM_STATUSES.PENDIENTE);
          return [{ affectedRows: 1 }];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO reclamos_historial')) {
          return [{ insertId: 1 }];
        }
        return [[]];
      });

      const res = await request(app)
        .patch('/api/reclamos/10/reabrir')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ motivo: 'El bache sigue sin arreglarse y necesito reabrirlo' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.estado).toBe(CLAIM_STATUSES.PENDIENTE);
    });

    test('Reclamo Resuelto vuelve a estado En revisión', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: '1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 11,
            id_reclamo: 11,
            id_usuario: 1,
            titulo: 'Luminaria rota',
            estado: CLAIM_STATUSES.RESUELTO,
            cancelado_por_tipo: null,
            fecha_ultimo_cambio_estado: new Date().toISOString(),
          }]];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE reclamos')) {
          expect(params[0]).toBe(CLAIM_STATUSES.EN_REVISION);
          return [{ affectedRows: 1 }];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO reclamos_historial')) {
          return [{ insertId: 2 }];
        }
        return [[]];
      });

      const res = await request(app)
        .patch('/api/reclamos/11/reabrir')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ motivo: 'La luz volvió a parpadear y se quemó de nuevo' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.estado).toBe(CLAIM_STATUSES.EN_REVISION);
    });

    test('Rechaza reapertura si pasaron más de 15 días (400)', async () => {
      const fechaVieja = new Date();
      fechaVieja.setDate(fechaVieja.getDate() - 20); // 20 días atrás

      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: '1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 12,
            id_reclamo: 12,
            id_usuario: 1,
            titulo: 'Reclamo viejo',
            estado: CLAIM_STATUSES.RESUELTO,
            fecha_ultimo_cambio_estado: fechaVieja.toISOString(),
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .patch('/api/reclamos/12/reabrir')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ motivo: 'Quiero reabrirlo tardíamente' });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/15 días/);
    });

    test('Rechaza si no es el autor del reclamo (403)', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 5, email: '5@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 13,
            id_reclamo: 13,
            id_usuario: 1, // Autor es 1, quien pide es 5
            estado: CLAIM_STATUSES.RESUELTO,
            fecha_ultimo_cambio_estado: new Date().toISOString(),
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .patch('/api/reclamos/13/reabrir')
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .send({ motivo: 'Reabro el reclamo de mi vecino' });

      expect(res.status).toBe(403);
    });
  });

  describe('HU-16: "A mí también me pasa"', () => {

    test('Instituciones NO pueden participar en "A mí también me pasa" (403)', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 2, email: 'inst@test.com', activo: 1, tipo_usuario: 'institucion', id_ciudad: 1 }]];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/reclamos/10/afectado')
        .set('Authorization', `Bearer ${institutionToken}`);

      expect(res.status).toBe(403);
    });

    test('No se permite participar en reclamos con estado Resuelto (400)', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 5, email: '5@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 20,
            id_usuario: 1,
            visibilidad: 'publico',
            estado: CLAIM_STATUSES.RESUELTO,
            id_ciudad: 1,
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/reclamos/20/afectado')
        .set('Authorization', `Bearer ${otherCitizenToken}`);

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/finalizados/);
    });

    test('No se permite participar en reclamos con estado Cancelado (400)', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 5, email: '5@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 21,
            id_usuario: 1,
            visibilidad: 'publico',
            estado: CLAIM_STATUSES.CANCELADO,
            id_ciudad: 1,
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/reclamos/21/afectado')
        .set('Authorization', `Bearer ${otherCitizenToken}`);

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/finalizados/);
    });

    test('El autor no puede auto-adherirse a su propio reclamo (400)', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: '1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 22,
            id_usuario: 1,
            visibilidad: 'publico',
            estado: CLAIM_STATUSES.EN_PROCESO,
            id_ciudad: 1,
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/reclamos/22/afectado')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/propio reclamo/);
    });

    test('Ciudadano de otra ciudad no puede adherirse (visitante) (403)', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 5, email: '5@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 2 }]]; // Ciudad 2
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 23,
            id_usuario: 1,
            visibilidad: 'publico',
            estado: CLAIM_STATUSES.EN_PROCESO,
            id_ciudad: 1, // Ciudad 1
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/reclamos/23/afectado')
        .set('Authorization', `Bearer ${otherCitizenToken}`);

      expect(res.status).toBe(403);
      expect(res.body.mensaje).toMatch(/tu ciudad/);
    });

    test('Ciudadano habilitado puede adherirse exitosamente a reclamo público activo', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 5, email: '5@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{
            id: 24,
            id_usuario: 1,
            visibilidad: 'publico',
            estado: CLAIM_STATUSES.EN_PROCESO,
            id_ciudad: 1,
          }]];
        }
        if (typeof sql === 'string' && sql.includes('SELECT 1 FROM reclamos_afectados')) {
          return [[]]; // Aún no afectado
        }
        if (typeof sql === 'string' && sql.includes('INSERT IGNORE INTO reclamos_afectados')) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/reclamos/24/afectado')
        .set('Authorization', `Bearer ${otherCitizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.afectado).toBe(true);
    });
  });
});
