const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path}`, err);

  // Si el error tiene un status asignado (ej. 400, 404), respetamos su mensaje
  if (err.status && err.status < 500) {
    return res.status(err.status).json({
      ok: false,
      mensaje: err.message
    });
  }

  // Errores inesperados o 500 no deben filtrar detalles internos al cliente (ej. SQL stack traces)
  res.status(500).json({
    ok: false,
    mensaje: 'Error interno del servidor'
  });
};

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    ok: false,
    mensaje: 'Ruta no encontrada'
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
