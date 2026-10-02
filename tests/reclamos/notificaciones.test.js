const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { generateTestToken, ROLES } = require('../helpers/auth');
const NotificationService = require('../../src/modules/notificaciones/notificationService');
const { NOTIFICATION_TYPES } = require('../../src/modules/notificaciones/notifications.constants');
const NotificationModel = require('../../src/modules/notificaciones/notificationModel');

// Mock del emailService para evitar envíos reales
jest.mock('../../src/config/emailService', () => ({
  enviarCodigoVerificacion: jest.fn(),
  enviarRecuperacionPassword: jest.fn(),
}));

// Mock de base de datos para pruebas controladas
jest.mock('../../src/config/db', () => {
  return {
    query: jest.fn(),
    getConnection: jest.fn(async () => ({
      query: jest.fn().mockResolvedValue([{ affectedRows: 1, insertId: 10 }]),
      beginTransaction: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn(),
    })),
  };
});

describe('HU-22: Sistema de Notificaciones Internas', () => {
  const tokenCiudadanoA = generateTestToken(ROLES.CIUDADANO, 1);
  const tokenCiudadanoB = generateTestToken(ROLES.CIUDADANO, 2);
  const tokenInstitucion = generateTestToken(ROLES.INSTITUCION, 10, { id_institucion: 5 });
  const tokenAdmin = generateTestToken(ROLES.ADMIN, 99);

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock general para autenticación verifyToken
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
        const uid = params ? params[0] : 1;
        return [[{
          id_usuario: uid,
          email: `user${uid}@test.com`,
          activo: 1,
          tipo_usuario: uid === 99 ? 'admin' : (uid === 10 ? 'institucion' : 'ciudadano'),
          id_ciudad: 1,
          id_institucion: uid === 10 ? 5 : null,
        }]];
      }
      return [[]];
    });
  });

  describe('1. Notificaciones en Eventos del Negocio (NotificationService)', () => {
    test('1. Crear notificación ante cambio de estado institucional', async () => {
      let insertQuery = null;
      let insertParams = null;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          insertQuery = sql;
          insertParams = params;
          return [{ insertId: 101 }];
        }
        return [[]];
      });

      const res = await NotificationService.notificarCambioEstado({
        idReclamo: 45,
        idUsuarioAutor: 1,
        tituloReclamo: 'Bache en calle San Martín',
        estadoAnterior: 'Pendiente',
        estadoNuevo: 'En revisión',
        actorId: 10, // Institución ejecutante
      });

      expect(res).toBe(101);
      expect(insertQuery).toContain('INSERT INTO notificaciones');
      expect(insertParams[0]).toBe(1); // id_usuario destinatario (autor)
      expect(insertParams[1]).toBe(NOTIFICATION_TYPES.CLAIM_STATUS_CHANGED);
      expect(insertParams[4]).toBe(45); // id_reclamo
    });

    test('2. Crear notificación al resolver el reclamo', async () => {
      let insertParams = null;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          insertParams = params;
          return [{ insertId: 102 }];
        }
        return [[]];
      });

      const res = await NotificationService.notificarResolucion({
        idReclamo: 45,
        idUsuarioAutor: 1,
        tituloReclamo: 'Luminaria rota',
        mensajeResolucion: 'Se reemplazó foco LED',
        actorId: 10,
      });

      expect(res).toBe(102);
      expect(insertParams[0]).toBe(1);
      expect(insertParams[1]).toBe(NOTIFICATION_TYPES.CLAIM_RESOLVED);
      expect(insertParams[3]).toContain('Se reemplazó foco LED');
    });

    test('3. Crear notificación ante actualización institucional en bitácora', async () => {
      let insertParams = null;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          insertParams = params;
          return [{ insertId: 103 }];
        }
        return [[]];
      });

      const res = await NotificationService.notificarActualizacion({
        idReclamo: 45,
        idUsuarioAutor: 1,
        tituloReclamo: 'Pérdida de agua',
        texto: 'Cuadrilla técnica programada para mañana a las 8hs.',
        actorId: 10,
      });

      expect(res).toBe(103);
      expect(insertParams[0]).toBe(1);
      expect(insertParams[1]).toBe(NOTIFICATION_TYPES.CLAIM_UPDATE);
      expect(insertParams[3]).toContain('Cuadrilla técnica programada');
    });

    test('4. Crear notificación ante reasignación administrativa', async () => {
      let insertParams = null;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          insertParams = params;
          return [{ insertId: 104 }];
        }
        return [[]];
      });

      const res = await NotificationService.notificarReasignacion({
        idReclamo: 45,
        idUsuarioAutor: 1,
        tituloReclamo: 'Árbol caído',
        nombreInstitucionDestino: 'Espacios Verdes',
        actorId: 99, // Admin
      });

      expect(res).toBe(104);
      expect(insertParams[0]).toBe(1);
      expect(insertParams[1]).toBe(NOTIFICATION_TYPES.CLAIM_REASSIGNED);
      expect(insertParams[3]).toContain('Espacios Verdes');
    });

    test('5. NO crear auto-notificación si la acción la ejecuta el propio ciudadano', async () => {
      const mockInsert = jest.fn();
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          mockInsert();
          return [{ insertId: 999 }];
        }
        return [[]];
      });

      // El ciudadano 1 agrega una nota en su propio reclamo
      const res = await NotificationService.crear({
        idUsuarioDestino: 1,
        actorId: 1, // Mismo actor
        tipo: NOTIFICATION_TYPES.CLAIM_UPDATE,
        titulo: 'Actualización',
        mensaje: 'Nota propia',
        idReclamo: 45,
      });

      expect(res).toBeNull();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    test('5a. Crear notificación CLAIM_ASSIGNED a la institución cuando se le asigna un reclamo', async () => {
      let insertParams = null;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM instituciones')) {
          return [[{ id_usuario: 50, nombre: 'Obras Públicas' }]];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          insertParams = params;
          return [{ insertId: 105 }];
        }
        return [[]];
      });

      const res = await NotificationService.notificarAsignacionInstitucional({
        idReclamo: 45,
        idInstitucion: 12,
        tituloReclamo: 'Bache profundo',
        actorId: 1, // Ciudadano creador
      });

      expect(res).toBe(105);
      expect(insertParams[0]).toBe(50); // id_usuario institucional
      expect(insertParams[1]).toBe(NOTIFICATION_TYPES.CLAIM_ASSIGNED);
      expect(insertParams[2]).toBe('Nuevo reclamo asignado');
      expect(insertParams[3]).toContain('Bache profundo');
      expect(insertParams[4]).toBe(45);
    });

    test('5b. Crear notificación CLAIM_ASSIGNED con motivo ante reasignación administrativa', async () => {
      let insertParams = null;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM instituciones')) {
          return [[{ id_usuario: 60, nombre: 'Luminarias y Redes' }]];
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          insertParams = params;
          return [{ insertId: 106 }];
        }
        return [[]];
      });

      const res = await NotificationService.notificarAsignacionInstitucional({
        idReclamo: 45,
        idInstitucion: 15,
        tituloReclamo: 'Corte de cableado',
        actorId: 99, // Admin
        motivo: 'Competencia operativa exclusiva',
      });

      expect(res).toBe(106);
      expect(insertParams[0]).toBe(60);
      expect(insertParams[1]).toBe(NOTIFICATION_TYPES.CLAIM_ASSIGNED);
      expect(insertParams[3]).toContain('Competencia operativa exclusiva');
    });

    test('5c. Crear notificación CLAIM_REOPENED ante reapertura de reclamo', async () => {
      let insertParams = null;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          insertParams = params;
          return [{ insertId: 107 }];
        }
        return [[]];
      });

      const res = await NotificationService.notificarReapertura({
        idReclamo: 45,
        idUsuarioDestino: 50,
        tituloReclamo: 'Bache mal reparado',
        actorId: 1,
        estadoNuevo: 'En revisión',
      });

      expect(res).toBe(107);
      expect(insertParams[0]).toBe(50);
      expect(insertParams[1]).toBe(NOTIFICATION_TYPES.CLAIM_REOPENED);
      expect(insertParams[2]).toBe('Reclamo reabierto');
      expect(insertParams[3]).toContain('volvió a revisión');
    });

    test('5d. Crear notificación CLAIM_SUPPORT al autor ante apoyo vecinal ("A mí también me pasa")', async () => {
      let insertParams = null;
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO notificaciones')) {
          insertParams = params;
          return [{ insertId: 108 }];
        }
        return [[]];
      });

      const res = await NotificationService.notificarApoyoComunitario({
        idReclamo: 45,
        idUsuarioAutor: 1,
        tituloReclamo: 'Semáforo intermitente',
        actorId: 2, // Vecino que se adhiere
      });

      expect(res).toBe(108);
      expect(insertParams[0]).toBe(1); // Creador del reclamo
      expect(insertParams[1]).toBe(NOTIFICATION_TYPES.CLAIM_SUPPORT);
      expect(insertParams[2]).toBe('Nuevo apoyo a tu reclamo');
      expect(insertParams[3]).toContain('Semáforo intermitente');
      expect(insertParams[4]).toBe(45);
    });
  });

  describe('2. Endpoints y Seguridad (API /api/notificaciones)', () => {
    test('6. Listar solo notificaciones del usuario autenticado', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'user1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM notificaciones n')) {
          expect(params[0]).toBe(1); // Debe filtrar estrictamente por el usuario autenticado
          return [[{
            id_notificacion: 1,
            id_usuario: 1,
            tipo: NOTIFICATION_TYPES.CLAIM_STATUS_CHANGED,
            titulo: 'Cambio de estado',
            mensaje: 'Tu reclamo pasó a En revisión',
            id_reclamo: 45,
            leida: 0,
            fecha_creacion: new Date().toISOString(),
            reclamo_titulo: 'Bache calle San Martín',
          }]];
        }
        if (typeof sql === 'string' && sql.includes('COUNT(*)') && sql.includes('notificaciones')) {
          return [[{ total: 1 }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/notificaciones')
        .set('Authorization', `Bearer ${tokenCiudadanoA}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(1);
      expect(res.body.data[0].leida).toBe(false);
      expect(res.body.noLeidas).toBe(1);
    });

    test('7. Usuario B no puede marcar como leída una notificación de Usuario A (404 controlado)', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 2, email: 'user2@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE notificaciones')) {
          // Si la notificación pertenece a A y B intenta marcarla, WHERE id_notificacion = 1 AND id_usuario = 2 da 0 affected
          expect(params[0]).toBe(1); // id_notificacion
          expect(params[1]).toBe(2); // id_usuario B
          return [{ affectedRows: 0 }];
        }
        return [[]];
      });

      const res = await request(app)
        .patch('/api/notificaciones/1/leida')
        .set('Authorization', `Bearer ${tokenCiudadanoB}`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.mensaje).toMatch(/no encontrada o no pertenece al usuario/i);
    });

    test('8. Marcar una notificación propia como leída exitosamente', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'user1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE notificaciones')) {
          expect(params[0]).toBe(1); // id_notificacion
          expect(params[1]).toBe(1); // id_usuario A
          return [{ affectedRows: 1 }];
        }
        return [[]];
      });

      const res = await request(app)
        .patch('/api/notificaciones/1/leida')
        .set('Authorization', `Bearer ${tokenCiudadanoA}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mensaje).toMatch(/marcada como leída/i);
    });

    test('9. Marcar todas las notificaciones propias como leídas', async () => {
      db.query.mockImplementation(async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM usuarios u')) {
          return [[{ id_usuario: 1, email: 'user1@test.com', activo: 1, tipo_usuario: 'ciudadano', id_ciudad: 1 }]];
        }
        if (typeof sql === 'string' && sql.includes('UPDATE notificaciones')) {
          expect(params[0]).toBe(1); // id_usuario
          return [{ affectedRows: 3 }];
        }
        return [[]];
      });

      const res = await request(app)
        .patch('/api/notificaciones/leidas')
        .set('Authorization', `Bearer ${tokenCiudadanoA}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.actualizadas).toBe(3);
    });

    test('10. Petición no autenticada responde 401', async () => {
      const resGet = await request(app).get('/api/notificaciones');
      expect(resGet.status).toBe(401);

      const resPatch = await request(app).patch('/api/notificaciones/1/leida');
      expect(resPatch.status).toBe(401);
    });
  });
});
