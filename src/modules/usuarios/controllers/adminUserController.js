const UserModel = require('../models/userModel');
const { ROLES } = require('../../../constants/roles');

const userController = {

  async listar(req, res, next) {
    try {
      const { busqueda, rol, estado, pagina = 1, limite = 20 } = req.query;
      const result = await UserModel.getAll({ busqueda, rol, estado, pagina, limite });
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
      const usuario = await UserModel.getById(req.params.id);
      if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
      res.json({ ok: true, data: usuario });
    } catch (err) {
      next(err);
    }
  },

  async crear(req, res, next) {
    try {
      const { email, password, rol, estado, nombre, foto } = req.body;

      // Validaciones básicas
      if (!email || !password) {
        return res.status(400).json({ ok: false, mensaje: 'Email y contraseña son obligatorios' });
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ ok: false, mensaje: 'Email inválido' });
      }
      if (password.length < 6) {
        return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const rolNormalizado = (rol || ROLES.CIUDADANO).toLowerCase();
      if (!Object.values(ROLES).includes(rolNormalizado)) {
        return res.status(400).json({ ok: false, mensaje: 'Rol inválido. Roles permitidos: admin, ciudadano' });
      }

      // Restricción: el alta de instituciones debe realizarse por el flujo institucional formal
      // para asegurar la asignación territorial (ciudad/provincia), tipo de entidad y datos de contacto requeridos.
      if (rolNormalizado === ROLES.INSTITUCION) {
        return res.status(400).json({
          ok: false,
          mensaje: 'El alta de cuentas institucionales debe realizarse a través del registro institucional (/register/institution) para garantizar su asignación territorial, tipo de entidad y datos de contacto requeridos.',
        });
      }

      // Verificar email duplicado
      const existe = await UserModel.emailExiste(email);
      if (existe) {
        return res.status(409).json({ ok: false, mensaje: 'El email ya está registrado' });
      }

      // Crear usuario y perfil de forma atómica y transaccional
      const id = await UserModel.createWithProfile({
        email,
        password,
        rol: rolNormalizado,
        estado: estado || 'activo',
        nombre,
        foto,
      });

      // Enviar email de bienvenida si está disponible el servicio
      try {
        const emailService = require('../../../services/emailService');
        await emailService.enviarBienvenida(email, nombre || email);
      } catch (emailErr) {
        console.error('Error enviando email de bienvenida:', emailErr.message);
      }

      res.status(201).json({ ok: true, mensaje: 'Usuario creado correctamente', id });

    } catch (err) {
      next(err);
    }
  },

  async editar(req, res, next) {
    try {
      const { email, rol, estado, foto, nombre } = req.body;
      const { id } = req.params;

      if (!email) return res.status(400).json({ ok: false, mensaje: 'Email es obligatorio' });
      if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ ok: false, mensaje: 'Email inválido' });

      const usuarioActual = await UserModel.getById(id);
      if (!usuarioActual) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

      // Protección: no auto-inhabilitación ni auto-degradación
      if (Number(id) === Number(req.user?.id)) {
        if (estado && estado !== 'activo') {
          return res.status(400).json({ ok: false, mensaje: 'No podés inhabilitar tu propia cuenta administradora' });
        }
        if (rol && rol.toLowerCase() !== 'admin') {
          return res.status(400).json({ ok: false, mensaje: 'No podés cambiar el rol de tu propia cuenta administradora' });
        }
      }

      // Restricción de cambio de rol para preservar integridad
      const rolActual = (usuarioActual.rol || '').toLowerCase();
      const nuevoRol = rol ? rol.toLowerCase() : rolActual;

      if (rol && nuevoRol !== rolActual) {
        if (rolActual === 'institucion' && nuevoRol !== 'institucion') {
          return res.status(400).json({
            ok: false,
            mensaje: 'No se puede cambiar el rol de una cuenta institucional para preservar la trazabilidad de los reclamos asignados. La gestión institucional debe realizarse desde el módulo correspondiente.'
          });
        }
        if (rolActual !== 'institucion' && nuevoRol === 'institucion') {
          return res.status(400).json({
            ok: false,
            mensaje: 'No se puede transformar una cuenta directamente a institución. El alta institucional requiere verificación formal de entidad y asignación territorial.'
          });
        }
      }

      const existe = await UserModel.emailExiste(email, id);
      if (existe) {
        return res.status(409).json({ ok: false, mensaje: 'El email ya está en uso' });
      }

      const filas = await UserModel.update(id, { email, rol: nuevoRol, estado: estado || usuarioActual.estado });
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

      // Si se inhabilitó la cuenta, revocar refresh tokens activos
      if (estado === 'inactivo') {
        try {
          const RefreshTokenModel = require('../models/refreshTokenModel');
          await RefreshTokenModel.deleteByUserId(id);
        } catch (_) {}
      }

      // Actualizar nombre y/o foto según el rol delegando en la capa de modelo
      if (nombre !== undefined || foto) {
        await UserModel.updateProfileData(id, nuevoRol, { nombre, foto, usuarioActual });
      }

      res.json({ ok: true, mensaje: 'Usuario actualizado correctamente' });
    } catch (err) {
      next(err);
    }
  },

  async cambiarRol(req, res, next) {
    try {
      const { id } = req.params;
      const { rol } = req.body;
      const rolesValidos = Object.values(ROLES);
      if (!rol || !rolesValidos.includes(rol.toLowerCase())) {
        return res.status(400).json({ ok: false, mensaje: `Rol inválido. Roles válidos: ${rolesValidos.join(', ')}` });
      }

      const nuevoRol = rol.toLowerCase();

      // Protección: no auto-degradación
      if (Number(id) === Number(req.user?.id) && nuevoRol !== 'admin') {
        return res.status(400).json({ ok: false, mensaje: 'No podés cambiar el rol de tu propia cuenta administradora' });
      }

      const usuario = await UserModel.getById(id);
      if (!usuario) {
        return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
      }

      const rolActual = (usuario.rol || '').toLowerCase();

      if (rolActual === nuevoRol) {
        return res.json({ ok: true, mensaje: 'El usuario ya posee el rol indicado' });
      }

      // Reglas de integridad
      if (rolActual === 'institucion' && nuevoRol !== 'institucion') {
        return res.status(400).json({
          ok: false,
          mensaje: 'No se puede cambiar el rol de una cuenta institucional para preservar la trazabilidad de los reclamos asignados. La gestión institucional debe realizarse desde el módulo correspondiente.'
        });
      }

      if (rolActual !== 'institucion' && nuevoRol === 'institucion') {
        return res.status(400).json({
          ok: false,
          mensaje: 'No se puede transformar una cuenta directamente a institución. El alta institucional requiere verificación formal de entidad y asignación territorial.'
        });
      }

      const filas = await UserModel.updateRol(id, nuevoRol);
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

      res.json({ ok: true, mensaje: `Rol actualizado correctamente a ${nuevoRol}` });
    } catch (err) {
      next(err);
    }
  },

  // Endpoint atómico para inhabilitar / rehabilitar cuentas de usuario
  async cambiarEstado(req, res, next) {
    try {
      const { id } = req.params;
      let { estado, activo } = req.body;

      if (activo !== undefined && estado === undefined) {
        estado = (activo === true || activo === 1 || activo === '1') ? 'activo' : 'inactivo';
      }

      if (!estado || !['activo', 'inactivo'].includes(String(estado).toLowerCase())) {
        return res.status(400).json({ ok: false, mensaje: "Estado inválido. Valores aceptados: 'activo' o 'inactivo'" });
      }

      const nuevoEstado = String(estado).toLowerCase();
      const esInactivo = nuevoEstado === 'inactivo';

      // Protección: no auto-inhabilitación
      if (Number(id) === Number(req.user?.id) && esInactivo) {
        return res.status(400).json({ ok: false, mensaje: 'No podés inhabilitar tu propia cuenta administradora' });
      }

      const usuarioExistente = await UserModel.getById(id);
      if (!usuarioExistente) {
        return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
      }

      const filas = await UserModel.setEstado(id, !esInactivo);
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

      // Si se inhabilita, revocar refresh tokens
      if (esInactivo) {
        try {
          const RefreshTokenModel = require('../models/refreshTokenModel');
          await RefreshTokenModel.deleteByUserId(id);
        } catch (tokenErr) {
          console.error('Error al revocar refresh tokens al inhabilitar usuario:', tokenErr);
        }
      }

      res.json({
        ok: true,
        mensaje: esInactivo ? 'Usuario inhabilitado correctamente' : 'Usuario rehabilitado correctamente',
        data: { id: Number(id), estado: nuevoEstado, activo: esInactivo ? 0 : 1 },
      });
    } catch (err) {
      next(err);
    }
  },

  async eliminar(req, res, next) {
    try {
      if (Number(req.params.id) === Number(req.user?.id)) {
        return res.status(400).json({ ok: false, mensaje: 'No podés inhabilitar tu propia cuenta administradora' });
      }
      const filas = await UserModel.delete(req.params.id);
      if (filas === 0) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

      try {
        const RefreshTokenModel = require('../models/refreshTokenModel');
        await RefreshTokenModel.deleteByUserId(req.params.id);
      } catch (_) {}

      res.json({ ok: true, mensaje: 'Usuario inhabilitado correctamente' });
    } catch (err) {
      next(err);
    }
  },

  async stats(req, res, next) {
    try {
      const data = await UserModel.getStats();
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async actualizarPerfil(req, res, next) {
    try {
      const { nombre, apellido, email, provincia, ciudad, zona, foto } = req.body;
      const id = req.params.id || req.user.id;

      if (email) {
        const existe = await UserModel.emailExiste(email, id);
        if (existe) return res.status(409).json({ ok: false, mensaje: 'El email ya está en uso' });
      }

      await UserModel.updatePerfil(id, { nombre, apellido, email, provincia, ciudad, zona, foto });
      res.json({ ok: true, mensaje: 'Perfil actualizado correctamente' });
    } catch (err) {
      next(err);
    }
  },

  async cambiarPassword(req, res, next) {
    try {
      const { passwordActual, passwordNueva } = req.body;
      const id = req.params.id || req.user.id;

      if (!passwordActual || !passwordNueva)
        return res.status(400).json({ ok: false, mensaje: 'Ambas contraseñas son requeridas' });
      if (passwordNueva.length < 8)
        return res.status(400).json({ ok: false, mensaje: 'La nueva contraseña debe tener al menos 8 caracteres' });

      await UserModel.cambiarPassword(id, passwordActual, passwordNueva);
      res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
    } catch (err) {
      if (err.message === 'La contraseña actual es incorrecta') {
        err.status = 400;
      }
      next(err);
    }
  },
};

module.exports = userController;
