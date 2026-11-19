const router = require('express').Router();
const { jsonAssistant_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/json-assistant/generate-json', [middleware.authValidation], jsonAssistant_controller.generateJson);
router.get('/json-assistant/get-pending-json', [middleware.openApi], jsonAssistant_controller.generatePendingJson);
router.get('/json-assistant/run-pending-json', [middleware.openApi], jsonAssistant_controller.runPendingJson);
router.get('/json-assistant/failed-json', [middleware.openApi], jsonAssistant_controller.getFailedJsonRecords);

module.exports = router; 