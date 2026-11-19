const router = require('express').Router();
const { kolabryaAnalysis_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/analysis/generate', [middleware.authValidation], kolabryaAnalysis_controller.generateAnalysis);
router.get('/analysis-all/:caseUuid?', [middleware.authValidation], kolabryaAnalysis_controller.getAnalysis);
router.get('/analysis/get-pending-analysis', [middleware.openApi], kolabryaAnalysis_controller.generatePendingReport);
router.get('/analysis/run-pending-analysis', [middleware.openApi], kolabryaAnalysis_controller.runPendingReport);
router.get('/analysis/clear/:caseUuid?', [middleware.authValidation], kolabryaAnalysis_controller.deleteAnalysis);
router.get('/analysis/failed', [middleware.authValidation], kolabryaAnalysis_controller.getFailedRecords);
router.get('/analysis/:requestUuid/:caseUuid?', [middleware.authValidation], kolabryaAnalysis_controller.getAnalysisById);

module.exports = router; 