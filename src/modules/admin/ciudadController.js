const cityService = require('../../services/ciudadService');

const cityController = {
  async listar(req, res, next) {
    try {
      const esRutaAdmin = String(req.baseUrl || '').includes('/admin');
      if (esRutaAdmin) {
        const { estado, provincia, busqueda } = req.query || {};
        const resultado = await cityService.listAdmin({ estado, provincia, busqueda });
        return res.json({
          ok: true,
          data: resultado.ciudades,
          stats: resultado.stats,
        });
      }

      const ciudades = await cityService.listActive();
      res.json({ ok: true, data: ciudades });
    } catch (err) {
      next(err);
    }
  },

  async obtenerStats(req, res, next) {
    try {
      const resultado = await cityService.listAdmin({});
      res.json({ ok: true, data: resultado.stats });
    } catch (err) {
      next(err);
    }
  },

  async listarProvincias(req, res, next) {
    try {
      const provincias = cityService.getProvincias();
      res.json({ ok: true, data: provincias });
    } catch (err) {
      next(err);
    }
  },

  async listarLocalidades(req, res, next) {
    try {
      const { provincia, q, limit } = req.query;
      const localidades = await cityService.listLocalidades({ provincia, q, limit });
      res.json({ ok: true, data: localidades });
    } catch (err) {
      next(err);
    }
  },

  async registrarCiudad(req, res, next) {
    try {
      const { nombre, provincia } = req.body || {};
      const nueva = await cityService.createCityAdmin({
        nombre,
        provincia,
        idAdmin: req.user?.id || null,
      });

      res.status(201).json({
        ok: true,
        mensaje: `Localidad "${nueva.nombre}" (${nueva.provincia}) registrada correctamente en estado inactivo.`,
        data: nueva,
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

  async cambiarEstado(req, res, next) {
    try {
      const { activa, estado, id_institucion_principal, motivo } = req.body || {};
      let targetActiva;
      if (activa !== undefined) {
        targetActiva = Boolean(activa === true || activa === 1 || activa === '1');
      } else if (estado !== undefined) {
        targetActiva = String(estado).trim().toLowerCase() === 'activa';
      } else {
        return res.status(400).json({
          ok: false,
          mensaje: 'Debe indicar el estado operativo deseado (activa o inactiva).',
        });
      }

      const resultado = await cityService.cambiarEstadoCiudad({
        idCiudad: req.params.id,
        activa: targetActiva,
        idInstitucionPrincipal: id_institucion_principal,
        motivo,
        idAdmin: req.user?.id || null,
      });

      res.json({
        ok: true,
        mensaje: targetActiva
          ? `La ciudad "${resultado.nombre}" fue activada correctamente con "${resultado.institucion_principal_nombre}" como institución principal.`
          : `La ciudad "${resultado.nombre}" fue desactivada correctamente.`,
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

  async designarInstitucionPrincipal(req, res, next) {
    try {
      const { id_institucion } = req.body || {};
      const resultado = await cityService.designarInstitucionPrincipal({
        idCiudad: req.params.id,
        idInstitucion: id_institucion,
        idAdmin: req.user?.id || null,
      });

      res.json({
        ok: true,
        mensaje: `"${resultado.institucion_principal_nombre}" fue designada como institución principal de ${resultado.ciudad_nombre}.`,
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
};

module.exports = cityController;
