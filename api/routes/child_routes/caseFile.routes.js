const router = require('express').Router();
const { caseFile_controller } = require('../../controller');
const middleware = require('../../middlewares');
const uploadCaseDoc  = require('../../middlewares/casefileUpload'); 
 
router.post('/case/create', uploadCaseDoc,  [middleware.authValidation], caseFile_controller.createCase);
router.get('/case/get', [middleware.authValidation], caseFile_controller.getCase);
router.get('/case/get-case/:caseUuid', [middleware.authValidation], caseFile_controller.getOnlyCase);
router.get('/case/get-all', [middleware.authValidation], caseFile_controller.getCase);
router.get('/case/fetch-all', [middleware.authValidation], caseFile_controller.getGroupData); //*
router.get('/case/get-all-responses', [middleware.authValidation], caseFile_controller.getResponses);
router.get('/case/get-audio', [middleware.authValidation], caseFile_controller.getCaseAudio);
router.get('/case/get/:caseName', [middleware.authValidation], caseFile_controller.searchCase);
router.get('/case/get-id/:caseUuid', [middleware.authValidation], caseFile_controller.searchCaseById);
router.get('/case/get-file/:caseId', [middleware.authValidation], caseFile_controller.getCaseAllFile);
router.get('/case/delete-case/:caseId', [middleware.authValidation], caseFile_controller.deleteCase);
router.post('/case/delete-file', [middleware.authValidation], caseFile_controller.deleteFile);
router.post('/case/update/:caseId', uploadCaseDoc, [middleware.authValidation], caseFile_controller.updateCase);
router.post('/case/add-response', [middleware.authValidation], caseFile_controller.addCaseResponse);
router.post('/case/audio-transcript', [middleware.authValidation], caseFile_controller.audioTranscript);
router.post('/case/view-response', [middleware.authValidation], caseFile_controller.viewCaseResponse);
router.post('/case-type/create', [middleware.authValidation], caseFile_controller.createCaseType);
router.post('/case-type/update', [middleware.authValidation], caseFile_controller.updateCaseType);
router.post('/case-queries/add', [middleware.authValidation], caseFile_controller.addCaseQueries);
router.get('/case-queries/get', [middleware.authValidation], caseFile_controller.getCaseQueries);
router.post('/case-queries/update', [middleware.authValidation], caseFile_controller.updateCaseQueries);
router.post('/case-queries/title/add', [middleware.authValidation], caseFile_controller.addCaseQueriesTitles);
router.get('/case-queries/title/get', [middleware.authValidation], caseFile_controller.getCaseQueriesTitles);
router.post('/case-queries/title/update', [middleware.authValidation], caseFile_controller.updateCaseQueriesTitles);
router.get('/case/runFunction', [middleware.authValidation], caseFile_controller.runFunction);
router.post('/case-file-type/add', [middleware.authValidation], caseFile_controller.addCaseFileType);
router.get('/case-file-type/get', [middleware.authValidation], caseFile_controller.getCaseFileType);
router.post('/case/file-upload-openAI/post', [middleware.openApi], caseFile_controller.uploadFileToOpenAI);

module.exports = router;