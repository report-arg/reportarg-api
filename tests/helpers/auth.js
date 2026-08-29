const jwt = require('jsonwebtoken');
const { ROLES } = require('../../src/constants/roles');

const generateTestToken = (role = ROLES.CIUDADANO, id = 1) => {
  return jwt.sign(
    { id, email: `${role}@test.com`, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

module.exports = {
  generateTestToken,
  ROLES,
};
