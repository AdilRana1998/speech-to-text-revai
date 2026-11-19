const router = require('express').Router();
const { caseDocAssistant_controller } = require('../../controller');
const middleware = require('../../middlewares');

router.post('/document/get-file', [middleware.openApi], caseDocAssistant_controller.getFiles);
router.get('/document/get-pending-doc', [middleware.openApi], caseDocAssistant_controller.generatePendingReport);
router.get('/document/run-pending-doc', [middleware.openApi], caseDocAssistant_controller.runPendingDoc);
router.get('/document/failed', [middleware.openApi], caseDocAssistant_controller.getFailedRecords);
router.get('/document/:caseUuid', [middleware.authValidation], caseDocAssistant_controller.getDocument);
router.post('/document/update', [middleware.authValidation], caseDocAssistant_controller.updateUserNotes);
router.post('/document/get', [middleware.authValidation], caseDocAssistant_controller.getAll);

module.exports = router; 