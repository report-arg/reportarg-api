const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { generateTestToken, ROLES } = require('../helpers/auth');

// Mocks the emailService so tests don't fail trying to send emails
jest.mock('../../src/config/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

jest.mock('../../src/config/db', () => {
  const mQuery = jest.fn(async (sql, params) => {
    if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
      const userId = params ? params[0] : 1;
      return [[{
        id_usuario: userId,
        email: 'test@domain.com',
        activo: 1,
        tipo_usuario: userId === 3 ? 'admin' : userId === 2 ? 'institucion' : 'ciudadano',
        id_ciudad: 1,
        id_institucion: userId === 2 ? 10 : null,
      }]];
    }
    return [[]];
  });
  return {
    query: mQuery,
    getConnection: jest.fn(async () => ({
      query: jest.fn().mockResolvedValue([[]]),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    })),
  };
});

describe('HU-21: Reasignación Administrativa de Reclamos', () => {
  const adminToken = generateTestToken(ROLES.ADMIN, 3);
  const userToken = generateTestToken(ROLES.CIUDADANO, 1);
  const instToken = generateTestToken(ROLES.INSTITUCION, 2);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Seguridad: Ciudadano no puede reasignar (403)', async () => {
    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ id_institucion: 5 });

    expect(res.status).toBe(403);
  });

  test('Seguridad: Institución no puede reasignar (403)', async () => {
    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${instToken}`)
      .send({ id_institucion: 5 });

    expect(res.status).toBe(403);
  });

  test('Seguridad: Sin token no puede reasignar (401)', async () => {
    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .send({ id_institucion: 5 });

    expect(res.status).toBe(401);
  });

  test('Error: Faltan parámetros (400)', async () => {
    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({}); // Falta id_institucion

    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/destino es obligatoria/i);
  });

  test('Error: Reclamo inexistente (404)', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM usuarios u')) return [[{ id_usuario: 3, activo: 1, tipo_usuario: 'admin', id_ciudad: 1 }]];
      if (sql.includes('FROM reclamos')) return [[]]; // Not found
      return [[]];
    });

    const res = await request(app)
      .patch('/api/admin/reclamos/999/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 5 });

    expect(res.status).toBe(404);
    expect(res.body.mensaje).toMatch(/Reclamo no encontrado/i);
  });

  test('Error: Institución destino inexistente (404)', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM usuarios u')) return [[{ id_usuario: 3, activo: 1, tipo_usuario: 'admin', id_ciudad: 1 }]];
      if (sql.includes('FROM reclamos r')) return [[{ id: 1, id_ciudad: 10 }]];
      if (sql.includes('FROM instituciones i')) return [[]]; // Not found
      return [[]];
    });

    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 999 });

    expect(res.status).toBe(404);
    expect(res.body.mensaje).toMatch(/destino no existe/i);
  });

  test('Error: Reasignación cross-city rechazada (400)', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM usuarios u')) return [[{ id_usuario: 3, activo: 1, tipo_usuario: 'admin', id_ciudad: 1 }]];
      if (sql.includes('FROM reclamos r')) return [[{ id: 1, id_ciudad: 10 }]];
      if (sql.includes('FROM instituciones i')) return [[{ id: 5, id_ciudad: 20, nombre: 'Inst 5' }]];
      return [[]];
    });

    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 5 });

    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/misma ciudad/i);
  });

  test('Éxito: Reasignación administrativa correcta', async () => {
    let updateCalled = false;
    let historyCalled = false;
    
    db.query.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM usuarios u')) return [[{ id_usuario: 3, activo: 1, tipo_usuario: 'admin', id_ciudad: 1 }]];
      if (sql.includes('FROM reclamos r')) return [[{ id: 1, id_ciudad: 10, estado: 'Pendiente', institucionId: 2, institucionNombre: 'Antigua Inst' }]];
      if (sql.includes('FROM instituciones i')) return [[{ id: 5, id_ciudad: 10, nombre: 'Nueva Inst' }]];
      if (sql.includes('UPDATE reclamos')) { updateCalled = true; return [{ affectedRows: 1 }]; }
      if (sql.includes('INSERT INTO reclamos_historial')) { historyCalled = true; return [{ insertId: 100 }]; }
      return [[]];
    });

    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 5 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    expect(updateCalled).toBe(true);
    expect(historyCalled).toBe(true);
  });

});
