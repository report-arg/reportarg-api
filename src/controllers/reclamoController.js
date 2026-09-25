const CategoryModel = require('../models/categoryModel');
const ClaimModel    = require('../models/claimModel');
const HistorialModel = require('../models/historialModel');
const { resolverInstitucionAsignada } = require('../services/assignmentService');
const { CATEGORY_TYPES, HISTORIAL_EVENTS } = require('../constants/publication');

const reclamoController = {

  /**
   * Obtiene las categorías habilitadas para crear reclamos
   */
  async categoriasParaReclamo(req, res) {
    try {
      const data = await CategoryModel.getParaReclamo();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error categorias para reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener categorías' });
    }
  },

  /**
   * Crea un nuevo reclamo (Público o Privado) — HU-01, HU-02, HU-03
   */
  async crear(req, res) {
    try {
      const { titulo, descripcion, id_categoria, direccion, latitud, longitud, visibilidad } = req.body;
      const id_usuario = req.user.id;
      const id_ciudad = req.user.id_ciudad || 1;

      // 1. Validaciones de campos obligatorios
      if (!titulo || !titulo.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El título es obligatorio' });
      }
      if (!descripcion || !descripcion.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'La descripción es obligatoria' });
      }
      if (!id_categoria) {
        return res.status(400).json({ ok: false, mensaje: 'La categoría es obligatoria' });
      }
      if (!direccion || !direccion.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'La dirección es obligatoria' });
      }

      // 2. Validación de categoría válida
      const categoria = await CategoryModel.getById(id_categoria);
      if (!categoria || ![CATEGORY_TYPES.RECLAMO, CATEGORY_TYPES.AMBOS].includes(categoria.tipo)) {
        return res.status(400).json({ ok: false, mensaje: 'La categoría seleccionada no es válida para reclamos' });
      }

      // 3. Validación de límite de reclamos pendientes simultáneos (HU-01 Criterio de Aceptación 8)
      const pendientesCount = await ClaimModel.countPendientesByUsuario(id_usuario);
      if (pendientesCount >= 3) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Has alcanzado el límite máximo de 3 reclamos simultáneos en estado Pendiente. Esperá a que las instituciones avancen en la gestión de tus reclamos anteriores para crear uno nuevo.'
        });
      }

      // 4. Auto-asignación de institución según Ciudad + Categoría con respaldo en Institución Principal (HU-04, HU-05)
      const id_institucion = await resolverInstitucionAsignada(id_ciudad, id_categoria);

      // 5. Creación del reclamo en BD
      const id = await ClaimModel.crear({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        id_categoria,
        id_usuario,
        id_ciudad,
        id_institucion,
        direccion: direccion.trim(),
        latitud,
        longitud,
        visibilidad: visibilidad === 'privado' ? 'privado' : 'publico',
      });

      // 6. Registro inmutable en auditoría/historial (HU-18)
      await HistorialModel.registrar({
        id_reclamo: id,
        id_usuario,
        tipo_evento: HISTORIAL_EVENTS.CREACION,
        detalle: `Reclamo registrado como ${visibilidad === 'privado' ? 'privado' : 'público'}. Asignado a institución ID ${id_institucion || 'Sin asignar'}.`,
        estado_nuevo: 'Pendiente',
      });

      res.status(201).json({
        ok: true,
        mensaje: 'Reclamo registrado exitosamente.',
        id,
      });
    } catch (err) {
      console.error('Error al crear reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error interno al procesar la creación del reclamo' });
    }
  },

  /**
   * Obtiene los reclamos creados por el ciudadano logueado (HU-06)
   */
  async misReclamos(req, res) {
    try {
      const data = await ClaimModel.getByUsuario(req.user.id);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error mis reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamos personales' });
    }
  },

  /**
   * Obtiene los reclamos públicos de la ciudad activa (HU-07)
   */
  async reclamosPublicos(req, res) {
    try {
      const id_ciudad = req.user?.id_ciudad || 1;
      const data = await ClaimModel.getPublicosPorCiudad(id_ciudad);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error reclamos públicos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamos públicos de la ciudad' });
    }
  },

  /**
   * Obtiene el detalle completo de un reclamo con historial y restricción de privacidad (HU-08)
   */
  async obtenerDetalle(req, res) {
    try {
      const { id } = req.params;
      const reclamo = await ClaimModel.getById(id);

      if (!reclamo) {
        return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      }

      // Restricción de seguridad para reclamos privados (HU-02 Criterios 5, 6 y 7)
      if (reclamo.visibilidad === 'privado') {
        const esAutor = req.user.id === reclamo.id_usuario;
        const esAdmin = req.user.rol === 'admin';
        const esInstitucionAsignada = req.user.rol === 'institucion' && req.user.id_institucion === reclamo.id_institucion;

        if (!esAutor && !esAdmin && !esInstitucionAsignada) {
          return res.status(403).json({
            ok: false,
            mensaje: 'Acceso denegado: Este reclamo es privado y solo puede ser consultado por su autor o la institución responsable.'
          });
        }
      }

      // Cargar historial inmutable del reclamo (HU-18)
      const historial = await HistorialModel.getByReclamo(id);

      res.json({
        ok: true,
        data: {
          ...reclamo,
          historial,
        }
      });
    } catch (err) {
      console.error('Error al obtener detalle del reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al cargar el detalle del reclamo' });
    }
  },

  /**
   * Obtiene datos de geolocalización para el mapa comunitario público
   */
  async reclamosParaMapa(req, res) {
    try {
      const id_ciudad = req.user?.id_ciudad || 1;
      const data = await ClaimModel.getParaMapa(id_ciudad);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error reclamos para mapa:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener puntos del mapa' });
    }
  },
};

module.exports = reclamoController;
