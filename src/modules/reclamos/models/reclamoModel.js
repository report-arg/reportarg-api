const db = require('../../../config/db');
const { CLAIM_STATUSES } = require('../../../constants/publication');
const { seguimiento, compararAtencion } = require('../services/claimTrackingService');

const ClaimModel = {

  /**
   * Cuenta la cantidad de reclamos en estado 'Pendiente' creados por un ciudadano. (Limitado por BUSINESS_RULES.CLAIM_MAX_PENDING_PER_CITIZEN)
   * @param {number} idUsuario
   */
  async countPendientesByUsuario(idUsuario) {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS total FROM reclamos WHERE id_usuario = ? AND estado = ?`,
      [idUsuario, CLAIM_STATUSES.PENDIENTE]
    );
    return row.total;
  },

  /**
   * Crea un nuevo reclamo público o privado (HU-01, HU-02, HU-03)
   */
  async crear({ titulo, descripcion, id_categoria, id_usuario, id_ciudad, id_institucion = null, direccion, latitud, longitud, visibilidad = 'publico', imagen = null }) {
    if (!id_ciudad) {
      throw new Error('id_ciudad es obligatorio para registrar un reclamo.');
    }

    const [result] = await db.query(
      `INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, id_ciudad, id_institucion, direccion, latitud, longitud, visibilidad, imagen, estado, fecha_creacion, fecha_ultimo_cambio_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        titulo || null,
        descripcion || null,
        id_categoria,
        id_usuario,
        id_ciudad,
        id_institucion,
        direccion || null,
        latitud ?? null,
        longitud ?? null,
        visibilidad,
        imagen || null,
        CLAIM_STATUSES.PENDIENTE
      ]
    );
    return result.insertId;
  },


  /**
   * Obtiene todos los reclamos propios del ciudadano autenticado (HU-06)
   */
  async getByUsuario(idUsuario, { estado = null, categoria = null, orderBy = 'recientes' } = {}) {
    let orderClause = 'ORDER BY r.fecha_creacion DESC';
    if (orderBy === 'impacto') {
      orderClause = 'ORDER BY afectadosCount DESC, r.fecha_creacion DESC';
    } else if (orderBy === 'antiguos') {
      orderClause = 'ORDER BY COALESCE(r.fecha_ultimo_cambio_estado, r.fecha_creacion) ASC, r.id_reclamo ASC';
    } else if (orderBy === 'recientes') {
      orderClause = 'ORDER BY COALESCE(r.fecha_ultimo_cambio_estado, r.fecha_creacion) DESC';
    }

    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.visibilidad,
        r.editado,
        r.fecha_ultimo_cambio_estado,
        r.direccion,
        r.latitud,
        r.longitud,
        r.fecha_creacion,
        c.id_categoria   AS categoriaId,
        c.nombre         AS categoriaNombre,
        inst.id_institucion AS institucionId,
        inst.nombre      AS institucionNombre,
        (SELECT COUNT(*) FROM reclamos_afectados ra WHERE ra.id_reclamo = r.id_reclamo) AS afectadosCount,
        (SELECT COUNT(*) FROM reclamos_actualizaciones rac WHERE rac.id_reclamo = r.id_reclamo) AS actualizacionesCount
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      LEFT JOIN instituciones inst ON inst.id_institucion = r.id_institucion
      WHERE r.id_usuario = ?
        ${estado ? "AND r.estado = ?" : ""}
        ${categoria ? "AND r.id_categoria = ?" : ""}
      ${orderClause}
    `, [idUsuario, ...(estado ? [estado] : []), ...(categoria ? [categoria] : [])]);
    const data = rows.map(r => seguimiento(r));
    return orderBy === 'atencion' ? data.sort(compararAtencion) : data;
  },

  /**
   * Obtiene únicamente los reclamos públicos de una ciudad determinada (HU-07)
   */
  async getPublicosPorCiudad(idCiudad, idUsuarioActual = null, { estado = null, categoria = null } = {}) {
    if (!idCiudad) return [];

    let isAfectadoQuery = 'FALSE AS isAfectado';
    const params = [idCiudad];

    if (idUsuarioActual) {
      isAfectadoQuery = 'EXISTS(SELECT 1 FROM reclamos_afectados ra2 WHERE ra2.id_reclamo = r.id_reclamo AND ra2.id_usuario = ?) AS isAfectado';
      params.unshift(idUsuarioActual); // Prepend to match position in SELECT
    }

    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.visibilidad,
        r.editado,
        r.fecha_ultimo_cambio_estado,
        r.direccion,
        r.latitud,
        r.longitud,
        r.fecha_creacion,
        r.imagen,
        r.id_usuario,
        c.id_categoria   AS categoriaId,
        c.nombre         AS categoriaNombre,
        inst.id_institucion AS institucionId,
        inst.nombre      AS institucionNombre,
        COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), u.email) AS autorNombre,
        u.email          AS autorEmail,
        ${isAfectadoQuery},
        (SELECT COUNT(*) FROM reclamos_afectados ra WHERE ra.id_reclamo = r.id_reclamo) AS afectadosCount,
        (SELECT COUNT(*) FROM reclamos_actualizaciones rac WHERE rac.id_reclamo = r.id_reclamo) AS actualizacionesCount
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      LEFT JOIN instituciones inst ON inst.id_institucion = r.id_institucion
      LEFT JOIN usuarios     u    ON u.id_usuario     = r.id_usuario
      LEFT JOIN ciudadanos   ci   ON ci.id_usuario    = r.id_usuario
      WHERE r.visibilidad = 'publico' AND r.id_ciudad = ?
        ${estado ? 'AND r.estado = ?' : ''}
        ${categoria ? 'AND r.id_categoria = ?' : ''}
      ORDER BY r.fecha_creacion DESC
    `, [...params, ...(estado ? [estado] : []), ...(categoria ? [categoria] : [])]);
    return rows.map(r => seguimiento(r));
  },


  /**
   * Obtiene el detalle completo de un reclamo por su ID (HU-08)
   */
  async getById(id) {
    const [rows] = await db.query(`
      SELECT
        r.id_reclamo     AS id,
        r.titulo,
        r.descripcion,
        r.estado,
        r.visibilidad,
        r.editado,
        r.id_ciudad,
        r.id_institucion,
        r.direccion,
        r.latitud,
        r.longitud,
        r.motivo_cancelacion,
        r.cancelado_por_tipo,
        r.mensaje_resolucion,
        r.fecha_resolucion,
        r.fecha_ultimo_cambio_estado,
        r.fecha_creacion,
        r.imagen,
        r.id_usuario,
        c.id_categoria   AS categoriaId,
        c.nombre         AS categoriaNombre,
        c.descripcion    AS categoriaDesc,
        inst.id_institucion AS institucionId,
        inst.nombre      AS institucionNombre,
        inst.es_principal AS institucionEsPrincipal,
        COALESCE(CONCAT(ci.nombre, ' ', ci.apellido), u.email) AS autorNombre,
        u.email          AS autorEmail,
        (SELECT COUNT(*) FROM reclamos_afectados ra WHERE ra.id_reclamo = r.id_reclamo) AS afectadosCount,
        (SELECT COUNT(*) FROM reclamos_actualizaciones rac WHERE rac.id_reclamo = r.id_reclamo) AS actualizacionesCount
      FROM reclamos r
      LEFT JOIN categorias   c    ON c.id_categoria   = r.id_categoria
      LEFT JOIN usuarios     u    ON u.id_usuario     = r.id_usuario
      LEFT JOIN ciudadanos   ci   ON ci.id_usuario    = r.id_usuario
      LEFT JOIN instituciones inst ON inst.id_institucion = r.id_institucion
      WHERE r.id_reclamo = ?
    `, [id]);
    return rows[0] ? seguimiento(rows[0]) : null;
  },

  /**
   * Actualiza el estado de un reclamo
   */
  async updateEstado(id, estado) {
    const [result] = await db.query(
      `UPDATE reclamos
       SET estado = ?, fecha_ultimo_cambio_estado = NOW()
       WHERE id_reclamo = ?`,
      [estado, id]
    );
    return result.affectedRows;
  },

  /**
   * Permite al autor editar su reclamo ÚNICAMENTE mientras se encuentra en estado 'Pendiente'
   */
  async editar(id, idUsuario, { titulo, descripcion, direccion }) {
    const [result] = await db.query(
      `UPDATE reclamos
       SET titulo = ?, descripcion = ?, direccion = ?, editado = 1
       WHERE id_reclamo = ? AND id_usuario = ? AND estado = ?`,
      [titulo, descripcion, direccion, id, idUsuario, CLAIM_STATUSES.PENDIENTE]
    );
    return result.affectedRows;
  },

  /**
   * Permite al autor cancelar su reclamo ÚNICAMENTE mientras se encuentra en estado 'Pendiente'
   */
  async cancelar(id, idUsuario, motivo) {
    const [result] = await db.query(
      `UPDATE reclamos
       SET estado = ?, motivo_cancelacion = ?, cancelado_por_tipo = 'ciudadano', fecha_ultimo_cambio_estado = NOW()
       WHERE id_reclamo = ? AND id_usuario = ? AND estado = ?`,
      [CLAIM_STATUSES.CANCELADO, motivo || 'Cancelado por el ciudadano', id, idUsuario, CLAIM_STATUSES.PENDIENTE]
    );
    return result.affectedRows;
  },

  /**
   * Obtiene los reclamos con ubicación para el mapa público (excluyendo reclamos privados HU-02)
   */
  async getParaMapa(idCiudad) {
    if (!idCiudad) return [];

    const [rows] = await db.query(`
      SELECT
        r.id_reclamo AS id,
        r.titulo,
        r.estado,
        r.direccion,
        r.latitud,
        r.longitud,
        c.nombre AS categoriaNombre
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      WHERE r.latitud IS NOT NULL AND r.longitud IS NOT NULL
        AND r.visibilidad = 'publico'
        AND r.id_ciudad = ?
      ORDER BY r.fecha_creacion DESC
    `, [idCiudad]);
    return rows;
  },

  /**
   * Permite a la institución resolver el reclamo
   */
  async resolver(id, idInstitucion, mensaje, evidenciaUrl = null) {
    const [result] = await db.query(
      `UPDATE reclamos
       SET estado = ?, mensaje_resolucion = ?, imagen = COALESCE(?, imagen), fecha_resolucion = NOW(), fecha_ultimo_cambio_estado = NOW()
       WHERE id_reclamo = ? AND id_institucion = ? AND estado = ?`,
      [CLAIM_STATUSES.RESUELTO, mensaje, evidenciaUrl, id, idInstitucion, CLAIM_STATUSES.EN_PROCESO]
    );
    return result.affectedRows;
  },

  /**
   * Permite a la institución cancelar el reclamo
   */
  async cancelarInstitucion(id, idInstitucion, motivo) {
    const [result] = await db.query(
      `UPDATE reclamos
       SET estado = ?, motivo_cancelacion = ?, cancelado_por_tipo = 'institucion', fecha_ultimo_cambio_estado = NOW()
       WHERE id_reclamo = ? AND id_institucion = ?`,
      [CLAIM_STATUSES.CANCELADO, motivo, id, idInstitucion]
    );
    return result.affectedRows;
  },

  /**
   * Permite al autor reabrir el reclamo
   */
  async reabrir(id, idUsuario, nuevoEstado = CLAIM_STATUSES.EN_REVISION) {
    const [result] = await db.query(
      `UPDATE reclamos
       SET estado = ?, motivo_cancelacion = NULL, cancelado_por_tipo = NULL, fecha_ultimo_cambio_estado = NOW()
       WHERE id_reclamo = ? AND id_usuario = ? AND estado IN (?, ?)`,
      [nuevoEstado, id, idUsuario, CLAIM_STATUSES.RESUELTO, CLAIM_STATUSES.CANCELADO]
    );
    return result.affectedRows;
  },

  /**
   * Obtiene la bandeja de entrada para una institución (HU-09)
   */
  async getBandejaInstitucion(idInstitucion, estado = null, idCategoria = null, orderBy = 'recientes', idCiudad = null) {
    if (!idInstitucion) return [];
    let query = `
      SELECT
        r.id_reclamo AS id,
        r.titulo,
        r.estado,
        r.visibilidad,
        r.fecha_creacion,
        r.fecha_ultimo_cambio_estado,
        r.direccion,
        c.nombre AS categoriaNombre,
        (SELECT COUNT(*) FROM reclamos_afectados ra WHERE ra.id_reclamo = r.id_reclamo) AS afectadosCount
      FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      WHERE r.id_institucion = ?
    `;
    const params = [idInstitucion];
    if (idCiudad) { query += ` AND r.id_ciudad = ?`; params.push(idCiudad); }

    if (estado && estado !== 'Todos') {
      query += ` AND r.estado = ?`;
      params.push(estado);
    }
    
    if (idCategoria && idCategoria !== 'Todas') {
      query += ` AND r.id_categoria = ?`;
      params.push(idCategoria);
    }

    if (orderBy === 'impacto') {
      query += ` ORDER BY afectadosCount DESC, r.fecha_ultimo_cambio_estado DESC`;
    } else if (orderBy === 'antiguos') {
      query += ` ORDER BY COALESCE(r.fecha_ultimo_cambio_estado, r.fecha_creacion) ASC, r.id_reclamo ASC`;
    } else {
      query += ` ORDER BY r.fecha_ultimo_cambio_estado DESC`;
    }

    const [rows] = await db.query(query, params);
    const data = rows.map(r => seguimiento(r));
    return orderBy === 'atencion' ? data.sort(compararAtencion) : data;
  },

  /**
   * Verifica si un usuario está afectado por un reclamo
   */
  async isAfectado(idReclamo, idUsuario) {
    const [rows] = await db.query(
      `SELECT 1 FROM reclamos_afectados WHERE id_reclamo = ? AND id_usuario = ?`,
      [idReclamo, idUsuario]
    );
    return rows.length > 0;
  },

  /**
   * Marca a un usuario como afectado por un reclamo
   */
  async marcarAfectado(idReclamo, idUsuario) {
    const [result] = await db.query(
      `INSERT IGNORE INTO reclamos_afectados (id_reclamo, id_usuario) VALUES (?, ?)`,
      [idReclamo, idUsuario]
    );
    return result.affectedRows;
  },

  /**
   * Quita a un usuario como afectado por un reclamo
   */
  async quitarAfectado(idReclamo, idUsuario) {
    const [result] = await db.query(
      `DELETE FROM reclamos_afectados WHERE id_reclamo = ? AND id_usuario = ?`,
      [idReclamo, idUsuario]
    );
    return result.affectedRows;
  },

  /**
   * Permite al administrador reasignar la institución responsable
   */
  async reasignarInstitucion(idReclamo, idNuevaInstitucion, idAdmin, motivo = '') {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[reclamo]] = await connection.query('SELECT id_usuario, titulo, id_ciudad, id_institucion, estado FROM reclamos WHERE id_reclamo = ? FOR UPDATE', [idReclamo]);
      if (!reclamo) throw Object.assign(new Error('Reclamo no encontrado'), { status: 404 });
      const [[institucion]] = await connection.query('SELECT id_institucion, id_ciudad, nombre FROM instituciones WHERE id_institucion = ? FOR UPDATE', [idNuevaInstitucion]);
      if (!institucion) throw Object.assign(new Error('La institución destino no existe'), { status: 404 });
      if (!reclamo.id_ciudad || Number(institucion.id_ciudad) !== Number(reclamo.id_ciudad)) {
        throw Object.assign(new Error('La institución destino debe pertenecer a la misma ciudad del reclamo'), { status: 400 });
      }
      if (Number(reclamo.id_institucion) === Number(idNuevaInstitucion)) {
        throw Object.assign(new Error('El reclamo ya está asignado a esa institución'), { status: 400 });
      }
      await connection.query('UPDATE reclamos SET id_institucion = ? WHERE id_reclamo = ?', [idNuevaInstitucion, idReclamo]);
      const HistorialModel = require('./historialModel');
      await HistorialModel.registrar({ id_reclamo: idReclamo, id_usuario: idAdmin, tipo_evento: 'REASIGNACION',
        detalle: `Institución anterior ID ${reclamo.id_institucion || 'Sin asignar'} -> nueva ${institucion.nombre} (ID ${idNuevaInstitucion}). Motivo: ${motivo || 'Intervención administrativa'}`,
        estado_anterior: reclamo.estado, estado_nuevo: reclamo.estado }, connection);

      const NotificationService = require('../../notificaciones/notificationService');
      if (reclamo.id_usuario) {
        await NotificationService.notificarReasignacion({
          idReclamo,
          idUsuarioAutor: reclamo.id_usuario,
          tituloReclamo: reclamo.titulo,
          nombreInstitucionDestino: institucion.nombre,
          actorId: idAdmin,
        }, connection);
      }

      await NotificationService.notificarAsignacionInstitucional({
        idReclamo,
        idInstitucion: idNuevaInstitucion,
        tituloReclamo: reclamo.titulo,
        actorId: idAdmin,
        motivo,
      }, connection);

      await connection.commit();
      return 1;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  },

  async getStats() {
    const [[row]] = await db.query(`SELECT COUNT(*) AS total,
      SUM(estado = ?) AS pendientes, SUM(estado = ?) AS enRevision,
      SUM(estado = ?) AS enProceso, SUM(estado = ?) AS resueltos,
      SUM(estado = ?) AS cancelados FROM reclamos`, Object.values(CLAIM_STATUSES));
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value || 0)]));
  },
  async getUltimos(limite = 5) {
    const { rows } = await this.getLista({ pagina: 1, limite });
    return rows;
  },
  async getLista({ estado = null, pagina = 1, limite = 20 }) {
    const where = estado ? 'WHERE r.estado = ?' : '';
    const params = estado ? [estado] : [];
    const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM reclamos r ${where}`, params);
    const [rows] = await db.query(`SELECT r.id_reclamo AS id, r.titulo, r.estado, r.fecha_creacion,
      r.id_ciudad, r.id_institucion, c.nombre AS categoriaNombre, i.nombre AS institucionNombre,
      u.email AS autorNombre FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
      LEFT JOIN instituciones i ON i.id_institucion = r.id_institucion
      LEFT JOIN usuarios u ON u.id_usuario = r.id_usuario
      ${where} ORDER BY r.fecha_creacion DESC, r.id_reclamo DESC LIMIT ? OFFSET ?`, [...params, limite, (pagina - 1) * limite]);
    return { rows, total: Number(count.total) };
  },
  async getActividadMensual() {
    const [rows] = await db.query(`SELECT MONTH(fecha_creacion) AS mes, COUNT(*) AS total FROM reclamos
      WHERE YEAR(fecha_creacion) = YEAR(CURRENT_DATE()) GROUP BY MONTH(fecha_creacion) ORDER BY mes`);
    return rows;
  },
  async getPorCategoria() {
    const [rows] = await db.query(`SELECT c.nombre AS categoria, COUNT(*) AS cantidad FROM reclamos r
      LEFT JOIN categorias c ON c.id_categoria = r.id_categoria GROUP BY c.id_categoria, c.nombre ORDER BY cantidad DESC`);
    return rows;
  }
};
module.exports = ClaimModel;
