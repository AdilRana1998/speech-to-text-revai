const router = require('express').Router();
const {
    report_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.get('/getUsageInfo', [middleware.authValidation], report_controller.getUsageInfo);
router.get('/showAllPrompts', [middleware.authValidation], report_controller.allPromptUsageInfo);


module.exports = router;
