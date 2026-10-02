const CategoryModel = require('../../categorias/categoryModel');
const ClaimModel    = require('../models/reclamoModel');
const HistorialModel = require('../models/historialModel');
const ActualizacionModel = require('../models/actualizacionModel');
const NotificationService = require('../../notificaciones/notificationService');
const { resolverInstitucionAsignada } = require('../services/assignmentService');
const { CATEGORY_TYPES, HISTORIAL_EVENTS, CLAIM_STATUSES } = require('../../../constants/publication');

const { ROLES } = require('../../../constants/roles');
const { filtrosReclamo } = require('../services/claimFilterService');

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
      const imagen = req.body.imagen || req.body.imagen_url || null;
      const id_usuario = req.user.id;
      let id_ciudad = req.user.id_ciudad;

      if (req.user.role === ROLES.ADMIN) {
        id_ciudad = req.body.id_ciudad;
      }

      // Validación explícita de usuario sin ciudad activa o seleccionada
      if (!id_ciudad) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Se requiere especificar la ciudad para registrar el reclamo.'
        });
      }

      if (!Number.isSafeInteger(Number(id_ciudad)) || Number(id_ciudad) <= 0) {
        return res.status(400).json({ ok: false, mensaje: 'La ciudad seleccionada es inválida' });
      }
      const cityService = require('../services/cityService');
      if (!await cityService.getActiveById(Number(id_ciudad))) {
        return res.status(400).json({ ok: false, mensaje: 'La ciudad seleccionada no existe o no está activa' });
      }
      if (visibilidad !== undefined && !['publico', 'privado'].includes(visibilidad)) {
        return res.status(400).json({ ok: false, mensaje: 'Visibilidad inválida' });
      }
      if (!Number.isSafeInteger(Number(id_categoria)) || Number(id_categoria) <= 0) {
        return res.status(400).json({ ok: false, mensaje: 'La categoría es inválida' });
      }
      for (const [valor, min, max] of [[latitud, -90, 90], [longitud, -180, 180]]) {
        if (valor !== undefined && valor !== null && (typeof valor !== 'number' || !Number.isFinite(valor) || valor < min || valor > max)) {
          return res.status(400).json({ ok: false, mensaje: 'Coordenadas inválidas' });
        }
      }
      // 1. Validaciones de campos obligatorios
      if (typeof titulo !== 'string' || !titulo.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El título es obligatorio' });
      }
      if (typeof descripcion !== 'string' || !descripcion.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'La descripción es obligatoria' });
      }
      if (!id_categoria) {
        return res.status(400).json({ ok: false, mensaje: 'La categoría es obligatoria' });
      }
      if (typeof direccion !== 'string' || !direccion.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'La dirección es obligatoria' });
      }

      // 2. Validación de categoría válida
      const categoria = await CategoryModel.getById(id_categoria);
      if (!categoria || categoria.estado !== 'activo' || ![CATEGORY_TYPES.RECLAMO, CATEGORY_TYPES.AMBOS].includes(categoria.tipo)) {
        return res.status(400).json({ ok: false, mensaje: 'La categoría seleccionada no es válida para reclamos' });
      }

      // 3. Validación de límite de reclamos pendientes simultáneos (HU-01 Criterio de Aceptación 8)
      const pendientesCount = await ClaimModel.countPendientesByUsuario(id_usuario);
      if (req.user.role === ROLES.CIUDADANO && pendientesCount >= 3) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Has alcanzado el límite máximo de 3 reclamos simultáneos en estado Pendiente. Esperá a que las instituciones avancen en la gestión de tus reclamos anteriores para crear uno nuevo.'
        });
      }

      // 4. Auto-asignación de institución según Ciudad + Categoría con respaldo en Institución Principal de esa ciudad (HU-04, HU-05)
      const id_institucion = await resolverInstitucionAsignada(id_ciudad, id_categoria);

      // 5. Creación del reclamo en BD (persistiendo imagen si fue subida)
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
        imagen,
      });

      // 6. Registro inmutable en auditoría/historial (HU-18)
      await HistorialModel.registrar({
        id_reclamo: id,
        id_usuario,
        tipo_evento: HISTORIAL_EVENTS.CREACION,
        detalle: `Reclamo creado por ${req.user.role === ROLES.ADMIN ? 'administrador' : 'ciudadano'} como ${visibilidad === 'privado' ? 'privado' : 'público'}. Asignado a institución ID ${id_institucion || 'Sin asignar'}.`,
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
      const data = await ClaimModel.getByUsuario(req.user.id, filtrosReclamo(req.query));
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error mis reclamos:', err);
      res.status(err.status || 500).json({ ok: false, mensaje: err.status ? err.message : 'Error al obtener reclamos personales' });
    }
  },

  /**
   * Obtiene los reclamos públicos de la ciudad activa (HU-07)
   */
  async reclamosPublicos(req, res) {
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
      console.error('Error al obtener detalle del reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al cargar el detalle del reclamo' });
    }
  },


  /**
   * Permite al autor editar su propio reclamo en estado Pendiente
   */
  async editar(req, res) {
    try {
      const { id } = req.params;
      const { titulo, descripcion, direccion } = req.body;
      const reclamo = await ClaimModel.getById(id);

      if (!reclamo) {
        return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      }
      if (Number(reclamo.id_usuario) !== Number(req.user.id)) {
        return res.status(403).json({ ok: false, mensaje: 'Solo el autor puede editar este reclamo' });
      }
      if (reclamo.estado !== 'Pendiente') {
        return res.status(400).json({ ok: false, mensaje: 'El reclamo ya fue tomado en revisión y no puede editarse' });
      }

      const affected = await ClaimModel.editar(id, req.user.id, {
        titulo: titulo ? titulo.trim() : reclamo.titulo,
        descripcion: descripcion ? descripcion.trim() : reclamo.descripcion,
        direccion: direccion ? direccion.trim() : reclamo.direccion,
      });

      if (affected > 0) {
        await HistorialModel.registrar({
          id_reclamo: id,
          id_usuario: req.user.id,
          tipo_evento: HISTORIAL_EVENTS.EDICION,
          detalle: 'Reclamo editado por el ciudadano.',
          estado_nuevo: 'Pendiente',
        });
        return res.json({ ok: true, mensaje: 'Reclamo editado correctamente.' });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo editar el reclamo.' });
    } catch (err) {
      console.error('Error al editar reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al editar reclamo' });
    }
  },

  /**
   * Permite al autor cancelar su propio reclamo en estado Pendiente
   */
  async cancelar(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const reclamo = await ClaimModel.getById(id);

      if (!reclamo) {
        return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      }
      if (Number(reclamo.id_usuario) !== Number(req.user.id)) {
        return res.status(403).json({ ok: false, mensaje: 'Solo el autor puede cancelar este reclamo' });
      }
      if (reclamo.estado !== 'Pendiente') {
        return res.status(400).json({ ok: false, mensaje: 'El reclamo no se puede cancelar porque ya no está en estado Pendiente' });
      }

      const affected = await ClaimModel.cancelar(id, req.user.id, motivo);

      if (affected > 0) {
        await HistorialModel.registrar({
          id_reclamo: id,
          id_usuario: req.user.id,
          tipo_evento: HISTORIAL_EVENTS.CANCELACION,
          detalle: `Reclamo cancelado por el ciudadano. Motivo: ${motivo || 'Sin detalle'}`,
          estado_nuevo: 'Cancelado',
        });
        return res.json({ ok: true, mensaje: 'Reclamo cancelado exitosamente.' });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo cancelar el reclamo.' });
    } catch (err) {
      console.error('Error al cancelar reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al cancelar el reclamo' });
    }
  },

  /**
   * Obtiene datos de geolocalización para el mapa comunitario público
   */
  async reclamosParaMapa(req, res) {
    try {
      const id_ciudad = req.user?.id_ciudad;
      if (!id_ciudad) {
        return res.json({ ok: true, data: [] });
      }
      const data = await ClaimModel.getParaMapa(id_ciudad);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error reclamos para mapa:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener puntos del mapa' });
    }
  },
  /**
   * Permite al autor reabrir su propio reclamo en estado Resuelto o Cancelado
   */
  async reabrir(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const reclamo = await ClaimModel.getById(id);

      if (!reclamo) {
        return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      }
      if (Number(reclamo.id_usuario) !== Number(req.user.id)) {
        return res.status(403).json({ ok: false, mensaje: 'Solo el autor puede reabrir este reclamo' });
      }
      if (!['Resuelto', 'Cancelado'].includes(reclamo.estado)) {
        return res.status(400).json({ ok: false, mensaje: 'El reclamo solo se puede reabrir si está Resuelto o Cancelado' });
      }
      if (!motivo || !motivo.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El motivo de reapertura es obligatorio' });
      }

      // Validar que no hayan pasado más de 15 días desde la fecha_ultimo_cambio_estado
      const fechaUltimoCambio = new Date(reclamo.fecha_ultimo_cambio_estado);
      const diffTime = Math.abs(new Date() - fechaUltimoCambio);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 15) {
        return res.status(400).json({ ok: false, mensaje: 'El plazo máximo de 15 días para reabrir este reclamo ha expirado' });
      }

      // Determinar estado de destino según cómo fue cerrado:
      // Si fue cancelado voluntariamente por el ciudadano desde 'Pendiente', debe volver a 'Pendiente'.
      // Si fue resuelto o cancelado por la institución, debe volver a 'En revisión'.
      let estadoDestino = CLAIM_STATUSES.EN_REVISION;
      if (reclamo.estado === CLAIM_STATUSES.CANCELADO && reclamo.cancelado_por_tipo === 'ciudadano') {
        estadoDestino = CLAIM_STATUSES.PENDIENTE;
      }

      const affected = await ClaimModel.reabrir(id, req.user.id, estadoDestino);

      if (affected > 0) {
        await HistorialModel.registrar({
          id_reclamo: id,
          id_usuario: req.user.id,
          tipo_evento: HISTORIAL_EVENTS.REAPERTURA,
          detalle: `Reclamo reabierto por el ciudadano. Motivo: ${motivo}`,
          estado_anterior: reclamo.estado,
          estado_nuevo: estadoDestino,
        });
        return res.json({ ok: true, mensaje: 'Reclamo reabierto exitosamente.', estado: estadoDestino });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo reabrir el reclamo.' });
    } catch (err) {
      console.error('Error al reabrir reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al reabrir el reclamo' });
    }
  },


  /**
   * Permite agregar una actualización al reclamo (solo autor o institución asignada)
   */
  async agregarActualizacion(req, res) {
    try {
      const { id } = req.params;
      const { texto } = req.body;
      const idUsuario = req.user.id;
      const rolUsuario = req.user.role;
      const idInstitucionUsuario = req.user.id_institucion;

      if (!texto || !texto.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El texto de la actualización es obligatorio' });
      }

      const reclamo = await ClaimModel.getById(id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });

      const esAutor = Number(idUsuario) === Number(reclamo.id_usuario);
      const { ROLES } = require('../constants/roles');
const { filtrosReclamo } = require('../services/claimFilterService');
      const esInstitucionAsignada = rolUsuario === ROLES.INSTITUCION && Number(idInstitucionUsuario) === Number(reclamo.id_institucion);

      if (!esAutor && !esInstitucionAsignada) {
        return res.status(403).json({ ok: false, mensaje: 'Solo el autor o la institución asignada pueden agregar actualizaciones' });
      }

      const tipo_autor = esInstitucionAsignada ? 'institucion' : 'ciudadano';

      await ActualizacionModel.crear({
        id_reclamo: id,
        id_usuario: idUsuario,
        tipo_autor,
        texto: texto.trim()
      });

      // Notificar al ciudadano autor si la actualización fue agregada por la institución (HU-22)
      if (tipo_autor === 'institucion') {
        await NotificationService.notificarActualizacion({
          idReclamo: id,
          idUsuarioAutor: reclamo.id_usuario,
          tituloReclamo: reclamo.titulo,
          texto: texto.trim(),
          actorId: idUsuario,
        });
      }

      res.json({ ok: true, mensaje: 'Actualización agregada correctamente' });
    } catch (err) {
      console.error('Error al agregar actualización:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al agregar la actualización' });
    }
  },

  /**
   * Permite a un ciudadano marcar/desmarcar "A mí también me pasa" (HU-16)
   */
  async toggleAfectado(req, res) {
    try {
      const { id } = req.params;
      const idUsuario = req.user.id;

      // 1. Exclusivo de ciudadanos (HU-16)
      if (req.user.role !== 'ciudadano') {
        return res.status(403).json({ ok: false, mensaje: 'Esta funcionalidad es exclusiva para ciudadanos' });
      }

      const reclamo = await ClaimModel.getById(id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });

      // 2. No disponible en reclamos privados
      if (reclamo.visibilidad === 'privado') {
        return res.status(403).json({ ok: false, mensaje: 'No se puede participar en reclamos privados' });
      }

      // 3. No disponible en estados terminales (Resuelto o Cancelado)
      if (['Resuelto', 'Cancelado'].includes(reclamo.estado)) {
        return res.status(400).json({ ok: false, mensaje: 'No se pueden registrar adhesiones en reclamos finalizados' });
      }

      // 4. El autor no puede adherirse a su propio reclamo
      if (Number(reclamo.id_usuario) === Number(idUsuario)) {
        return res.status(400).json({ ok: false, mensaje: 'No puedes adherirte a tu propio reclamo' });
      }

      // 5. Restricción territorial: sólo ciudadanos de la misma ciudad (no visitantes)
      if (req.user.id_ciudad && reclamo.id_ciudad && Number(req.user.id_ciudad) !== Number(reclamo.id_ciudad)) {
        return res.status(403).json({ ok: false, mensaje: 'Solo puedes participar en reclamos de tu ciudad' });
      }

      // Check if user already marked
      const isAfectado = await ClaimModel.isAfectado(id, idUsuario);
      
      if (isAfectado) {
        await ClaimModel.quitarAfectado(id, idUsuario);
        return res.json({ ok: true, mensaje: 'Has dejado de estar afectado por este reclamo', afectado: false });
      } else {
        await ClaimModel.marcarAfectado(id, idUsuario);
        return res.json({ ok: true, mensaje: 'Has sido marcado como afectado por este reclamo', afectado: true });
      }

    } catch (err) {
      console.error('Error al togglear afectado:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al actualizar tu participación en el reclamo' });
    }
  }
};
module.exports = reclamoController;

