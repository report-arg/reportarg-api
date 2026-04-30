const UserModel = require('../../models/userModel');
const db = require('../../config/db');

const userController = {

  async listar(req, res) {
    try {
      const { busqueda, rol, estado } = req.query;
      const usuarios = await UserModel.getAll({ busqueda, rol, estado });
      res.json({ ok: true, data: usuarios });
    } catch (err) {
      console.error('Error listar usuarios:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener usuarios' });
    }
  },

  async obtener(req, res) {
    try {
      const usuario = await UserModel.getById(req.params.id);
      if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
      res.json({ ok: true, data: usuario });
    } catch (err) {
      console.error('Error obtener usuario:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener usuario' });
    }
  },

  async crear(req, res) {
  try {
    const { email, password, rol, estado, nombre, foto } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Email y contraseña son obligatorios' });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ ok: false, mensaje: 'Email inválido' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar email duplicado
    const existe = await UserModel.emailExiste(email);
    if (existe) {
      return res.status(409).json({ ok: false, mensaje: 'El email ya está registrado' });
    }

    // Crear usuario
    const id = await UserModel.create({
      email,
      password,
      rol: rol || 'ciudadano',
      estado: estado || 'activo',
    });

    // Si es institución crear registro en tabla instituciones
    if (rol === 'institucion') {
      await db.query(`
        INSERT INTO instituciones (id_usuario, nombre, foto_perfil, verificada)
        VALUES (?, ?, ?, 0)
      `, [id, nombre || email, foto || null]);
    }

    // Si es ciudadano crear registro en tabla ciudadanos
    if (rol === 'ciudadano') {
      const partes = (nombre || "").split(" ");
      const nombreCiudadano   = partes[0] || "";
      const apellidoCiudadano = partes.slice(1).join(" ") || "";
      await db.query(`
        INSERT INTO ciudadanos (id_usuario, nombre, apellido, foto_perfil)
        VALUES (?, ?, ?, ?)
      `, [id, nombreCiudadano, apellidoCiudadano, foto || null]);
    }

    // Enviar email de bienvenida
    try {
      const emailService = require('../../config/emailService');
      await emailService.enviarBienvenida(email, nombre || email);
    } catch (emailErr) {
      console.error('Error enviando email de bienvenida:', emailErr.message);
    }

    res.status(201).json({ ok: true, mensaje: 'Usuario creado correctamente', id });

  } catch (err) {
    console.error('Error crear usuario:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al crear usuario' });
  }
},

  async editar(req, res) {
  try {
    const { email, rol, estado, foto } = req.body;
    const { id } = req.params;

    if (!email) return res.status(400).json({ ok: false, mensaje: 'Email es obligatorio' });

    const existe = await UserModel.emailExiste(email, id);
    if (existe) {
      return res.status(409).json({ ok: false, mensaje: 'El email ya está en uso' });
    }

    const filas = await UserModel.update(id, { email, rol, estado });
    if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

    // Actualizar foto si se subió una nueva
    if (foto) {
      await db.query(`
        UPDATE ciudadanos SET foto_perfil = ? WHERE id_usuario = ?
      `, [foto, id]);
      await db.query(`
        UPDATE instituciones SET foto_perfil = ? WHERE id_usuario = ?
      `, [foto, id]);
    }

    res.json({ ok: true, mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error('Error editar usuario:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al editar usuario' });
  }
},
  async cambiarRol(req, res) {
    try {
      const { rol } = req.body;
      const rolesValidos = ['admin', 'ciudadano', 'institucion'];
      if (!rolesValidos.includes(rol?.toLowerCase())) {
        return res.status(400).json({ ok: false, mensaje: 'Rol inválido' });
      }
      const filas = await UserModel.updateRol(req.params.id, rol);
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
      res.json({ ok: true, mensaje: 'Rol actualizado correctamente' });
    } catch (err) {
      console.error('Error cambiar rol:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al cambiar rol' });
    }
  },

  async eliminar(req, res) {
    try {
      const filas = await UserModel.delete(req.params.id);
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
      res.json({ ok: true, mensaje: 'Usuario eliminado correctamente' });
    } catch (err) {
      console.error('Error eliminar usuario:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al eliminar usuario' });
    }
  },

  async stats(req, res) {
    try {
      const data = await UserModel.getStats();
      res.json({ ok: true, data });
    } catch (err) {
      console.error('Error stats:', err);
      res.status(500).json({ ok: false, mensaje: 'Error al obtener estadísticas' });
    }
  },
};

module.exports = userController;