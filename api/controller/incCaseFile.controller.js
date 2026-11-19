const Controller = {}
const { sendStatus } = require('../../utils')
const {
    addCase,
    addFile,
    fetchCase,
    removeCase,
    removeFile,
    alterCase,
    renameFolder,
    sendReport,
    updateReport,
    fetchOnlyCase,
    updateReviewer,
    updateCaseFileType,
    fetchOnlyCaseFile,
    fetchCaseTypes,
    deleteReport,
    getSummary,
    getSummaryAll,
    getSummaryNew,
    generateReport,
    getReport,
    deleteFolderFiles,
    getAllReport,
    updateMediationReport,
    deleteAllReport,
    getOcfSummary,
    getOcfSixSummary,
    getIncomeSummary,
    generateSummaryReport,
    getSummaryReport,
    getAllSummaryReport,
    deleteAllSummaryReport,
    reportSummary,
    getABSummary,
    presignedUrls,
    getIMESummary,
    generateSettlement,
    getSettlement,
    getAllSettlement,
    deleteAllSettlement,
    updateSettlementReport,
    getLTDSummary,
    emailReport,
    getIncInvoice,
    generateInjuryTracking,
    getInjuryTracking,
    updateInjuryTracking,
    getAllInjuryTracking,
    getOnlyCaseFileAnalysis,
    dataRegenerator,
    editReport,
    generateFile,
    downloadFile,
    downloadReport,
    addResponse,
    viewResponse,
    flatDataRegenerator,
    addSection,
    getSection,
    deleteSection,
    alterSection,
    deleteSummary,
    getSummaryFilter,
    sendCustomReport,
    addPrompt,
    getPrompt,
    deletePrompt,
    updatePrompt,
    shareCase,
    getShareCase,
    revokeShareCase,
    generateMedicalInjuryReport,
    getMedicalInjuryReport,
    getAllMedicalInjuryReport,
    deleteAllMedicalInjuryReport,
    updateMedicalInjuryReport,
    saveInjury,
    getPromptTypes,
    deleteResponse
} = require('../services/incCaseFile.services');

