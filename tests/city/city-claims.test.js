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

describe('Pruebas obligatorias de contexto de ciudad y aislamiento', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Ciudadano de Viale (id_ciudad = 1) obtiene feed de Viale', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 1, email: 'ciudadano@viale.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
      }
      if (typeof sql === 'string' && sql.includes('SELECT * FROM (')) {
        return [[{ id: 10, tipo: 'reclamo', titulo: 'Bache en Viale', autorNombre: 'Juan' }]];
      }
      if (typeof sql === 'string' && sql.includes('COUNT(*) AS total FROM (')) {
        return [[{ total: 1 }]];
      }
      return [[]];
    });

    const token = generateTestToken(ROLES.CIUDADANO, 1);
    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data[0].titulo).toBe('Bache en Viale');
  });

  test('Usuario sin ciudad activa (id_ciudad = null) no recibe contenido global', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 5, email: 'ciudadano@otra.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: null }]];
      }
      return [[]];
    });

    const token = generateTestToken(ROLES.CIUDADANO, 5);
    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.mensaje).toMatch(/no cuenta con la plataforma ReportARG activa/i);
  });

  test('Usuario sin ciudad activa no puede crear reclamo', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 5, email: 'ciudadano@otra.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: null }]];
      }
      return [[]];
    });

    const token = generateTestToken(ROLES.CIUDADANO, 5);
    const res = await request(app)
      .post('/api/reclamos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Intento Reclamo',
        descripcion: 'Descripcion de prueba',
        id_categoria: 1,
        direccion: 'Calle Falsa 123'
      });

    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/no podés registrar reclamos/i);
  });

  test('Institución no puede crear reclamo', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 20, email: 'inst@viale.com', activo: 1, tipo_usuario: 'institucion', id_ciudad: 1 }]];
      }
      return [[]];
    });

    const token = generateTestToken(ROLES.INSTITUCION, 20);
    const res = await request(app)
      .post('/api/reclamos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Reclamo institucion',
        descripcion: 'Prueba',
        id_categoria: 1,
        direccion: 'Calle 1'
      });

    expect(res.status).toBe(403);
  });

  test('Ciudadano sí puede crear reclamo y conserva ciudad del usuario e imagen', async () => {
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        return [[{ id_usuario: 10, email: 'ciudadano@viale.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos WHERE id_usuario')) {
        return [[{ total: 0 }]];
      }
      if (typeof sql === 'string' && sql.includes('categorias')) {
        return [[{ id_categoria: 1, nombre: 'Baches', tipo: 'ambos' }]];
      }
      if (typeof sql === 'string' && sql.includes('instituciones')) {
        return [[{ id: 100, nombre: 'Municipalidad de Viale' }]];
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO reclamos')) {
        return [{ insertId: 99 }];
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO historial')) {
        return [{ insertId: 1 }];
      }
      return [[]];
    });

    const token = generateTestToken(ROLES.CIUDADANO, 10);
    const res = await request(app)
      .post('/api/reclamos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Bache grande en esquina',
        descripcion: 'Se solicita reparar el bache en la esquina de la plaza.',
        id_categoria: 1,
        direccion: 'Av. San Martin y Belgrano',
        visibilidad: 'publico',
        imagen_url: 'https://cloudinary.com/test.jpg'
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.id).toBe(99);
  });

  test('Reclamo privado accesible por autor, institución asignada o admin (y denegado a otro ciudadano)', async () => {
    const reclamoPrivado = {
      id: 50,
      titulo: 'Sensible',
      descripcion: 'Privado',
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
          email: 'user@test.com',
          activo: 1,
          tipo_usuario: uId === 10 ? 'ciudadano' : uId === 99 ? 'ciudadano' : uId === 20 ? 'institucion' : 'admin',
          id_ciudad: 1,
          id_institucion: uId === 20 ? 100 : null
        }]];
      }
      if (typeof sql === 'string' && sql.includes('WHERE r.id_reclamo = ?')) {
        return [[reclamoPrivado]];
      }
      if (typeof sql === 'string' && sql.includes('FROM historial')) {
        return [[]];
      }
      return [[]];
    });

    // 1. Autor (ID 10) -> Acceso permitido (200)
    const tokenAutor = generateTestToken(ROLES.CIUDADANO, 10);
    const resAutor = await request(app)
      .get('/api/reclamos/50')
      .set('Authorization', `Bearer ${tokenAutor}`);
    expect(resAutor.status).toBe(200);

    // 2. Institución asignada (ID 20 / inst 100) -> Acceso permitido (200)
    const tokenInst = generateTestToken(ROLES.INSTITUCION, 20);
    const resInst = await request(app)
      .get('/api/reclamos/50')
      .set('Authorization', `Bearer ${tokenInst}`);
    expect(resInst.status).toBe(200);

    // 3. Admin (ID 30) -> Acceso permitido (200)
    const tokenAdmin = generateTestToken(ROLES.ADMIN, 30);
    const resAdmin = await request(app)
      .get('/api/reclamos/50')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(resAdmin.status).toBe(200);

    // 4. Otro ciudadano (ID 99) -> Acceso denegado (403)
    const tokenAjeno = generateTestToken(ROLES.CIUDADANO, 99);
    const resAjeno = await request(app)
      .get('/api/reclamos/50')
      .set('Authorization', `Bearer ${tokenAjeno}`);
    expect(resAjeno.status).toBe(403);
    expect(resAjeno.body.mensaje).toMatch(/Acceso denegado/i);
  });
});
