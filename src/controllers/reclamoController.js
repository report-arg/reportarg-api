const CategoryModel = require('../models/categoryModel');
const ClaimModel    = require('../models/claimModel');

const reclamoController = {

  async categoriasParaReclamo(req, res) {
    try {
      const data = await CategoryModel.getParaReclamo();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error categorias para reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener categorías' });
    }
  },

  async crear(req, res) {
    try {
      const { titulo, descripcion, id_categoria, id_usuario, direccion } = req.body;

      if (!titulo || !titulo.trim())
        return res.status(400).json({ ok: false, mensaje: 'El título es obligatorio' });
      if (!id_categoria)
        return res.status(400).json({ ok: false, mensaje: 'La categoría es obligatoria' });
      if (!id_usuario)
        return res.status(400).json({ ok: false, mensaje: 'El usuario es obligatorio' });

      const id = await ClaimModel.crear({ titulo, descripcion, id_categoria, id_usuario, direccion });
      res.status(201).json({ ok: true, id });
    } catch (err) {
      console.error('Error crear reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al crear el reclamo' });
    }
  },

  async misReclamos(req, res) {
    try {
      const { usuario } = req.query;
      if (!usuario)
        return res.status(400).json({ ok: false, mensaje: 'Falta el parámetro usuario' });
      const data = await ClaimModel.getByUsuario(usuario);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error mis reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamos' });
    }
  },
};

module.exports = reclamoController;
