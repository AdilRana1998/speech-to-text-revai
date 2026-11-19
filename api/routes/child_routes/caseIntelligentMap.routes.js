const router = require('express').Router();
const { caseIntelligentMap_controller } = require('../../controller');
const middleware = require('../../middlewares');

router.get('/intelligent-map/:caseUuid', [middleware.authValidation], caseIntelligentMap_controller.getIntelligentMap);

//job
router.post('/intelligent-map/find-record', [middleware.openApi], caseIntelligentMap_controller.findRecord);
router.post('/intelligent-map/find-failed-record', [middleware.openApi], caseIntelligentMap_controller.findFailedRecord);

//open-ai-webhook
router.post('/intelligent-map-webhook', [middleware.openApi], caseIntelligentMap_controller.openAIWebhook);

module.exports = router;