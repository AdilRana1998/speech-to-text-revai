const router = require('express').Router();
const {
    admin_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.post('/admin/create', [middleware.authValidation], admin_controller.create);
router.post('/admin/add-users', [middleware.authValidation], admin_controller.edit);
router.get('/admin/get-users', [middleware.authValidation], admin_controller.get);
router.get('/admin/delete-user/:userUUid', [middleware.authValidation], admin_controller.delete);
router.post('/admin/verify', [middleware.authValidation], admin_controller.verify);
router.get('/admin/get-all', [middleware.authValidation], admin_controller.getAll);
router.get('/admin/get-users-cases/:userUUid', [middleware.authValidation], admin_controller.userCase);
router.get('/admin/get-users-response/:caseUUid', [middleware.authValidation], admin_controller.userResponses);

module.exports = router;
