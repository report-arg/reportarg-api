const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { ROLES, CATEGORY_TYPES } = require('../../src/constants/publication'); // Assuming constants or we mock the values

jest.mock('../../src/config/db', () => ({
  query: jest.fn()
}));

const mockUser = {
  id: 1,
  id_institucion: 100,
  role: 'institucion',
  id_ciudad: 1
};

jest.mock('../../src/middlewares/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = req.headers.authorization ? mockUser : null;
    if (!req.user) return res.status(401).json({ ok: false, mensaje: 'Token faltante' });
    next();
  },
  optionalToken: (req, res, next) => {
    req.user = req.headers.authorization ? mockUser : null;
    next();
  },
  requireRole: (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ ok: false, mensaje: 'No autorizado' });
    next();
  },
  requireAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ ok: false, mensaje: 'No autorizado' });
    next();
  },
  requireInstitucion: (req, res, next) => {
    if (!req.user || req.user.role !== 'institucion') return res.status(403).json({ ok: false, mensaje: 'No autorizado' });
    next();
  },
  requireCiudadano: (req, res, next) => {
    if (!req.user || req.user.role !== 'ciudadano') return res.status(403).json({ ok: false, mensaje: 'No autorizado' });
    next();
  }
}));

describe('Comunicados - Seguridad y Reglas', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mockUser.id_institucion = 100;
    mockUser.role = 'institucion';
  });

  describe('POST /api/comunicados', () => {
    test('Institución no puede crear comunicado con categoría de solo reclamo', async () => {
      // Mock category that is only for reclamos
      db.query.mockResolvedValueOnce([[{ id: 10, nombre: 'Baches', tipo: 'reclamo' }]]);

      const res = await request(app)
        .post('/api/comunicados')
        .set('Authorization', 'Bearer token')
        .send({
          titulo: 'Nuevo comunicado',
          descripcion: 'Cuerpo del comunicado',
          id_categoria: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toMatch(/no es válida para comunicados/i);
    });

    test('Falla si la institución intenta crear un comunicado sin id_institucion válido (403)', async () => {
      // Un usuario sin id_institucion
      const mockUserSinInstitucion = { id: 2, role: 'ciudadano' };
      // Intercept the query inside resolveInstitutionId
      db.query.mockResolvedValueOnce([[]]); // No institution mapped to this user

      // Replace the mock temporarily if possible, or just mock the DB result for resolveInstitutionId
      // Actually we mock the DB for `SELECT id_institucion FROM instituciones WHERE id_usuario = ?`
      // But the auth mock gives id_institucion: 100.
      // Let's modify the mockUser for this test
      mockUser.id_institucion = null;
      mockUser.role = 'ciudadano';

      const res = await request(app)
        .post('/api/comunicados')
        .set('Authorization', 'Bearer token')
        .send({ titulo: 'Falla', id_categoria: 1 });

      expect(res.status).toBe(403);
      expect(res.body.mensaje).toMatch(/No autorizado|Usuario no asociado a una institución válida/i);

      // Restore mock
      mockUser.id_institucion = 100;
      mockUser.role = 'institucion';
    });

    test('Creación exitosa con categoría válida (tipo ambos o comunicado)', async () => {
      // Mock Category
      db.query.mockResolvedValueOnce([[{ id: 2, nombre: 'Aviso', tipo: 'ambos' }]]);
      // Mock Insert
      db.query.mockResolvedValueOnce([{ insertId: 50 }]);

      const res = await request(app)
        .post('/api/comunicados')
        .set('Authorization', 'Bearer token')
        .send({
          titulo: 'Aviso importante',
          descripcion: 'Mañana no hay recolección',
          id_categoria: 2
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.id).toBe(50);
      
      const insertCall = db.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO comunicados'));
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toContain(100); // id_institucion
      expect(insertCall[1]).toContain('Aviso importante'); // titulo
    });
  });
});
