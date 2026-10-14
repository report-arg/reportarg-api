module.exports = {
  // Routes
  reclamoRoutes: require('./routes/reclamoRoutes'),
  institucionReclamoRoutes: require('./routes/institucionReclamoRoutes'),
  adminReclamoRoutes: require('./routes/adminReclamoRoutes'),

  // Controllers
  reclamoController: require('./controllers/reclamoController'),
  institucionReclamoController: require('./controllers/institucionReclamoController'),
  adminReclamoController: require('./controllers/adminReclamoController'),

  // Models
  ReclamoModel: require('./models/reclamoModel'),
  HistorialModel: require('./models/historialModel'),
  ActualizacionModel: require('./models/actualizacionModel'),

  // Services
  asignacionService: require('./services/asignacionService'),
  reclamoFilterService: require('./services/reclamoFilterService'),
  reclamoTrackingService: require('./services/reclamoTrackingService'),
};
