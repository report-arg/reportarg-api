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

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { generateTestToken, ROLES } = require('../helpers/auth');
const cityService = require('../../src/services/cityService');
const { resolverInstitucionAsignada } = require('../../src/services/assignmentService');
const InstitutionModel = require('../../src/models/institutionModel');

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
});
