const InstitutionModel = require('./institutionModel');
const emailService     = require('../../services/emailService');

const institutionController = {

  async listar(req, res, next) {
    try {
      const { estado } = req.query;
      const instituciones = await InstitutionModel.getAll({ estado });
      res.json({ ok: true, data: instituciones });
    } catch (err) {
      next(err);
    }
  },

  async obtener(req, res, next) {
    try {
      const institucion = await InstitutionModel.getById(req.params.id);
      if (!institucion) {
        return res.status(404).json({ ok: false, mensaje: 'Institución no encontrada' });
      }
      res.json({ ok: true, data: institucion });
    } catch (err) {
      next(err);
    }
  },

  async verificar(req, res, next) {
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
      next(err);
    }
  },

  async rechazar(req, res, next) {
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
      next(err);
    }
  },

  async stats(req, res, next) {
    try {
      const data = await InstitutionModel.getStats();
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = institutionController;