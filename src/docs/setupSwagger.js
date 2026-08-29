const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger-output.json');

const setupSwagger = (app) => {
  app.get('/api/docs.json', (req, res) => {
    res.json(swaggerSpec);
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'ReportARG API',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
};

module.exports = setupSwagger;
