const router = require('express').Router();
const {
    forgot_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.post('/forgot',[middleware.openApi],forgot_controller.post);
router.post('/verifyEmail',[middleware.openApi],forgot_controller.verifyEmail);

module.exports = router;