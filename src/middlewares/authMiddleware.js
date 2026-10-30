const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { ROLES, normalizeRole, getCanonicalRole } = require('../constants/roles');

const getUserFromToken = async (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return null;

    const [rows] = await db.query(
      `SELECT u.id_usuario, u.email, u.activo, u.tipo_usuario, u.id_ciudad, i.id_institucion, i.verificada AS institucion_verificada
       FROM usuarios u
       LEFT JOIN instituciones i ON i.id_usuario = u.id_usuario
       WHERE u.id_usuario = ?`,
      [decoded.id]
    );
    const userDb = rows && rows[0];

    // Si el usuario no existe en BD o fue inhabilitado (activo = 0), denegar acceso inmediatamente
    if (!userDb || !userDb.activo) return null;

    // El rol autorizado DEBE provenir del usuario actual en base de datos y no del token JWT
    let normalizedDbRole = getCanonicalRole(userDb.tipo_usuario);

    // Regla estricta: No utilizar el rol del token como fallback cuando el rol de base de datos sea inexistente o inválido
    if (!normalizedDbRole) {
      return null;
    }

    // Si la cuenta está vinculada a una entidad institucional (y no es admin), su identidad es institucional
    // aunque el registro inicial tuviera un alias legacy ('usuario'), evitando que opere como ciudadano
    if (userDb.id_institucion && normalizedDbRole !== ROLES.ADMIN) {
      normalizedDbRole = ROLES.INSTITUCION;
    }

    // Determinamos si la institución está formalmente verificada sin alterar el rol ni la identidad de la cuenta
    const isInstitucionVerificada = Boolean(userDb.id_institucion) &&
      userDb.institucion_verificada !== undefined &&
      userDb.institucion_verificada !== null
      ? Number(userDb.institucion_verificada) === 1
      : false;

    return {
      id: userDb.id_usuario,
      email: userDb.email,
      role: normalizedDbRole, // Conserva la identidad real en BD ('admin', 'institucion', 'ciudadano')
      id_ciudad: userDb.id_ciudad || null,
      id_institucion: userDb.id_institucion || null,
      institucion_verificada: isInstitucionVerificada,
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
      return res.status(403).json({
        error: 'No tenés permisos para realizar esta acción.',
        codigo: 'ROL_NO_AUTORIZADO',
        rolActual: req.user.role,
      });
    }

    // Regla transversal: ninguna institución no verificada o inhabilitada puede ejecutar acciones protegidas
    if (req.user.role === ROLES.INSTITUCION && !req.user.institucion_verificada) {
      return res.status(403).json({
        error: 'Institución pendiente de verificación o inhabilitada. Las capacidades operativas institucionales requieren aprobación previa.',
        codigo: 'INSTITUCION_NO_VERIFICADA',
      });
    }

    next();
  };
};

const requireAdmin = requireRole(ROLES.ADMIN);
const requireCiudadano = requireRole(ROLES.CIUDADANO);

/**
 * Middleware para capacidades institucionales operativas.
 * Requiere identidad institucional Y estado verificado (aprobado formalmente).
 * No permite que instituciones no verificadas o pendientes operen reclamos o comunicados.
 */
const requireInstitucion = (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  if (req.user.role !== ROLES.INSTITUCION) {
    return res.status(403).json({
      error: 'No tenés permisos para realizar esta acción.',
      codigo: 'ROL_NO_AUTORIZADO',
      rolActual: req.user.role,
    });
  }

  if (!req.user.institucion_verificada) {
    return res.status(403).json({
      error: 'Institución pendiente de verificación o inhabilitada. Las capacidades operativas institucionales requieren aprobación previa.',
      codigo: 'INSTITUCION_NO_VERIFICADA',
    });
  }

  next();
};

module.exports = {
  getUserFromToken,
  verifyToken,
  optionalToken,
  requireRole,
  requireAdmin,
  requireCiudadano,
  requireInstitucion,
};


