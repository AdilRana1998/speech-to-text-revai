const router = require('express').Router();
const { textFormatter_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/action/8r2p7w4x', [middleware.authValidation], textFormatter_controller.postTextFormatter);
router.get('/action/clear', [middleware.authValidation], textFormatter_controller.deleteAllTextFormatter);
router.get('/action/get-pending-textformatter', [middleware.authValidation], textFormatter_controller.getPendingTextFormatter); 
router.get('/action/run-pending-textformatter', [middleware.authValidation], textFormatter_controller.runPendingTextFormatter);
router.get('/action/:textformatterUuid', [middleware.authValidation], textFormatter_controller.getTextFormatter);
router.get('/action', [middleware.authValidation], textFormatter_controller.getAllTextFormatter);

module.exports = router;