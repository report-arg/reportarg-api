const CategoryModel = require('./categoriaModel');
const InstitutionModel = require('../instituciones/institucionModel');

const categoryController = {

  async listar(req, res, next) {
    try {
      const { busqueda, tipo, estado } = req.query;
      const categorias = await CategoryModel.getAll({ busqueda, tipo, estado });
      res.json({ ok: true, data: categorias });
    } catch (err) {
      next(err);
    }
  },

  async obtener(req, res, next) {
    try {
      const categoria = await CategoryModel.getById(req.params.id);
      if (!categoria) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
      res.json({ ok: true, data: categoria });
    } catch (err) {
      next(err);
    }
  },

  async crear(req, res, next) {
    try {
      const { nombre, descripcion, tipo, estado, orden } = req.body;

      // Validaciones obligatorias
      if (!nombre?.trim()) return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
      if (!tipo) return res.status(400).json({ ok: false, mensaje: 'El tipo es obligatorio' });
      if (!['reclamo', 'comunicado', 'ambos'].includes(tipo)) {
        return res.status(400).json({ ok: false, mensaje: 'Tipo inválido' });
      }

      // Validaciones de unicidad
      const nombreExiste = await CategoryModel.nombreExiste(nombre.trim());
      if (nombreExiste) return res.status(409).json({ ok: false, mensaje: 'Ya existe una categoría con ese nombre' });

      const {id, codigo} = await CategoryModel.create({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        tipo,
        estado: estado || 'activo',
        orden: orden ?? 0,
      });

      res.status(201).json({ ok: true, mensaje: 'Categoría creada correctamente', id, codigo });
    } catch (err) {
      next(err);
    }
  },

  async editar(req, res, next) {
    try {
      const { nombre, descripcion, tipo, estado, orden } = req.body;
      const { id } = req.params;

      // Validaciones obligatorias
      if (!nombre?.trim()) return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
      if (!tipo) return res.status(400).json({ ok: false, mensaje: 'El tipo es obligatorio' });
      if (!['reclamo', 'comunicado', 'ambos'].includes(tipo)) {
        return res.status(400).json({ ok: false, mensaje: 'Tipo inválido' });
      }
      if (estado && !['activo', 'inactivo'].includes(estado)) {
        return res.status(400).json({ ok: false, mensaje: 'Estado inválido' });
      }

      // Validación de unicidad de nombre
      const nombreExiste = await CategoryModel.nombreExiste(nombre.trim(), id);
      if (nombreExiste) return res.status(409).json({ ok: false, mensaje: 'Ya existe una categoría con ese nombre' });

      const filas = await CategoryModel.update(id, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        tipo,
        estado: estado || 'activo',
        orden: orden ?? 0,
      });

      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
      res.json({ ok: true, mensaje: 'Categoría actualizada correctamente' });
    } catch (err) {
      next(err);
    }
  },

  async bajaLogica(req, res, next) {
    try {
      const { id } = req.params;
      const categoria = await CategoryModel.getById(id);
      if (!categoria) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
      if (categoria.estado === 'inactivo') {
        return res.status(409).json({ ok: false, mensaje: 'La categoría ya está inactiva' });
      }

      await CategoryModel.bajaLogica(id);
      res.json({ ok: true, mensaje: 'Categoría desactivada correctamente' });
    } catch (err) {
      next(err);
    }
  },

  async reactivar(req, res, next) {
    try {
      const { id } = req.params;
      const categoria = await CategoryModel.getById(id);
      if (!categoria) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
      if (categoria.estado === 'activo') {
        return res.status(409).json({ ok: false, mensaje: 'La categoría ya está activa' });
      }

      await CategoryModel.reactivar(id);
      res.json({ ok: true, mensaje: 'Categoría activada correctamente' });
    } catch (err) {
      next(err);
    }
  },

  async eliminar(req, res, next) {
    try {
      const categoria = await CategoryModel.getById(req.params.id);
      if (!categoria) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });

      await CategoryModel.delete(req.params.id);
      res.json({ ok: true, mensaje: 'Categoría eliminada correctamente' });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      if (err.message && err.message.includes('No se puede eliminar')) {
        return res.status(409).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  },

  async obtenerAsignacion(req, res, next) {
    try {
      const { id } = req.params;
      const { id_ciudad } = req.query;
      if (!id_ciudad) {
        return res.status(400).json({ ok: false, mensaje: 'El parámetro id_ciudad es obligatorio.' });
      }
      const instCategoria = await InstitutionModel.getPorCategoriaYCiudad(id, id_ciudad);
      if (instCategoria) {
        return res.json({
          ok: true,
          data: {
            tipo: 'especializada',
            institucion: instCategoria,
            detalle: `Atendida por institución especializada (${instCategoria.nombre})`,
          },
        });
      }
      const instPrincipal = await InstitutionModel.getPrincipalDeCiudad(id_ciudad);
      if (instPrincipal) {
        return res.json({
          ok: true,
          data: {
            tipo: 'principal',
            institucion: instPrincipal,
            detalle: `Derivada por respaldo a la institución principal (${instPrincipal.nombre})`,
          },
        });
      }
      return res.json({
        ok: true,
        data: {
          tipo: 'ninguna',
          institucion: null,
          detalle: 'Sin institución responsable configurada en esta localidad',
        },
      });
    } catch (err) {
      next(err);
    }
  },

};

module.exports = categoryController;