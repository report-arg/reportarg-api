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

describe('Módulo de Administración Territorial de Ciudades (ADMIN-01 — Etapa 3)', () => {
  const adminId = 1;
  const adminToken = generateTestToken(ROLES.ADMIN, adminId);
  const citizenToken = generateTestToken(ROLES.CIUDADANO, 2);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAdminAuth = (extra = () => [[]]) => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('i.id_institucion') && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: adminId, email: 'admin@reportarg.gob.ar', activo: 1, tipo_usuario: 'admin' }]];
      }
      return extra(sql, params);
    });
  };

  describe('1. Listado y métricas administrativas (GET /api/admin/ciudades)', () => {
    test('Rechaza acceso sin token o con rol ciudadano', async () => {
      const resNoAuth = await request(app).get('/api/admin/ciudades');
      expect(resNoAuth.status).toBe(401);

      db.query.mockResolvedValueOnce([[{ id_usuario: 2, email: 'c@test.com', activo: 1, tipo_usuario: 'ciudadano' }]]);
      const resCitizen = await request(app)
        .get('/api/admin/ciudades')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(resCitizen.status).toBe(403);
    });

    test('Devuelve ciudades activas e inactivas, institución principal, métricas e instituciones elegibles', async () => {
      mockAdminAuth((sql) => {
        if (typeof sql === 'string' && sql.includes('FROM ciudades c') && sql.includes('instituciones_verificadas')) {
          return [[
            {
              id_ciudad: 1,
              id: 1,
              nombre: 'Viale',
              provincia: 'Entre Ríos',
              activa: 1,
              id_institucion_principal: 10,
              institucion_principal_nombre: 'Municipalidad de Viale',
              institucion_principal_tipo: 'municipio',
              instituciones_verificadas: 3,
              instituciones_pendientes: 1,
              ciudadanos_total: 120,
              reclamos_total: 45,
              reclamos_abiertos: 8,
            },
            {
              id_ciudad: 2,
              id: 2,
              nombre: 'Paraná',
              provincia: 'Entre Ríos',
              activa: 0,
              id_institucion_principal: null,
              institucion_principal_nombre: null,
              institucion_principal_tipo: null,
              instituciones_verificadas: 1,
              instituciones_pendientes: 2,
              ciudadanos_total: 15,
              reclamos_total: 0,
              reclamos_abiertos: 0,
            },
          ]];
        }
        if (typeof sql === 'string' && sql.includes('ORDER BY inst_e.es_principal DESC')) {
          return [[
            { id: 10, id_ciudad: 1, nombre: 'Municipalidad de Viale', tipo: 'municipio', es_principal: 1 },
            { id: 25, id_ciudad: 2, nombre: 'Municipalidad de Paraná', tipo: 'municipio', es_principal: 0 },
          ]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/ciudades')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.stats).toEqual({
        total: 2,
        activas: 1,
        inactivas: 1,
        sin_principal: 1,
        activas_sin_principal: 0,
      });

      const parana = res.body.data.find((c) => c.id === 2);
      expect(parana.activa).toBe(0);
      expect(parana.estado).toBe('inactiva');
      expect(parana.instituciones_elegibles).toHaveLength(1);
      expect(parana.instituciones_elegibles[0].nombre).toBe('Municipalidad de Paraná');
    });

    test('GET /api/ciudades (público) continúa devolviendo únicamente ciudades activas', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Viale', provincia: 'Entre Ríos' }]]);

      const res = await request(app).get('/api/ciudades');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].nombre).toBe('Viale');
    });
  });

  describe('2. Registro administrativo de nueva localidad (POST /api/admin/ciudades)', () => {
    test('Registra localidad oficial de Argentina en estado inactivo (activa = 0) y audita la acción', async () => {
      mockAdminAuth();
      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[]]) // no existe aún en ciudades
          .mockResolvedValueOnce([{ insertId: 5 }]) // INSERT INTO ciudades
          .mockResolvedValueOnce([{ insertId: 99 }]), // INSERT INTO admin_auditoria
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/admin/ciudades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Crespo', provincia: 'Entre Ríos' });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toMatchObject({
        id: 5,
        nombre: 'Crespo',
        provincia: 'Entre Ríos',
        activa: 0,
        estado: 'inactiva',
      });
      expect(mockConn.commit).toHaveBeenCalled();
    });

    test('Rechaza registrar una localidad que ya existe en ciudades (409 CIUDAD_YA_REGISTRADA)', async () => {
      mockAdminAuth();
      const mockConn = {
        query: jest.fn().mockResolvedValueOnce([[{ id_ciudad: 1, nombre: 'Viale', provincia: 'Entre Ríos', activa: 1 }]]),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/admin/ciudades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Viale', provincia: 'Entre Ríos' });

      expect(res.status).toBe(409);
      expect(res.body.codigo).toBe('CIUDAD_YA_REGISTRADA');
      expect(mockConn.rollback).toHaveBeenCalled();
    });
  });

  describe('3. Activación y desactivación operativa de ciudades (PATCH /api/admin/ciudades/:id/estado)', () => {
    test('Bloquea activar una ciudad si no posee una institución principal verificada y activa (409 CIUDAD_SIN_INSTITUCION_PRINCIPAL)', async () => {
      mockAdminAuth();
      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ id_ciudad: 2, nombre: 'Paraná', provincia: 'Entre Ríos', activa: 0 }]]) // SELECT ciudad FOR UPDATE
          .mockResolvedValueOnce([[]]), // SELECT institución principal -> vacía
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .patch('/api/admin/ciudades/2/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activa: true });

      expect(res.status).toBe(409);
      expect(res.body.codigo).toBe('CIUDAD_SIN_INSTITUCION_PRINCIPAL');
      expect(mockConn.rollback).toHaveBeenCalled();
    });

    test('Activa una ciudad inactiva asignando su institución principal en la misma transacción y vinculando ciudadanos residentes', async () => {
      mockAdminAuth();
      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ id_ciudad: 2, nombre: 'Paraná', provincia: 'Entre Ríos', activa: 0 }]]) // SELECT ciudad FOR UPDATE
          .mockResolvedValueOnce([[{ id_institucion: 25, nombre: 'Municipalidad de Paraná', id_ciudad: 2, verificada: 1, status: 'approved', activo: 1 }]]) // SELECT inst
          .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE es_principal = 0
          .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE es_principal = 1
          .mockResolvedValueOnce([[{ id_institucion: 25, nombre: 'Municipalidad de Paraná' }]]) // comprobar principal
          .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE ciudades SET activa = 1
          .mockResolvedValueOnce([{ affectedRows: 4 }]) // UPDATE usuarios residentes con id_ciudad = NULL
          .mockResolvedValueOnce([{ insertId: 101 }]), // INSERT INTO admin_auditoria
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .patch('/api/admin/ciudades/2/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activa: true, id_institucion_principal: 25 });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toMatchObject({
        id: 2,
        activa: 1,
        estado: 'activa',
        id_institucion_principal: 25,
        institucion_principal_nombre: 'Municipalidad de Paraná',
      });
      expect(mockConn.commit).toHaveBeenCalled();
    });

    test('Desactivar una ciudad exige motivo obligatorio (400 MOTIVO_OBLIGATORIO) y con motivo actualiza estado y audita', async () => {
      mockAdminAuth();

      const resSinMotivo = await request(app)
        .patch('/api/admin/ciudades/1/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activa: false, motivo: '   ' });

      expect(resSinMotivo.status).toBe(400);
      expect(resSinMotivo.body.codigo).toBe('MOTIVO_OBLIGATORIO');

      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ id_ciudad: 1, nombre: 'Viale', provincia: 'Entre Ríos', activa: 1 }]]) // SELECT ciudad
          .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE ciudades SET activa = 0
          .mockResolvedValueOnce([{ insertId: 102 }]), // INSERT INTO admin_auditoria
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const resConMotivo = await request(app)
        .patch('/api/admin/ciudades/1/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activa: false, motivo: 'Suspensión operativa temporal por reorganización municipal' });

      expect(resConMotivo.status).toBe(200);
      expect(resConMotivo.body.ok).toBe(true);
      expect(resConMotivo.body.data.activa).toBe(0);
      expect(mockConn.commit).toHaveBeenCalled();
    });
  });

  describe('4. Designación de Institución Principal (PUT /api/admin/ciudades/:id/institucion-principal)', () => {
    test('Permite cambiar la institución principal a otra institución verificada y activa de la misma ciudad', async () => {
      mockAdminAuth();
      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ id_ciudad: 1, nombre: 'Viale', provincia: 'Entre Ríos', activa: 1 }]]) // ciudad
          .mockResolvedValueOnce([[{ id_institucion: 12, nombre: 'Secretaría General de Viale', id_ciudad: 1, verificada: 1, status: 'approved', activo: 1 }]]) // nueva inst
          .mockResolvedValueOnce([[{ id_institucion: 10, nombre: 'Municipalidad de Viale' }]]) // principal previa
          .mockResolvedValueOnce([{ affectedRows: 1 }]) // es_principal = 0
          .mockResolvedValueOnce([{ affectedRows: 1 }]) // es_principal = 1
          .mockResolvedValueOnce([{ insertId: 103 }]), // auditoría
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .put('/api/admin/ciudades/1/institucion-principal')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id_institucion: 12 });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toMatchObject({
        id_ciudad: 1,
        id_institucion_principal: 12,
        institucion_principal_nombre: 'Secretaría General de Viale',
      });
      expect(mockConn.commit).toHaveBeenCalled();
    });

    test('Rechaza designar una institución de otra ciudad o no verificada (400)', async () => {
      mockAdminAuth();
      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ id_ciudad: 1, nombre: 'Viale', provincia: 'Entre Ríos', activa: 1 }]])
          .mockResolvedValueOnce([[{ id_institucion: 99, nombre: 'Muni Paraná', id_ciudad: 2, verificada: 1, status: 'approved', activo: 1 }]]),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .put('/api/admin/ciudades/1/institucion-principal')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id_institucion: 99 });

      expect(res.status).toBe(400);
      expect(res.body.codigo).toBe('INSTITUCION_DE_OTRA_CIUDAD');
      expect(mockConn.rollback).toHaveBeenCalled();
    });
  });
});
