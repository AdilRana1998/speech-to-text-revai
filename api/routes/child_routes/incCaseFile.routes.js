const router = require('express').Router();
const { incCaseFile_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/inc-case/create', [middleware.authValidation], incCaseFile_controller.createCase);
router.post('/inc-case/add-file', [middleware.authValidation], incCaseFile_controller.addFile);
router.get('/inc-case/get', [middleware.authValidation], incCaseFile_controller.getCase);
router.post('/inc-case/update/:caseUuid', [middleware.authValidation], incCaseFile_controller.updateCase);
router.get('/inc-case/get-case/:caseUuid', [middleware.authValidation], incCaseFile_controller.getOnlyCase);
router.get('/inc-case/delete-case/:caseUuid', [middleware.authValidation], incCaseFile_controller.deleteCase); //
router.post('/inc-case/delete-file', [middleware.authValidation], incCaseFile_controller.deleteFile);
router.post('/inc-case/delete-folder-files', [middleware.authValidation], incCaseFile_controller.deleteFolderFiles);
router.post('/inc-case/rename-folder', [middleware.authValidation], incCaseFile_controller.renameFolder);
router.post('/inc-case/update-reviewer', [middleware.authValidation], incCaseFile_controller.updateReviewer);
router.post('/inc-case/update-casefile-type', [middleware.authValidation], incCaseFile_controller.updateCaseFileType);
router.post('/inc-case/send-report', [middleware.authValidation], incCaseFile_controller.sendReport);
router.get('/inc-case/get-case-file/:caseUuid', [middleware.authValidation], incCaseFile_controller.getOnlyCaseFile);
router.get('/inc-case/get-case-file-analysis/:caseUuid', [middleware.authValidation], incCaseFile_controller.getOnlyCaseFileAnalysis);
router.get('/inc-case/get-types', [middleware.authValidation], incCaseFile_controller.getCaseTypes);
router.get('/inc-case/delete-report/:requestUuid', [middleware.authValidation], incCaseFile_controller.deleteReport);
router.get('/inc-case/get-all-summary/:caseUuid', [middleware.authValidation], incCaseFile_controller.getSummaryAll);
router.get('/inc-case/get-ocf6-summary/:requestUuid', [middleware.authValidation], incCaseFile_controller.getOcfSixSummary);
router.get('/inc-case/get-ltd-summary/:requestUuid', [middleware.authValidation], incCaseFile_controller.getLTDSummary);
router.get('/inc-case/invoice', [middleware.authValidation], incCaseFile_controller.getIncInvoice);
// disability=7

router.get('/inc-case/get-medical-summary/:requestUuid', [middleware.authValidation], incCaseFile_controller.getSummaryNew);
router.get('/inc-case/get-ime-summary/:requestUuid', [middleware.authValidation], incCaseFile_controller.getIMESummary);
router.get('/inc-case/get-ocf-summary/:requestUuid', [middleware.authValidation], incCaseFile_controller.getOcfSummary);
router.get('/inc-case/get-income-summary/:requestUuid', [middleware.authValidation], incCaseFile_controller.getIncomeSummary);
router.get('/inc-case/get-ab-summary/:requestUuid', [middleware.authValidation], incCaseFile_controller.getABSummary);

router.get('/inc-case/get-all-filter/:requestUuid', [middleware.authValidation], incCaseFile_controller.getSummaryFilter);

//
router.post('/inc-case/presigned-urls', [middleware.authValidation], incCaseFile_controller.presignedUrls);

//report
router.post('/inc-case/report', [middleware.authValidation], incCaseFile_controller.generateReport);
router.post('/inc-case/edit-report', [middleware.authValidation], incCaseFile_controller.editReport);
router.get('/inc-case/report/:reportUuid/:caseUuid', [middleware.authValidation], incCaseFile_controller.getReport);
router.get('/inc-case/report/:caseUuid', [middleware.authValidation], incCaseFile_controller.getAllReport);
router.get('/inc-case/delete/report', [middleware.authValidation], incCaseFile_controller.deleteAllReport);
router.get('/inc-case/delete-summary/:recordUuid/:caseUuid', [middleware.authValidation], incCaseFile_controller.deleteSummary);


router.post('/inc-case/summary/report', [middleware.authValidation], incCaseFile_controller.generateSummaryReport);
router.get('/inc-case/summary/report/:reportUuid/:caseUuid/:reportType', [middleware.authValidation], incCaseFile_controller.getSummaryReport);
router.get('/inc-case/summary/report-all/:caseUuid/:reportType', [middleware.authValidation], incCaseFile_controller.getAllSummaryReport);
router.get('/inc-case/summary/delete/report/:caseUuid/:reportType', [middleware.authValidation], incCaseFile_controller.deleteAllSummaryReport);

//setlement
router.post('/inc-case/settlement', [middleware.authValidation], incCaseFile_controller.generateSettlement);
router.get('/inc-case/settlement/:reportUuid/:caseUuid', [middleware.authValidation], incCaseFile_controller.getSettlement);
router.get('/inc-case/settlement/:caseUuid', [middleware.authValidation], incCaseFile_controller.getAllSettlement);
router.get('/inc-case/delete/settlement/:caseUuid', [middleware.authValidation], incCaseFile_controller.deleteAllSettlement);

//injury-tracking
router.post('/inc-case/injury-tracking', [middleware.authValidation], incCaseFile_controller.generateInjuryTracking);
router.get('/inc-case/get-injury-tracking/:requestUuid/:caseUuid', [middleware.authValidation], incCaseFile_controller.getInjuryTracking);
router.get('/inc-case/all-injury-tracking/:caseUuid', [middleware.authValidation], incCaseFile_controller.getAllInjuryTracking);
router.get('/inc-case/delete/injury-tracking/:caseUuid', [middleware.authValidation], incCaseFile_controller.deleteAllSettlement);

//firsst webhook job
router.post('/inc-case/update-report', [middleware.openApi], incCaseFile_controller.updateReport);
router.post('/inc-case/mediation-report', [middleware.openApi], incCaseFile_controller.updateMediationReport);
router.post('/inc-case/summary/get-report', [middleware.openApi], incCaseFile_controller.reportSummary);
router.post('/inc-case/settlement-report', [middleware.openApi], incCaseFile_controller.updateSettlementReport);
router.post('/inc-case/tracking-injury', [middleware.openApi], incCaseFile_controller.updateInjuryTracking);
router.post('/inc-case/medical-injury', [middleware.openApi], incCaseFile_controller.updateMedicalInjuryReport);
router.post('/inc-case/download-report', [middleware.openApi], incCaseFile_controller.downloadReport);

//report
router.post('/inc-case/email-report', [middleware.openApi], incCaseFile_controller.emailReport);

//generate data for old users
router.post('/inc-case/data-regerator', [middleware.openApi], incCaseFile_controller.dataRegenerator);

//download manager
router.post('/inc-case/generate-file', [middleware.authValidation], incCaseFile_controller.generateFile);
router.get('/inc-case/download-file/:requestUuid/:caseUuid', [middleware.authValidation], incCaseFile_controller.downloadFile);

router.post('/inc-case/add-response', [middleware.authValidation], incCaseFile_controller.addResponse);
router.get('/inc-case/view-response/:caseUuid', [middleware.authValidation], incCaseFile_controller.viewResponse);
router.get('/inc-case/delete-response/:caseUuid/:requestUuid', [middleware.authValidation], incCaseFile_controller.deleteResponse);


router.post('/inc-case/flat-data-regerator', [middleware.openApi], incCaseFile_controller.flatDataRegenerator);
router.post('/inc-case/send-custom-report', [middleware.authValidation], incCaseFile_controller.sendCustomReport);

//add sections
router.post('/inc-case/add-section', [middleware.authValidation], incCaseFile_controller.addSection);
router.get('/inc-case/get-section/:caseUuid/:reportType', [middleware.authValidation], incCaseFile_controller.getSection);
router.get('/inc-case/delete-section/:caseUuid/:requestUuid', [middleware.authValidation], incCaseFile_controller.deleteSection);
router.post('/inc-case/update-section', [middleware.authValidation], incCaseFile_controller.updateSection);

//save prompts
router.post('/inc-case/add-prompt', [middleware.authValidation], incCaseFile_controller.addPrompt);
router.post('/inc-case/update-prompt', [middleware.authValidation], incCaseFile_controller.updatePrompt);
router.get('/inc-case/get-prompt/:caseUuid', [middleware.authValidation], incCaseFile_controller.getPrompt);
router.get('/inc-case/delete-prompt/:caseUuid/:requestUuid', [middleware.authValidation], incCaseFile_controller.deletePrompt);
router.get('/inc-case/get-prompt-types', [middleware.authValidation], incCaseFile_controller.getPromptTypes);

//share case => user1 can share only one case with user2 
router.post('/inc-case/share-case', [middleware.authValidation], incCaseFile_controller.shareCase);
router.post('/inc-case/revoke-share-case', [middleware.authValidation], incCaseFile_controller.revokeShareCase);
router.get('/inc-case/get-share-case/:caseUuid', [middleware.authValidation], incCaseFile_controller.getShareCase);

router.post('/inc-case/medical-injury/report', [middleware.authValidation], incCaseFile_controller.generateMedicalInjuryReport);
router.post('/inc-case/save-injury', [middleware.authValidation], incCaseFile_controller.saveInjury);
router.get('/inc-case/medical-injury/report/:reportUuid/:caseUuid', [middleware.authValidation], incCaseFile_controller.getMedicalInjuryReport);
router.get('/inc-case/medical-injury/report-all/:caseUuid', [middleware.authValidation], incCaseFile_controller.getAllMedicalInjuryReport);
router.get('/inc-case/medical-injury/delete/report/:caseUuid', [middleware.authValidation], incCaseFile_controller.deleteAllMedicalInjuryReport);

module.exports = router;