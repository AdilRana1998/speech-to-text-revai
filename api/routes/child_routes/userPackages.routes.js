const router = require('express').Router();
const {
    user_packages_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.post('/userPackages/create', [middleware.authValidation], user_packages_controller.create);
router.get('/userPackages/getAll', [middleware.authValidation], user_packages_controller.getAll);
router.get('/userPackages/getAllUserPackages', [middleware.authValidation], user_packages_controller.getAllUserPackages);
router.get('/userPackages/getUserActivePackage', [middleware.authValidation], user_packages_controller.getUserActivePackage);

module.exports = router;