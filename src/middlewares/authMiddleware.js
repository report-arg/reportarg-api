const jwt = require('jsonwebtoken');
const { ROLES, normalizeRole } = require('../constants/roles');

const verifyToken = (req, res, next) => {
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

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: normalizeRole(decoded.role),
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado.' });
    }

    return res.status(401).json({ error: 'Token inválido.' });
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
  requireRole,
  requireAdmin,
  requireCiudadano,
  requireInstitucion,
};
