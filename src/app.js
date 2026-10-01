const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { verifyToken, requireAdmin } = require('./middlewares/authMiddleware');

dotenv.config({ quiet: true });

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API ReportARG funcionando. Documentación: /api/docs');
});

const setupSwagger = require('./docs/setupSwagger');
setupSwagger(app);

const {
  authRoutes,
  adminUserRoutes,
  adminProfileRoutes,
} = require('./modules/usuarios');

app.use('/api/auth', authRoutes);

const { uploadRoutes, searchRoutes } = require('./modules/admin');

app.use('/api/admin/usuarios/me', verifyToken, adminProfileRoutes);
app.use('/api/admin/upload', verifyToken, uploadRoutes);

const { notificationRoutes } = require('./modules/notificaciones');
app.use('/api/notificaciones', verifyToken, notificationRoutes);

app.use('/api/admin', verifyToken, requireAdmin);

app.use('/api/admin/usuarios', adminUserRoutes);

const { categoryRoutes } = require('./modules/categorias');
app.use('/api/admin/categorias', categoryRoutes);

const { institutionRoutes } = require('./modules/instituciones');
app.use('/api/admin/instituciones', institutionRoutes);

const adminReclamoRoutes = require('./modules/reclamos/routes/adminReclamoRoutes');
app.use('/api/admin/reclamos', adminReclamoRoutes);

app.use('/api/admin/buscar', searchRoutes);

app.use('/api/admin/notificaciones', notificationRoutes);

const { feedRoutes, actividadRoutes } = require('./modules/feed');
app.use('/api/feed', feedRoutes);

const reclamoRoutes = require('./modules/reclamos/routes/reclamoRoutes');
app.use('/api/reclamos', reclamoRoutes);

const { comunicadoRoutes } = require('./modules/comunicados');
app.use('/api/comunicados', comunicadoRoutes);

const { comentarioRoutes } = require('./modules/comentarios');
app.use('/api/comentarios', comentarioRoutes);

app.use('/api/actividad', actividadRoutes);

const institucionReclamoRoutes = require('./modules/reclamos/routes/institucionReclamoRoutes');
app.use('/api/institucion/reclamos', institucionReclamoRoutes);

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error interno del servidor' });
});

module.exports = app;
