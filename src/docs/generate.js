const path = require('path');
const fs = require('fs');
const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const outputFile = path.join(__dirname, 'swagger-output.json');
const endpointsFiles = [path.join(__dirname, '../app.js')];

const doc = {
  info: {
    title: 'ReportARG API',
    description: 'Documentación generada a partir de las rutas de Express. Autenticación: Bearer JWT.',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Desarrollo local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Registro, login y sesión' },
    { name: 'Feed', description: 'Feed público' },
    { name: 'Reclamos', description: 'Reclamos de ciudadanos' },
    { name: 'Comunicados', description: 'Comunicados de instituciones' },
    { name: 'Comentarios', description: 'Comentarios del feed' },
    { name: 'Perfil', description: 'Perfil del usuario autenticado' },
    { name: 'Upload', description: 'Subida de imágenes' },
    { name: 'Admin', description: 'Panel administrativo' },
  ],
};

const PUBLIC_PATHS = new Set([
  '/',
  '/api/auth/register-citizen',
  '/api/auth/register-institution',
  '/api/auth/verify-email',
  '/api/auth/resend-code',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/login',
  '/api/auth/social-login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/feed',
  '/api/feed/categorias',
  '/api/feed/tendencias',
  '/api/reclamos/categorias',
  '/api/reclamos/mapa',
  '/api/comunicados/categorias',
]);

const tagFromPath = (apiPath) => {
  if (apiPath.startsWith('/api/admin/usuarios/me')) return 'Perfil';
  if (apiPath.startsWith('/api/admin/upload')) return 'Upload';
  if (apiPath.startsWith('/api/admin')) return 'Admin';
  if (apiPath.startsWith('/api/auth')) return 'Auth';
  if (apiPath.startsWith('/api/feed')) return 'Feed';
  if (apiPath.startsWith('/api/reclamos')) return 'Reclamos';
  if (apiPath.startsWith('/api/comunicados')) return 'Comunicados';
  if (apiPath.startsWith('/api/comentarios')) return 'Comentarios';
  return 'General';
};

const normalizePath = (apiPath) => apiPath.replace(/\/+$/, '') || '/';

const isPublic = (apiPath, method) => {
  const normalized = normalizePath(apiPath);
  if (PUBLIC_PATHS.has(normalized)) return true;
  if (method === 'get' && /^\/api\/comentarios\/\{[^}]+\}$/.test(normalized)) return true;
  return false;
};

const enrichSpec = (spec) => {
  for (const [apiPath, operations] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(operations)) {
      if (!operation || typeof operation !== 'object' || !operation.responses) continue;

      operation.tags = [tagFromPath(apiPath)];

      if (!isPublic(apiPath, method)) {
        operation.security = [{ bearerAuth: [] }];
      }
    }
  }
};

const generate = async () => {
  await swaggerAutogen(outputFile, endpointsFiles, doc);
  const spec = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  enrichSpec(spec);
  fs.writeFileSync(outputFile, `${JSON.stringify(spec, null, 2)}\n`);
};

if (require.main === module) {
  generate()
    .then(() => {
      console.log(`Swagger generado en ${outputFile}`);
    })
    .catch((error) => {
      console.error('Error generando Swagger:', error);
      process.exit(1);
    });
}

module.exports = generate;
