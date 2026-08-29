const CategoryModel = require('../models/categoryModel');
const ClaimModel    = require('../models/claimModel');
const { CATEGORY_TYPES } = require('../constants/publication');

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
      const { titulo, descripcion, id_categoria, direccion, latitud, longitud } = req.body;
      const id_usuario = req.user.id;

      if (!titulo || !titulo.trim())
        return res.status(400).json({ ok: false, mensaje: 'El título es obligatorio' });
      if (!id_categoria)
        return res.status(400).json({ ok: false, mensaje: 'La categoría es obligatoria' });
      const categoria = await CategoryModel.getById(id_categoria);
      if (!categoria || ![CATEGORY_TYPES.RECLAMO, CATEGORY_TYPES.AMBOS].includes(categoria.tipo)) {
        return res.status(400).json({ ok: false, mensaje: 'La categoria seleccionada no es valida para reclamos' });
      }

      const id = await ClaimModel.crear({ titulo, descripcion, id_categoria, id_usuario, direccion, latitud, longitud });
      res.status(201).json({ ok: true, id });
    } catch (err) {
      console.error('Error crear reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al crear el reclamo' });
    }
  },

  async misReclamos(req, res) {
    try {
      const data = await ClaimModel.getByUsuario(req.user.id);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error mis reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamos' });
    }
  },

  async reclamosParaMapa(req, res) {
    try {
      const data = await ClaimModel.getParaMapa();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error reclamos para mapa:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener datos del mapa' });
    }
  },
};

module.exports = reclamoController;
