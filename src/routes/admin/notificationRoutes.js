const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/notificationController');
const { verifyToken, requireAdmin } = require('../../middlewares/authMiddleware');

router.use(verifyToken, requireAdmin);

router.get('/',           ctrl.listar);
router.put('/leer-todas', ctrl.marcarTodasLeidas);
router.put('/:id/leer',   ctrl.marcarLeida);

module.exports = router;
