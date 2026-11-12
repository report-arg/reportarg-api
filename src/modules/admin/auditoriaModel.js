const db = require('../../config/db');

const AuditoriaModel = {
  /**
   * Registra un evento de auditoría administrativa o institucional.
   * Soporta ejecutarse dentro de una transacción activa (connection) o sobre el pool general (db).
   */
  async registrar(
    {
      idActor = null,
      entidadTipo,
      entidadId,
      accion,
      motivo = null,
      datosPrevios = null,
      datosNuevos = null,
    },
    connection = null
  ) {
    if (!entidadTipo || entidadId === undefined || entidadId === null || !accion) {
      return null;
    }

    const executor = connection || db;
    const previosJson =
      datosPrevios !== null && datosPrevios !== undefined
        ? JSON.stringify(datosPrevios)
        : null;
    const nuevosJson =
      datosNuevos !== null && datosNuevos !== undefined
        ? JSON.stringify(datosNuevos)
        : null;

    const [result] = await executor.query(
      `INSERT INTO admin_auditoria
        (id_actor, entidad_tipo, entidad_id, accion, motivo, datos_previos, datos_nuevos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        idActor || null,
        String(entidadTipo).trim(),
        Number(entidadId),
        String(accion).trim(),
        motivo ? String(motivo).trim() : null,
        previosJson,
        nuevosJson,
      ]
    );

    return result && result.insertId ? result.insertId : null;
  },

  /**
   * Obtiene el historial de auditoría de una entidad específica.
   */
  async getByEntidad(entidadTipo, entidadId, limite = 50) {
    const limiteNum = Math.min(200, Math.max(1, parseInt(limite, 10) || 50));
    const [rows] = await db.query(
      `SELECT
         a.id_auditoria AS id,
         a.id_actor,
         COALESCE(CONCAT(c.nombre, ' ', c.apellido), u.email, 'Administrador') AS actor_nombre,
         u.email AS actor_email,
         u.tipo_usuario AS actor_rol,
         a.entidad_tipo,
         a.entidad_id,
         a.accion,
         a.motivo,
         a.datos_previos,
         a.datos_nuevos,
         a.fecha_creacion
       FROM admin_auditoria a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_actor
       LEFT JOIN ciudadanos c ON c.id_usuario = a.id_actor
       WHERE a.entidad_tipo = ? AND a.entidad_id = ?
       ORDER BY a.fecha_creacion DESC, a.id_auditoria DESC
       LIMIT ?`,
      [String(entidadTipo).trim(), Number(entidadId), limiteNum]
    );

    return Array.isArray(rows) ? rows : [];
  },

  /**
   * Lista eventos de auditoría globales con filtros opcionales y paginación.
   */
  async getAll({ entidadTipo = null, entidadId = null, accion = null, pagina = 1, limite = 25 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (entidadTipo) {
      where += ' AND a.entidad_tipo = ?';
      params.push(String(entidadTipo).trim());
    }
    if (entidadId !== null && entidadId !== undefined && entidadId !== '') {
      where += ' AND a.entidad_id = ?';
      params.push(Number(entidadId));
    }
    if (accion) {
      where += ' AND a.accion = ?';
      params.push(String(accion).trim());
    }

    const [[countRow]] = await db.query(
      `SELECT COUNT(*) AS total FROM admin_auditoria a ${where}`,
      params
    );
    const total = countRow && countRow.total !== undefined ? Number(countRow.total) : 0;

    const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
    const limiteNum = Math.min(100, Math.max(1, parseInt(limite, 10) || 25));
    const offset = (paginaNum - 1) * limiteNum;

    const [rows] = await db.query(
      `SELECT
         a.id_auditoria AS id,
         a.id_actor,
         COALESCE(CONCAT(c.nombre, ' ', c.apellido), u.email, 'Administrador') AS actor_nombre,
         u.email AS actor_email,
         u.tipo_usuario AS actor_rol,
         a.entidad_tipo,
         a.entidad_id,
         a.accion,
         a.motivo,
         a.datos_previos,
         a.datos_nuevos,
         a.fecha_creacion
       FROM admin_auditoria a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_actor
       LEFT JOIN ciudadanos c ON c.id_usuario = a.id_actor
       ${where}
       ORDER BY a.fecha_creacion DESC, a.id_auditoria DESC
       LIMIT ? OFFSET ?`,
      [...params, limiteNum, offset]
    );

    return {
      rows: Array.isArray(rows) ? rows : [],
      total,
      pagina: paginaNum,
      limite: limiteNum,
      totalPaginas: Math.ceil(total / limiteNum) || 1,
    };
  },
};

module.exports = AuditoriaModel;

