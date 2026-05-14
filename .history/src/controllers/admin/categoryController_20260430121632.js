const CategoryModel = require('../../models/categoryModel');

const categoryController = {

  async listar(req, res) {
    try {
      const categorias = await CategoryModel.getAll();
      res.json({ ok: true, data: categorias });
    } catch (err) {
      console.error('Error listar categorias:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener categorías' });
    }
  },

  async obtener(req, res) {
    try {
      const categoria = await CategoryModel.getById(req.params.id);
      if (!categoria) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
      res.json({ ok: true, data: categoria });
    } catch (err) {
      console.error('Error obtener categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener categoría' });
    }
  },

  async crear(req, res) {
    try {
      const { nombre, descripcion } = req.body;

      if (!nombre?.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
      }

      const existe = await CategoryModel.nombreExiste(nombre.trim());
      if (existe) {
        return res.status(409).json({ ok: false, mensaje: 'Ya existe una categoría con ese nombre' });
      }

      const id = await CategoryModel.create({ nombre: nombre.trim(), descripcion });
      res.status(201).json({ ok: true, mensaje: 'Categoría creada correctamente', id });
    } catch (err) {
      console.error('Error crear categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al crear categoría' });
    }
  },

  async editar(req, res) {
    try {
      const { nombre, descripcion } = req.body;
      const { id } = req.params;

      if (!nombre?.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
      }

      const existe = await CategoryModel.nombreExiste(nombre.trim(), id);
      if (existe) {
        return res.status(409).json({ ok: false, mensaje: 'Ya existe una categoría con ese nombre' });
      }

      const filas = await CategoryModel.update(id, { nombre: nombre.trim(), descripcion });
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });

      res.json({ ok: true, mensaje: 'Categoría actualizada correctamente' });
    } catch (err) {
      console.error('Error editar categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al editar categoría' });
    }
  },

  async eliminar(req, res) {
    try {
      const filas = await CategoryModel.delete(req.params.id);
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
      res.json({ ok: true, mensaje: 'Categoría eliminada correctamente' });
    } catch (err) {
      // Error específico de reclamos asociados
      if (err.message.includes('reclamos asociados')) {
        return res.status(409).json({ ok: false, mensaje: err.message });
      }
      console.error('Error eliminar categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al eliminar categoría' });
    }
  },
};

module.exports = categoryController;