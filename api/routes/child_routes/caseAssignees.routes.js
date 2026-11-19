const router = require('express').Router();
const { caseAssignees_controller } = require('../../controller');
const middleware = require('../../middlewares');
const uploadCaseDoc  = require('../../middlewares/casefileUpload'); 


router.post('/assistant/case/assign', [middleware.authValidation], caseAssignees_controller.assign);
router.get('/assistant/case/assigned', [middleware.authValidation], caseAssignees_controller.assignedCases);
router.post('/assistant/case/delete-file', [middleware.authValidation], caseAssignees_controller.deleteAssignedCaseFile);
router.post('/assistant/case/edit/:caseUuid', uploadCaseDoc, [middleware.authValidation], caseAssignees_controller.editAssignedCase);

router.post('/assistant/case/unassign', [middleware.authValidation], caseAssignees_controller.unassign);
// router.get('/cases/:caseUuid/assignees', [middleware.authValidation], caseAssignees_controller.assignees);


router.get('/assignees/case/get', [middleware.authValidation], caseAssignees_controller.getCase);
router.get('/assignees/case/get-case/:caseUuid', [middleware.authValidation], caseAssignees_controller.getOnlyCase);



module.exports = router;