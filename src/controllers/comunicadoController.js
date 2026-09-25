const CategoryModel = require('../models/categoryModel');
const ComunicadoModel = require('../models/comunicadoModel');
const db = require('../config/db');
const {
  CATEGORY_TYPES,
} = require('../constants/publication');

const resolveInstitutionId = async (req) => {
  if (req.user?.id_institucion) return req.user.id_institucion;
  const [rows] = await db.query('SELECT id_institucion FROM instituciones WHERE id_usuario = ?', [req.user.id]);
  return rows[0]?.id_institucion || null;
};

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
   * Crea un nuevo comunicado en la tabla `comunicados`.
   */
  async crear(req, res) {
    try {
      const { titulo, descripcion, id_categoria, imagen = null } = req.body;
      const idInstitucion = await resolveInstitutionId(req);

      if (!idInstitucion) {
        return res.status(403).json({ ok: false, mensaje: 'Usuario no asociado a una institución válida' });
      }

      if (!titulo || !titulo.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El título es obligatorio' });
      }

      if (!id_categoria) {
        return res.status(400).json({ ok: false, mensaje: 'La categoría es obligatoria' });
      }

      const categoria = await CategoryModel.getById(id_categoria);
      if (!categoria) {
        return res.status(400).json({ ok: false, mensaje: 'Categoría no encontrada' });
      }

      if (![CATEGORY_TYPES.COMUNICADO, CATEGORY_TYPES.AMBOS].includes(categoria.tipo)) {
        return res.status(400).json({ ok: false, mensaje: 'La categoría seleccionada no es válida para comunicados' });
      }

      const id = await ComunicadoModel.crear({
        idInstitucion,
        titulo: titulo.trim(),
        contenido: descripcion ? descripcion.trim() : null,
        idCategoria: id_categoria,
        imagen,
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
      const idInstitucion = await resolveInstitutionId(req);
      if (!idInstitucion) return res.json({ ok: true, data: [] });

      const data = await ComunicadoModel.getByInstitucion(idInstitucion);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error mis comunicados:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener comunicados' });
    }
  },

  async eliminar(req, res) {
    try {
      const idInstitucion = await resolveInstitutionId(req);
      if (!idInstitucion) {
        return res.status(403).json({ ok: false, mensaje: 'No autorizado' });
      }

      const afectados = await ComunicadoModel.eliminar(Number(req.params.id), idInstitucion);
      if (!afectados) {
        return res.status(404).json({ ok: false, mensaje: 'Comunicado no encontrado o no pertenece a tu institución' });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error('Error eliminar comunicado:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al eliminar comunicado' });
    }
  },
};

module.exports = comunicadoController;
