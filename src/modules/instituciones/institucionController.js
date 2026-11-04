const InstitutionModel = require('./institucionModel');
const emailService     = require('../../services/emailService');

const institutionController = {

  async listar(req, res, next) {
    try {
      const { estado, id_ciudad, busqueda, pagina = 1, limite = 20 } = req.query;
      const result = await InstitutionModel.getAll({ estado, id_ciudad, busqueda, pagina, limite });
      res.json({
        ok: true,
        data: result.rows,
        total: result.total,
        pagina: result.pagina,
        limite: result.limite,
        totalPaginas: result.totalPaginas,
      });
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

      await InstitutionModel.verificar(req.params.id, req.user?.id || null);

      const { categorias, es_principal } = req.body || {};
      if (Array.isArray(categorias)) {
        await InstitutionModel.actualizarCategorias(req.params.id, categorias, req.user?.id || null);
      }
      if (es_principal === true && institucion.id_ciudad) {
        await InstitutionModel.setPrincipalDeCiudad(institucion.id_ciudad, req.params.id, req.user?.id || null);
      }

      // Enviar email de aprobación
      try {
        await emailService.enviarAprobacionInstitucion(institucion.email, institucion.nombre);
      } catch (emailErr) {
        console.error('Error enviando email de aprobación:', emailErr.message);
      }

      res.json({ ok: true, mensaje: 'Institución verificada correctamente' });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
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

      const motivoLimpio = motivo.trim();
      await InstitutionModel.rechazar(req.params.id, motivoLimpio, req.user?.id || null);

      // Revocar refresh tokens activos del usuario institucional rechazado/inhabilitado
      if (institucion.id_usuario) {
        try {
          const RefreshTokenModel = require('../usuarios/models/refreshTokenModel');
          await RefreshTokenModel.deleteByUserId(institucion.id_usuario);
        } catch (_) {}
      }

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

  async cambiarEstado(req, res, next) {
    try {
      const { id } = req.params;
      let { activo, estado, motivo } = req.body || {};

      if (activo === undefined && estado !== undefined) {
        const est = String(estado).trim().toLowerCase();
        if (est === 'activa' || est === 'activo') activo = true;
        else if (est === 'suspendida' || est === 'inactiva' || est === 'inactivo') activo = false;
      }

      if (typeof activo !== 'boolean' && activo !== 0 && activo !== 1) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Debe especificarse si la institución pasa a estado activo o suspendido.',
        });
      }

      const targetActivo = Boolean(Number(activo) === 1 || activo === true);
      if (!targetActivo && (!motivo || !String(motivo).trim())) {
        return res.status(400).json({
          ok: false,
          mensaje: 'El motivo es obligatorio para suspender operativamente una institución.',
        });
      }

      const resultado = await InstitutionModel.cambiarEstadoOperativo(id, {
        activo: targetActivo,
        motivo: motivo ? String(motivo).trim() : null,
        idAdmin: req.user?.id || null,
      });

      if (!targetActivo && resultado?.id_usuario) {
        try {
          const RefreshTokenModel = require('../usuarios/models/refreshTokenModel');
          await RefreshTokenModel.deleteByUserId(resultado.id_usuario);
        } catch (_) {}
      }

      const msgReclamos =
        !targetActivo && resultado.reclamos_reasignados > 0
          ? ` Se reasignaron automáticamente ${resultado.reclamos_reasignados} reclamo(s) abierto(s) a la institución principal de la ciudad.`
          : '';

      res.json({
        ok: true,
        mensaje: targetActivo
          ? 'Institución rehabilitada correctamente.'
          : `Institución suspendida correctamente.${msgReclamos}`,
        data: resultado,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          ok: false,
          mensaje: err.message,
          ...(err.codigo ? { codigo: err.codigo } : {}),
        });
      }
      next(err);
    }
  },

  async obtenerCategorias(req, res, next) {
    try {
      const institucion = await InstitutionModel.getById(req.params.id);
      if (!institucion) {
        return res.status(404).json({ ok: false, mensaje: 'Institución no encontrada' });
      }
      const data = await InstitutionModel.getCategoriasByInstitucion(req.params.id);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async actualizarCategorias(req, res, next) {
    try {
      const { categorias } = req.body || {};
      if (!Array.isArray(categorias)) {
        return res.status(400).json({
          ok: false,
          mensaje: 'El campo categorias debe ser un arreglo de identificadores válidos.',
        });
      }

      await InstitutionModel.actualizarCategorias(req.params.id, categorias, req.user?.id || null);
      const actualizadas = await InstitutionModel.getCategoriasByInstitucion(req.params.id);

      res.json({
        ok: true,
        mensaje: 'Categorías autorizadas actualizadas correctamente.',
        data: actualizadas,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  },

  async designarPrincipal(req, res, next) {
    try {
      const institucion = await InstitutionModel.getById(req.params.id);
      if (!institucion) {
        return res.status(404).json({ ok: false, mensaje: 'Institución no encontrada' });
      }

      if (
        Number(institucion.verificada) !== 1 ||
        institucion.status === 'rejected' ||
        Number(institucion.activo) !== 1
      ) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Solo una institución verificada, aprobada y activa puede ser designada como institución principal de su ciudad.',
        });
      }

      if (!institucion.id_ciudad) {
        return res.status(400).json({
          ok: false,
          mensaje: 'La institución no posee una ciudad operativa asignada.',
        });
      }

      await InstitutionModel.setPrincipalDeCiudad(
        institucion.id_ciudad,
        institucion.id_institucion,
        req.user?.id || null
      );

      res.json({
        ok: true,
        mensaje: `"${institucion.nombre}" fue designada como institución principal de ${institucion.ciudad_nombre || 'la ciudad'}.`,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ ok: false, mensaje: err.message });
      }
      next(err);
    }
  },
};

module.exports = institutionController;