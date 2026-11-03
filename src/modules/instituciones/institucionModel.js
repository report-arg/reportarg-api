const db = require('../../config/db');
const AuditoriaModel = require('../admin/auditoriaModel');

const InstitutionModel = {

  async getByUserId(userId) {
    const [institutions] = await db.query('SELECT id_institucion FROM instituciones WHERE id_usuario = ?', [userId]);
    return institutions[0] || null;
  },

  async create(connection, { id_usuario, nombre, tipo, cuit = null, nombre_contacto = null, telefono, provincia, ciudad, zona, direccion, status, id_ciudad }) {
    const executor = connection || db;
    await executor.query(
      `INSERT INTO instituciones (id_usuario, nombre, tipo, cuit, nombre_contacto, telefono, provincia, ciudad, zona, direccion, status, id_ciudad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_usuario, nombre, tipo, cuit, nombre_contacto, telefono, provincia, ciudad, zona, direccion, status || 'pending', id_ciudad]
    );
  },

  async getAll({ estado, id_ciudad, busqueda, pagina = 1, limite = 20 } = {}) {
    let where = ' WHERE 1=1';
    const params = [];

    if (estado === 'pendiente') {
      where += " AND i.verificada = 0 AND (i.status = 'pending' OR i.status IS NULL)";
    } else if (estado === 'verificada') {
      where += ' AND i.verificada = 1 AND u.activo = 1';
    } else if (estado === 'rechazada') {
      where += " AND i.status = 'rejected'";
    } else if (estado === 'suspendida') {
      where += ' AND i.verificada = 1 AND u.activo = 0';
    }

    if (id_ciudad && Number.isSafeInteger(Number(id_ciudad)) && Number(id_ciudad) > 0) {
      where += ' AND i.id_ciudad = ?';
      params.push(Number(id_ciudad));
    }

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      where += ` AND (
        i.nombre LIKE ?
        OR u.email LIKE ?
        OR i.tipo LIKE ?
        OR c.nombre LIKE ?
        OR c.provincia LIKE ?
        OR i.direccion LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    // Total de registros coincidentes
    const countSql = `
      SELECT COUNT(*) AS total
      FROM instituciones i
      INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
      LEFT JOIN ciudades c ON c.id_ciudad = i.id_ciudad
      ${where}
    `;
    const [[countResult]] = await db.query(countSql, params);
    const total = countResult ? countResult.total : 0;

    const parsedPagina = Math.max(1, parseInt(pagina, 10) || 1);
    const parsedLimite = Math.max(1, parseInt(limite, 10) || 20);
    const offset = (parsedPagina - 1) * parsedLimite;

    // Consulta de registros con relación territorial y contacto
    const dataSql = `
      SELECT
        i.id_institucion AS id,
        i.id_institucion,
        i.nombre,
        i.tipo,
        i.cuit,
        i.nombre_contacto,
        i.id_ciudad,
        i.zona,
        i.direccion,
        i.telefono,
        i.verificada,
        i.fecha_verificacion,
        i.status,
        i.motivo_rechazo,
        i.fecha_rechazo,
        i.es_principal,
        i.foto_perfil,
        u.id_usuario,
        u.email,
        u.activo,
        u.fecha_creacion AS creado_en,
        c.nombre AS ciudad_nombre,
        c.provincia AS provincia,
        c.activa AS ciudad_activa
      FROM instituciones i
      INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
      LEFT JOIN ciudades c ON c.id_ciudad = i.id_ciudad
      ${where}
      ORDER BY i.id_institucion DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, parsedLimite, offset];
    const [rows] = await db.query(dataSql, dataParams);

    return {
      rows,
      total,
      pagina: parsedPagina,
      limite: parsedLimite,
      totalPaginas: Math.ceil(total / parsedLimite) || 1,
    };
  },

  async getById(id) {
    const [rows] = await db.query(`
      SELECT
        i.id_institucion AS id,
        i.id_institucion,
        i.nombre,
        i.tipo,
        i.cuit,
        i.nombre_contacto,
        i.id_ciudad,
        i.zona,
        i.direccion,
        i.telefono,
        i.verificada,
        i.fecha_verificacion,
        i.status,
        i.motivo_rechazo,
        i.fecha_rechazo,
        i.es_principal,
        i.foto_perfil,
        u.id_usuario,
        u.email,
        u.activo,
        u.fecha_creacion AS creado_en,
        c.nombre AS ciudad_nombre,
        c.provincia AS provincia,
        c.activa AS ciudad_activa
      FROM instituciones i
      INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
      LEFT JOIN ciudades c ON c.id_ciudad = i.id_ciudad
      WHERE i.id_institucion = ?
    `, [id]);
    return rows[0] || null;
  },

  async verificar(id, idAdmin = null) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(`
        UPDATE instituciones
        SET verificada = 1,
            status = 'approved',
            fecha_verificacion = NOW(),
            motivo_rechazo = NULL,
            fecha_rechazo = NULL
        WHERE id_institucion = ?
      `, [id]);

      // Asegurar consistencia atómica del rol institucional en usuarios si no era admin
      await connection.query(`
        UPDATE usuarios u
        INNER JOIN instituciones i ON i.id_usuario = u.id_usuario
        SET u.tipo_usuario = 'institucion',
            u.activo = 1
        WHERE i.id_institucion = ? AND u.tipo_usuario != 'admin'
      `, [id]);

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'institucion',
          entidadId: Number(id),
          accion: 'VERIFICAR_INSTITUCION',
          datosNuevos: { verificada: 1, status: 'approved' },
        },
        connection
      );

      await connection.commit();
      return result ? result.affectedRows : 1;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async rechazar(id, motivo = null, idAdmin = null) {
    const motivoLimpio = motivo ? String(motivo).trim() : null;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(`
        UPDATE instituciones
        SET verificada = 0,
            status = 'rejected',
            motivo_rechazo = ?,
            fecha_rechazo = NOW(),
            fecha_verificacion = NULL
        WHERE id_institucion = ?
      `, [motivoLimpio, id]);

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'institucion',
          entidadId: Number(id),
          accion: 'RECHAZAR_INSTITUCION',
          motivo: motivoLimpio,
          datosNuevos: { verificada: 0, status: 'rejected', motivo_rechazo: motivoLimpio },
        },
        connection
      );

      await connection.commit();
      return result ? result.affectedRows : 1;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async getStats() {
    const [[total]]       = await db.query(`SELECT COUNT(*) AS total FROM instituciones`);
    const [[verificadas]] = await db.query(`SELECT COUNT(*) AS total FROM instituciones WHERE verificada = 1`);
    const [[pendientes]]  = await db.query(`SELECT COUNT(*) AS total FROM instituciones WHERE verificada = 0 AND (status IS NULL OR status = 'pending')`);
    return {
      total:       total.total,
      verificadas: verificadas.total,
      pendientes:  pendientes.total,
    };
  },

  /**
   * Obtiene la institución principal activa y verificada de una ciudad determinada (HU-05 / ADMIN-01)
   */
  async getPrincipalDeCiudad(idCiudad) {
    const [rows] = await db.query(
      `SELECT i.id_institucion AS id, i.nombre
       FROM instituciones i
       INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
       WHERE i.id_ciudad = ?
         AND i.es_principal = 1
         AND i.verificada = 1
         AND i.status = 'approved'
         AND u.activo = 1
       LIMIT 1`,
      [idCiudad]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene la institución verificada y activa asignada a una categoría en una ciudad (HU-04 / ADMIN-01)
   */
  async getPorCategoriaYCiudad(idCategoria, idCiudad) {
    if (!idCiudad) return null;

    const [rows] = await db.query(
      `SELECT i.id_institucion AS id, i.nombre
       FROM instituciones i
       INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
       INNER JOIN institucion_categorias ic ON ic.id_institucion = i.id_institucion
       WHERE ic.id_categoria = ?
         AND i.id_ciudad = ?
         AND i.verificada = 1
         AND i.status = 'approved'
         AND u.activo = 1
       LIMIT 1`,
      [idCategoria, idCiudad]
    );
    return rows[0] || null;
  },


  /**
   * Define la institución principal de una ciudad asegurando unicidad y validez en transacción (HU-05 / ADMIN-01)
   */
  async setPrincipalDeCiudad(idCiudad, idInstitucion, idAdmin = null) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE instituciones SET es_principal = 0 WHERE id_ciudad = ?`,
        [idCiudad]
      );
      const [result] = await connection.query(
        `UPDATE instituciones SET es_principal = 1 WHERE id_institucion = ? AND id_ciudad = ?`,
        [idInstitucion, idCiudad]
      );

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'ciudad',
          entidadId: Number(idCiudad),
          accion: 'DESIGNAR_INSTITUCION_PRINCIPAL',
          datosNuevos: { id_ciudad: Number(idCiudad), id_institucion: Number(idInstitucion) },
        },
        connection
      );

      await connection.commit();
      return result ? result.affectedRows : 1;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
};

module.exports = InstitutionModel;