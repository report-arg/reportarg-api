const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { ROLES } = require('../../src/constants/roles');
const { generateTestToken } = require('../helpers/auth');
const InstitutionModel = require('../../src/modules/instituciones/institucionModel');
const UserModel = require('../../src/modules/usuarios/models/usuarioModel');

// Mocks de servicios y base de datos
jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

jest.mock('../../src/config/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

jest.mock('../../src/services/emailService', () => ({
  enviarAprobacionInstitucion: jest.fn().mockResolvedValue(true),
  enviarRechazoInstitucion: jest.fn().mockResolvedValue(true),
  enviarBienvenida: jest.fn().mockResolvedValue(true),
  enviarCodigoVerificacion: jest.fn().mockResolvedValue(true),
}));

describe('Etapa 1: Seguridad e Integridad de Datos (ADMIN-01)', () => {
  let mockConnection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      query: jest.fn(),
      beginTransaction: jest.fn().mockResolvedValue(true),
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
      release: jest.fn(),
    };

    // Por defecto db.getConnection retorna la conexión simulada
    db.getConnection.mockResolvedValue(mockConnection);
  });

  describe('1. Autorización basada en el rol actual de BD y no del JWT', () => {
    test('Un administrador degradado en BD pierde inmediatamente sus permisos administrativos (403)', async () => {
      // El JWT indica role: "admin", pero en la base de datos fue cambiado a "ciudadano"
      const tokenConRolAdmin = generateTestToken(ROLES.ADMIN, 99);

      db.query = jest.fn().mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 99,
            email: 'exadmin@test.com',
            activo: 1,
            tipo_usuario: 'ciudadano', // Rol real en BD degradado
            id_ciudad: 1,
            id_institucion: null,
            institucion_verificada: null,
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${tokenConRolAdmin}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/no tenés permisos/i);
      expect(res.body.codigo).toBe('ROL_NO_AUTORIZADO');
      expect(res.body.rolActual).toBe('ciudadano');
    });

    test('Un usuario con rol en base de datos inexistente o inválido no hace fallback al token y es rechazado (401)', async () => {
      // El JWT indica role: "admin", pero en BD el tipo_usuario es inválido/desconocido
      const token = generateTestToken(ROLES.ADMIN, 100);

      db.query = jest.fn().mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 100,
            email: 'hacker@test.com',
            activo: 1,
            tipo_usuario: 'rol_inexistente_invalido',
            id_ciudad: 1,
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/acceso denegado/i);
    });

    test('Un usuario con rol null en BD es rechazado inmediatamente (401)', async () => {
      const token = generateTestToken(ROLES.ADMIN, 101);

      db.query = jest.fn().mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 101,
            email: 'nullrole@test.com',
            activo: 1,
            tipo_usuario: null,
            id_ciudad: 1,
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  describe('2. Rechazo de tokens de usuarios inactivos / inhabilitados', () => {
    test('Un usuario inhabilitado (activo = 0) no puede acceder aunque su token JWT siga vigente (401)', async () => {
      const token = generateTestToken(ROLES.ADMIN, 102);

      db.query = jest.fn().mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 102,
            email: 'bloqueado@test.com',
            activo: 0, // Inhabilitado
            tipo_usuario: 'admin',
            id_ciudad: 1,
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token no proporcionado o inválido/i);
    });

    test('Un token JWT vencido (expirado) es rechazado inmediatamente con 401', async () => {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'test-secret-key';
      process.env.JWT_SECRET = secret;
      const expiredToken = jwt.sign({ id: 102, email: 'user@test.com', role: 'ciudadano' }, secret, { expiresIn: '-10s' });

      const res = await request(app)
        .get('/api/reclamos/mis-reclamos')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token no proporcionado o inválido/i);
    });
  });

  describe('3. Permisos institucionales según el estado actual de la cuenta', () => {
    test('Institución pendiente o no verificada (verificada = 0) no puede realizar operaciones institucionales operativas (403)', async () => {
      const token = generateTestToken(ROLES.INSTITUCION, 201);

      db.query = jest.fn().mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 201,
            email: 'inst_pendiente@test.com',
            activo: 1,
            tipo_usuario: 'institucion',
            id_ciudad: 1,
            id_institucion: 50,
            institucion_verificada: 0, // No verificada
          }]];
        }
        return [[]];
      });

      // Intenta acceder a una ruta exclusiva para instituciones
      const res = await request(app)
        .post('/api/comunicados')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Aviso urgente' });

      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('INSTITUCION_NO_VERIFICADA');
      expect(res.body.error).toMatch(/pendiente de verificación/i);
    });

    test('Institución no verificada conserva su rol institucion y NO puede acceder a operaciones ciudadanas (403)', async () => {
      const token = generateTestToken(ROLES.INSTITUCION, 201);

      db.query = jest.fn().mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 201,
            email: 'inst_pendiente@test.com',
            activo: 1,
            tipo_usuario: 'institucion',
            id_ciudad: 1,
            id_institucion: 50,
            institucion_verificada: 0, // No verificada
          }]];
        }
        return [[]];
      });

      // Intenta acceder a una ruta exclusiva para ciudadanos (crear reclamo ciudadano)
      const res = await request(app)
        .post('/api/reclamos')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Reclamo ciudadano no permitido para institución' });

      // Debe ser rechazada porque su rol no es ciudadano
      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('ROL_NO_AUTORIZADO');
      expect(res.body.rolActual).toBe('institucion');
    });

    test('Institución verificada (verificada = 1) accede correctamente a operaciones institucionales', async () => {
      const token = generateTestToken(ROLES.INSTITUCION, 202);

      db.query = jest.fn().mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 202,
            email: 'inst_ok@test.com',
            activo: 1,
            tipo_usuario: 'institucion',
            id_ciudad: 1,
            id_institucion: 51,
            institucion_verificada: 1, // Verificada
          }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM categorias')) {
          return [[{ id_categoria: 1, nombre: 'Seguridad', tipo: 'comunicado' }]];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO comunicados')) {
          return [{ insertId: 77 }];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/comunicados')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Aviso municipal', descripcion: 'Texto descriptivo', id_categoria: 1 });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
    });

    test('Institución no verificada no puede publicar comentarios ni actualizaciones mediante rutas compartidas (403)', async () => {
      const token = generateTestToken(ROLES.INSTITUCION, 203);

      db.query = jest.fn().mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 203,
            email: 'inst_pendiente2@test.com',
            activo: 1,
            tipo_usuario: 'usuario', // Incluso con alias legacy en BD, al tener id_institucion se valida como institución
            id_ciudad: 1,
            id_institucion: 52,
            institucion_verificada: 0,
          }]];
        }
        return [[]];
      });

      const resComentario = await request(app)
        .post('/api/comentarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ id_reclamo: 10, texto: 'Intento de comentar sin verificación' });

      expect(resComentario.status).toBe(403);
      expect(resComentario.body.codigo).toBe('INSTITUCION_NO_VERIFICADA');

      const resActualizacion = await request(app)
        .post('/api/reclamos/10/actualizaciones')
        .set('Authorization', `Bearer ${token}`)
        .send({ texto: 'Intento de actualizar sin verificación' });

      expect(resActualizacion.status).toBe(403);
      expect(resActualizacion.body.codigo).toBe('INSTITUCION_NO_VERIFICADA');
    });
  });

  describe('4. Transaccionalidad y Rollback en Aprobación Institucional', () => {
    test('Rollback exitoso cuando falla la actualización de usuarios en InstitutionModel.verificar', async () => {
      mockConnection.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('UPDATE instituciones')) {
          return [{ affectedRows: 1 }];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE usuarios')) {
          throw new Error('Fallo simulado de base de datos en tabla usuarios');
        }
        return [[]];
      });

      await expect(InstitutionModel.verificar(10)).rejects.toThrow('Fallo simulado de base de datos en tabla usuarios');

      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    test('Commit exitoso cuando ambas operaciones de verificación se completan correctamente', async () => {
      mockConnection.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('UPDATE instituciones')) {
          return [{ affectedRows: 1 }];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE usuarios')) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      });

      const affected = await InstitutionModel.verificar(10);

      expect(affected).toBe(1);
      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Transaccionalidad y Rollback en Creación de Usuarios y Perfiles', () => {
    test('Rollback exitoso cuando falla la creación del perfil ciudadano en UserModel.createWithProfile', async () => {
      mockConnection.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO usuarios')) {
          return [{ insertId: 999 }];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO ciudadanos')) {
          throw new Error('Fallo de integridad simulado al crear perfil ciudadano');
        }
        return [[]];
      });

      await expect(
        UserModel.createWithProfile({
          email: 'fallo@test.com',
          password: 'password123',
          rol: 'ciudadano',
          estado: 'activo',
          nombre: 'Juan Perez',
        })
      ).rejects.toThrow('Fallo de integridad simulado al crear perfil ciudadano');

      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    test('Commit exitoso al crear usuario y perfil atómicamente', async () => {
      mockConnection.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO usuarios')) {
          return [{ insertId: 888 }];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO ciudadanos')) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      });

      const newId = await UserModel.createWithProfile({
        email: 'exito@test.com',
        password: 'password123',
        rol: 'ciudadano',
        estado: 'activo',
        nombre: 'Ana Gomez',
      });

      expect(newId).toBe(888);
      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Conservación de los flujos legítimos existentes', () => {
    test('Admin activo y con rol verificado accede exitosamente (200)', async () => {
      const adminToken = generateTestToken(ROLES.ADMIN, 1);

      db.query = jest.fn().mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 1,
            email: 'admin@reportarg.gob.ar',
            activo: 1,
            tipo_usuario: 'admin',
            id_ciudad: 1,
          }]];
        }
        if (typeof sql === 'string' && sql.includes('COUNT(*)')) {
          return [[{ total: 0 }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('Ciudadano activo accede a su endpoint de reclamos propios exitosamente', async () => {
      const citizenToken = generateTestToken(ROLES.CIUDADANO, 5);

      db.query = jest.fn().mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 5,
            email: 'ciudadano@test.com',
            activo: 1,
            tipo_usuario: 'ciudadano',
            id_ciudad: 1,
          }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM reclamos r')) {
          return [[]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/reclamos/mis-reclamos')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('7. Reglas ADMIN-01 Etapa 1: Upload protegido, vencimiento de rechazo y bloqueo de reclamos huérfanos', () => {
    test('Institución no verificada no puede subir archivos a /api/admin/upload/foto (403)', async () => {
      const token = generateTestToken(ROLES.INSTITUCION, 201);

      db.query = jest.fn().mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 201,
            email: 'inst_pendiente@test.com',
            activo: 1,
            tipo_usuario: 'institucion',
            id_ciudad: 1,
            id_institucion: 50,
            institucion_verificada: 0,
            institucion_status: 'pending',
          }]];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/admin/upload/foto')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('INSTITUCION_NO_VERIFICADA');
    });

    test('Institución rechazada hace más de 7 días se inhabilita automáticamente y recibe 401', async () => {
      const token = generateTestToken(ROLES.INSTITUCION, 205);
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      let userDisabledSqlCalled = false;

      db.query = jest.fn().mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 205,
            email: 'inst_vencida@test.com',
            activo: 1,
            tipo_usuario: 'institucion',
            id_ciudad: 1,
            id_institucion: 55,
            institucion_verificada: 0,
            institucion_status: 'rejected',
            fecha_rechazo: eightDaysAgo,
          }]];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE usuarios SET activo = 0')) {
          userDisabledSqlCalled = true;
          return [{ affectedRows: 1 }];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/notificaciones')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(userDisabledSqlCalled).toBe(true);
    });

    test('No permite crear un reclamo si la ciudad no tiene institución responsable ni principal válida (409)', async () => {
      const citizenToken = generateTestToken(ROLES.CIUDADANO, 5);

      db.query = jest.fn().mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{
            id_usuario: 5,
            email: 'ciudadano@test.com',
            activo: 1,
            tipo_usuario: 'ciudadano',
            id_ciudad: 1,
            ciudad_activa: 1,
          }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM ciudades')) {
          return [[{ id_ciudad: 1, nombre: 'Viale', provincia: 'Entre Ríos', activa: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM categorias')) {
          return [[{ id: 1, nombre: 'Bacheo', estado: 'activo', tipo: 'reclamo' }]];
        }
        if (typeof sql === 'string' && sql.includes('COUNT(*) AS total FROM reclamos')) {
          return [[{ total: 0 }]];
        }
        // Ninguna institución especializada ni principal válida
        if (typeof sql === 'string' && sql.includes('FROM instituciones i')) {
          return [[]];
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/reclamos')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          titulo: 'Bache en calle céntrica',
          descripcion: 'Bache profundo frente a la plaza',
          id_categoria: 1,
          direccion: 'Av. San Martín 120',
        });

      expect(res.status).toBe(409);
      expect(res.body.mensaje).toMatch(/no cuenta actualmente con una institución principal o responsable/i);
    });
  });
});
