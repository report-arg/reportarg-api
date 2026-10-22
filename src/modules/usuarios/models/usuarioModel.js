const db = require('../../../config/db');

const UserModel = {
  async findByEmail(email) {
    const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return users[0] || null;
  },

  async getProfileData(userId) {
    const [[perfilRow]] = await db.query(`
      SELECT COALESCE(CONCAT(c.nombre, ' ', c.apellido), i.nombre) AS nombre,
             COALESCE(c.foto_perfil, i.foto_perfil) AS foto
      FROM usuarios u
      LEFT JOIN ciudadanos c ON c.id_usuario = u.id_usuario
      LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
      WHERE u.id_usuario = ?
    `, [userId]);
    return perfilRow || null;
  },

  async createAuthUser(connection, { email, password, email_verified, verification_code, verification_expires, auth_provider, activo, id_ciudad, tipo_usuario }) {
    const executor = connection || db;
    const [result] = await executor.query(
      `INSERT INTO usuarios (email, password, email_verified, verification_code, verification_expires, auth_provider, activo, id_ciudad, tipo_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, password, email_verified ? 1 : 0, verification_code, verification_expires, auth_provider || 'local', activo ? 1 : 0, id_ciudad || null, tipo_usuario || 'usuario']
    );
    return result.insertId;
  },

  async updatePassword(userId, password) {
    await db.query('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [password, userId]);
  },

  async updateVerification(userId, { email_verified, verification_code, verification_expires }) {
    await db.query(
      'UPDATE usuarios SET email_verified = ?, verification_code = ?, verification_expires = ? WHERE id_usuario = ?',
      [email_verified ? 1 : 0, verification_code, verification_expires, userId]
    );
  },

  async updateSocialAuth(userId, { email_verified, auth_provider, activo }) {
    await db.query(
      `UPDATE usuarios SET email_verified = ?, auth_provider = COALESCE(auth_provider, ?), activo = ? WHERE id_usuario = ?`,
      [email_verified ? 1 : 0, auth_provider, activo ? 1 : 0, userId]
    );
  },


  // Listar todos con filtros opcionales y paginación
  async getAll({ busqueda, rol, estado, pagina = 1, limite = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (busqueda) {
      where += ` AND (u.email LIKE ? OR c.nombre LIKE ? OR c.apellido LIKE ? OR i.nombre LIKE ?)`;
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }
    if (rol && rol !== 'Todos') {
      where += ` AND u.tipo_usuario = ?`;
      params.push(rol.toLowerCase());
    }
    if (estado && estado !== 'Todos') {
      where += ` AND u.activo = ?`;
      params.push(estado === 'activo' ? 1 : 0);
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM usuarios u
      LEFT JOIN ciudadanos c ON c.id_usuario = u.id_usuario
      LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
      ${where}
    `;
    const [countRows] = await db.query(countSql, params);
    const totalCount = countRows && countRows[0] && countRows[0].total !== undefined ? Number(countRows[0].total) : 0;

    let query = `
      SELECT 
        u.id_usuario AS id,
        u.email,
        u.tipo_usuario AS rol,
        u.id_ciudad,
        CASE WHEN u.activo = 1 THEN 'activo' ELSE 'inactivo' END AS estado,
        u.fecha_creacion,
        COALESCE(
          CONCAT(c.nombre, ' ', c.apellido),
          i.nombre
        ) AS nombre,
        COALESCE(c.foto_perfil, i.foto_perfil) AS foto,
        ciud.nombre AS ciudad_activa,
        ciud.provincia AS provincia_activa
      FROM usuarios u
      LEFT JOIN ciudadanos c ON c.id_usuario = u.id_usuario
      LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
      LEFT JOIN ciudades ciud ON ciud.id_ciudad = u.id_ciudad
      ${where}
      ORDER BY u.id_usuario DESC
    `;

    const paginaNum = Math.max(1, parseInt(pagina) || 1);
    const limiteNum = Math.min(100, Math.max(1, parseInt(limite) || 20));
    const offset = (paginaNum - 1) * limiteNum;

    query += ` LIMIT ? OFFSET ?`;
    const queryParams = [...params, limiteNum, offset];

    const [rows] = await db.query(query, queryParams);
    return {
      rows: Array.isArray(rows) ? rows : [],
      total: totalCount || (Array.isArray(rows) ? rows.length : 0),
      pagina: paginaNum,
      limite: limiteNum,
      totalPaginas: Math.ceil((totalCount || (Array.isArray(rows) ? rows.length : 0)) / limiteNum) || 1,
    };
  },

  // Obtener uno por ID con datos de ciudad activa y declarada
  async getById(id) {
    const [rows] = await db.query(`
      SELECT 
        u.id_usuario AS id,
        u.email,
        u.tipo_usuario AS rol,
        u.id_ciudad,
        CASE WHEN u.activo = 1 THEN 'activo' ELSE 'inactivo' END AS estado,
        u.fecha_creacion,
        COALESCE(
          CONCAT(c.nombre, ' ', c.apellido),
          i.nombre
        ) AS nombre,
        c.nombre AS nombre_ciudadano,
        c.apellido,
        COALESCE(c.provincia, i.provincia) AS provincia,
        COALESCE(c.ciudad, i.ciudad) AS ciudad,
        COALESCE(c.zona, i.zona) AS zona,
        c.provincia AS provincia_declarada,
        c.ciudad AS ciudad_declarada,
        ciud.nombre AS ciudad_activa,
        ciud.provincia AS provincia_activa,
        i.telefono,
        i.direccion,
        i.tipo,
        COALESCE(c.foto_perfil, i.foto_perfil) AS foto,
        (SELECT COUNT(*) FROM reclamos r WHERE r.id_usuario = u.id_usuario) AS reportes
      FROM usuarios u
      LEFT JOIN ciudadanos c ON c.id_usuario = u.id_usuario
      LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
      LEFT JOIN ciudades ciud ON ciud.id_ciudad = u.id_ciudad
      WHERE u.id_usuario = ?
    `, [id]);
    return rows[0] || null;
  },

  // Actualizar perfil propio
  async updatePerfil(id, { nombre, apellido, email, provincia, ciudad, zona, foto, telefono, direccion, tipo }) {
    if (email) {
      await db.query('UPDATE usuarios SET email = ? WHERE id_usuario = ?', [email, id]);
    }
    const [[user]] = await db.query('SELECT tipo_usuario FROM usuarios WHERE id_usuario = ?', [id]);
    if (!user) throw new Error('Usuario no encontrado');

    if (user.tipo_usuario === 'institucion') {
      await db.query(`
        UPDATE instituciones
        SET nombre = COALESCE(?, nombre), tipo = COALESCE(?, tipo), telefono = COALESCE(?, telefono),
            provincia = COALESCE(?, provincia), ciudad = COALESCE(?, ciudad), zona = COALESCE(?, zona),
            direccion = COALESCE(?, direccion), foto_perfil = COALESCE(?, foto_perfil)
        WHERE id_usuario = ?
      `, [nombre || null, tipo || null, telefono || null, provincia || null, ciudad || null, zona || null, direccion || null, foto || null, id]);
      return;
    }

    await db.query(`
      INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona, foto_perfil)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nombre = COALESCE(VALUES(nombre), nombre), apellido = COALESCE(VALUES(apellido), apellido),
        provincia = COALESCE(VALUES(provincia), provincia), ciudad = COALESCE(VALUES(ciudad), ciudad),
        zona = COALESCE(VALUES(zona), zona), foto_perfil = COALESCE(VALUES(foto_perfil), foto_perfil)
    `, [id, nombre || null, apellido || null, provincia || null, ciudad || null, zona || null, foto || null]);
  },

  // Cambiar contraseña verificando la actual
  async cambiarPassword(id, passwordActual, passwordNueva) {
    const bcrypt = require('bcryptjs');
    const [[user]] = await db.query('SELECT password FROM usuarios WHERE id_usuario = ?', [id]);
    if (!user) throw new Error('Usuario no encontrado');
    const coincide = await bcrypt.compare(passwordActual, user.password);
    if (!coincide) throw new Error('La contraseña actual es incorrecta');
    const hash = await bcrypt.hash(passwordNueva, 10);
    await db.query('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [hash, id]);
  },

  // Crear usuario con perfil de forma atómica y transaccional
  async createWithProfile({ email, password, rol, estado = 'activo', id_ciudad = null, nombre, foto }) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(`
        INSERT INTO usuarios (email, password, tipo_usuario, activo, id_ciudad)
        VALUES (?, ?, ?, ?, ?)
      `, [email, hash, rol.toLowerCase(), estado === 'activo' ? 1 : 0, id_ciudad]);
      const newUserId = result.insertId;

      // Si es ciudadano o admin, crear perfil en tabla ciudadanos dentro de la misma transacción
      if (rol.toLowerCase() === 'ciudadano' || rol.toLowerCase() === 'admin') {
        const partes = (nombre || "").trim().split(" ");
        const nombreCiudadano   = partes[0] || (rol.toLowerCase() === 'admin' ? "Administrador" : "");
        const apellidoCiudadano = partes.slice(1).join(" ") || "";
        await connection.query(`
          INSERT INTO ciudadanos (id_usuario, nombre, apellido, foto_perfil)
          VALUES (?, ?, ?, ?)
        `, [newUserId, nombreCiudadano, apellidoCiudadano, foto || null]);
      }

      await connection.commit();
      return newUserId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // Crear usuario simple
  async create({ email, password, rol, estado, id_ciudad = null }) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(`
      INSERT INTO usuarios (email, password, tipo_usuario, activo, id_ciudad)
      VALUES (?, ?, ?, ?, ?)
    `, [email, hash, rol.toLowerCase(), estado === 'activo' ? 1 : 0, id_ciudad]);
    return result.insertId;
  },

  // Actualizar datos de perfil (nombre y foto) según el rol sin exponer SQL en el controlador
  async updateProfileData(userId, rol, { nombre, foto, usuarioActual }) {
    if (rol === 'institucion') {
      const updates = [];
      const params = [];
      if (nombre) { updates.push('nombre = ?'); params.push(nombre); }
      if (foto) { updates.push('foto_perfil = ?'); params.push(foto); }
      if (updates.length > 0) {
        params.push(userId);
        await db.query(`UPDATE instituciones SET ${updates.join(', ')} WHERE id_usuario = ?`, params);
      }
    } else {
      const partes = (nombre || usuarioActual?.nombre || "").trim().split(" ");
      const nombreCiudadano = partes[0] || "";
      const apellidoCiudadano = partes.slice(1).join(" ") || "";
      await db.query(`
        INSERT INTO ciudadanos (id_usuario, nombre, apellido, foto_perfil)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre),
          apellido = VALUES(apellido),
          foto_perfil = COALESCE(VALUES(foto_perfil), foto_perfil)
      `, [userId, nombreCiudadano, apellidoCiudadano, foto || null]);
    }
  },

  // Editar usuario
  async update(id, { email, rol, estado, id_ciudad }) {
    let query = `UPDATE usuarios SET email = ?, tipo_usuario = ?, activo = ?`;
    const params = [email, rol.toLowerCase(), estado === 'activo' ? 1 : 0];
    if (id_ciudad !== undefined) {
      query += `, id_ciudad = ?`;
      params.push(id_ciudad);
    }
    query += ` WHERE id_usuario = ?`;
    params.push(id);
    const [result] = await db.query(query, params);
    return result.affectedRows;
  },

  // Cambiar solo el rol
  async updateRol(id, rol) {
    const [result] = await db.query(`
      UPDATE usuarios SET tipo_usuario = ? WHERE id_usuario = ?
    `, [rol.toLowerCase(), id]);
    return result.affectedRows;
  },

  // Cambiar estado activo/inactivo (rehabilitar / inhabilitar)
  async setEstado(id, activo) {
    const [result] = await db.query(`
      UPDATE usuarios SET activo = ? WHERE id_usuario = ?
    `, [activo ? 1 : 0, id]);
    return result.affectedRows;
  },

  // Baja lógica — no borra, cambia estado a 'inactivo'
  async delete(id) {
    return this.setEstado(id, false);
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
