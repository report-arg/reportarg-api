const jwt = require('jsonwebtoken');
const { normalizeRole } = require('../constants/roles');

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

module.exports = {
  verifyToken,
};
