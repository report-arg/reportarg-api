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

jest.mock('../../src/services/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { generateTestToken, ROLES } = require('../helpers/auth');
const cityService = require('../../src/services/ciudadService');
const { resolverInstitucionAsignada } = require('../../src/modules/reclamos/services/asignacionService');
const InstitutionModel = require('../../src/modules/instituciones/institucionModel');

describe('Pruebas de Aislamiento Territorial y Reglas de Negocio', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('A. CityService', () => {
    test('Viale + Entre Ríos encuentra la ciudad Viale', async () => {
      db.query.mockResolvedValueOnce([[{ id_ciudad: 1, nombre: 'Viale', provincia: 'Entre Ríos' }]]);
      const res = await cityService.findActiveCity('Viale', 'Entre Ríos');
      expect(res).toBe(1);
    });

    test('Mismo nombre + provincia incorrecta NO encuentra ciudad (no hay fallback silencioso por nombre)', async () => {
      db.query.mockResolvedValueOnce([[]]); // No coincide con la provincia
      const res = await cityService.findActiveCity('Viale', 'Santa Fe');
      expect(res).toBeNull();
    });

    test('Búsqueda sin provincia retorna null si hay ambigüedad o ninguna ciudad', async () => {
      db.query.mockResolvedValueOnce([[]]);
      const res = await cityService.findActiveCity('CiudadInexistente');
      expect(res).toBeNull();
    });
  });

  describe('B. Feed y Aislamiento por Ciudad', () => {
    test('Usuario de ciudad A (id_ciudad = 1) obtiene contenido de A y excluye ciudad B', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'userA@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('SELECT * FROM (')) {
          expect(params).toContain(1); // Filtra por id_ciudad = 1
          return [[
            { id: 10, tipo: 'reclamo', titulo: 'Reclamo Ciudad A', esInstitucion: 0 },
            { id: 20, tipo: 'comunicado', titulo: 'Comunicado Ciudad A', esInstitucion: 1 }
          ]];
        }
        if (typeof sql === 'string' && sql.includes('COUNT(*) AS total FROM (')) {
          return [[{ total: 2 }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const res = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].tipo).toBe('reclamo');
      expect(res.body.data[1].tipo).toBe('comunicado');
    });

    test('Visitante anónimo sin contexto de ciudad -> recibe respuesta controlada vacía sin elegir arbitrariamente la primera ciudad', async () => {
      const res = await request(app).get('/api/feed');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.mensaje).toMatch(/Es necesario acceder con un contexto de ciudad activa/i);
    });

    test('Usuario sin ciudad activa (id_ciudad = null) -> recibe feed vacío de forma controlada', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 5, email: 'userNull@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: null }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 5);
      const res = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.mensaje).toMatch(/Tu ciudad declarada aún no cuenta con la plataforma ReportARG activa/i);
    });
  });

  describe('C. Tendencias por Ciudad', () => {
    test('Tendencias contabilizan reclamos y comunicados restringidos a la ciudad solicitada', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'user@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('total_reclamos')) {
          expect(params).toEqual([1, 1]);
          return [[{ id: 1, nombre: 'Luz', reclamos: 2, comunicados: 1, total: 3 }]];
        }

        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const res = await request(app)
        .get('/api/feed/tendencias')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data[0].total).toBe(3);
    });
  });

  describe('D. AssignmentService (Asignación Institucional)', () => {
    test('Categoría + Ciudad encuentra institución específica', async () => {
      jest.spyOn(InstitutionModel, 'getPorCategoriaYCiudad').mockResolvedValueOnce({ id: 50, nombre: 'EPE' });

      const instId = await resolverInstitucionAsignada(1, 2);
      expect(instId).toBe(50);
      expect(InstitutionModel.getPorCategoriaYCiudad).toHaveBeenCalledWith(2, 1);
    });

    test('Si no hay institución específica, asigna a la Institución Principal de ESA ciudad', async () => {
      jest.spyOn(InstitutionModel, 'getPorCategoriaYCiudad').mockResolvedValueOnce(null);
      jest.spyOn(InstitutionModel, 'getPrincipalDeCiudad').mockResolvedValueOnce({ id: 100, nombre: 'Municipalidad de Viale' });

      const instId = await resolverInstitucionAsignada(1, 2);
      expect(instId).toBe(100);
      expect(InstitutionModel.getPrincipalDeCiudad).toHaveBeenCalledWith(1);
    });

    test('Si no existe institución principal en esa ciudad, retorna null', async () => {
      jest.spyOn(InstitutionModel, 'getPorCategoriaYCiudad').mockResolvedValueOnce(null);
      jest.spyOn(InstitutionModel, 'getPrincipalDeCiudad').mockResolvedValueOnce(null);

      const instId = await resolverInstitucionAsignada(999, 2);
      expect(instId).toBeNull();
    });
  });

  describe('E. Seguridad de Reclamos y Permisos', () => {
    test('Institución intenta crear reclamo -> HTTP 403', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 20, email: 'inst@test.com', activo: 1, tipo_usuario: 'institucion', id_ciudad: 1 }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.INSTITUCION, 20);
      const res = await request(app)
        .post('/api/reclamos')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'No permitido' });

      expect(res.status).toBe(403);
    });

    test('Reclamo privado no es accesible por un ciudadano ajeno', async () => {
      const reclamoPrivado = {
        id: 88,
        visibilidad: 'privado',
        id_usuario: 10,
        id_institucion: 100,
        id_ciudad: 1
      };

      db.query.mockImplementation(async (sql, params) => {
        const uId = params ? params[0] : 1;
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: uId,
            email: 'ajeno@test.com',
            activo: 1,
            tipo_usuario: 'ciudadano',
            id_ciudad: 1,
            id_institucion: null
          }]];
        }
        if (typeof sql === 'string' && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[reclamoPrivado]];
        }
        return [[]];
      });

      const tokenAjeno = generateTestToken(ROLES.CIUDADANO, 99);
      const res = await request(app)
        .get('/api/reclamos/88')
        .set('Authorization', `Bearer ${tokenAjeno}`);

      expect(res.status).toBe(403);
    });
  });

  describe('F. CITY-02: Registro Ciudadano, Residencia y Ciudades de Interés', () => {
    test('Registro de ciudadano con ciudad activa asocia id_ciudad activo y perfil de residencia', async () => {
      db.query.mockResolvedValueOnce([[]]); // findByEmail -> no existe
      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ id_ciudad: 1 }]]) // findActiveCity -> Viale activa (id 1)
          .mockResolvedValueOnce([{ insertId: 42 }]) // INSERT INTO usuarios
          .mockResolvedValueOnce([{ insertId: 10 }]), // INSERT INTO ciudadanos
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/auth/register-citizen')
        .send({
          nombre: 'Ana',
          apellido: 'Pérez',
          email: 'ana@test.com',
          password: 'Password123',
          provincia: 'Entre Ríos',
          ciudad: 'Viale',
          zona: 'Centro',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.ciudad_activa).toBe(true);
      expect(res.body.ciudad_residencia).toMatchObject({
        id: 1,
        nombre: 'Viale',
        provincia: 'Entre Ríos',
        activa: true,
      });
    });

    test('Registro de ciudadano con ciudad existente pero inactiva registra residencia con id_ciudad = null y ciudad_activa = false', async () => {
      db.query.mockResolvedValueOnce([[]]); // findByEmail -> no existe
      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[]]) // findActiveCity -> Paraná no activa
          .mockResolvedValueOnce([{ insertId: 43 }]) // INSERT INTO usuarios (id_ciudad = null)
          .mockResolvedValueOnce([{ insertId: 11 }]), // INSERT INTO ciudadanos
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/auth/register-citizen')
        .send({
          nombre: 'Lucas',
          apellido: 'Gómez',
          email: 'lucas@test.com',
          password: 'Password123',
          provincia: 'Entre Ríos',
          ciudad: 'Paraná',
          zona: 'Sur',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.ciudad_activa).toBe(false);
      expect(res.body.ciudad_residencia).toMatchObject({
        id: null,
        nombre: 'Paraná',
        provincia: 'Entre Ríos',
        activa: false,
      });
    });

    test('Registro de ciudadano con ciudad inexistente es rechazado con HTTP 400 (CIUDAD_INEXISTENTE)', async () => {
      db.query.mockResolvedValueOnce([[]]); // findByEmail -> no existe
      const mockConn = {
        query: jest.fn()
          .mockResolvedValueOnce([[]]) // findActiveCity -> null
          .mockResolvedValueOnce([[]]), // existsCity en tabla ciudades -> null
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/auth/register-citizen')
        .send({
          nombre: 'Pedro',
          apellido: 'Falso',
          email: 'pedro@test.com',
          password: 'Password123',
          provincia: 'Entre Ríos',
          ciudad: 'CiudadFantasmaInexistente',
          zona: 'Norte',
        });

      expect(res.status).toBe(400);
      expect(res.body.codigo).toBe('CIUDAD_INEXISTENTE');
      expect(mockConn.rollback).toHaveBeenCalled();
    });

    test('Ciudadano puede agregar hasta 3 ciudades adicionales de interés y se rechaza una cuarta (HTTP 400)', async () => {
      let currentCount = 2;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'c@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudades WHERE id_ciudad = ?')) {
          const requestedId = Number(params[0]);
          if (requestedId === 4) {
            return [[{ id_ciudad: 4, nombre: 'Crespo', provincia: 'Entre Ríos', activa: 1 }]];
          }
          if (requestedId === 5) {
            return [[{ id_ciudad: 5, nombre: 'Victoria', provincia: 'Entre Ríos', activa: 1 }]];
          }
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudadanos WHERE id_usuario = ?')) {
          return [[{ id_ciudadano: 1, nombre: 'Ana', apellido: 'Pérez', provincia: 'Entre Ríos', ciudad: 'Viale', zona: 'Centro' }]];
        }
        if (typeof sql === 'string' && sql.includes('SELECT 1 FROM ciudadano_ciudades_interes')) {
          return [[]];
        }
        if (typeof sql === 'string' && sql.includes('COUNT(*) AS total FROM ciudadano_ciudades_interes')) {
          return [[{ total: currentCount }]];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO ciudadano_ciudades_interes')) {
          currentCount += 1;
          return [{ affectedRows: 1 }];
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudadano_ciudades_interes cci')) {
          return [[
            { id: 2, nombre: 'Paraná', provincia: 'Entre Ríos', activa: 1 },
            { id: 3, nombre: 'Concordia', provincia: 'Entre Ríos', activa: 1 },
            { id: 4, nombre: 'Crespo', provincia: 'Entre Ríos', activa: 1 },
          ]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 1);

      // Agrega la 3ra ciudad de interés -> éxito (201)
      const resAdd3 = await request(app)
        .post('/api/auth/me/ciudades-interes')
        .set('Authorization', `Bearer ${token}`)
        .send({ id_ciudad: 4 });

      expect(resAdd3.status).toBe(201);
      expect(resAdd3.body.ok).toBe(true);
      expect(resAdd3.body.data.ciudades).toHaveLength(3);
      expect(resAdd3.body.data.disponibles).toBe(0);

      // Intenta agregar una 4ta ciudad de interés -> bloqueado (400 LIMITE_CIUDADES_INTERES)
      const resAdd4 = await request(app)
        .post('/api/auth/me/ciudades-interes')
        .set('Authorization', `Bearer ${token}`)
        .send({ id_ciudad: 5 });

      expect(resAdd4.status).toBe(400);
      expect(resAdd4.body.codigo).toBe('LIMITE_CIUDADES_INTERES');
    });

    test('No permite agregar ciudades de interés inexistentes, inactivas ni la propia ciudad de residencia', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'c@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudades WHERE id_ciudad = ?')) {
          const requestedId = Number(params[0]);
          if (requestedId === 99) return [[]]; // Inexistente
          if (requestedId === 8) return [[{ id_ciudad: 8, nombre: 'Diamante', provincia: 'Entre Ríos', activa: 0 }]]; // Inactiva
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 1);

      const resResidencia = await request(app)
        .post('/api/auth/me/ciudades-interes')
        .set('Authorization', `Bearer ${token}`)
        .send({ id_ciudad: 1 });
      expect(resResidencia.status).toBe(400);
      expect(resResidencia.body.codigo).toBe('CIUDAD_ES_RESIDENCIA');

      const resInexistente = await request(app)
        .post('/api/auth/me/ciudades-interes')
        .set('Authorization', `Bearer ${token}`)
        .send({ id_ciudad: 99 });
      expect(resInexistente.status).toBe(400);
      expect(resInexistente.body.codigo).toBe('CIUDAD_INEXISTENTE');

      const resInactiva = await request(app)
        .post('/api/auth/me/ciudades-interes')
        .set('Authorization', `Bearer ${token}`)
        .send({ id_ciudad: 8 });
      expect(resInactiva.status).toBe(400);
      expect(resInactiva.body.codigo).toBe('CIUDAD_INACTIVA');
    });

    test('Permite eliminar una ciudad de interés y volver a consultar el listado', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'c@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('DELETE FROM ciudadano_ciudades_interes')) {
          return [{ affectedRows: 1 }];
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudadano_ciudades_interes cci')) {
          return [[{ id: 2, nombre: 'Paraná', provincia: 'Entre Ríos', activa: 1 }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const resDel = await request(app)
        .delete('/api/auth/me/ciudades-interes/3')
        .set('Authorization', `Bearer ${token}`);

      expect(resDel.status).toBe(200);
      expect(resDel.body.ok).toBe(true);
      expect(resDel.body.data.ciudades).toHaveLength(1);
      expect(resDel.body.data.disponibles).toBe(2);
    });

    test('Desactivación de una ciudad que el ciudadano tenía guardada informa la situación y bloquea cambio de contexto operativo', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'c@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudadano_ciudades_interes cci')) {
          return [[
            { id: 2, nombre: 'Paraná', provincia: 'Entre Ríos', activa: 1 },
            { id: 3, nombre: 'Concordia', provincia: 'Entre Ríos', activa: 0 }, // Se desactivó
          ]];
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudades WHERE id_ciudad = ?')) {
          const requestedId = Number(params[0]);
          if (requestedId === 3) {
            return [[{ id_ciudad: 3, nombre: 'Concordia', provincia: 'Entre Ríos', activa: 0 }]];
          }
          if (requestedId === 2) {
            return [[{ id_ciudad: 2, nombre: 'Paraná', provincia: 'Entre Ríos', activa: 1 }]];
          }
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 1);

      const resList = await request(app)
        .get('/api/auth/me/ciudades-interes')
        .set('Authorization', `Bearer ${token}`);

      expect(resList.status).toBe(200);
      expect(resList.body.data.hay_ciudades_inactivas).toBe(true);
      expect(resList.body.data.ciudades_inactivas).toHaveLength(1);
      expect(resList.body.data.ciudades_inactivas[0]).toMatchObject({
        id: 3,
        nombre: 'Concordia',
        activa: false,
        estado: 'inactiva',
      });

      // Intentar cambiar contexto a la ciudad desactivada (id 3) -> bloqueado (400 CIUDAD_INACTIVA)
      const resCtxInactiva = await request(app)
        .post('/api/auth/me/contexto-ciudad')
        .set('Authorization', `Bearer ${token}`)
        .send({ id_ciudad: 3 });

      expect(resCtxInactiva.status).toBe(400);
      expect(resCtxInactiva.body.codigo).toBe('CIUDAD_INACTIVA');

      // Cambiar contexto a una ciudad activa de interés (id 2) -> éxito como visitante sin permisos de escritura
      const resCtxActiva = await request(app)
        .post('/api/auth/me/contexto-ciudad')
        .set('Authorization', `Bearer ${token}`)
        .send({ id_ciudad: 2 });

      expect(resCtxActiva.status).toBe(200);
      expect(resCtxActiva.body.data).toMatchObject({
        es_residencia: false,
        es_visitante: true,
        id_ciudad_residencia: 1,
        permisos_escritura: false,
      });
    });

    test('El cambio de contexto permite consultar feed de otra ciudad activa pero bloquea crear reclamos en ciudad visitada o inactiva', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'c@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudades WHERE id_ciudad = ? AND activa = 1')) {
          if (Number(params[0]) === 2) {
            return [[{ id_ciudad: 2, nombre: 'Paraná', provincia: 'Entre Ríos' }]];
          }
          return [[]];
        }
        if (typeof sql === 'string' && sql.includes('SELECT * FROM (')) {
          expect(params).toContain(2);
          return [[{ id: 50, tipo: 'reclamo', titulo: 'Reclamo en Paraná' }]];
        }
        if (typeof sql === 'string' && sql.includes('COUNT(*) AS total FROM (')) {
          return [[{ total: 1 }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 1);

      // Consultar feed de ciudad visitada (id_ciudad=2) -> permitido como visitante
      const resFeedVisitante = await request(app)
        .get('/api/feed?id_ciudad=2')
        .set('Authorization', `Bearer ${token}`);

      expect(resFeedVisitante.status).toBe(200);
      expect(resFeedVisitante.body.es_visitante).toBe(true);
      expect(resFeedVisitante.body.data).toHaveLength(1);

      // Intentar crear un reclamo enviando id_ciudad=2 (ciudad visitada distinta a residencia 1) -> 403
      const resCrearVisitante = await request(app)
        .post('/api/reclamos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          titulo: 'Bache en calle visitada',
          descripcion: 'Intento de reclamo en otra ciudad',
          id_categoria: 1,
          direccion: 'San Martín 100',
          id_ciudad: 2,
        });

      expect(resCrearVisitante.status).toBe(403);
      expect(resCrearVisitante.body.codigo).toBe('CIUDAD_VISITANTE_SIN_PERMISOS');
    });

    test('Ciudadano con ciudad de residencia inactiva no puede crear reclamos ni participar en "A mí también me pasa"', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 7, email: 'inactiva@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1, ciudad_activa: 0 }]];
        }
        if (typeof sql === 'string' && sql.includes('WHERE r.id_reclamo = ?')) {
          return [[{ id: 10, id_usuario: 1, visibilidad: 'publico', estado: 'Pendiente', id_ciudad: 1 }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 7);

      const resCrear = await request(app)
        .post('/api/reclamos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          titulo: 'Bache en mi cuadra',
          descripcion: 'Descripción detallada del bache',
          id_categoria: 1,
          direccion: 'Av. Principal 123',
        });

      expect(resCrear.status).toBe(403);
      expect(resCrear.body.codigo).toBe('CIUDAD_RESIDENCIA_INACTIVA');

      const resAfectado = await request(app)
        .post('/api/reclamos/10/afectado')
        .set('Authorization', `Bearer ${token}`);

      expect(resAfectado.status).toBe(403);
    });

    test('No se permite modificar la ciudad o provincia de residencia desde el perfil ciudadano (PATCH /api/auth/me/perfil)', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('i.id_institucion') && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'c@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id: 1,
            email: 'c@test.com',
            rol: 'ciudadano',
            id_ciudad: 1,
            nombre_ciudadano: 'Ana',
            apellido: 'Pérez',
            provincia: 'Entre Ríos',
            ciudad: 'Viale',
            provincia_declarada: 'Entre Ríos',
            ciudad_declarada: 'Viale',
            zona: 'Centro',
          }]];
        }
        return [[]];
      });

      const token = generateTestToken(ROLES.CIUDADANO, 1);
      const resPatch = await request(app)
        .patch('/api/auth/me/perfil')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Ana',
          apellido: 'Pérez',
          email: 'c@test.com',
          provincia: 'Santa Fe',
          ciudad: 'Rosario',
          zona: 'Centro',
        });

      expect(resPatch.status).toBe(400);
      expect(resPatch.body.codigo).toBe('RESIDENCIA_NO_EDITABLE');
    });
  });
});
