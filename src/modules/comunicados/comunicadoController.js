const CategoryModel = require('../categorias/categoryModel');
const ComunicadoModel = require('./comunicadoModel');
const db = require('../../config/db');
const {
  CATEGORY_TYPES,
} = require('../../constants/publication');

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
  async categorias(req, res, next) {
    try {
      const data = await CategoryModel.getParaComunicado();
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/comunicados
   * Crea un nuevo comunicado en la tabla `comunicados`.
   */
  async crear(req, res, next) {
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
      next(err);
    }
  },

  /**
   * GET /api/comunicados/mis-comunicados
   * Devuelve los comunicados publicados por la institución autenticada.
   */
  async misComunicados(req, res, next) {
    try {
      const idInstitucion = await resolveInstitutionId(req);
      if (!idInstitucion) return res.json({ ok: true, data: [] });

      const data = await ComunicadoModel.getByInstitucion(idInstitucion);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async eliminar(req, res, next) {
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
      next(err);
    }
  },

  async editar(req, res, next) {
    try {
      const { id } = req.params;
      const { titulo, descripcion, id_categoria, imagen } = req.body;
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

      const afectados = await ComunicadoModel.actualizar(Number(id), idInstitucion, {
        titulo: titulo.trim(),
        contenido: descripcion ? descripcion.trim() : null,
        idCategoria: id_categoria,
        imagen: imagen !== undefined ? imagen : undefined,
      });

      if (!afectados) {
        return res.status(404).json({ ok: false, mensaje: 'Comunicado no encontrado o no pertenece a tu institución' });
      }

      return res.json({ ok: true, mensaje: 'Comunicado actualizado exitosamente' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = comunicadoController;
