const ClaimModel = require('../../models/claimModel');
const { CLAIM_STATUSES } = require('../../constants/publication');

const claimController = {

  async stats(req, res) {
    try {
      const data = await ClaimModel.getStats();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error stats reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener estadísticas' });
    }
  },

  async ultimos(req, res) {
    try {
      const data = await ClaimModel.getUltimos(5);
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error ultimos reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener últimos reclamos' });
    }
  },

  async actividadMensual(req, res) {
    try {
      const data = await ClaimModel.getActividadMensual();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error actividad mensual:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener actividad mensual' });
    }
  },

  async porCategoria(req, res) {
    try {
      const data = await ClaimModel.getPorCategoria();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error reclamos por categoria:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamos por categoría' });
    }
  },

  async lista(req, res) {
    try {
      const { estado, pagina = 1, limite = 20 } = req.query;
      const result = await ClaimModel.getLista({
        estado: estado || null,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
      });
      res.json({
        ok: true,
        data: result.rows,
        total: result.total,
        totalPaginas: Math.ceil(result.total / parseInt(limite)),
      });
    } catch (err) {
      console.error('Error lista reclamos:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamos' });
    }
  },

  async detalle(req, res) {
    try {
      const reclamo = await ClaimModel.getById(req.params.id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      res.json({ ok: true, data: reclamo });
    } catch (err) {
      console.error('Error detalle reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener reclamo' });
    }
  },

  async actualizarEstado(req, res) {
    try {
      const { estado } = req.body;
      const estados = Object.values(CLAIM_STATUSES);
      if (!estados.includes(estado))
        return res.status(400).json({ ok: false, mensaje: 'Estado inválido' });
      const affected = await ClaimModel.updateEstado(req.params.id, estado);
      if (!affected) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });
      res.json({ ok: true });
    } catch (err) {
      console.error('Error actualizar estado:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al actualizar estado' });
    }
  },

  async reasignarInstitucion(req, res) {
    try {
      const { id } = req.params;
      const { id_institucion } = req.body;
      const idUsuarioAdmin = req.user.id;
      
      if (!id_institucion) {
        return res.status(400).json({ ok: false, mensaje: 'La institución destino es obligatoria' });
      }

      const reclamo = await ClaimModel.getById(id);
      if (!reclamo) return res.status(404).json({ ok: false, mensaje: 'Reclamo no encontrado' });

      const InstitutionModel = require('../../models/institutionModel');
      const institucion = await InstitutionModel.getById(id_institucion);
      
      if (!institucion) return res.status(404).json({ ok: false, mensaje: 'La institución destino no existe' });

      // Validar que la institucion pertenezca a la misma ciudad del reclamo
      if (Number(institucion.id_ciudad) !== Number(reclamo.id_ciudad)) {
        return res.status(400).json({ ok: false, mensaje: 'La institución destino debe pertenecer a la misma ciudad del reclamo' });
      }

      const instAntiguaId = reclamo.institucionId;
      const instAntiguaNombre = reclamo.institucionNombre || 'Ninguna';

      const affected = await ClaimModel.reasignarInstitucion(id, id_institucion);
      if (!affected) return res.status(500).json({ ok: false, mensaje: 'No se pudo actualizar el reclamo' });

      const HistorialModel = require('../../models/historialModel');
      const { HISTORIAL_EVENTS } = require('../../constants/publication');

      await HistorialModel.registrar({
        id_reclamo: id,
        id_usuario: idUsuarioAdmin,
        tipo_evento: HISTORIAL_EVENTS.REASIGNACION,
        detalle: `Reasignado administrativamente. Anterior: ${instAntiguaNombre} (ID ${instAntiguaId || 'N/A'}) -> Nueva: ${institucion.nombre} (ID ${id_institucion}).`,
        estado_nuevo: reclamo.estado,
      });

      res.json({ ok: true, mensaje: 'Reclamo reasignado exitosamente' });
    } catch (err) {
      console.error('Error al reasignar reclamo:', err);
      res.status(500).json({ ok: false, mensaje: 'Error interno al reasignar institución' });
    }
  }
};

module.exports = claimController;
