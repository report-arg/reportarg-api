const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/categoryController');
const { verifyToken, requireRole } = require('../../middlewares/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/',           ctrl.listar);
router.get('/:id',        ctrl.obtener);
router.post('/',          ctrl.crear);
router.put('/:id',        ctrl.editar);
router.patch('/:id/baja', ctrl.bajaLogica);
router.delete('/:id',     ctrl.eliminar);

module.exports = router;
