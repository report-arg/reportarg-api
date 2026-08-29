const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/notificationController');
const { verifyToken, requireRole } = require('../../middlewares/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/',              ctrl.listar);
router.put('/leer-todas',    ctrl.marcarTodasLeidas);
router.put('/:id/leer',      ctrl.marcarLeida);

module.exports = router;
