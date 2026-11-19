const router = require('express').Router();
const {
    activityLogs_controller
} = require('../../controller');
const middleware = require('../../middlewares'); 

router.post('/activity/create', [middleware.authValidation], activityLogs_controller.create);
router.get('/activity/user-screen', [middleware.authValidation], activityLogs_controller.findScreen);
router.get('/activity/user-login-count', [middleware.authValidation], activityLogs_controller.countLogin);
router.post('/activity/type/create', [middleware.authValidation], activityLogs_controller.createType);
router.get('/activity/type/get', [middleware.authValidation], activityLogs_controller.getTypes);
router.get('/activity/type/getRoute/:route-name', [middleware.authValidation], activityLogs_controller.getTypesByRoute);

module.exports = router;
