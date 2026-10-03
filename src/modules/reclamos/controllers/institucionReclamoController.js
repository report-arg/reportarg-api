const { filtrosReclamo } = require('../services/claimFilterService');
const ClaimModel = require('../models/reclamoModel');
const HistorialModel = require('../models/historialModel');
const NotificationService = require('../../notificaciones/notificationService');
const { CLAIM_STATUSES, HISTORIAL_EVENTS } = require('../../../constants/publication');

const institucionReclamoController = {

  async bandeja(req, res, next) {
    try {
      const idInstitucion = req.user.id_institucion;
      const { estado, categoria, orderBy } = filtrosReclamo(req.query);
      const data = await ClaimModel.getBandejaInstitucion(idInstitucion, estado, categoria, orderBy, req.user.id_ciudad);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async avanzarEstado(req, res, next) {
    try {
      const { id } = req.params;
      const { nuevoEstado } = req.body;
      const idInstitucion = req.user.id_institucion;

      const reclamo = await ClaimModel.getById(id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });

      if (Number(reclamo.id_institucion) !== Number(idInstitucion)) {
        return res.status(403).json({ ok: false, mensaje: 'Este reclamo no está asignado a tu institución' });
      }

      // Validar máquina de estados
      const transicionesValidas = {
        [CLAIM_STATUSES.PENDIENTE]: [CLAIM_STATUSES.EN_REVISION],
        [CLAIM_STATUSES.EN_REVISION]: [CLAIM_STATUSES.EN_PROCESO],
        [CLAIM_STATUSES.EN_PROCESO]: [] // A resuelto se pasa por resolver()
      };

      const permitidos = transicionesValidas[reclamo.estado] || [];
      if (!permitidos.includes(nuevoEstado)) {
        return res.status(400).json({ ok: false, mensaje: `No podés pasar de ${reclamo.estado} a ${nuevoEstado}` });
      }

      const affected = await ClaimModel.updateEstado(id, nuevoEstado);
      if (affected > 0) {
        await HistorialModel.registrar({
          id_reclamo: id,
          id_usuario: req.user.id,
          tipo_evento: HISTORIAL_EVENTS.CAMBIO_ESTADO,
          detalle: `La institución actualizó el estado a ${nuevoEstado}.`,
          estado_anterior: reclamo.estado,
          estado_nuevo: nuevoEstado,
        });

        // Notificación al autor ciudadano (HU-22)
        await NotificationService.notificarCambioEstado({
          idReclamo: id,
          idUsuarioAutor: reclamo.id_usuario,
          tituloReclamo: reclamo.titulo,
          estadoAnterior: reclamo.estado,
          estadoNuevo: nuevoEstado,
          actorId: req.user.id,
        });

        return res.json({ ok: true, mensaje: 'Estado actualizado correctamente' });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo actualizar el estado' });
    } catch (err) {
      next(err);
    }
  },

  async resolver(req, res, next) {
    try {
      const { id } = req.params;
      const { mensaje, evidenciaUrl } = req.body;
      const idInstitucion = req.user.id_institucion;

      if (!mensaje || !mensaje.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El mensaje de resolución es obligatorio' });
      }

      const reclamo = await ClaimModel.getById(id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });

      if (Number(reclamo.id_institucion) !== Number(idInstitucion)) {
        return res.status(403).json({ ok: false, mensaje: 'Este reclamo no está asignado a tu institución' });
      }

      if (reclamo.estado !== CLAIM_STATUSES.EN_PROCESO) {
        return res.status(400).json({ ok: false, mensaje: 'Solo podés resolver reclamos en proceso' });
      }

      const affected = await ClaimModel.resolver(id, idInstitucion, mensaje, evidenciaUrl);
      if (affected > 0) {
        await HistorialModel.registrar({
          id_reclamo: id,
          id_usuario: req.user.id,
          tipo_evento: HISTORIAL_EVENTS.RESOLUCION,
          detalle: `Reclamo resuelto por la institución. Mensaje: ${mensaje}`,
          estado_anterior: reclamo.estado,
          estado_nuevo: CLAIM_STATUSES.RESUELTO,
        });

        // Notificación al autor ciudadano (HU-22)
        await NotificationService.notificarResolucion({
          idReclamo: id,
          idUsuarioAutor: reclamo.id_usuario,
          tituloReclamo: reclamo.titulo,
          mensajeResolucion: mensaje,
          actorId: req.user.id,
        });

        return res.json({ ok: true, mensaje: 'Reclamo resuelto correctamente' });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo resolver el reclamo' });
    } catch (err) {
      next(err);
    }
  },

  async cancelar(req, res, next) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const idInstitucion = req.user.id_institucion;

      if (!motivo || !motivo.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El motivo de cancelación es obligatorio' });
      }

      const reclamo = await ClaimModel.getById(id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });

      if (Number(reclamo.id_institucion) !== Number(idInstitucion)) {
        return res.status(403).json({ ok: false, mensaje: 'Este reclamo no está asignado a tu institución' });
      }

      if ([CLAIM_STATUSES.RESUELTO, CLAIM_STATUSES.CANCELADO].includes(reclamo.estado)) {
        return res.status(400).json({ ok: false, mensaje: 'Este reclamo ya finalizó su gestión y no puede ser cancelado' });
      }

      const affected = await ClaimModel.cancelarInstitucion(id, idInstitucion, motivo);
      if (affected > 0) {
        await HistorialModel.registrar({
          id_reclamo: id,
          id_usuario: req.user.id,
          tipo_evento: HISTORIAL_EVENTS.CANCELACION,
          detalle: `Reclamo cancelado por la institución. Motivo: ${motivo}`,
          estado_anterior: reclamo.estado,
          estado_nuevo: CLAIM_STATUSES.CANCELADO,
        });

        // Notificación al autor ciudadano (HU-22)
        await NotificationService.notificarCancelacion({
          idReclamo: id,
          idUsuarioAutor: reclamo.id_usuario,
          tituloReclamo: reclamo.titulo,
          motivo,
          actorId: req.user.id,
          canceladoPorTipo: 'institucion',
        });

        return res.json({ ok: true, mensaje: 'Reclamo cancelado correctamente' });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo cancelar el reclamo' });
    } catch (err) {
      next(err);
    }
  }

};

module.exports = institucionReclamoController;
