/**
 * Roles canónicos de ReportARG.
 * Contrato compartido: req.user.role usa siempre estos valores.
 */
const ROLES = Object.freeze({
  ADMIN: 'admin',
  CIUDADANO: 'ciudadano',
  INSTITUCION: 'institucion',
});

const ROLE_ALIASES = Object.freeze({
  admin: ROLES.ADMIN,
  ciudadano: ROLES.CIUDADANO,
  citizen: ROLES.CIUDADANO,
  usuario: ROLES.CIUDADANO,
  institucion: ROLES.INSTITUCION,
  institution: ROLES.INSTITUCION,
});

const normalizeRole = (role) => {
  if (!role) {
    return ROLES.CIUDADANO;
  }

  return ROLE_ALIASES[String(role).trim().toLowerCase()] || ROLES.CIUDADANO;
};

/**
 * Retorna el rol canónico exacto o null si el valor no coincide con ningún rol o alias válido.
 * No aplica fallbacks silenciosos.
 */
const getCanonicalRole = (role) => {
  if (!role) return null;
  return ROLE_ALIASES[String(role).trim().toLowerCase()] || null;
};

const isValidRole = (role) => Object.values(ROLES).includes(role);

module.exports = {
  ROLES,
  ROLE_ALIASES,
  normalizeRole,
  getCanonicalRole,
  isValidRole,
};
