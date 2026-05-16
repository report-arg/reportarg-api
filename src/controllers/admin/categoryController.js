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
      const { codigo, nombre, descripcion, tipo, estado, orden } = req.body;

      // Validaciones obligatorias
      if (!codigo?.trim()) return res.status(400).json({ ok: false, mensaje: 'El código es obligatorio' });
      if (!nombre?.trim()) return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
      if (!tipo) return res.status(400).json({ ok: false, mensaje: 'El tipo es obligatorio' });
      if (!['reclamo', 'comunicado', 'ambos'].includes(tipo)) {
        return res.status(400).json({ ok: false, mensaje: 'Tipo inválido' });
      }

      // Validaciones de unicidad
      const codigoExiste = await CategoryModel.codigoExiste(codigo.trim().toUpperCase());
      if (codigoExiste) return res.status(409).json({ ok: false, mensaje: 'Ya existe una categoría con ese código' });

      const nombreExiste = await CategoryModel.nombreExiste(nombre.trim());
      if (nombreExiste) return res.status(409).json({ ok: false, mensaje: 'Ya existe una categoría con ese nombre' });

      const id = await CategoryModel.create({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        tipo,
        estado: estado || 'activo',
        orden: orden ?? 0,
      });

      res.status(201).json({ ok: true, mensaje: 'Categoría creada correctamente', id });
    } catch (err) {
      console.error('Error crear categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al crear categoría' });
    }
  },

  async editar(req, res) {
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
      console.error('Error editar categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al editar categoría' });
    }
  },

  async bajaLogica(req, res) {
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
      console.error('Error baja logica categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al desactivar categoría' });
    }
  },

  async eliminar(req, res) {
    try {
      const filas = await CategoryModel.delete(req.params.id);
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
      res.json({ ok: true, mensaje: 'Categoría eliminada correctamente' });
    } catch (err) {
      if (err.message.includes('reclamos asociados')) {
        return res.status(409).json({ ok: false, mensaje: err.message });
      }
      console.error('Error eliminar categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al eliminar categoría' });
    }
  },

};

module.exports = categoryController;