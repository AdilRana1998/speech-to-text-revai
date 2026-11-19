const router = require('express').Router();
const { documentEnhance_controller } = require('../../controller');
const middleware = require('../../middlewares');
const uploadDoc  = require('../../middlewares/docxEnhance'); 
 
router.post('/doc-enhance/create', uploadDoc, [middleware.authValidation], documentEnhance_controller.createCase);
router.get('/doc-enhance/get', [middleware.authValidation], documentEnhance_controller.getCase);
router.get('/doc-enhance/get-enhance/:requestUuid', [middleware.authValidation], documentEnhance_controller.getOnlyCase);
router.get('/doc-enhance/delete-enhance/:requestUuid', [middleware.authValidation], documentEnhance_controller.deleteCase);

//job
router.post('/doc-enhance/start-report', [middleware.openApi], documentEnhance_controller.startDocEnhancement);
router.post('/doc-enhance/send-report', [middleware.openApi], documentEnhance_controller.sendReport);

//webhook
router.post('/doc-enhance/update-doc', [middleware.openApi], documentEnhance_controller.updateReport);
module.exports = router;