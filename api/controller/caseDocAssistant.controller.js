const Controller = {}
const { sendStatus } = require('../../utils')
const {
    getFiles,
    startKolabryaDocAnalysis,
    runPendingDocAnalysis,
    getDocument,
    updateUserNotes,
    getFailedRecords,
    getAll
} = require('../services/caseDocAssistant.services');

Controller.getFiles = async (req, res, next) => {
    const result =  await getFiles();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-File-For-Document-Assistant", result.statusCode);
}

Controller.generatePendingReport = async (req, res, next) => {
    const result =  await startKolabryaDocAnalysis();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Document-Assistant", result.statusCode);
}

Controller.runPendingDoc = async (req, res, next) => {
    const result =  await runPendingDocAnalysis();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-Document-Assistant", result.statusCode);
}

Controller.getFailedRecords = async (req, res, next) => {
    const result =  await getFailedRecords();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Falied-Record-Document-Assistant", result.statusCode);
}

Controller.getDocument = async (req, res, next) => {
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
	const firmId = req.firmId;
    const userId = req.userId;
    const caseUuid = req.params.caseUuid;
    const groupUsers = req.groupUsers;
    const result =  await getDocument(caseUuid, isFirm, firmAssistant, firmId, groupUsers, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Document-By-Case-Uuid", result.statusCode);
}

Controller.updateUserNotes = async (req, res, next) => {
    const userNote = req.body.userNote;
    const requestUuid = req.body.requestUuid;
    const caseUuid = req.body.caseUuid;
    const userId = req.userId;
    const result =  await updateUserNotes(userNote, requestUuid, caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-User-Notes", result.statusCode);
}

Controller.getAll = async (req, res, next) => {
    const userId = req.body.userId;
    const result =  await getAll(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Documnets-By-UserId", result.statusCode);
}

module.exports = Controller;