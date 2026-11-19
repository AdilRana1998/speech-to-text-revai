const router = require('express').Router();
const { caseInterview_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/case-interview/create/form', [middleware.authValidation], caseInterview_controller.createForm);
router.post('/case-interview/create/type', [middleware.authValidation], caseInterview_controller.createType);
router.get('/case-interview/get-form/:caseUuid', [middleware.authValidation], caseInterview_controller.getForm);
router.post('/case-interview/create', [middleware.authValidation], caseInterview_controller.createInterview);
router.post('/case-interview/delete-interview', [middleware.authValidation], caseInterview_controller.deleteInterview);
router.post('/case-interview/fetch-interview', [middleware.authValidation], caseInterview_controller.fetchInterview);
router.post('/case-interview/edit-interview', [middleware.authValidation], caseInterview_controller.editInterview);
router.get('/case-interview/get-interview/:caseUuid', [middleware.authValidation], caseInterview_controller.getInterview);
router.get('/case-interview/interview-detail/:interviewUuid', [middleware.authValidation], caseInterview_controller.interviewDetails);
//Inconsistencies Routes
router.post('/case-interview/post-inc-prompt', [middleware.openApi], caseInterview_controller.postIncPrompt);
router.post('/case-interview/get-pending-inc', [middleware.openApi], caseInterview_controller.startCaseInterviewFileInc);
router.post('/case-interview/start-pending-inc', [middleware.openApi], caseInterview_controller.runCaseInterviewFileInc);
// add inc failure job

//route to dump meeting data in table as the batches
router.post('/case-interview/get-room-data', [middleware.openApi], caseInterview_controller.getRoomData);

//routes to send File Inc + meeting Inc combination to OpenAI.
router.post('/case-interview/get-pending-file-meeting-inc', [middleware.openApi], caseInterview_controller.caseMeetingFileInc);
router.post('/case-interview/start-pending-file-meeting-inc', [middleware.openApi], caseInterview_controller.runCaseMeetingFileInc);

router.post('/case-interview/post', [middleware.openApi], caseInterview_controller.post);
router.post('/case-interview/postFileInc', [middleware.openApi], caseInterview_controller.postFileInc);

module.exports = router; 