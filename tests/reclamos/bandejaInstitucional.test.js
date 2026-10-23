const institucionReclamoController = require('../../src/modules/reclamos/controllers/institucionReclamoController');
const ClaimModel = require('../../src/modules/reclamos/models/reclamoModel');
const db = require('../../src/config/db');
const { requireInstitucion } = require('../../src/middlewares/authMiddleware');
const { ROLES } = require('../../src/constants/roles');
const { CLAIM_STATUSES } = require('../../src/constants/publication');

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

const DIA_MS = 86400000;

describe('LIS-01 y LIS-02: Consultar, buscar, filtrar, ordenar y paginar reclamos institucionales', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sin usuario autenticado requireInstitucion retorna 401', () => {
    const req = { user: null };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    requireInstitucion(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rol ciudadano no puede consultar la bandeja institucional → 403', () => {
    const req = {
      user: { id: 1, role: ROLES.CIUDADANO, institucion_verificada: false },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    requireInstitucion(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('institución autenticada obtiene formato paginado { total, rows } asignado a req.user.id_institucion e ignora id_institucion en query', async () => {
    const idInstitucionAutenticada = 10;
    const idInstitucionAjena = 99;
    const haceSeisDias = new Date(Date.now() - 6 * DIA_MS).toISOString();

    let capturedDataParams = [];

    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) AS total FROM reclamos r')) {
        return [[{ total: 1 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_institucion = ?')) {
        capturedDataParams = params;
        return [[{
          id: 501,
          titulo: 'Pérdida de agua en esquina',
          estado: CLAIM_STATUSES.PENDIENTE,
          visibilidad: 'publico',
          fecha_creacion: haceSeisDias,
          fecha_ultimo_cambio_estado: haceSeisDias,
          direccion: 'Av. San Martín 120',
          categoriaId: 2,
          categoriaCodigo: 'AGUA',
          categoriaNombre: 'Problemas de agua',
          afectadosCount: 4,
        }]];
      }
      return [[]];
    });

    const req = {
      user: {
        id: 44,
        role: ROLES.INSTITUCION,
        id_ciudad: 1,
        id_institucion: idInstitucionAutenticada,
        institucion_verificada: true,
      },
      query: {
        id_institucion: String(idInstitucionAjena),
      },
    };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await institucionReclamoController.bandeja(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(capturedDataParams[0]).toBe(idInstitucionAutenticada);
    expect(capturedDataParams).not.toContain(idInstitucionAjena);

    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: {
        total: 1,
        rows: [
          expect.objectContaining({
            id: 501,
            titulo: 'Pérdida de agua en esquina',
            estado: CLAIM_STATUSES.PENDIENTE,
            visibilidad: 'publico',
            categoriaId: 2,
            categoriaCodigo: 'AGUA',
            categoriaNombre: 'Problemas de agua',
            afectadosCount: 4,
            demorado: true,
          }),
        ],
      },
    });
  });

  test('LIS-02: aplica conjuntamente búsqueda (ID, título o dirección), estado, categoría, visibilidad, período, demorados, ordenamiento y paginación en SQL', async () => {
    let capturedCountSql = '';
    let capturedDataSql = '';
    let capturedDataParams = [];

    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) AS total')) {
        capturedCountSql = sql;
        return [[{ total: 45 }]];
      }
      if (typeof sql === 'string' && sql.includes('FROM reclamos r')) {
        capturedDataSql = sql;
        capturedDataParams = params;
        return [[]];
      }
      return [[]];
    });

    const req = {
      user: {
        id: 44,
        role: ROLES.INSTITUCION,
        id_ciudad: 1,
        id_institucion: 10,
        institucion_verificada: true,
      },
      query: {
        busqueda: '#42',
        estado: 'Pendiente',
        categoria: '3',
        visibilidad: 'privado',
        fechaDesde: '2026-10-01',
        fechaHasta: '2026-10-20',
        demorado: 'true',
        orderBy: 'impacto',
        pagina: '2',
        limite: '20',
      },
    };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await institucionReclamoController.bandeja(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(capturedCountSql).toContain('r.id_institucion = ?');
    expect(capturedCountSql).toContain('r.estado = ?');
    expect(capturedCountSql).toContain('r.id_categoria = ?');
    expect(capturedCountSql).toContain('r.visibilidad = ?');
    expect(capturedCountSql).toContain('r.id_reclamo = ? OR r.titulo LIKE ? OR r.direccion LIKE ?');
    expect(capturedCountSql).toContain('r.fecha_creacion >= ?');
    expect(capturedCountSql).toContain('r.fecha_creacion < DATE_ADD(?, INTERVAL 1 DAY)');
    expect(capturedCountSql).toContain('COALESCE(r.fecha_ultimo_cambio_estado, r.fecha_creacion) <= ?');

    expect(capturedDataSql).toContain('ORDER BY afectadosCount DESC, r.fecha_creacion DESC, r.id_reclamo DESC');
    expect(capturedDataSql).toContain('LIMIT ? OFFSET ?');

    // Verifica que el ID numérico 42 fue extraído de '#42', limite=20 y offset=20 (página 2)
    expect(capturedDataParams).toContain(42);
    expect(capturedDataParams.slice(-2)).toEqual([20, 20]);

    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: {
        total: 45,
        rows: [],
      },
    });
  });

  test('LIS-02: mantiene compatibilidad con ordenamiento legacy "atencion" devolviendo { total, rows }', async () => {
    const haceSeisDias = new Date(Date.now() - 6 * DIA_MS).toISOString();
    const haceUnDia = new Date(Date.now() - 1 * DIA_MS).toISOString();

    db.query.mockResolvedValueOnce([[
      { id: 1, titulo: 'Reciente', estado: 'Pendiente', fecha_creacion: haceUnDia, fecha_ultimo_cambio_estado: haceUnDia, afectadosCount: 1 },
      { id: 2, titulo: 'Demorado urgente', estado: 'Pendiente', fecha_creacion: haceSeisDias, fecha_ultimo_cambio_estado: haceSeisDias, afectadosCount: 5 },
    ]]);

    const result = await ClaimModel.getBandejaInstitucion(10, null, null, 'atencion', 1, { pagina: 1, limite: 20 });
    expect(result.total).toBe(2);
    expect(result.rows[0].id).toBe(2); // Demorado primero
    expect(result.rows[1].id).toBe(1);
  });

  test('ClaimModel.getBandejaInstitucion retorna { total: 0, rows: [] } si no hay idInstitucion', async () => {
    const res = await ClaimModel.getBandejaInstitucion(null);
    expect(res).toEqual({ total: 0, rows: [] });
    expect(db.query).not.toHaveBeenCalled();
  });
});
