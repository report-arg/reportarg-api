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

describe('LIS-01: Consultar listado operativo de reclamos (Bandeja Institucional)', () => {
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

  test('institución autenticada obtiene únicamente reclamos asignados a req.user.id_institucion e ignora id_institucion en query', async () => {
    const idInstitucionAutenticada = 10;
    const idInstitucionAjena = 99;
    const haceSeisDias = new Date(Date.now() - 6 * DIA_MS).toISOString();

    let capturedParams = [];

    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM reclamos r') && sql.includes('WHERE r.id_institucion = ?')) {
        capturedParams = params;
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
    expect(capturedParams[0]).toBe(idInstitucionAutenticada);
    expect(capturedParams).not.toContain(idInstitucionAjena);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: [
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
      })
    );
  });

  test('ClaimModel.getBandejaInstitucion retorna vacío si no hay idInstitucion', async () => {
    const res = await ClaimModel.getBandejaInstitucion(null);
    expect(res).toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
  });
});
