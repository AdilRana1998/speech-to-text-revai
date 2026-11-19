const router = require('express').Router();
const { sampleFile_controller } = require('../../controller');
const middleware = require('../../middlewares');
const uploadFile  = require('../../middlewares/sampleAttachmentUpload'); 
 
router.post('/sample/create', uploadFile, [middleware.authValidation], sampleFile_controller.createSample);
router.get('/sample/get', [middleware.authValidation], sampleFile_controller.getCase);
router.get('/sample/get/:sampleName', [middleware.authValidation], sampleFile_controller.sampleCase);
router.get('/sample/get-file/:promptId', [middleware.authValidation], sampleFile_controller.getSampleAllFile);
router.get('/sample/delete-sample/:promptId', [middleware.authValidation], sampleFile_controller.deleteSample);
router.get('/sample/delete-file/:fileId', [middleware.authValidation], sampleFile_controller.deleteFile);
router.get('/sample/get-id/:promptUuid', [middleware.authValidation], sampleFile_controller.searchPromptById);
// router.post('/sample/update/:caseId', uploadFile, [middleware.authValidation], sampleFile_controller.updateCase);

module.exports = router;


 