Controller.createCase = async (req, res, next) => {
    const caseName = req.body?.caseName;
    const caseType = req.body?.caseType;
    const caseTypeTitle = req.body?.caseTypeTitle;
    //tort
    const plaintiffFirstName = req.body?.plaintiffFirstName;
    const plaintiffLastName = req.body?.plaintiffLastName;
    const plaintiffDOB = req.body?.plaintiffDOB;
    const insuredDefendant = req.body?.insuredDefendant;
    const dateOfLoss = req.body?.dateOfLoss;
    const liabilityDispute = req.body?.liabilityDispute;
    const incomeLoss = req.body?.incomeLoss;
    const housekeepingRequired = req.body?.housekeepingRequired;
    const futureCareNeeded = req.body?.futureCareNeeded;
    const outOfPocketExpenses = req.body?.outOfPocketExpenses;
    const previousAccident = req.body?.previousAccident;
    const previousAccidentDate = req.body?.previousAccidentDate;
    const subsequentAccident = req.body?.subsequentAccident;
    const subsequentAccidentDate = req.body?.subsequentAccidentDate;
    //ab
    const applicantiffFirstName = req.body?.applicantiffFirstName;
    const applicantiffLastName = req.body?.applicantiffLastName;
    const applicantiffDOB = req.body?.applicantiffDOB;
    const insuredDefendantAB = req.body?.insuredDefendantAB;
    const dateOfLossAB = req.body?.dateOfLossAB;
    const applicantiffInMIG = req.body?.applicantiffInMIG;
    const disputingCAT = req.body?.disputingCAT;
    const summaryOfOCF18 = req.body?.summaryOfOCF18;
    const summaryOfOCF6 = req.body?.summaryOfOCF6;
    const attendantCareDispute = req.body?.attendantCareDispute;
    const specifiedBenefitsDispute = req.body?.specifiedBenefitsDispute;

    const primaryAttorneyEmail = req.body?.primaryAttorneyEmail;
    const additionalEmails = req.body?.additionalEmails;
    const userId = req.userId;
    const result = await addCase(caseName, plaintiffFirstName, plaintiffLastName, plaintiffDOB, insuredDefendant, dateOfLoss, liabilityDispute, incomeLoss, housekeepingRequired, futureCareNeeded, outOfPocketExpenses, previousAccident, previousAccidentDate, subsequentAccident, subsequentAccidentDate, applicantiffFirstName, applicantiffLastName, applicantiffDOB, insuredDefendantAB, dateOfLossAB, applicantiffInMIG, disputingCAT, summaryOfOCF18, summaryOfOCF6, attendantCareDispute, specifiedBenefitsDispute, primaryAttorneyEmail, additionalEmails, caseType, caseTypeTitle, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Inc-Case", result.statusCode);
}

Controller.addFile = async (req, res, next) => {
    const requestUuid = req.body?.requestUuid;
    const caseFiles = req.body?.caseFiles;
    const reviewers = req.body?.reviewers;
    const caseFileTypes = req.body?.caseFileTypes;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await addFile(caseFiles, requestUuid, reviewers, caseFileTypes, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-File-Inc-Case", result.statusCode);
}

Controller.getCase = async (req, res, next) => {
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await fetchCase(isGroup, groupUsers, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Active-Inc-Cases", result.statusCode);
}

Controller.getOnlyCase = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.params.caseUuid;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await fetchOnlyCase(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Only-Inc-Active-Cases-By-Uuid", result.statusCode);
}

Controller.getOnlyCaseFile = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.params.caseUuid;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await fetchOnlyCaseFile(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Inc-Active-Cases-Summary-By-Uuid", result.statusCode);
}

Controller.getOnlyCaseFileAnalysis = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.params.caseUuid;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getOnlyCaseFileAnalysis(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Inc-Active-Cases--Analysis-Summary-By-Uuid", result.statusCode);
}

Controller.deleteCase = async (req, res, next) => {
    const userId = req.userId;
    const caseId = req.params.caseUuid;
    const result = await removeCase(caseId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Inc-Active-Case", result.statusCode);
}

Controller.deleteFile = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.body.caseUuid;
    const fileUuid = req.body.fileUuid;
    const result = await removeFile(caseUuid, fileUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Inc-Active-File", result.statusCode);
}

Controller.deleteFolderFiles = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.body.caseUuid;
    const fileUuid = req.body.fileUuid;
    const result = await deleteFolderFiles(caseUuid, fileUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Inc-Active-File", result.statusCode);
}

Controller.renameFolder = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.body.caseUuid;
    const fileUuid = req.body.renameFolder;
    const result = await renameFolder(caseUuid, fileUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Rename-User-Inc-Active-Folder", result.statusCode);
}

Controller.updateReviewer = async (req, res, next) => {
    const reviewers = req.body.reviewers;
    const caseUuid = req.body.caseUuid;
    const fileUuid = req.body.fileUuid;
    const userId = req.userId;
    const result = await updateReviewer(reviewers, caseUuid, fileUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Reviewer-Inc-Active-File", result.statusCode);
}

Controller.updateCaseFileType = async (req, res, next) => {
    const caseFileTypes = req.body.caseFileTypes;
    const caseUuid = req.body.caseUuid;
    const fileUuid = req.body.fileUuid;
    const userId = req.userId;
    const result = await updateCaseFileType(caseFileTypes, caseUuid, fileUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-CaseFileTypes-Inc-Active-File", result.statusCode);
}

Controller.updateCase = async (req, res, next) => {
    const caseName = req.body?.caseName;
    const caseType = req.body?.caseTypeUuid;
    //tort
    const plaintiffFirstName = req.body?.plaintiffFirstName;
    const plaintiffLastName = req.body?.plaintiffLastName;
    const plaintiffDOB = req.body?.plaintiffDOB;
    const insuredDefendant = req.body?.insuredDefendant;
    const dateOfLoss = req.body?.dateOfLoss;
    const liabilityDispute = req.body?.liabilityDispute;
    const incomeLoss = req.body?.incomeLoss;
    const housekeepingRequired = req.body?.housekeepingRequired;
    const futureCareNeeded = req.body?.futureCareNeeded;
    const outOfPocketExpenses = req.body?.outOfPocketExpenses;
    const previousAccident = req.body?.previousAccident;
    const previousAccidentDate = req.body?.previousAccidentDate;
    const subsequentAccident = req.body?.subsequentAccident;
    const subsequentAccidentDate = req.body?.subsequentAccidentDate;

    //ab
    const applicantiffFirstName = req.body?.applicantiffFirstName;
    const applicantiffLastName = req.body?.applicantiffLastName;
    const applicantiffDOB = req.body?.applicantiffDOB;
    const insuredDefendantAB = req.body?.insuredDefendantAB;
    const dateOfLossAB = req.body?.dateOfLossAB;
    const applicantiffInMIG = req.body?.applicantiffInMIG;
    const disputingCAT = req.body?.disputingCAT;
    const summaryOfOCF18 = req.body?.summaryOfOCF18;
    const summaryOfOCF6 = req.body?.summaryOfOCF6;
    const attendantCareDispute = req.body?.attendantCareDispute;
    const specifiedBenefitsDispute = req.body?.specifiedBenefitsDispute;

    //
    const primaryAttorneyEmail = req.body?.primaryAttorneyEmail;
    const additionalEmails = req.body?.additionalEmails;
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const result = await alterCase(caseName, plaintiffFirstName, plaintiffLastName, plaintiffDOB, insuredDefendant, dateOfLoss, liabilityDispute, incomeLoss, housekeepingRequired, futureCareNeeded, outOfPocketExpenses, previousAccident, previousAccidentDate, subsequentAccident, subsequentAccidentDate, applicantiffFirstName, applicantiffLastName, applicantiffDOB, insuredDefendantAB, dateOfLossAB, applicantiffInMIG, disputingCAT, summaryOfOCF18, summaryOfOCF6, attendantCareDispute, specifiedBenefitsDispute, primaryAttorneyEmail, additionalEmails, caseType, caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update/Edit-File-In-Inc-Case", result.statusCode);
}

Controller.sendReport = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const summaryName = req.body?.summaryName;
    const caseFiles = req.body?.caseFiles;
    const isCombine = req.body?.isCombine;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await sendReport(caseUuid, summaryName, caseFiles, isCombine, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Report-API", result.statusCode);
}

Controller.updateReport = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const jobUuid = req.body?.jobUuid;
    const caseInfoHeader = req.body?.caseInfoHeader;
    const status = req.body?.status;
    const caseDetails = req.body.records;
    const failedDetails = req.body?.failedFiles;
    const allData = req.body;
    const result = await updateReport(caseUuid, jobUuid, caseInfoHeader, status, caseDetails, failedDetails, allData);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Response-Webhook-Ins-Case", result.statusCode);
}

Controller.getCaseTypes = async (req, res, next) => {
    const userId = req.userId;
    const result = await fetchCaseTypes(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Active-Inc-Cases-Types", result.statusCode);
}

Controller.deleteReport = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const result = await deleteReport(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Inc-Active-Case-Report", result.statusCode);
}

Controller.getSummary = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const result = await getSummary(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Summary", result.statusCode);
}

Controller.getSummaryAll = async (req, res, next) => {
    const caseUuid = req.params.caseUuid
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getSummaryAll(caseUuid, userId, isGroup, groupUsers)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Summary-All", result.statusCode);
}

Controller.getSummaryNew = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const date = req.query.date;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const preDOL = req.query.preDol;
    const postDOL = req.query.postDol;
    const fileName = req.query.fileName;
    const fileType = req.query.section
    const duplicate = req.query.duplicate;
    const insurerDecision = req.query.insurerDecision;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getSummaryNew(requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Medical-Summary", result.statusCode);
}

Controller.getOcfSummary = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const date = req.query.date;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const preDOL = req.query.preDol;
    const postDOL = req.query.postDol;
    const fileName = req.query.fileName;
    const fileType = req.query.section
    const duplicate = req.query.duplicate;
    const insurerDecision = req.query.insurerDecision;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getOcfSummary(requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-OCF-Summary", result.statusCode);
}

Controller.getOcfSixSummary = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const result = await getOcfSixSummary(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-OCF-Six-Summary", result.statusCode);
}

Controller.getIncomeSummary = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const date = req.query.date;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const preDOL = req.query.preDol;
    const postDOL = req.query.postDol;
    const fileName = req.query.fileName;
    const fileType = req.query.section
    const duplicate = req.query.duplicate;
    const insurerDecision = req.query.insurerDecision;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getIncomeSummary(requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Income-Summary", result.statusCode);
}

Controller.getABSummary = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const date = req.query.date;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const preDOL = req.query.preDol;
    const postDOL = req.query.postDol;
    const fileName = req.query.fileName;
    const fileType = req.query.section
    const duplicate = req.query.duplicate;
    const insurerDecision = req.query.insurerDecision;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getABSummary(requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-AB-Summary", result.statusCode);
}

Controller.getIMESummary = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const date = req.query.date;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const preDOL = req.query.preDol;
    const postDOL = req.query.postDol;
    const fileName = req.query.fileName;
    const fileType = req.query.section
    const duplicate = req.query.duplicate;
    const insurerDecision = req.query.insurerDecision;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getIMESummary(requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-IME-Summary", result.statusCode);
}

Controller.getLTDSummary = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const result = await getLTDSummary(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-LTD-Summary", result.statusCode);
}

Controller.generateReport = async (req, res, next) => {
    const jobUuid = req.body?.jobUuid;
    const caseUuid = req.body?.caseUuid;
    const userQuery = req.body?.userQuery;
    const promptType = req.body?.promptType;
    const fileUuid = req.body?.fileDetails;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await generateReport(promptType, userQuery, caseUuid, jobUuid, fileUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Report-Ins", result.statusCode);
}

Controller.getReport = async (req, res, next) => {
    const requestUuid = req.params.reportUuid;
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getReport(requestUuid, caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Report-Ins", result.statusCode);
}

Controller.getAllReport = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getAllReport(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Report-Ins", result.statusCode);
}

Controller.updateMediationReport = async (req, res, next) => {
    const messageId = req.body?.messageId;
    const threadId = req.body?.threadId;
    const role = req.body?.role;
    const content = req.body?.content;
    const status = req.body?.status;
    const sourceChunks = req.body?.sourceChunks;
    const citations = req.body?.citations;
    const allData = req.body;
    const result = await updateMediationReport(messageId, threadId, role, content, status, sourceChunks, citations, allData);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Response-Webhook-Ins-Case-Mediation-Report", result.statusCode);
}

Controller.updateInjuryTracking = async (req, res, next) => {
    const jobUuid = req.body?.jobUuid;
    const status = req.body?.status;
    const response = req.body.injuryData;
    const allData = req.body;
    const result = await updateInjuryTracking(jobUuid, status, response, allData);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Response-Webhook-Ins-Injury-Tracking-Webhook", result.statusCode);
}

Controller.updateMedicalInjuryReport = async (req, res, next) => {
    const jobUuid = req.body?.jobUuid;
    const status = req.body?.status;
    const response = req.body.MedicalChronologyReport;
    const citations = req.body?.citations;
    const allData = req.body;
    const result = await updateMedicalInjuryReport(jobUuid, status, response, citations, allData);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Response-Webhook-Ins-Medical-Injury-Report-Webhook", result.statusCode);
}

Controller.updateSettlementReport = async (req, res, next) => {
    const messageId = req.body?.messageId;
    const threadId = req.body?.threadId;
    const role = req.body?.role;
    const content = req.body?.content;
    const status = req.body?.status;
    const sourceChunks = req.body?.sourceChunks;
    const allData = req.body;
    const result = await updateSettlementReport(messageId, threadId, role, content, status, sourceChunks, allData);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Response-Webhook-Ins-Case-Settlement-Report", result.statusCode);
}

Controller.deleteAllReport = async (req, res, next) => {
    const userId = req.userId;
    const result = await deleteAllReport(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Mediation-Report", result.statusCode);
}

Controller.generateSummaryReport = async (req, res, next) => {
    const reportType = req.body?.reportType;
    const caseUuid = req.body?.caseUuid;
    const clientSide = req.body?.clientSide;
    const reportStructure = req.body?.reportStructure;
    const selectedSections = req.body?.selectedSections;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await generateSummaryReport(reportType, caseUuid, clientSide, reportStructure, selectedSections, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Summary-Report", result.statusCode);
}

Controller.getSummaryReport = async (req, res, next) => {
    const requestUuid = req.params.reportUuid;
    const caseUuid = req.params.caseUuid;
    const reportType = req.params.reportType;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getSummaryReport(caseUuid, requestUuid, reportType, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Summary-Report-Ins", result.statusCode);
}

Controller.getAllSummaryReport = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const reportType = req.params.reportType;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getAllSummaryReport(caseUuid, reportType, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Summary-Report-Ins", result.statusCode);
}

Controller.deleteAllSummaryReport = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const reportType = req.params.reportType;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await deleteAllSummaryReport(caseUuid, reportType, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Mediation-Report", result.statusCode);
}

Controller.reportSummary = async (req, res, next) => {
    const jobUuid = req.body?.jobUuid;
    const status = req.body?.status;
    const reportData = req.body?.reportData;
    const citations = req.body?.citations;
    const allData = req.body;
    const result = await reportSummary(jobUuid, status, reportData, citations, allData);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Response-Webhook-Ins-Case-Summary-Report", result.statusCode);
}

Controller.presignedUrls = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const fileNames = req.body?.files;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await presignedUrls(fileNames, caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Azure-Blob-Storage-Pre-Design-Url", result.statusCode);
}

Controller.generateSettlement = async (req, res, next) => {
    const jobUuid = req.body?.jobUuid;
    const caseUuid = req.body?.caseUuid;
    const userQuery = req.body?.userQuery;
    const promptType = req.body?.promptType;
    const caseType = req.body?.caseType;
    const userId = req.userId;
    const result = await generateSettlement(promptType, userQuery, caseUuid, caseType, jobUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Settlement-Ins", result.statusCode);
}

Controller.getSettlement = async (req, res, next) => {
    const requestUuid = req.params.reportUuid;
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const result = await getSettlement(requestUuid, caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Settlement-Ins", result.statusCode);
}

Controller.getAllSettlement = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const result = await getAllSettlement(caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Settlement-Ins", result.statusCode);
}

Controller.deleteAllSettlement = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await deleteAllSettlement(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Settlement-Ins", result.statusCode);
}

Controller.emailReport = async (req, res, next) => {
    const result = await emailReport();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Email-Report", result.statusCode);
}

Controller.getIncInvoice = async (req, res, next) => {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const userId = req.userId;
    const caseId = req.query.caseId
    const result = await getIncInvoice(startDate, endDate, userId, caseId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Inc-Invoice", result.statusCode);
}

Controller.generateInjuryTracking = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await generateInjuryTracking(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Injury-Tracking", result.statusCode);
}

Controller.getInjuryTracking = async (req, res, next) => {
    const requestUuid = req.params.requestUuid;
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getInjuryTracking(requestUuid, caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-injury-tracking-Ins", result.statusCode);
}

Controller.getAllInjuryTracking = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getAllInjuryTracking(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Injury-Tracking-On-Page-Load", result.statusCode);
}

Controller.dataRegenerator = async (req, res, next) => {
    const result = await dataRegenerator(req.body);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Data-Regeratotor", result.statusCode);
}

Controller.editReport = async (req, res, next) => {
    const caseUuid = req.body.caseUuid;
    const recordUuid = req.body?.recordUuid;
    const summary = req.body?.summary;
    const date = req.body?.date;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await editReport(caseUuid, recordUuid, summary, date, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Edit-Ins-Report", result.statusCode);
}

Controller.generateFile = async (req, res, next) => {
    const caseUuid = req.body.caseUuid;
    const requestUuid = req.body.requestUuid;
    const date = req.body.date;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const preDOL = req.body.preDol;
    const postDOL = req.body.postDol;
    const fileName = req.body.fileName;
    const fileType = req.body.section
    const duplicate = req.body.duplicate;
    const insurerDecision = req.body.insurerDecision;
    const tabDetails = req.body?.type;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await generateFile(caseUuid, requestUuid, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision, tabDetails, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-File", result.statusCode);
}

Controller.downloadFile = async (req, res, next) => {
    const requestUuid = req.params.requestUuid;
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await downloadFile(requestUuid, caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Download-File", result.statusCode);
}

Controller.downloadReport = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const jobUuid = req.body?.jobUuid;
    const status = req.body?.status;
    const allData = req.body;
    const result = await downloadReport(caseUuid, jobUuid, status, allData);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Response-Webhook-Ins-Case-For-Download-Report", result.statusCode);
}

Controller.addResponse = async (req, res, next) => {
    const title = req.body?.title;
    const description = req.body?.description;
    const caseUuid = req.body?.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await addResponse(title, description, caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Response-Inc-Case", result.statusCode);
}

Controller.viewResponse = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await viewResponse(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "View-Response-Inc-Case", result.statusCode);
}

Controller.deleteResponse = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const requestUuid = req.params.requestUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await deleteResponse(caseUuid, requestUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Response-Inc-Case", result.statusCode);
}

Controller.flatDataRegenerator = async (req, res, next) => {
    const result = await flatDataRegenerator(req.body);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Flat-Data-Regeratotor", result.statusCode);
}

Controller.addSection = async (req, res, next) => {
    const reportType = req.body?.reportType;
    const caseUuid = req.body?.caseUuid;
    const title = req.body?.title;
    const description = req.body?.description;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await addSection(reportType, caseUuid, title, description, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Section-Summary-Report", result.statusCode);
}

Controller.getSection = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const reportType = req.params.reportType;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getSection(caseUuid, reportType, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Section-Summary-Report", result.statusCode);
}

Controller.deleteSection = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const requestUuid = req.params.requestUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await deleteSection(caseUuid, requestUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Section-Summary-Report", result.statusCode);
}

Controller.updateSection = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const requestUuid = req.body?.requestUuid;
    const title = req.body?.title;
    const description = req.body?.description;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await alterSection(caseUuid, requestUuid, title, description, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update/Edit-Section-Summary-Report", result.statusCode);
}

Controller.deleteSummary = async (req, res, next) => {
    const recordUuid = req.params.recordUuid;
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await deleteSummary(caseUuid, recordUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Summary-Report", result.statusCode);
}

Controller.getSummaryFilter = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const type = req.query.type;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getSummaryFilter(requestUuid, userId, isGroup, groupUsers, type)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Summary-Filter", result.statusCode);
}

Controller.sendCustomReport = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await sendCustomReport(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Send-Custom-Report-Inc-Case", result.statusCode);
}

Controller.addPrompt = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const promptType = req.body?.promptType;
    const title = req.body?.title;
    const description = req.body?.description;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await addPrompt(caseUuid, promptType, title, description, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Prompt-Intelligent-Analysis", result.statusCode);
}

Controller.updatePrompt = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const requestUuid = req.body?.requestUuid;
    const title = req.body?.title;
    const description = req.body?.description;
    const userId = req.userId;
    const result = await updatePrompt(caseUuid, requestUuid, title, description, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Prompt-Intelligent-Analysis", result.statusCode);
}

Controller.getPrompt = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getPrompt(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Prompt-Intelligent-Analysis", result.statusCode);
}

Controller.getPromptTypes = async (req, res, next) => {
    const isGroup = req.isInsGroup;
    const result = await getPromptTypes(isGroup);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Prompt-Types", result.statusCode);
}

Controller.deletePrompt = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const requestUuid = req.params.requestUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await deletePrompt(caseUuid, requestUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Prompt-Intelligent-Analysis", result.statusCode);
}

Controller.shareCase = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const sharedWith = req.body?.sharedWith;
    const userId = req.userId;
    const result = await shareCase(caseUuid, sharedWith, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Inc-Share-Case", result.statusCode);
}

Controller.getShareCase = async (req, res, next) => {
    const caseUuid = req.params?.caseUuid;
    const userId = req.userId;
    const result = await getShareCase(caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Inc-Get-Share-Case", result.statusCode);
}

Controller.revokeShareCase = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const requestUuid = req.body?.requestUuid;
    const userId = req.userId;
    const result = await revokeShareCase(caseUuid, requestUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Inc-Revoke-Share-Case", result.statusCode);
}

Controller.generateMedicalInjuryReport = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const templateType = req.body?.templateType;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await generateMedicalInjuryReport(caseUuid, templateType, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Medical-Injury-Report", result.statusCode);
}

Controller.saveInjury = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const requestUuid = req.body?.requestUuid;
    const response = req.body?.response;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await saveInjury(caseUuid, requestUuid, response, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Save-Injury-Report", result.statusCode);
}

Controller.getMedicalInjuryReport = async (req, res, next) => {
    const requestUuid = req.params.reportUuid;
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getMedicalInjuryReport(caseUuid, requestUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Medical-Injury-Report-Ins", result.statusCode);
}

Controller.getAllMedicalInjuryReport = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await getAllMedicalInjuryReport(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Medical-Injury-Report-Ins", result.statusCode);
}

Controller.deleteAllMedicalInjuryReport = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const isGroup = req.isInsGroup;
    const groupUsers = req.groupUsers;
    const result = await deleteAllMedicalInjuryReport(caseUuid, userId, isGroup, groupUsers);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Medical-Injury-Report", result.statusCode);
}

module.exports = Controller;