const router = require('express').Router();
const { healthCheck_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.get('/kolabrya-health-check', [middleware.openApi], healthCheck_controller.postHealthCheck);

module.exports = router;