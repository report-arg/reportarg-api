const CategoryModel = require('../../categorias/categoryModel');
const ClaimModel    = require('../models/reclamoModel');
const HistorialModel = require('../models/historialModel');
const ActualizacionModel = require('../models/actualizacionModel');
const NotificationService = require('../../notificaciones/notificationService');
const { NOTIFICATION_TYPES } = require('../../notificaciones/notifications.constants');
const { resolverInstitucionAsignada } = require('../services/assignmentService');
const { CATEGORY_TYPES, HISTORIAL_EVENTS, CLAIM_STATUSES } = require('../../../constants/publication');

const { ROLES } = require('../../../constants/roles');
const { BUSINESS_RULES } = require('../../../constants/businessRules');
const { filtrosReclamo } = require('../services/claimFilterService');
const cityService = require('../../../services/cityService');
const InstitutionModel = require('../../instituciones/institutionModel');
const claimWorkflowService = require('../services/claimWorkflowService');

const reclamoController = {

  /**
   * Obtiene las categorías habilitadas para crear reclamos
   * Resolviendo la institución asignada automáticamente según la ciudad (HU-04, HU-05)
   */
  async categoriasParaReclamo(req, res, next) {
    try {
      const data = await CategoryModel.getParaReclamo();
      const id_ciudad = req.user?.id_ciudad || req.query.id_ciudad || 1;

      const principal = await InstitutionModel.getPrincipalDeCiudad(id_ciudad);
      const nombrePrincipal = principal?.nombre || null;

      const categoriasConInstitucion = await Promise.all(
        data.map(async (cat) => {
          const direct = await InstitutionModel.getPorCategoriaYCiudad(cat.id, id_ciudad);
          return {
            ...cat,
            institucion_responsable: direct?.nombre || nombrePrincipal
          };
        })
      );

      res.json({ ok: true, data: categoriasConInstitucion });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Crea un nuevo reclamo (Público o Privado) — HU-01, HU-02, HU-03
   */
  async crear(req, res, next) {
    try {
      const id_usuario = req.user.id;
      let id_ciudad = req.user.id_ciudad;
      if (req.user.role === ROLES.ADMIN) {
        id_ciudad = req.body.id_ciudad;
      }

      const id = await claimWorkflowService.crearReclamo({
        ...req.body,
        id_usuario,
        id_ciudad,
        role: req.user.role
      });

      res.status(201).json({
        ok: true,
        mensaje: 'Reclamo registrado exitosamente.',
        id,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  },

  /**
   * Obtiene los reclamos creados por el ciudadano logueado (HU-06)
   */
  async misReclamos(req, res, next) {
    try {
      const data = await ClaimModel.getByUsuario(req.user.id, filtrosReclamo(req.query));
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Obtiene los reclamos públicos de la ciudad activa (HU-07)
   */
  async reclamosPublicos(req, res, next) {
    try {
      const filtros = filtrosReclamo(req.query);
      const id_ciudad = req.user?.id_ciudad;
      const id_usuario = req.user?.id;
      if (!id_ciudad) {
        return res.json({ ok: true, data: [] });
      }
      const data = await ClaimModel.getPublicosPorCiudad(id_ciudad, id_usuario, filtros);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Obtiene el detalle completo de un reclamo con historial y restricción de privacidad (HU-08)
   */
  async obtenerDetalle(req, res, next) {
    try {
      const { id } = req.params;
      const reclamo = await ClaimModel.getById(id);

      if (!reclamo) {
        return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      }

      // Restricción de seguridad para reclamos privados (HU-02 Criterios 5, 6 y 7)
      if (reclamo.visibilidad === 'privado') {
        const esAutor = Number(req.user.id) === Number(reclamo.id_usuario);
        const esAdmin = req.user.role === ROLES.ADMIN;
        const esInstitucionAsignada = req.user.role === ROLES.INSTITUCION && Number(req.user.id_institucion) === Number(reclamo.id_institucion);

        if (!esAutor && !esAdmin && !esInstitucionAsignada) {
          return res.status(403).json({
            ok: false,
            mensaje: 'Acceso denegado: Este reclamo es privado y solo puede ser consultado por su autor o la institución responsable.'
          });
        }
      }

      // Cargar historial inmutable del reclamo (HU-18)
      const historial = await HistorialModel.getByReclamo(id);
      const actualizaciones = await ActualizacionModel.getByReclamo(id);
      
      let isAfectado = false;
      if (req.user?.id) {
        isAfectado = await ClaimModel.isAfectado(id, req.user.id);
      }

      res.json({
        ok: true,
        data: {
          ...reclamo,
          historial,
          actualizaciones,
          isAfectado
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Obtiene las actualizaciones públicas de un reclamo para su consulta en el feed
   */
  async obtenerActualizaciones(req, res, next) {
    try {
      const { id } = req.params;
      const data = await ActualizacionModel.getByReclamo(id);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },


  /**
   * Permite al autor editar su propio reclamo en estado Pendiente
   */
  async editar(req, res, next) {
    try {
      const { id } = req.params;
      await claimWorkflowService.editarReclamo(id, req.user.id, req.body);
      res.json({ ok: true, mensaje: 'Reclamo editado correctamente.' });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  },

  /**
   * Permite al autor cancelar su propio reclamo en estado Pendiente
   */
  async cancelar(req, res, next) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      await claimWorkflowService.cancelarReclamo(id, req.user.id, motivo);
      res.json({ ok: true, mensaje: 'Reclamo cancelado exitosamente.' });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  },

  /**
   * Obtiene datos de geolocalización para el mapa comunitario público
   */
  async reclamosParaMapa(req, res, next) {
    try {
      const id_ciudad = req.user?.id_ciudad;
      if (!id_ciudad) {
        return res.json({ ok: true, data: [] });
      }
      const data = await ClaimModel.getParaMapa(id_ciudad);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
  /**
   * Permite al autor reabrir su propio reclamo en estado Resuelto o Cancelado
   */
  async reabrir(req, res, next) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const estadoDestino = await claimWorkflowService.reabrirReclamo(id, req.user.id, motivo);
      res.json({ ok: true, mensaje: 'Reclamo reabierto exitosamente.', estado: estadoDestino });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  },


  /**
   * Permite agregar una actualización al reclamo (HU-17)
   * - En estado 'Pendiente': solo el ciudadano creador puede publicar actualizaciones.
   * - A partir de 'En revisión': solo la institución responsable asignada puede publicar actualizaciones.
   * - En estados terminales ('Resuelto', 'Cancelado'): bloqueado.
   */
  async agregarActualizacion(req, res, next) {
    try {
      const { id } = req.params;
      const { texto } = req.body;
      const idUsuario = req.user.id;
      const rolUsuario = req.user.role;
      const idInstitucionUsuario = req.user.id_institucion;

      await claimWorkflowService.agregarActualizacion(id, idUsuario, rolUsuario, idInstitucionUsuario, texto);
      res.json({ ok: true, mensaje: 'Actualización agregada correctamente' });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  },

  /**
   * Permite a un ciudadano marcar/desmarcar "A mí también me pasa" (HU-16)
   */
  async toggleAfectado(req, res, next) {
    try {
      const { id } = req.params;
      const afectado = await claimWorkflowService.toggleAfectado(id, req.user.id, req.user.role, req.user.id_ciudad);
      const mensaje = afectado ? 'Has sido marcado como afectado por este reclamo' : 'Has dejado de estar afectado por este reclamo';
      res.json({ ok: true, mensaje, afectado });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  }
};
module.exports = reclamoController;

