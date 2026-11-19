const router = require('express').Router();
const {
    packages_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.post('/packages/create', [middleware.openApi], packages_controller.createPackages);

module.exports = router;