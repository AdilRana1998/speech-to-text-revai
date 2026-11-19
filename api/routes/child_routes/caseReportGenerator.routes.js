const router = require('express').Router();
const { caseReport_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/case-report/toc/generate', [middleware.authValidation], caseReport_controller.createCaseTimeLine);
router.post('/case-report/toc/start', [middleware.authValidation], caseReport_controller.getCaseDashboardMap);
router.post('/case-report/toc/retrive', [middleware.authValidation], caseReport_controller.startPendingDashboard);
router.get('/case-report/toc/:caseUuid', [middleware.authValidation], caseReport_controller.viewReportData);
router.post('/case-report/toc-report', [middleware.authValidation], caseReport_controller.combineData);
router.post('/case-report/generate/toc-report', [middleware.authValidation], caseReport_controller.sendCombineData);
router.post('/case-report/generate/retrive', [middleware.authValidation], caseReport_controller.startPendingReport);
router.get('/case-report/download/:reportUuid', [middleware.authValidation], caseReport_controller.downloadReport);

module.exports = router;