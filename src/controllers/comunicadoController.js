const CategoryModel = require('../models/categoryModel');
const ComunicadoModel = require('../models/comunicadoModel');
const {
  CATEGORY_TYPES,
  CLAIM_STATUSES,
  COMMUNICATION_STATUSES,
} = require('../constants/publication');

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
   * Body: { titulo, descripcion, id_categoria, estado }
   * estado: 'publicado' (default) | 'borrador'
   */
  async crear(req, res) {
    try {
      const { titulo, descripcion, id_categoria, imagen = null, estado = COMMUNICATION_STATUSES.PUBLICADO } = req.body;
      const id_usuario = req.user.id;

      if (!titulo || !titulo.trim())
        return res.status(400).json({ ok: false, mensaje: 'El título es obligatorio' });

      if (!id_categoria)
        return res.status(400).json({ ok: false, mensaje: 'La categoría es obligatoria' });

      // Validar que la categoría sea de tipo 'comunicado' o 'ambos' (HU-08)
      if (!Object.values(COMMUNICATION_STATUSES).includes(estado)) {
        return res.status(400).json({ ok: false, mensaje: 'El estado del comunicado no es valido' });
      }

      const categoria = await CategoryModel.getById(id_categoria);
      if (!categoria)
        return res.status(400).json({ ok: false, mensaje: 'Categoría no encontrada' });

      if (![CATEGORY_TYPES.COMUNICADO, CATEGORY_TYPES.AMBOS].includes(categoria.tipo))
        return res.status(400).json({ ok: false, mensaje: 'La categoría seleccionada no es válida para comunicados' });

      // Mapear estados lógicos a los valores del ENUM de la tabla reclamos
      // 'publicado' → 'recibido'  (visible en el feed)
      // 'borrador'  → 'rechazado' (filtrado del feed público)
      const estadoDb = estado === COMMUNICATION_STATUSES.BORRADOR
        ? CLAIM_STATUSES.RECHAZADO
        : CLAIM_STATUSES.RECIBIDO;

      const id = await ComunicadoModel.crear({
        titulo,
        descripcion,
        idCategoria: id_categoria,
        idUsuario: id_usuario,
        imagen,
        estado: estadoDb,
      });
      res.status(201).json({ ok: true, id });
    } catch (err) {
      console.error('Error crear comunicado:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al crear el comunicado' });
    }
  },

  /**
   * GET /api/comunicados/mis-comunicados
   * Devuelve los comunicados publicados por la institución autenticada.
   */
  async misComunicados(req, res) {
    try {
      const data = await ComunicadoModel.getByInstitucion(req.user.id);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error mis comunicados:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener comunicados' });
    }
  },

  async eliminar(req, res) {
    try {
      const afectados = await ComunicadoModel.eliminar(Number(req.params.id), Number(req.user.id));
      if (!afectados) {
        return res.status(403).json({ ok: false, mensaje: 'No autorizado o comunicado inexistente' });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error('Error eliminar comunicado:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al eliminar comunicado' });
    }
  },
};

module.exports = comunicadoController;
