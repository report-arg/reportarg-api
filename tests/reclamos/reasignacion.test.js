const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { generateTestToken, ROLES } = require('../helpers/auth');

// Mocks the emailService so tests don't fail trying to send emails
jest.mock('../../src/config/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

// Mock de DB con conexión compartida y controlable
// Nota: debe tener prefijo 'mock' para poder usarse dentro de jest.mock()
const mockConnQuery = jest.fn();
jest.mock('../../src/config/db', () => {
  return {
    query: jest.fn(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        const userId = params ? params[0] : 3;
        return [[{
          id_usuario: userId,
          email: `${userId}@test.com`,
          activo: 1,
          tipo_usuario: userId === 3 ? 'admin' : userId === 2 ? 'institucion' : 'ciudadano',
          id_ciudad: 1,
          id_institucion: userId === 2 ? 10 : null,
        }]];
      }
      return [[]];
    }),
    getConnection: jest.fn().mockImplementation(() => Promise.resolve({
      query: mockConnQuery,
      beginTransaction: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn(),
    })),
  };
});

describe('HU-21: Reasignación Administrativa de Reclamos', () => {
  const adminToken = generateTestToken(ROLES.ADMIN, 3);
  const userToken  = generateTestToken(ROLES.CIUDADANO, 1);
  const instToken  = generateTestToken(ROLES.INSTITUCION, 2);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset del mock de query de la conexión de transacción
    mockConnQuery.mockResolvedValue([[]]);
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
    // La conexión de transacción devuelve vacío (reclamo no encontrado)
    mockConnQuery.mockResolvedValue([[]]);

    const res = await request(app)
      .patch('/api/admin/reclamos/999/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 5 });

    expect(res.status).toBe(404);
    expect(res.body.mensaje).toMatch(/Reclamo no encontrado/i);
  });

  test('Error: Institución destino inexistente (404)', async () => {
    // Primera query: SELECT reclamo → hallado
    // Segunda query: SELECT institución → no hallada
    mockConnQuery
      .mockResolvedValueOnce([[{ id_reclamo: 1, id_ciudad: 10, id_institucion: 2, estado: 'Pendiente' }]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 999 });

    expect(res.status).toBe(404);
    expect(res.body.mensaje).toMatch(/destino no existe/i);
  });

  test('Error: Reasignación cross-city rechazada (400)', async () => {
    mockConnQuery
      .mockResolvedValueOnce([[{ id_reclamo: 1, id_ciudad: 10, id_institucion: 2, estado: 'Pendiente' }]])
      .mockResolvedValueOnce([[{ id_institucion: 5, id_ciudad: 20, nombre: 'Inst Ciudad 20' }]]); // Ciudad distinta

    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 5 });

    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/misma ciudad/i);
  });

  test('Error: No se puede reasignar a la misma institución (400)', async () => {
    mockConnQuery
      .mockResolvedValueOnce([[{ id_reclamo: 1, id_ciudad: 10, id_institucion: 5, estado: 'Pendiente' }]])
      .mockResolvedValueOnce([[{ id_institucion: 5, id_ciudad: 10, nombre: 'Misma Inst' }]]);

    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 5 });

    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/ya está asignado/i);
  });

  test('Éxito: Reasignación administrativa correcta (actualiza institución y registra historial)', async () => {
    let updateCalled = false;
    let historyCalled = false;

    mockConnQuery.mockImplementation(async (sql) => {
      if (sql.includes('FROM reclamos')) {
        return [[{ id_reclamo: 1, id_ciudad: 10, id_institucion: 2, estado: 'Pendiente' }]];
      }
      if (sql.includes('FROM instituciones')) {
        return [[{ id_institucion: 5, id_ciudad: 10, nombre: 'Nueva Institución' }]];
      }
      if (sql.includes('UPDATE reclamos')) {
        updateCalled = true;
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('INSERT INTO reclamos_historial')) {
        historyCalled = true;
        return [{ insertId: 100 }];
      }
      return [[]];
    });

    const res = await request(app)
      .patch('/api/admin/reclamos/1/institucion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_institucion: 5, motivo: 'Reasignación por volumen de trabajo' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // Verificar que se actualizó la institución Y se registró el historial (reglas HU-21)
    expect(updateCalled).toBe(true);
    expect(historyCalled).toBe(true);
  });

});
