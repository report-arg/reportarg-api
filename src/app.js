const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API ReportARG funcionando');
});

// Rutas

//userRoutes
const userRoutes = require('./routes/admin/userRoutes');
app.use('/api/admin/usuarios', userRoutes);

//categoryRoutes
const categoryRoutes = require('./routes/admin/categoryRoutes');
app.use('/api/admin/categorias', categoryRoutes);

//institutionRoutes
const institutionRoutes = require('./routes/admin/institutionRoutes');
app.use('/api/admin/instituciones', institutionRoutes);

//claimRoutes
const claimRoutes = require('./routes/admin/claimRoutes');
app.use('/api/admin/reclamos', claimRoutes);

//searchRoutes
const searchRoutes = require('./routes/admin/searchRoutes');
app.use('/api/admin/buscar', searchRoutes);

//notificationRoutes
const notificationRoutes = require('./routes/admin/notificationRoutes');
app.use('/api/admin/notificaciones', notificationRoutes);

//uploadRoutes
const uploadRoutes = require('./routes/admin/uploadRoutes');
app.use('/api/admin/upload', uploadRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});