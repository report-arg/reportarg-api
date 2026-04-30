const InstitutionModel = require('../../models/institutionModel');
const emailService     = require('../../config/emailService');

const institutionController = {

  async listar(req, res) {
    try {
      const { estado } = req.query;
      const instituciones = await InstitutionModel.getAll({ estado });
      res.json({ ok: true, data: instituciones });
    } catch (err) {
      console.error('Error listar instituciones:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener instituciones' });
    }
  },

  async obtener(req, res) {
    try {
      const institucion = await InstitutionModel.getById(req.params.id);
      if (!institucion) {
        return res.status(404).json({ ok: false, mensaje: 'Institución no encontrada' });
      }
      res.json({ ok: true, data: institucion });
    } catch (err) {
      console.error('Error obtener institucion:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener institución' });
    }
  },

  async verificar(req, res) {
    try {
      const institucion = await InstitutionModel.getById(req.params.id);
      if (!institucion) {
        return res.status(404).json({ ok: false, mensaje: 'Institución no encontrada' });
      }
      if (institucion.verificada) {
        return res.status(409).json({ ok: false, mensaje: 'La institución ya está verificada' });
      }

      await InstitutionModel.verificar(req.params.id);

      // Enviar email de aprobación
      try {
        await emailService.enviarAprobacionInstitucion(institucion.email, institucion.nombre);
      } catch (emailErr) {
        console.error('Error enviando email de aprobación:', emailErr.message);
      }

      res.json({ ok: true, mensaje: 'Institución verificada correctamente' });
    } catch (err) {
      console.error('Error verificar institucion:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al verificar institución' });
    }
  },

  async rechazar(req, res) {
    try {
      const { motivo } = req.body;

      if (!motivo?.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'El motivo de rechazo es obligatorio' });
      }

      const institucion = await InstitutionModel.getById(req.params.id);
      if (!institucion) {
        return res.status(404).json({ ok: false, mensaje: 'Institución no encontrada' });
      }

      await InstitutionModel.rechazar(req.params.id);

      // Enviar email de rechazo con motivo
      try {
        await emailService.enviarRechazoInstitucion(
          institucion.email,
          institucion.nombre,
          motivo
        );
      } catch (emailErr) {
        console.error('Error enviando email de rechazo:', emailErr.message);
      }

      res.json({ ok: true, mensaje: 'Institución rechazada correctamente' });
    } catch (err) {
      console.error('Error rechazar institucion:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al rechazar institución' });
    }
  },

  async stats(req, res) {
    try {
      const data = await InstitutionModel.getStats();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error stats instituciones:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener estadísticas' });
    }
  },
};

module.exports = institutionController;