const db = require('../config/db');

const UserModel = {

  // Listar todos con filtros opcionales
  async getAll({ busqueda, rol, estado } = {}) {
    let query = `
      SELECT 
      u.id_usuario AS id,
      u.email,
      u.tipo_usuario AS rol,
      CASE WHEN u.activo = 1 THEN 'activo' ELSE 'inactivo' END AS estado,
      u.fecha_creacion,
      COALESCE(
        CONCAT(c.nombre, ' ', c.apellido),
        i.nombre
      ) AS nombre,
      COALESCE(c.foto_perfil, i.foto_perfil) AS foto
      FROM usuarios u
      LEFT JOIN ciudadanos c ON c.id_usuario = u.id_usuario
      LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
      WHERE 1=1
    `;
    const params = [];

    if (busqueda) {
      query += ` AND (u.email LIKE ? OR c.nombre LIKE ? OR c.apellido LIKE ? OR i.nombre LIKE ?)`;
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }
    if (rol && rol !== 'Todos') {
      query += ` AND u.tipo_usuario = ?`;
      params.push(rol.toLowerCase());
    }
    if (estado && estado !== 'Todos') {
      query += ` AND u.activo = ?`;
      params.push(estado === 'activo' ? 1 : 0);
    }

    query += ` ORDER BY u.id_usuario DESC`;
    const [rows] = await db.query(query, params);
    return rows;
  },

  // Obtener uno por ID
  async getById(id) {
    const [rows] = await db.query(`
      SELECT 
        u.id_usuario AS id,
        u.email,
        u.tipo_usuario AS rol,
        CASE WHEN u.activo = 1 THEN 'activo' ELSE 'inactivo' END AS estado,
        u.fecha_creacion,
        COALESCE(
          CONCAT(c.nombre, ' ', c.apellido),
          i.nombre
        ) AS nombre,
        c.nombre AS nombre_ciudadano,
        c.apellido,
        c.zona,
        COALESCE(c.foto_perfil, i.foto_perfil) AS foto
      FROM usuarios u
      LEFT JOIN ciudadanos c ON c.id_usuario = u.id_usuario
      LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
      WHERE u.id_usuario = ?
    `, [id]);
    return rows[0] || null;
  },

  // Crear usuario
  async create({ email, password, rol, estado }) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(`
    INSERT INTO usuarios (email, password, tipo_usuario, activo)
    VALUES (?, ?, ?, ?)
`, [email, hash, rol.toLowerCase(), estado === 'activo' ? 1 : 0]);
    return result.insertId;
  },

  // Editar usuario
  async update(id, { email, rol, estado }) {
    const [result] = await db.query(`
      UPDATE usuarios
      SET email = ?, tipo_usuario = ?, activo = ?
      WHERE id_usuario = ?
    `, [email, rol.toLowerCase(), estado === 'activo' ? 1 : 0, id]);
    return result.affectedRows;
  },

  // Cambiar solo el rol
  async updateRol(id, rol) {
    const [result] = await db.query(`
      UPDATE usuarios SET tipo_usuario = ? WHERE id_usuario = ?
    `, [rol.toLowerCase(), id]);
    return result.affectedRows;
  },

  // Baja lógica — no borra, cambia estado a 'inactivo'
  async delete(id) {
    const [result] = await db.query(`
      UPDATE usuarios SET activo = 0 WHERE id_usuario = ?
    `, [id]);
    return result.affectedRows;
  },

  // Stats para el dashboard
  async getStats() {
    const [[total]]      = await db.query(`SELECT COUNT(*) AS total FROM usuarios`);
    const [[activos]]    = await db.query(`SELECT COUNT(*) AS total FROM usuarios WHERE activo = 1`);
    const [[inactivos]]  = await db.query(`SELECT COUNT(*) AS total FROM usuarios WHERE activo = 0`);
    const [[admins]]     = await db.query(`SELECT COUNT(*) AS total FROM usuarios WHERE tipo_usuario = 'admin'`);
    return {
      total:      total.total,
      activos:    activos.total,
      inactivos:  inactivos.total,
      admins:     admins.total,
    };
  },

  // Verificar si email ya existe
  async emailExiste(email, excludeId = null) {
    let query = `SELECT id_usuario FROM usuarios WHERE email = ?`;
    const params = [email];
    if (excludeId) {
      query += ` AND id_usuario != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },
};

module.exports = UserModel;