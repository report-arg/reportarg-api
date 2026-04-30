const express = require('express');
const router  = express.Router();
const upload  = require('../../middlewares/upload');
const ctrl    = require('../../controllers/admin/uploadController');

router.post('/foto', upload.single('foto'), ctrl.subirFoto);

module.exports = router;