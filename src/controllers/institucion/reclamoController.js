const ClaimModel = require('../../models/claimModel');
const HistorialModel = require('../../models/historialModel');
const { CLAIM_STATUSES, HISTORIAL_EVENTS } = require('../../constants/publication');

const institucionReclamoController = {

  async bandeja(req, res) {
    try {
      const idInstitucion = req.user.id_institucion;
      const { estado } = req.query;
      const data = await ClaimModel.getBandejaInstitucion(idInstitucion, estado);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error al obtener bandeja institucional:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener bandeja de reclamos' });
    }
  },

  async avanzarEstado(req, res) {
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
        return res.json({ ok: true, mensaje: 'Estado actualizado correctamente' });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo actualizar el estado' });
    } catch (err) {
      console.error('Error avanzar estado:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al actualizar estado' });
    }
  },

  async resolver(req, res) {
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
        return res.json({ ok: true, mensaje: 'Reclamo resuelto correctamente' });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo resolver el reclamo' });
    } catch (err) {
      console.error('Error resolver reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al resolver el reclamo' });
    }
  },

  async cancelar(req, res) {
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
        return res.json({ ok: true, mensaje: 'Reclamo cancelado correctamente' });
      }

      res.status(400).json({ ok: false, mensaje: 'No se pudo cancelar el reclamo' });
    } catch (err) {
      console.error('Error cancelar reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al cancelar el reclamo' });
    }
  }

};

module.exports = institucionReclamoController;
