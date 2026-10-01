const NotificationModel = require('./notificationModel');

const notificationController = {
  /**
   * Lista las notificaciones del usuario autenticado (derivado de req.user.id).
   */
  async listar(req, res) {
    try {
      const idUsuario = req.user?.id;
      if (!idUsuario) {
        return res.status(401).json({ ok: false, mensaje: 'Usuario no autenticado' });
      }

      const { limite = 20, filtro } = req.query;
      const soloNoLeidas = filtro === 'no_leidas';
      const soloLeidas = filtro === 'leidas';

      const notifs = await NotificationModel.getByUsuario(idUsuario, {
        limite: Number(limite) || 20,
        soloNoLeidas,
        soloLeidas,
      });

      const noLeidas = await NotificationModel.countNoLeidas(idUsuario);

      const data = notifs.map(n => ({
        id: n.id || n.id_notificacion,
        id_notificacion: n.id_notificacion || n.id,
        tipo: n.tipo || 'CLAIM_STATUS_CHANGED',
        titulo: n.titulo || 'Notificación',
        mensaje: n.mensaje,
        sub: n.mensaje || (n.reclamo_titulo ? `Reclamo: ${n.reclamo_titulo}` : ''),
        id_reclamo: n.id_reclamo || null,
        reclamo_titulo: n.reclamo_titulo || null,
        tiempo: tiempoRelativo(n.fecha || n.fecha_creacion),
        fecha: n.fecha || n.fecha_creacion,
        fecha_creacion: n.fecha_creacion || n.fecha,
        fecha_lectura: n.fecha_lectura || null,
        leida: Boolean(n.leida),
      }));

      res.json({
        ok: true,
        data,
        noLeidas,
        total: data.length,
      });
    } catch (err) {
      console.error('Error al listar notificaciones:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener notificaciones' });
    }
  },

  /**
   * Obtiene la cantidad de notificaciones no leídas del usuario autenticado.
   */
  async countNoLeidas(req, res) {
    try {
      const idUsuario = req.user?.id;
      if (!idUsuario) {
        return res.status(401).json({ ok: false, mensaje: 'Usuario no autenticado' });
      }

      const count = await NotificationModel.countNoLeidas(idUsuario);
      res.json({ ok: true, noLeidas: count });
    } catch (err) {
      console.error('Error al contar notificaciones no leídas:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al contar notificaciones' });
    }
  },

  /**
   * Marca una notificación propia como leída.
   * Si no pertenece al usuario o no existe, retorna 404.
   */
  async marcarLeida(req, res) {
    try {
      const idUsuario = req.user?.id;
      if (!idUsuario) {
        return res.status(401).json({ ok: false, mensaje: 'Usuario no autenticado' });
      }

      const { id } = req.params;
      const affected = await NotificationModel.marcarLeida(id, idUsuario);

      if (affected === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Notificación no encontrada o no pertenece al usuario autenticado',
        });
      }

      res.json({ ok: true, mensaje: 'Notificación marcada como leída' });
    } catch (err) {
      console.error('Error al marcar notificación como leída:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al marcar notificación' });
    }
  },

  /**
   * Marca todas las notificaciones pendientes del usuario autenticado como leídas.
   */
  async marcarTodasLeidas(req, res) {
    try {
      const idUsuario = req.user?.id;
      if (!idUsuario) {
        return res.status(401).json({ ok: false, mensaje: 'Usuario no autenticado' });
      }

      const affected = await NotificationModel.marcarTodasLeidas(idUsuario);
      res.json({
        ok: true,
        mensaje: 'Todas las notificaciones fueron marcadas como leídas',
        actualizadas: affected,
      });
    } catch (err) {
      console.error('Error al marcar todas las notificaciones:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al marcar notificaciones' });
    }
  },
};

function tiempoRelativo(fecha) {
  if (!fecha) return '';
  const diff = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diff / 60000);
  const hs = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  if (min < 1) return 'Hace instantes';
  if (min < 60) return `Hace ${min} min`;
  if (hs < 24) return `Hace ${hs}h`;
  return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
}

module.exports = notificationController;
