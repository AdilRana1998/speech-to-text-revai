const router = require('express').Router();
const { kolabryaGrok_controller } = require('../../controller');
const uploadFile  = require('../../middlewares/grokUpload');
const middleware = require('../../middlewares');
 
router.post('/kolabrya/external', uploadFile, [middleware.authValidation], kolabryaGrok_controller.postExternal);
router.get('/kolabrya/:requestUuid', [middleware.authValidation], kolabryaGrok_controller.getExternalByUuid);
router.get('/kolabrya/external/clear', [middleware.authValidation], kolabryaGrok_controller.deleteThread);
router.get('/kolabrya', [middleware.authValidation], kolabryaGrok_controller.getAll);
router.post('/kolabrya/add-message', [middleware.openApi], kolabryaGrok_controller.addMessage);
router.post('/kolabrya/files', [middleware.openApi], kolabryaGrok_controller.fileStatus);
router.post('/kolabrya/message', [middleware.openApi], kolabryaGrok_controller.postMessage);
router.post('/kolabrya/count', [middleware.openApi], kolabryaGrok_controller.countRecord);
router.post('/kolabrya/get-all', [middleware.openApi], kolabryaGrok_controller.getRecord);

module.exports = router; 