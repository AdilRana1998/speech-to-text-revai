const Controller = {}
const { sendStatus } = require('../../utils')
const {
    postRedLine,
    getPendingRedLine,
    startPendingRedLine,
    getAllReport,
    getSuccessReport,
    deleteReport
} = require('../services/redLine.services');

Controller.postRedLine = async (req, res, next) => {
    const reportAttachments = req?.files;
    const caseData = req.body?.caseData;
    const userId = req.userId;
    const result =  await postRedLine(reportAttachments, caseData, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-RedLine", result.statusCode);
}

Controller.getPendingRedLine = async (req, res, next) => {
    const result =  await getPendingRedLine();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-RedLine", result.statusCode);
}

Controller.runPendingRedLine = async (req, res, next) => {
    const result =  await startPendingRedLine();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-RedLine", result.statusCode);
}

Controller.getRedLine = async (req, res, next) => {
    const userId = req.userId;
    const reportUuid = req.params.redlineUuid;
    const result =  await getAllReport(reportUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-RedLine-By-Uuid", result.statusCode);
}

Controller.getAllRedLine = async (req, res, next) => {
    const userId = req.userId;
    const result =  await getSuccessReport(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-RedLine", result.statusCode);
}

Controller.deleteAllRedLine = async (req, res, next) => {
    const userId = req.userId;
    const result =  await deleteReport(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-RedLine", result.statusCode);
}

module.exports = Controller;
