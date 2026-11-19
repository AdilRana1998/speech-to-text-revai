const router = require('express').Router();
const { kolabryaVisuals_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/visuals/generate', [middleware.authValidation], kolabryaVisuals_controller.generateVisuals);
router.get('/visuals/get-pending-visuals', [middleware.authValidation], kolabryaVisuals_controller.startKolabryaVisuals);
router.get('/visuals/run-pending-visuals', [middleware.authValidation], kolabryaVisuals_controller.runPendingVisuals);
router.get('/visuals/clear', [middleware.authValidation], kolabryaVisuals_controller.deleteVisuals);
router.get('/visuals/failed', [middleware.authValidation], kolabryaVisuals_controller.getFailedRecords);
router.get('/visuals/:requestUuid', [middleware.authValidation], kolabryaVisuals_controller.getVisualsById);
router.get('/visuals-all/:caseUuid', [middleware.authValidation], kolabryaVisuals_controller.getVisuals);

module.exports = router; 