const { errorHandler, notFoundHandler } = require('../../src/middlewares/errorHandler');

describe('errorHandler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { method: 'GET', path: '/test' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    console.error = jest.fn(); // Suppress logs
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe devolver 500 y un mensaje genérico para errores inesperados', () => {
    const err = new Error('Error inesperado de base de datos SQL SYNTAX');
    
    errorHandler(err, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      mensaje: 'Error interno del servidor'
    });
    // NO debe exponer 'Error inesperado de base de datos SQL SYNTAX'
    expect(res.json.mock.calls[0][0].mensaje).not.toContain('SQL SYNTAX');
  });

  it('debe respetar status y mensaje para errores controlados', () => {
    const err = new Error('Reclamo no encontrado');
    err.status = 404;
    
    errorHandler(err, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      mensaje: 'Reclamo no encontrado'
    });
  });

  it('notFoundHandler debe devolver 404 con mensaje estructurado', () => {
    notFoundHandler(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      mensaje: 'Ruta no encontrada'
    });
  });
});
