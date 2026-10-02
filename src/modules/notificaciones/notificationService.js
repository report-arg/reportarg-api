const NotificationModel = require('./notificationModel');
const { NOTIFICATION_TYPES } = require('./notifications.constants');

/**
 * Servicio centralizado para generación y despacho de notificaciones internas (HU-22).
 */
const NotificationService = {
  /**
   * Crea una notificación aplicando la regla de exclusión de auto-notificación.
   * Si actorId coincide con idUsuarioDestino, la notificación no se genera.
   * @param {Object} params
   * @param {number} params.idUsuarioDestino - ID del usuario receptor
   * @param {number} [params.actorId] - ID del usuario que ejecuta la acción
   * @param {string} [params.tipo] - Tipo semántico de notificación
   * @param {string} params.titulo - Título del aviso
   * @param {string} params.mensaje - Cuerpo descriptivo del aviso
   * @param {number} [params.idReclamo] - ID del reclamo asociado si aplica
   * @param {Object} [connection] - Conexión de transacción activa opcional
   */
  async crear({ idUsuarioDestino, actorId = null, tipo = NOTIFICATION_TYPES.GENERAL, titulo, mensaje, idReclamo = null }, connection = null) {
    // Regla de seguridad y UX: No auto-notificar al autor de la acción
    if (actorId !== null && Number(actorId) === Number(idUsuarioDestino)) {
      return null;
    }

    if (!idUsuarioDestino) {
      return null;
    }

    try {
      const idNotificacion = await NotificationModel.crear({
        id_usuario: idUsuarioDestino,
        tipo,
        titulo,
        mensaje,
        id_reclamo: idReclamo,
      }, connection || undefined);
      return idNotificacion;
    } catch (err) {
      // Si se ejecuta dentro de una transacción estricta, propagar error
      if (connection) {
        throw err;
      }
      // Si es una notificación desacoplada, evitar dejar en inconsistencia el reclamo
      console.warn('Advertencia en NotificationService al registrar notificación:', err.message);
      return null;
    }
  },

  /**
   * Notifica al autor del reclamo sobre un avance o cambio de estado.
   */
  async notificarCambioEstado({ idReclamo, idUsuarioAutor, tituloReclamo, estadoAnterior, estadoNuevo, actorId }, connection = null) {
    return this.crear({
      idUsuarioDestino: idUsuarioAutor,
      actorId,
      tipo: NOTIFICATION_TYPES.CLAIM_STATUS_CHANGED,
      titulo: 'Cambio de estado en tu reclamo',
      mensaje: `Tu reclamo "${tituloReclamo || 'Reclamo'}" pasó a estado "${estadoNuevo}".`,
      idReclamo,
    }, connection);
  },

  /**
   * Notifica al autor cuando el reclamo es resuelto por la institución responsable.
   */
  async notificarResolucion({ idReclamo, idUsuarioAutor, tituloReclamo, mensajeResolucion, actorId }, connection = null) {
    const detalleResolucion = mensajeResolucion ? ` Mensaje institucional: "${mensajeResolucion}"` : '';
    return this.crear({
      idUsuarioDestino: idUsuarioAutor,
      actorId,
      tipo: NOTIFICATION_TYPES.CLAIM_RESOLVED,
      titulo: 'Tu reclamo fue resuelto',
      mensaje: `Tu reclamo "${tituloReclamo || 'Reclamo'}" fue marcado como resuelto por la institución.${detalleResolucion}`,
      idReclamo,
    }, connection);
  },

  /**
   * Notifica al autor cuando el reclamo es cancelado por institución o administración.
   */
  async notificarCancelacion({ idReclamo, idUsuarioAutor, tituloReclamo, motivo, actorId, canceladoPorTipo = 'institucion' }, connection = null) {
    const origen = canceladoPorTipo === 'institucion' ? 'la institución responsable' : 'la administración';
    const detalleMotivo = motivo ? ` Motivo: ${motivo}` : '';
    return this.crear({
      idUsuarioDestino: idUsuarioAutor,
      actorId,
      tipo: NOTIFICATION_TYPES.CLAIM_CANCELLED,
      titulo: 'Tu reclamo fue cancelado',
      mensaje: `Tu reclamo "${tituloReclamo || 'Reclamo'}" fue cancelado por ${origen}.${detalleMotivo}`,
      idReclamo,
    }, connection);
  },

  /**
   * Notifica al autor cuando la institución agrega una actualización en la bitácora.
   */
  async notificarActualizacion({ idReclamo, idUsuarioAutor, tituloReclamo, texto, actorId }, connection = null) {
    const resumen = texto && texto.length > 80 ? `${texto.slice(0, 77)}...` : (texto || '');
    return this.crear({
      idUsuarioDestino: idUsuarioAutor,
      actorId,
      tipo: NOTIFICATION_TYPES.CLAIM_UPDATE,
      titulo: 'Actualización institucional en tu reclamo',
      mensaje: `La institución responsable agregó una novedad: "${resumen}"`,
      idReclamo,
    }, connection);
  },

  /**
   * Notifica al autor cuando la administración reasigna la institución responsable.
   */
  async notificarReasignacion({ idReclamo, idUsuarioAutor, tituloReclamo, nombreInstitucionDestino, actorId }, connection = null) {
    const instTexto = nombreInstitucionDestino ? ` a ${nombreInstitucionDestino}` : '';
    return this.crear({
      idUsuarioDestino: idUsuarioAutor,
      actorId,
      tipo: NOTIFICATION_TYPES.CLAIM_REASSIGNED,
      titulo: 'Organismo responsable reasignado',
      mensaje: `Tu reclamo "${tituloReclamo || 'Reclamo'}" fue reasignado${instTexto}.`,
      idReclamo,
    }, connection);
  },

  /**
   * Notifica cuando un reclamo es reabierto.
   */
  async notificarReapertura({ idReclamo, idUsuarioDestino, tituloReclamo, actorId, estadoNuevo = 'En revisión' }, connection = null) {
    const detalleEstado = estadoNuevo === 'Pendiente' ? 'volvió a estado Pendiente.' : 'volvió a revisión.';
    return this.crear({
      idUsuarioDestino,
      actorId,
      tipo: NOTIFICATION_TYPES.CLAIM_REOPENED,
      titulo: 'Reclamo reabierto',
      mensaje: `El reclamo "${tituloReclamo || 'Reclamo'}" fue reabierto y ${detalleEstado}`,
      idReclamo,
    }, connection);
  },
};

module.exports = NotificationService;
