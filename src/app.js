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

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const profileRoutes = require('./routes/profileRoutes');
const uploadRoutes = require('./routes/admin/uploadRoutes');

app.use('/api/admin/usuarios/me', verifyToken, profileRoutes);
app.use('/api/admin/upload', verifyToken, uploadRoutes);

app.use('/api/admin', verifyToken, requireAdmin);

const userRoutes = require('./routes/admin/userRoutes');
app.use('/api/admin/usuarios', userRoutes);

const categoryRoutes = require('./routes/admin/categoryRoutes');
app.use('/api/admin/categorias', categoryRoutes);

const institutionRoutes = require('./routes/admin/institutionRoutes');
app.use('/api/admin/instituciones', institutionRoutes);

const claimRoutes = require('./routes/admin/claimRoutes');
app.use('/api/admin/reclamos', claimRoutes);

const searchRoutes = require('./routes/admin/searchRoutes');
app.use('/api/admin/buscar', searchRoutes);

const notificationRoutes = require('./routes/admin/notificationRoutes');
app.use('/api/admin/notificaciones', notificationRoutes);

const feedRoutes = require('./routes/feedRoutes');
app.use('/api/feed', feedRoutes);

const reclamoRoutes = require('./routes/reclamoRoutes');
app.use('/api/reclamos', reclamoRoutes);

const comunicadoRoutes = require('./routes/comunicadoRoutes');
app.use('/api/comunicados', comunicadoRoutes);

const comentarioRoutes = require('./routes/comentarioRoutes');
app.use('/api/comentarios', comentarioRoutes);

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error interno del servidor' });
});

module.exports = app;
