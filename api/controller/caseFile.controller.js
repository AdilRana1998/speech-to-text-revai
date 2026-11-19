const Controller = {}
const { sendStatus } = require('../../utils')
const {
    addCase,
    fetchCase,
    getAllFile,
    removeCase,
    removeFile,
    getCase,
    alterCase,
    getCaseById,
    addResponse,
    viewResponse,
    addCaseType,
    alterCaseType,
    combineCaseResponse,
    audioToSpeech,
    fetchCaseAudio,
    getGroupData,
    addCaseQueries,
    getCaseQueries,
    updateCaseQueries,
    addCaseQueriesTitles,
    updateCaseTitles,
    getCaseQueriesTitle,
    runFunction,
    addCaseFileType,
    getCaseFileType,
    uploadFileToOpenAI,
    fetchOnlyCase
} = require('../services/caseFile.services');

Controller.createCase = async (req, res, next) => {
    const caseName = req.body?.caseName;
    const caseDoc = req.files?.caseFiles;
    const caseAudio = req.files?.caseAudio;
    const summary = req.body?.summary;
    const caseQueries = req.body?.caseQueries;
    const casefilesData = req.body?.casefilesData;
    const assignees = req.body?.assignees;
    const userType = req.userType;
    const firmId = req.firmId;
    const isFirm = req.isFirm;
    const userId = req.userId;
    const result =  await addCase(caseName, caseDoc, summary, caseAudio, caseQueries, casefilesData, assignees, userType, firmId, isFirm, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Case", result.statusCode);
}

Controller.getCase = async (req, res, next) => {
    let isGroup = false, isCompany = false;
    const userId = req.userId;    
    const groupUsers = req.groupUsers;
    const groupName = req.groupName;
    const companyUsers = req.companyUsers;
    if (req.isGroup == true && req.query.group == 'true') {
        isGroup = true
    }    
    if (req.isCompany == true && req.query.owner == 'true') {
        isCompany = true
    }    
    const result = await fetchCase(isGroup, groupUsers, groupName, isCompany, companyUsers, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Active-Cases", result.statusCode);
}


Controller.getOnlyCase = async (req, res, next) => {
    const userId = req.userId;    
    const caseUuid = req.params.caseUuid;
    const groupUsers = req.groupUsers;
    const result = await fetchOnlyCase(groupUsers, caseUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Only-Active-Cases", result.statusCode);
}

Controller.searchCase = async (req, res, next) => {
    const userId = req.userId;
    const caseName = req.params.caseName;
    const result = await getCase(caseName, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Search-Active-Case-By-Name", result.statusCode);
}

Controller.searchCaseById = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.params.caseUuid;
    const result = await getCaseById(caseUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Search-Active-Case-By-CaseUuid", result.statusCode);
}

Controller.getCaseAllFile = async (req, res, next) => {
    const userId = req.userId;
    const caseId = req.params.caseId;
    const result = await getAllFile(caseId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Active-File-In-Case", result.statusCode);
}

Controller.deleteCase = async (req, res, next) => {
    const userId = req.userId;
    const caseId = req.params.caseId;
    const result = await removeCase(caseId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Active-Case", result.statusCode);
}

Controller.deleteFile = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.body.caseUuid;
    const fileUuid = req.body.fileUuid;
    const groupUsers = req.groupUsers
    const result = await removeFile(caseUuid, fileUuid, groupUsers, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Active-File", result.statusCode);
}

Controller.updateCase = async (req, res, next) => {
    const caseName = req.body?.caseName;
    const caseSummary = req.body?.caseSummary;
    const caseDoc = req.files?.caseFiles;
    const caseAudio = req.files?.caseAudio;
    const caseQueries = req.body?.caseQueries;
    const casefilesData = req.body?.casefilesData;
    const caseId = req.params.caseId;
    const userId = req.userId;
    const result =  await alterCase(caseName, caseSummary, caseDoc, caseAudio, caseQueries, casefilesData, caseId, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update/Edit-File-In-Case", result.statusCode);
}

Controller.addCaseResponse = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const caseResponse = req.body?.caseData;
    const caseResponseTitle = req.body?.caseTitle;
    const isGroup = req.isGroup;
    const groupUsers = req.groupUsers;
    const userId = req.userId;
    const result =  await addResponse(caseUuid, caseResponse, caseResponseTitle, isGroup, groupUsers, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Response", result.statusCode);
}

Controller.viewCaseResponse = async (req, res, next) => {
    const caseUuid = req.body?.caseUuid;
    const assignees = req.body?.assignees;
    const firmId = req.firmId;
    const isFirm = req.isFirm;
    const isGroup = req.isGroup;
    const groupUsers = req.groupUsers;
    const userId = req.userId;
    const result =  await viewResponse(caseUuid, isGroup, groupUsers, assignees, firmId, isFirm, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "View-Response", result.statusCode);
}

Controller.createCaseType = async (req, res, next) => {
    const caseTypes = req.body?.caseTypes;
    const userId = req.userId;
    const result =  await addCaseType(caseTypes, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Case-Types", result.statusCode);
}

Controller.updateCaseType = async (req, res, next) => {
    const caseTypeUuid = req.body?.caseTypeUuid;
    const caseUuid = req.body?.caseUuid;
    const userId = req.userId;
    const result =  await alterCaseType(caseUuid, caseTypeUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Case-Types", result.statusCode);
}

Controller.getResponses = async (req, res, next) => {
    const userId = req.userId;
    const result = await combineCaseResponse(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Combine-Case-Response's", result.statusCode);
}

Controller.audioTranscript = async (req, res, next) => {
    const userId = req.userId;
    const result =  await audioToSpeech();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Job-Audio-To-Speech-For-Case", result.statusCode);
}

Controller.getCaseAudio = async (req, res, next) => {
    const userId = req.userId;
    const result = await fetchCaseAudio(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Case-Audio-Processed-InProcess", result.statusCode);
}

Controller.getGroupData = async (req, res, next) => {
    const userId = req.userId;
    const isGroup = req.isGroup;
    const groupUsers = req.groupUsers;
    const result = await getGroupData(isGroup, groupUsers, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Active-Cases", result.statusCode);
}

Controller.addCaseQueries = async (req, res, next) => {
    const record = req.body?.data;
    const result =  await addCaseQueries(record);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Case-Queries-Bulk", result.statusCode);
}

Controller.getCaseQueries = async (req, res, next) => {
    const result =  await getCaseQueries();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Case-Queries-Bulk", result.statusCode);
}

Controller.updateCaseQueries = async (req, res, next) => {
    const requestUuid = req.body?.requestUuid;
    const queryName = req.body?.queryName;
    const result =  await updateCaseQueries(requestUuid, queryName);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Case-Queries", result.statusCode);
}

Controller.addCaseQueriesTitles = async (req, res, next) => {
    const record = req.body?.data;
    const result =  await addCaseQueriesTitles(record);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Case-Queries-Titles-Bulk", result.statusCode);
}

Controller.updateCaseQueriesTitles = async (req, res, next) => {
    const requestUuid = req.body?.requestUuid;
    const title = req.body?.title;
    const result =  await updateCaseTitles(requestUuid, title);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Case-Titles", result.statusCode);
}

Controller.getCaseQueriesTitles = async (req, res, next) => {
    const result =  await getCaseQueriesTitle();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Case-Queries-Title", result.statusCode);
}

Controller.runFunction = async (req, res, next) => {
    const result = await runFunction()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "runFunction", result.statusCode);
}

Controller.addCaseFileType = async (req, res, next) => {
    const record = req.body?.caseFileTypes;
    const result =  await addCaseFileType(record);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Case-File-Type-Bulk", result.statusCode);
}

Controller.getCaseFileType = async (req, res, next) => {
    const result =  await getCaseFileType();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Case-File-Type-Bulk", result.statusCode);
}

Controller.uploadFileToOpenAI = async (req, res, next) => {
    const result =  await uploadFileToOpenAI();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Upload-File-To-OpenAI", result.statusCode);
}

module.exports = Controller;