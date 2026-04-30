const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/notificationController');

router.get('/',              ctrl.listar);
router.put('/leer-todas',    ctrl.marcarTodasLeidas);
router.put('/:id/leer',      ctrl.marcarLeida);

module.exports = router;