const Controller = {}
const { sendStatus } = require('../../utils')
const {
    generateVisuals,
    startKolabryaVisuals,
    startPendingVisuals,
    getVisualsById,
    getVisuals,
    deleteVisuals,
    getFailedRecords
} = require('../services/kolabryaVisuals.services');

Controller.generateVisuals = async (req, res, next) => {
    const promptType = req.body?.promptType;
    const caseData = req.body?.caseData;
    const userQuery = req.body?.userQuery;
    const kolabryaType = req.body?.kolabryaType;
    const requestUuid = req.body?.requestUuid;
    const text = req.body?.text;
    const groupId = req.groupId;
    const isGroup = req.isGroup;
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmId = req.firmId;
    const groupUsers = req.groupUsers;
    const userId = req.userId;    
    const result =  await generateVisuals(caseData, userQuery, promptType, kolabryaType, requestUuid, text, isGroup, groupId, isFirm, firmAssistant, firmId, groupUsers, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Kolabrya-Visuals", result.statusCode);
}

Controller.getVisuals = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const isFirm = req.isFirm;
    const firmId = req.firmId;
    const userId = req.userId;
    const result =  await getVisuals(caseUuid, isFirm, firmId, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Visuals", result.statusCode);
}

Controller.startKolabryaVisuals = async (req, res, next) => {
    const result =  await startKolabryaVisuals();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Visuals", result.statusCode);
}

Controller.runPendingVisuals = async (req, res, next) => {
    const result =  await startPendingVisuals();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-Visuals", result.statusCode);
}

Controller.deleteVisuals = async (req, res, next) => {
    const userId = req.userId;
    const result =  await deleteVisuals(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Visuals", result.statusCode);
}

Controller.getFailedRecords = async (req, res, next) => {
    const result =  await getFailedRecords();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Falied-Record-Visuals", result.statusCode);
}

Controller.getVisualsById = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const result =  await getVisualsById(requestUuid, userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Visuals-By-Uuid", result.statusCode);
}

module.exports = Controller;