const router = require('express').Router();
const { writeReport_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/report/generate', [middleware.authValidation], writeReport_controller.generateReport);
router.get('/report/clear', [middleware.authValidation], writeReport_controller.deleteAllReport);
router.get('/case/:caseUuid/report/:reportUuid', [middleware.authValidation], writeReport_controller.getReport);
router.get('/report/:caseUuid', [middleware.authValidation], writeReport_controller.getAllReport);

//JOB
router.post('/report/add-message', [middleware.openApi], writeReport_controller.addMessage);

//WEBHOOK
router.post('/report/files', [middleware.openApi], writeReport_controller.fileStatus);
router.post('/report/message', [middleware.openApi], writeReport_controller.postMessage);

module.exports = router;