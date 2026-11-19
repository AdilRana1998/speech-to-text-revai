const Controller = {}
const { sendStatus } = require('../../utils')
const {
    reWriteReport,
    getAllReport,
    getSuccessReport,
    deleteReport,
    addMessage,
    postMessage,
    fileStatus
} = require('../services/writeReport.services');

Controller.generateReport = async (req, res, next) => {
    const prompt = req.body?.prompt;
    const caseData = req.body?.caseData;
    const userQuery = req.body?.userQuery;
    const isGroup = req.isGroup;
    const groupId = req.groupId;
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
	const firmId = req.firmId;
    const userId = req.userId;
    const result =  await reWriteReport(prompt, caseData, userQuery, isGroup, groupId, isFirm, firmAssistant, firmId, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Report", result.statusCode);
}

Controller.getReport = async (req, res, next) => {
    const userId = req.userId;
    const reportUuid = req.params.reportUuid;
    const caseUuid = req.params.caseUuid;
    const result =  await getAllReport(caseUuid, reportUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Report-By-Uuid", result.statusCode);
}

Controller.getAllReport = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const result =  await getSuccessReport(caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Report", result.statusCode);
}

Controller.deleteAllReport = async (req, res, next) => {
    const userId = req.userId;
    const result =  await deleteReport(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Report", result.statusCode);
}


Controller.addMessage = async (req, res, next) => {
    const result =  await addMessage();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Records-For-Add-Message-Gemini", result.statusCode);
}

Controller.fileStatus = async (req, res, next) => {
    const userId = req.body?.userId;
    const caseUuid = req.body?.caseUuid;
    const caseDetails = req.body?.caseDetails;
    const result =  await fileStatus(caseUuid, caseDetails, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "File-Status-Gemini", result.statusCode);
}

Controller.postMessage = async (req, res, next) => {
    const messageId = req.body?.messageId;
    const threadId = req.body?.threadId;
    const response = req.body?.content;
    const status = req.body?.status;
    const result =  await postMessage(messageId, threadId, response, status, req.body);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Message-Response-Gemini", result.statusCode);
}

module.exports = Controller;