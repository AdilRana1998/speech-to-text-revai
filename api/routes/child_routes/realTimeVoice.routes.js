const router = require('express').Router();
const { realTimeVoice_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/post-data', [middleware.authValidation], realTimeVoice_controller.postData);

module.exports = router;