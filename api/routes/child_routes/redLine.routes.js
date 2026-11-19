const router = require('express').Router();
const { redLine_controller } = require('../../controller');
const middleware = require('../../middlewares');
const uploadFile  = require('../../middlewares/docxUpload'); 
 
router.post('/service/8p4q2z6w', uploadFile, [middleware.authValidation], redLine_controller.postRedLine);
router.get('/service/get-pending-redlines', [middleware.authValidation], redLine_controller.getPendingRedLine); 
router.get('/service/run-pending-redlines', [middleware.authValidation], redLine_controller.runPendingRedLine);
router.get('/service/all-redlines/:redlineUuid', [middleware.authValidation], redLine_controller.getRedLine);
router.get('/service/redlines', [middleware.authValidation], redLine_controller.getAllRedLine);
router.get('/service/clear', [middleware.authValidation], redLine_controller.deleteAllRedLine);

module.exports = router;


 