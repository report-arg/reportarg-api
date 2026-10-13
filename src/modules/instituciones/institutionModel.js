const db = require('../../config/db');

const InstitutionModel = {

  async getByUserId(userId) {
    const [institutions] = await db.query('SELECT id_institucion FROM instituciones WHERE id_usuario = ?', [userId]);
    return institutions[0] || null;
  },

  async create(connection, { id_usuario, nombre, tipo, telefono, provincia, ciudad, zona, direccion, status, id_ciudad }) {
    const executor = connection || db;
    await executor.query(
      `INSERT INTO instituciones (id_usuario, nombre, tipo, telefono, provincia, ciudad, zona, direccion, status, id_ciudad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_usuario, nombre, tipo, telefono, provincia, ciudad, zona, direccion, status, id_ciudad]
    );
  },

  async getAll({ estado, busqueda, pagina = 1, limite = 20 } = {}) {
    let where = ' WHERE 1=1';
    const params = [];

    if (estado === 'pendiente') {
      where += ' AND i.verificada = 0';
    } else if (estado === 'verificada') {
      where += ' AND i.verificada = 1';
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
        i.id_ciudad,
        i.direccion,
        i.telefono,
        i.verificada,
        i.fecha_verificacion,
        i.foto_perfil,
        u.id_usuario,
        u.email,
        u.activo,
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
        i.id_ciudad,
        i.direccion,
        i.telefono,
        i.verificada,
        i.fecha_verificacion,
        i.foto_perfil,
        u.id_usuario,
        u.email,
        u.activo,
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

  async verificar(id) {
    const [result] = await db.query(`
      UPDATE instituciones
      SET verificada = 1, fecha_verificacion = NOW()
      WHERE id_institucion = ?
    `, [id]);

    // Asegurar consistencia del rol institucional en usuarios si no era admin
    await db.query(`
      UPDATE usuarios u
      INNER JOIN instituciones i ON i.id_usuario = u.id_usuario
      SET u.tipo_usuario = 'institucion'
      WHERE i.id_institucion = ? AND u.tipo_usuario != 'admin'
    `, [id]);

    return result.affectedRows;
  },

  async rechazar(id) {
    const [result] = await db.query(`
      UPDATE instituciones
      SET verificada = 0, fecha_verificacion = NULL
      WHERE id_institucion = ?
    `, [id]);
    return result.affectedRows;
  },

  async getStats() {
    const [[total]]       = await db.query(`SELECT COUNT(*) AS total FROM instituciones`);
    const [[verificadas]] = await db.query(`SELECT COUNT(*) AS total FROM instituciones WHERE verificada = 1`);
    const [[pendientes]]  = await db.query(`SELECT COUNT(*) AS total FROM instituciones WHERE verificada = 0`);
    return {
      total:       total.total,
      verificadas: verificadas.total,
      pendientes:  pendientes.total,
    };
  },

  /**
   * Obtiene la institución principal de una ciudad determinada (HU-05)
   */
  async getPrincipalDeCiudad(idCiudad) {
    const [rows] = await db.query(
      `SELECT i.id_institucion AS id, i.nombre
       FROM instituciones i
       WHERE i.id_ciudad = ? AND i.es_principal = 1
       LIMIT 1`,
      [idCiudad]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene la institución asignada a una categoría en una ciudad (HU-04)
   */
  async getPorCategoriaYCiudad(idCategoria, idCiudad) {
    if (!idCiudad) return null;

    const [rows] = await db.query(
      `SELECT i.id_institucion AS id, i.nombre
       FROM instituciones i
       INNER JOIN institucion_categorias ic ON ic.id_institucion = i.id_institucion
       WHERE ic.id_categoria = ? AND i.id_ciudad = ?
       LIMIT 1`,
      [idCategoria, idCiudad]
    );
    return rows[0] || null;
  },


  /**
   * Define la institución principal de una ciudad asegurando unicidad (HU-05)
   */
  async setPrincipalDeCiudad(idCiudad, idInstitucion) {
    await db.query(`UPDATE instituciones SET es_principal = 0 WHERE id_ciudad = ?`, [idCiudad]);
    const [result] = await db.query(
      `UPDATE instituciones SET es_principal = 1 WHERE id_institucion = ? AND id_ciudad = ?`,
      [idInstitucion, idCiudad]
    );
    return result.affectedRows;
  }
};

module.exports = InstitutionModel;