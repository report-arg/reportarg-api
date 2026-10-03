const ClaimModel = require('../models/reclamoModel');
const HistorialModel = require('../models/historialModel');
const ActualizacionModel = require('../models/actualizacionModel');
const NotificationService = require('../../notificaciones/notificationService');
const { resolverInstitucionAsignada } = require('./assignmentService');
const InstitutionModel = require('../../instituciones/institutionModel');
const cityService = require('../../../services/cityService');
const CategoryModel = require('../../categorias/categoryModel');
const { CATEGORY_TYPES, HISTORIAL_EVENTS, CLAIM_STATUSES } = require('../../../constants/publication');
const { ROLES } = require('../../../constants/roles');
const { BUSINESS_RULES } = require('../../../constants/businessRules');

function throwError(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

const claimWorkflowService = {
  async crearReclamo({
    titulo, descripcion, id_categoria, direccion, latitud, longitud,
    visibilidad, imagen, id_usuario, id_ciudad, role
  }) {
    // 1. Validaciones
    if (!id_ciudad || !Number.isSafeInteger(Number(id_ciudad)) || Number(id_ciudad) <= 0) {
      throwError(400, 'La ciudad seleccionada es inválida o no se especificó.');
    }
    const isActiveCity = await cityService.getActiveById(Number(id_ciudad));
    if (!isActiveCity) {
      throwError(400, 'La ciudad seleccionada no existe o no está activa');
    }
    if (visibilidad !== undefined && !['publico', 'privado'].includes(visibilidad)) {
      throwError(400, 'Visibilidad inválida');
    }
    if (!Number.isSafeInteger(Number(id_categoria)) || Number(id_categoria) <= 0) {
      throwError(400, 'La categoría es inválida');
    }
    for (const [valor, min, max] of [[latitud, -90, 90], [longitud, -180, 180]]) {
      if (valor !== undefined && valor !== null && (typeof valor !== 'number' || !Number.isFinite(valor) || valor < min || valor > max)) {
        throwError(400, 'Coordenadas inválidas');
      }
    }
    if (typeof titulo !== 'string' || !titulo.trim()) {
      throwError(400, 'El título es obligatorio');
    }
    if (typeof descripcion !== 'string' || !descripcion.trim()) {
      throwError(400, 'La descripción es obligatoria');
    }
    if (typeof direccion !== 'string' || !direccion.trim()) {
      throwError(400, 'La dirección es obligatoria');
    }

    const categoria = await CategoryModel.getById(id_categoria);
    if (!categoria || categoria.estado !== 'activo' || ![CATEGORY_TYPES.RECLAMO, CATEGORY_TYPES.AMBOS].includes(categoria.tipo)) {
      throwError(400, 'La categoría seleccionada no es válida para reclamos');
    }

    const pendientesCount = await ClaimModel.countPendientesByUsuario(id_usuario);
    if (role === ROLES.CIUDADANO && pendientesCount >= BUSINESS_RULES.CLAIM_MAX_PENDING_PER_CITIZEN) {
      throwError(400, `Has alcanzado el límite máximo de ${BUSINESS_RULES.CLAIM_MAX_PENDING_PER_CITIZEN} reclamos simultáneos en estado Pendiente. Esperá a que las instituciones avancen en la gestión de tus reclamos anteriores para crear uno nuevo.`);
    }

    // 2. Coordinación
    const id_institucion = await resolverInstitucionAsignada(id_ciudad, id_categoria);

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

    let institucionAsignadaNombre = null;
    if (id_institucion) {
      const inst = await InstitutionModel.getById(id_institucion);
      institucionAsignadaNombre = inst?.nombre || null;
    }

    const detalleAsignacion = institucionAsignadaNombre
      ? `Asignado a ${institucionAsignadaNombre}.`
      : (id_institucion ? 'Asignado a institución responsable.' : 'Sin institución asignada.');

    await HistorialModel.registrar({
      id_reclamo: id,
      id_usuario,
      tipo_evento: HISTORIAL_EVENTS.CREACION,
      detalle: `Reclamo creado por ${role === ROLES.ADMIN ? 'administrador' : 'ciudadano'} como ${visibilidad === 'privado' ? 'privado' : 'público'}. ${detalleAsignacion}`,
      estado_nuevo: 'Pendiente',
    });

    if (id_institucion) {
      await NotificationService.notificarAsignacionInstitucional({
        idReclamo: id,
        idInstitucion: id_institucion,
        tituloReclamo: titulo.trim(),
        actorId: id_usuario,
      });
    }

    return id;
  },

  async editarReclamo(id, idUsuario, { titulo, descripcion, direccion }) {
    const reclamo = await ClaimModel.getById(id);
    if (!reclamo) throwError(404, 'Reclamo no encontrado');
    if (Number(reclamo.id_usuario) !== Number(idUsuario)) {
      throwError(403, 'Solo el autor puede editar este reclamo');
    }
    if (reclamo.estado !== 'Pendiente') {
      throwError(400, 'El reclamo ya fue tomado en revisión y no puede editarse');
    }

    const affected = await ClaimModel.editar(id, idUsuario, {
      titulo: titulo ? titulo.trim() : reclamo.titulo,
      descripcion: descripcion ? descripcion.trim() : reclamo.descripcion,
      direccion: direccion ? direccion.trim() : reclamo.direccion,
    });

    if (affected > 0) {
      await HistorialModel.registrar({
        id_reclamo: id,
        id_usuario: idUsuario,
        tipo_evento: HISTORIAL_EVENTS.EDICION,
        detalle: 'Reclamo editado por el ciudadano.',
        estado_nuevo: 'Pendiente',
      });
      return true;
    }
    throwError(400, 'No se pudo editar el reclamo.');
  },

  async cancelarReclamo(id, idUsuario, motivo) {
    const reclamo = await ClaimModel.getById(id);
    if (!reclamo) throwError(404, 'Reclamo no encontrado');
    if (Number(reclamo.id_usuario) !== Number(idUsuario)) {
      throwError(403, 'Solo el autor puede cancelar este reclamo');
    }
    if (reclamo.estado !== 'Pendiente') {
      throwError(400, 'El reclamo no se puede cancelar porque ya no está en estado Pendiente');
    }

    const affected = await ClaimModel.cancelar(id, idUsuario, motivo);
    if (affected > 0) {
      await HistorialModel.registrar({
        id_reclamo: id,
        id_usuario: idUsuario,
        tipo_evento: HISTORIAL_EVENTS.CANCELACION,
        detalle: `Reclamo cancelado por el ciudadano. Motivo: ${motivo || 'Sin detalle'}`,
        estado_nuevo: 'Cancelado',
      });
      return true;
    }
    throwError(400, 'No se pudo cancelar el reclamo.');
  },

  async reabrirReclamo(id, idUsuario, motivo) {
    const reclamo = await ClaimModel.getById(id);
    if (!reclamo) throwError(404, 'Reclamo no encontrado');
    if (Number(reclamo.id_usuario) !== Number(idUsuario)) {
      throwError(403, 'Solo el autor puede reabrir este reclamo');
    }
    if (!['Resuelto', 'Cancelado'].includes(reclamo.estado)) {
      throwError(400, 'El reclamo solo se puede reabrir si está Resuelto o Cancelado');
    }
    if (!motivo || !motivo.trim()) {
      throwError(400, 'El motivo de reapertura es obligatorio');
    }

    const fechaUltimoCambio = new Date(reclamo.fecha_ultimo_cambio_estado);
    const diffTime = Math.abs(new Date() - fechaUltimoCambio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > BUSINESS_RULES.CLAIM_REOPEN_WINDOW_DAYS) {
      throwError(400, `El plazo máximo de ${BUSINESS_RULES.CLAIM_REOPEN_WINDOW_DAYS} días para reabrir este reclamo ha expirado`);
    }

    let estadoDestino = CLAIM_STATUSES.EN_REVISION;
    if (reclamo.estado === CLAIM_STATUSES.CANCELADO && reclamo.cancelado_por_tipo === 'ciudadano') {
      estadoDestino = CLAIM_STATUSES.PENDIENTE;
    }

    const affected = await ClaimModel.reabrir(id, idUsuario, estadoDestino);

    if (affected > 0) {
      await HistorialModel.registrar({
        id_reclamo: id,
        id_usuario: idUsuario,
        tipo_evento: HISTORIAL_EVENTS.REAPERTURA,
        detalle: `Reclamo reabierto por el ciudadano. Motivo: ${motivo}`,
        estado_anterior: reclamo.estado,
        estado_nuevo: estadoDestino,
      });

      if (reclamo.id_institucion) {
        const inst = await InstitutionModel.getById(reclamo.id_institucion);
        if (inst && inst.id_usuario) {
          await NotificationService.notificarReapertura({
            idReclamo: id,
            idUsuarioDestino: inst.id_usuario,
            tituloReclamo: reclamo.titulo,
            actorId: idUsuario,
            estadoNuevo: estadoDestino,
          });
        }
      }
      return estadoDestino;
    }
    throwError(400, 'No se pudo reabrir el reclamo.');
  },

  async agregarActualizacion(id, idUsuario, rolUsuario, idInstitucionUsuario, texto) {
    if (!texto || !texto.trim()) {
      throwError(400, 'El texto de la actualización es obligatorio');
    }

    const reclamo = await ClaimModel.getById(id);
    if (!reclamo) throwError(404, 'Reclamo no encontrado');

    if ([CLAIM_STATUSES.RESUELTO, CLAIM_STATUSES.CANCELADO].includes(reclamo.estado)) {
      throwError(400, 'No se pueden agregar actualizaciones a un reclamo resuelto o cancelado');
    }

    const esAutor = Number(idUsuario) === Number(reclamo.id_usuario);
    const esInstitucionAsignada = rolUsuario === ROLES.INSTITUCION && Number(idInstitucionUsuario) === Number(reclamo.id_institucion);

    if (reclamo.estado === CLAIM_STATUSES.PENDIENTE) {
      if (!esAutor) {
        throwError(403, 'Solo el creador del reclamo puede publicar actualizaciones mientras está pendiente');
      }
    } else {
      if (!esInstitucionAsignada) {
        throwError(403, 'Una vez que el reclamo pasa a revisión, solo la institución responsable puede publicar actualizaciones');
      }
    }

    const tipo_autor = esInstitucionAsignada ? 'institucion' : 'ciudadano';

    await ActualizacionModel.crear({
      id_reclamo: id,
      id_usuario: idUsuario,
      tipo_autor,
      texto: texto.trim()
    });

    if (tipo_autor === 'institucion') {
      await NotificationService.notificarActualizacion({
        idReclamo: id,
        idUsuarioAutor: reclamo.id_usuario,
        tituloReclamo: reclamo.titulo,
        texto: texto.trim(),
        actorId: idUsuario,
      });
    } else if (tipo_autor === 'ciudadano' && reclamo.id_institucion) {
      const inst = await InstitutionModel.getById(reclamo.id_institucion);
      if (inst && inst.id_usuario) {
        await NotificationService.notificarActualizacionCiudadano({
          idReclamo: id,
          idUsuarioDestino: inst.id_usuario,
          tituloReclamo: reclamo.titulo,
          texto: texto.trim(),
          actorId: idUsuario,
        });
      }
    }
  },

  async toggleAfectado(id, idUsuario, rolUsuario, idCiudadUsuario) {
    if (rolUsuario !== ROLES.CIUDADANO) {
      throwError(403, 'Esta funcionalidad es exclusiva para ciudadanos');
    }

    const reclamo = await ClaimModel.getById(id);
    if (!reclamo) throwError(404, 'Reclamo no encontrado');

    if (reclamo.visibilidad === 'privado') {
      throwError(403, 'No se puede participar en reclamos privados');
    }

    if ([CLAIM_STATUSES.RESUELTO, CLAIM_STATUSES.CANCELADO].includes(reclamo.estado)) {
      throwError(400, 'No se pueden registrar adhesiones en reclamos finalizados');
    }

    if (Number(reclamo.id_usuario) === Number(idUsuario)) {
      throwError(400, 'No puedes adherirte a tu propio reclamo');
    }

    if (idCiudadUsuario && reclamo.id_ciudad && Number(idCiudadUsuario) !== Number(reclamo.id_ciudad)) {
      throwError(403, 'Solo puedes participar en reclamos de tu ciudad');
    }

    const isAfectado = await ClaimModel.isAfectado(id, idUsuario);
    if (isAfectado) {
      await ClaimModel.quitarAfectado(id, idUsuario);
      return false; // afectado: false
    } else {
      await ClaimModel.marcarAfectado(id, idUsuario);
      if (reclamo.id_usuario && Number(reclamo.id_usuario) !== Number(idUsuario)) {
        try {
          await NotificationService.notificarApoyoComunitario({
            idReclamo: reclamo.id || reclamo.id_reclamo || id,
            idUsuarioAutor: reclamo.id_usuario,
            tituloReclamo: reclamo.titulo,
            actorId: idUsuario,
          });
        } catch (notifErr) {
          console.warn('No se pudo enviar notificación de apoyo comunitario:', notifErr.message);
        }
      }
      return true; // afectado: true
    }
  }
};

module.exports = claimWorkflowService;
