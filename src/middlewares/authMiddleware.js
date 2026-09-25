const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { ROLES, normalizeRole } = require('../constants/roles');

const getUserFromToken = async (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return null;

    const [rows] = await db.query(
      `SELECT u.id_usuario, u.email, u.activo, u.tipo_usuario, u.id_ciudad, i.id_institucion
       FROM usuarios u
       LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
       WHERE u.id_usuario = ?`,
      [decoded.id]
    );
    const userDb = rows[0];

    if (!userDb || !userDb.activo) return null;

    return {
      id: userDb.id_usuario,
      email: userDb.email,
      role: normalizeRole(decoded.role || userDb.tipo_usuario),
      id_ciudad: userDb.id_ciudad || null,
      id_institucion: userDb.id_institucion || null,
    };
  } catch (error) {
    return null;
  }
};

const verifyToken = async (req, res, next) => {
  const user = await getUserFromToken(req);

  if (!user) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado o inválido.' });
  }

  req.user = user;
  next();
};

const optionalToken = async (req, res, next) => {
  const user = await getUserFromToken(req);
  req.user = user;
  next();
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
  getUserFromToken,
  verifyToken,
  optionalToken,
  requireRole,
  requireAdmin,
  requireCiudadano,
  requireInstitucion,
};


