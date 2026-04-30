const NotificationModel = require('../../models/notificationModel');

const notificationController = {

  async listar(req, res) {
  try {
    const idUsuario = req.usuario?.id_usuario || 1;
    const notifs    = await NotificationModel.getByUsuario(idUsuario);

    const data = notifs.map(n => ({
      id:     n.id,
      titulo: n.mensaje,
      sub:    "",
      tiempo: tiempoRelativo(n.fecha),
      leida:  !!n.leida,
    }));

    res.json({ ok: true, data });
  } catch (err) {
    console.error('Error listar notificaciones:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener notificaciones' });
  }
},

  async marcarLeida(req, res) {
    try {
      const idUsuario = req.usuario?.id_usuario || 1;
      await NotificationModel.marcarLeida(req.params.id, idUsuario);
      res.json({ ok: true, mensaje: 'Notificación marcada como leída' });
    } catch (err) {
      console.error('Error marcar leída:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al marcar notificación' });
    }
  },

  async marcarTodasLeidas(req, res) {
    try {
      const idUsuario = req.usuario?.id_usuario || 1;
      await NotificationModel.marcarTodasLeidas(idUsuario);
      res.json({ ok: true, mensaje: 'Todas las notificaciones marcadas como leídas' });
    } catch (err) {
      console.error('Error marcar todas leídas:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al marcar notificaciones' });
    }
  },
};

function tiempoRelativo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime();
  const min  = Math.floor(diff / 60000);
  const hs   = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  if (min < 60) return `Hace ${min} min`;
  if (hs  < 24) return `Hace ${hs}h`;
  return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
}

module.exports = notificationController;