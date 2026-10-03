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

const authorCitizenToken = generateTestToken(ROLES.CIUDADANO, 1);
const otherCitizenToken = generateTestToken(ROLES.CIUDADANO, 5);
const assignedInstitutionToken = generateTestToken(ROLES.INSTITUCION, 10, { id_institucion: 3 });
const otherInstitutionToken = generateTestToken(ROLES.INSTITUCION, 20, { id_institucion: 99 });

describe('HU-17: Actualizaciones de Reclamos según Estado', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupAuthMock(userObj) {
    return (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[userObj]];
      }
      return [[]];
    };
  }

  test('1. El ciudadano autor puede publicar actualización mientras el reclamo está Pendiente', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 1, email: '1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
        return [[{
          id: 10,
          id_reclamo: 10,
          id_usuario: 1,
          id_institucion: 3,
          titulo: 'Bache grande',
          estado: CLAIM_STATUSES.PENDIENTE,
        }]];
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO reclamos_actualizaciones')) {
        return [{ insertId: 101 }];
      }
      if (typeof sql === 'string' && sql.includes('FROM instituciones')) {
        return [[{ id_usuario: 10, nombre: 'Obras Públicas' }]];
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
        return [{ insertId: 501 }];
      }
      return [[]];
    });

    const res = await request(app)
      .post('/api/reclamos/10/actualizaciones')
      .set('Authorization', `Bearer ${authorCitizenToken}`)
      .send({ texto: 'Aporto foto adicional del bache' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.mensaje).toMatch(/correctamente/i);
  });

  test('2. Un ciudadano que no es autor no puede publicar actualización en reclamo Pendiente (403)', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 5, email: '5@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
        return [[{
          id: 10,
          id_reclamo: 10,
          id_usuario: 1, // Autor es usuario 1
          id_institucion: 3,
          titulo: 'Bache grande',
          estado: CLAIM_STATUSES.PENDIENTE,
        }]];
      }
      return [[]];
    });

    const res = await request(app)
      .post('/api/reclamos/10/actualizaciones')
      .set('Authorization', `Bearer ${otherCitizenToken}`)
      .send({ texto: 'Comentario de otro ciudadano' });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.mensaje).toMatch(/solo el creador/i);
  });

  test('3. El ciudadano autor no puede publicar actualización una vez que pasa a En revisión (403)', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 1, email: '1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
        return [[{
          id: 10,
          id_reclamo: 10,
          id_usuario: 1,
          id_institucion: 3,
          titulo: 'Bache grande',
          estado: CLAIM_STATUSES.EN_REVISION,
        }]];
      }
      return [[]];
    });

    const res = await request(app)
      .post('/api/reclamos/10/actualizaciones')
      .set('Authorization', `Bearer ${authorCitizenToken}`)
      .send({ texto: 'Intento de actualizar en revisión' });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.mensaje).toMatch(/solo la institución responsable/i);
  });

  test('4. La institución asignada puede publicar actualización cuando el reclamo está En revisión', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 10, email: 'inst@test.com', activo: 1, tipo_usuario: 'institucion', id_ciudad: 1, id_institucion: 3 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
        return [[{
          id: 10,
          id_reclamo: 10,
          id_usuario: 1,
          id_institucion: 3,
          titulo: 'Bache grande',
          estado: CLAIM_STATUSES.EN_REVISION,
        }]];
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO reclamos_actualizaciones')) {
        return [{ insertId: 102 }];
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
        return [{ insertId: 502 }];
      }
      return [[]];
    });

    const res = await request(app)
      .post('/api/reclamos/10/actualizaciones')
      .set('Authorization', `Bearer ${assignedInstitutionToken}`)
      .send({ texto: 'Cuadrilla técnica programada para inspeccionar el lugar.' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.mensaje).toMatch(/correctamente/i);
  });

  test('5. Una institución no asignada no puede publicar actualización en el reclamo (403)', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 20, email: 'otherinst@test.com', activo: 1, tipo_usuario: 'institucion', id_ciudad: 1, id_institucion: 99 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
        return [[{
          id: 10,
          id_reclamo: 10,
          id_usuario: 1,
          id_institucion: 3, // Asignada a institución 3
          titulo: 'Bache grande',
          estado: CLAIM_STATUSES.EN_REVISION,
        }]];
      }
      return [[]];
    });

    const res = await request(app)
      .post('/api/reclamos/10/actualizaciones')
      .set('Authorization', `Bearer ${otherInstitutionToken}`)
      .send({ texto: 'Actualización no permitida' });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('6. No se puede publicar actualización si el reclamo está Resuelto o Cancelado (400)', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 10, email: 'inst@test.com', activo: 1, tipo_usuario: 'institucion', id_ciudad: 1, id_institucion: 3 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_reclamo = ?')) {
        return [[{
          id: 10,
          id_reclamo: 10,
          id_usuario: 1,
          id_institucion: 3,
          titulo: 'Bache grande',
          estado: CLAIM_STATUSES.RESUELTO,
        }]];
      }
      return [[]];
    });

    const res = await request(app)
      .post('/api/reclamos/10/actualizaciones')
      .set('Authorization', `Bearer ${assignedInstitutionToken}`)
      .send({ texto: 'Intento en reclamo resuelto' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.mensaje).toMatch(/resuelto o cancelado/i);
  });
});
