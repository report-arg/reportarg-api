const CategoryModel = require('../models/categoryModel');
const ClaimModel    = require('../models/claimModel');

const comunicadoController = {

  /**
   * GET /api/comunicados/categorias
   * Devuelve categorías válidas para comunicados (tipo 'comunicado' o 'ambos').
   */
  async categorias(req, res) {
    try {
      const data = await CategoryModel.getParaComunicado();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error categorías comunicado:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener categorías' });
    }
  },

  /**
   * POST /api/comunicados
   * Crea un nuevo comunicado.
   * Body: { titulo, descripcion, id_categoria, id_usuario, estado }
   * estado: 'publicado' (default) | 'borrador'
   */
  async crear(req, res) {
    try {
      const { titulo, descripcion, id_categoria, id_usuario, imagen = null, estado = 'publicado' } = req.body;

      if (!titulo || !titulo.trim())
        return res.status(400).json({ ok: false, mensaje: 'El título es obligatorio' });

      if (!id_categoria)
        return res.status(400).json({ ok: false, mensaje: 'La categoría es obligatoria' });

      if (!id_usuario)
        return res.status(400).json({ ok: false, mensaje: 'El usuario es obligatorio' });

      // Validar que la categoría sea de tipo 'comunicado' o 'ambos' (HU-08)
      const categoria = await CategoryModel.getById(id_categoria);
      if (!categoria)
        return res.status(400).json({ ok: false, mensaje: 'Categoría no encontrada' });

      if (!['comunicado', 'ambos'].includes(categoria.tipo))
        return res.status(400).json({ ok: false, mensaje: 'La categoría seleccionada no es válida para comunicados' });

      // Mapear estados lógicos a los valores del ENUM de la tabla reclamos
      // 'publicado' → 'recibido'  (visible en el feed)
      // 'borrador'  → 'rechazado' (filtrado del feed público)
      const estadoDb = estado === 'borrador' ? 'rechazado' : 'recibido';

      const id = await ClaimModel.crearComunicado({ titulo, descripcion, id_categoria, id_usuario, imagen, estado: estadoDb });
      res.status(201).json({ ok: true, id });
    } catch (err) {
      console.error('Error crear comunicado:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al crear el comunicado' });
    }
  },

  /**
   * GET /api/comunicados/mis-comunicados?usuario=<id>
   * Devuelve los comunicados publicados por la institución autenticada.
   */
  async misComunicados(req, res) {
    try {
      const { usuario } = req.query;
      if (!usuario)
        return res.status(400).json({ ok: false, mensaje: 'Falta el parámetro usuario' });

      const data = await ClaimModel.getComunicadosByInstitucion(usuario);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error mis comunicados:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener comunicados' });
    }
  },
};

module.exports = comunicadoController;
