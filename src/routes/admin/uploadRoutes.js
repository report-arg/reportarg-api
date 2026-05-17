const express = require('express');
const router  = express.Router();
const upload  = require('../../middlewares/upload');
const ctrl    = require('../../controllers/admin/uploadController');

router.post('/foto', (req, res, next) => {
  upload.single('foto')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ ok: false, mensaje: err.message || 'Error al procesar el archivo' });
    }
    next();
  });
}, ctrl.subirFoto);

module.exports = router;