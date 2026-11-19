const router = require('express').Router();
const { chatgpt_controller } = require('../../controller');
const middleware = require('../../middlewares');
const uploadFile  = require('../../middlewares/fileUpload');  

router.post('/access/b5c7d2e1', uploadFile, [middleware.authValidation], chatgpt_controller.chatgpt);
router.get('/access/get-answer/:thread', [middleware.authValidation], chatgpt_controller.getanswer)
router.get('/access/get-all/:botId', [middleware.authValidation], chatgpt_controller.getall);
router.get('/access/delete-thread/:botId', [middleware.authValidation], chatgpt_controller.clearThread);
router.get('/access/document/:requestUuid', [middleware.authValidation], chatgpt_controller.getanswerdoc)
router.get('/access/document', [middleware.authValidation], chatgpt_controller.getalldoc);
router.post('/access/set-transcript', [middleware.authValidation], chatgpt_controller.set_Transcript)
router.get('/access/get-transcript/:botId', [middleware.authValidation], chatgpt_controller.get_Transcript)
router.post('/access/download-video', [middleware.authValidation], chatgpt_controller.downloadVideo);
router.get('/access/get-video/:botId', [middleware.authValidation], chatgpt_controller.convertFile);
router.get('/access/download-transcript/:botId', [middleware.authValidation], chatgpt_controller.formatFile);
router.get('/access/get-all-reports/:botId', [middleware.authValidation], chatgpt_controller.getallreports);
router.get('/access/get-answer-report/:thread', [middleware.authValidation], chatgpt_controller.getanswereport);
// router.post('/access/encrypt-thread', [middleware.openApi], chatgpt_controller.encryptData);
router.post('/access/delete-file-openAI', [middleware.authValidation], chatgpt_controller.getAndDeletFile);
router.post('/access/delete-vector-openAI', [middleware.authValidation], chatgpt_controller.getAndDeletVector);
router.post('/access/get-all', [middleware.authValidation], chatgpt_controller.getAll);
router.post('/access/improve-prompt', [middleware.authValidation], chatgpt_controller.prompt);
router.get('/access/get-improve-prompt/:thread', [middleware.authValidation], chatgpt_controller.getPrompt)
router.post('/access/add-feedback', [middleware.authValidation], chatgpt_controller.feedback);
router.get('/access/get-answer-rewrite-report/:thread', [middleware.authValidation], chatgpt_controller.getrewritereport);
router.get('/access/get-all-rewrite-reports/:botId', [middleware.authValidation], chatgpt_controller.getallrewritereport);
router.post('/access/research', [middleware.authValidation], chatgpt_controller.startResearch);
router.get('/access/get-answer-research/:thread', [middleware.authValidation], chatgpt_controller.getResearch);
router.get('/access/get-all-research/:botId', [middleware.authValidation], chatgpt_controller.getAllResearch);
router.get('/access/get-users-prompts', [middleware.authValidation], chatgpt_controller.getUsersPrompts);
router.get('/access/get-answer-titleXI-law/:thread', [middleware.authValidation], chatgpt_controller.getEmpLaw);
router.get('/access/get-all-titleXI-law/:botId', [middleware.authValidation], chatgpt_controller.getAllEmpLaw);
router.get('/access/all-prompt', [middleware.authValidation], chatgpt_controller.allPrompts);
router.get('/access/get-last-prompt', [middleware.authValidation], chatgpt_controller.lastPrompts);
router.get('/access/combined-activity', [middleware.authValidation], chatgpt_controller.allActivity);
router.post('/access/agent', [middleware.authValidation], chatgpt_controller.askAgent);
router.get('/access/agent/:requestUuid', [middleware.authValidation], chatgpt_controller.getAgentData);
router.get('/access/agent', [middleware.authValidation], chatgpt_controller.getAllAgentData);
router.get('/access/get-all-guide', [middleware.authValidation], chatgpt_controller.getAllGuideData);
router.get('/access/get-guide/:thread', [middleware.authValidation], chatgpt_controller.getGuideData);
router.post('/access/case-analysis', [middleware.authValidation], chatgpt_controller.readCase);
router.post('/access/get-data', [middleware.authValidation], chatgpt_controller.getUserData);
router.post('/access/delete-agent-thread', [middleware.authValidation], chatgpt_controller.deleteAgentThreads);
router.get('/access/delete-caidi-thread', [middleware.authValidation], chatgpt_controller.deleteCaidiThreads);
router.post('/access/1b5c7d2e1', [middleware.authValidation], chatgpt_controller.generateVisual);
router.get('/access/visuals/:thread', [middleware.authValidation], chatgpt_controller.getVisuals);
router.get('/access/visuals', [middleware.authValidation], chatgpt_controller.fetchVisuals);
router.post('/access/combine-data', [middleware.authValidation], chatgpt_controller.combineData);
router.post('/access/citation/upload-file', [middleware.openApi], chatgpt_controller.uploadFileCitation);
router.post('/access/citation/edit-file', [middleware.openApi], chatgpt_controller.editFileCitation);
router.post('/access/citation/files-upload-status', [middleware.openApi], chatgpt_controller.fileUploadStatusCitation);
router.post('/access/citation/upload-file-bulk', [middleware.openApi], chatgpt_controller.uploadFileCitationBulk);
router.post('/access/deActivate', [middleware.openApi], chatgpt_controller.deActivateOldRecords);


router.get('/access/get-answer-ins/:requestUuid', [middleware.authValidation], chatgpt_controller.getAnswerIns)
router.get('/access/get-all-ins', [middleware.authValidation], chatgpt_controller.getAllIns);

//a2aj mcp
router.post('/access/a2aj/mcp', [middleware.openApi], chatgpt_controller.a2ajMCP)


//VECTOR STORE
router.post('/access/vector/create-add', [middleware.openApi], chatgpt_controller.createVector);
router.post('/access/vector/retrive', [middleware.openApi], chatgpt_controller.retriveVectorStore);
router.post('/access/vector/add-file', [middleware.openApi], chatgpt_controller.updateVectorStore);
router.post('/access/vector/delete-file', [middleware.openApi], chatgpt_controller.deleteFileFromVectorStore);


router.post('/access/b5c7d2egr', [middleware.authValidation], chatgpt_controller.createQuery);
router.get('/access-all', [middleware.authValidation], chatgpt_controller.getAnalysis);
router.get('/access-all/clear', [middleware.authValidation], chatgpt_controller.deleteAnalysis);
router.get('/access-all/:requestUuid', [middleware.authValidation], chatgpt_controller.getAnalysisById);
router.post('/access-all/delete-file', [middleware.authValidation], chatgpt_controller.removeFile);

//
router.post('/access/presigned-urls', [middleware.authValidation], chatgpt_controller.presignedUrls);
router.post('/access/add-file', [middleware.authValidation], chatgpt_controller.addFile);
router.get('/get-batch/:requestUuid', [middleware.authValidation], chatgpt_controller.getBatch);
router.get('/recent-batch', [middleware.authValidation], chatgpt_controller.recentBatch);

//delete file api 

module.exports = router;