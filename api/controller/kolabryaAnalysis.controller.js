const Controller = {}
const { sendStatus } = require('../../utils')
const {
    generateAnalysis,
    startKolabryaAnalysis,
    startPendingAnalysis,
    getAnalysisById,
    getAnalysis,
    deleteAnalysis,
    getFailedRecords
} = require('../services/kolabryaAnalysis.services');

Controller.generateAnalysis = async (req, res, next) => {
    const promptType = req.body?.promptType;
    const caseData = req.body?.caseData;
    const userQuery = req.body?.userQuery;
    const kolabryaType = req.body?.kolabryaType;
    const requestUuid = req.body?.requestUuid;
    const text = req.body?.text;
    const groupId = req.groupId;
    const isGroup = req.isGroup;
    const groupUsers = req.groupUsers;
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
	const firmId = req.firmId;
    const userId = req.userId;    
    const result =  await generateAnalysis(caseData, userQuery, promptType, kolabryaType, requestUuid, text, isGroup, groupId, isFirm, firmAssistant, firmId, groupUsers, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Kolabrya-Analysis", result.statusCode);
}

Controller.getAnalysisById = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const caseUuid = req.params.caseUuid;
    const result =  await getAnalysisById(requestUuid, caseUuid, userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Analysis-By-Uuid", result.statusCode);
}

Controller.getAnalysis = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.params.caseUuid;
    const result =  await getAnalysis(caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Analysis", result.statusCode);
}

Controller.generatePendingReport = async (req, res, next) => {
    const result =  await startKolabryaAnalysis();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Analysis", result.statusCode);
}

Controller.runPendingReport = async (req, res, next) => {
    const result =  await startPendingAnalysis();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-Analysis", result.statusCode);
}

Controller.deleteAnalysis = async (req, res, next) => {
    const userId = req.userId;
    const caseUuid = req.params.caseUuid;
    const result =  await deleteAnalysis(caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Analysis", result.statusCode);
}

Controller.getFailedRecords = async (req, res, next) => {
    const result =  await getFailedRecords();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Falied-Record-Analysis", result.statusCode);
}

module.exports = Controller;