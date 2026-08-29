process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_QUIET = 'true';
require('dotenv').config({ quiet: true });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret';
}
