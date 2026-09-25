const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { ROLES, normalizeRole } = require('../constants/roles');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    // Obtener id_ciudad actual y estado de la cuenta desde la BD
    const [rows] = await db.query(
      'SELECT id_ciudad, id_usuario, activo, tipo_usuario FROM usuarios WHERE id_usuario = ?',
      [decoded.id]
    );
    const userDb = rows[0];

    if (!userDb || !userDb.activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o cuenta deshabilitada.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: normalizeRole(decoded.role || userDb.tipo_usuario),
      id_ciudad: userDb.id_ciudad || null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado.' });
    }

    return res.status(401).json({ error: 'Token inválido.' });
  }
};

const optionalToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      req.user = null;
      return next();
    }

    const [rows] = await db.query(
      'SELECT id_ciudad, id_usuario, activo, tipo_usuario FROM usuarios WHERE id_usuario = ?',
      [decoded.id]
    );
    const userDb = rows[0];

    if (!userDb || !userDb.activo) {
      req.user = null;
      return next();
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: normalizeRole(decoded.role || userDb.tipo_usuario),
      id_ciudad: userDb.id_ciudad || null,
    };

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const requireRole = (...allowedRoles) => {
  const allowed = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tenés permisos para realizar esta acción.' });
    }

    next();
  };
};

const requireAdmin = requireRole(ROLES.ADMIN);
const requireCiudadano = requireRole(ROLES.CIUDADANO);
const requireInstitucion = requireRole(ROLES.INSTITUCION);

module.exports = {
  verifyToken,
  optionalToken,
  requireRole,
  requireAdmin,
  requireCiudadano,
  requireInstitucion,
};

