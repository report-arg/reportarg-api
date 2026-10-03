const ComentarioModel = require('./comentarioModel');

const comentarioController = {

  /**
   * GET /api/comentarios/:idReclamo
   * Devuelve todos los comentarios de un reclamo/comunicado.
   * 
   */
  async listar(req, res, next) {
    try {
      const { idReclamo } = req.params;
      const data = await ComentarioModel.getByReclamo(Number(idReclamo));
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/comentarios
   * Crea un nuevo comentario.
   * Body: { id_reclamo, texto }
   */
  async crear(req, res, next) {
    try {
      const { id_reclamo, texto } = req.body;
      const id_usuario = req.user.id;

      if (!id_reclamo)
        return res.status(400).json({ ok: false, mensaje: 'Faltan datos obligatorios' });

      if (!texto || !texto.trim())
        return res.status(400).json({ ok: false, mensaje: 'El texto del comentario es obligatorio' });

      if (texto.trim().length > 500)
        return res.status(400).json({ ok: false, mensaje: 'El comentario no puede superar los 500 caracteres' });

      const id = await ComentarioModel.crear({
        id_reclamo: Number(id_reclamo),
        id_usuario:  Number(id_usuario),
        texto:       texto.trim(),
      });

      res.status(201).json({ ok: true, id });
    } catch (err) {
      next(err);
    }
  },

  async eliminar(req, res, next) {
    try {
      const { id } = req.params;
      const afectados = await ComentarioModel.eliminar(Number(id), Number(req.user.id));
      if (!afectados)
        return res.status(403).json({ ok: false, mensaje: 'No autorizado o comentario inexistente' });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = comentarioController;
