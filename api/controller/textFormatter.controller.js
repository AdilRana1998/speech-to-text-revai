const Controller = {}
const { sendStatus } = require('../../utils')
const {
    postTextFormatter,
    getPendingTextFormatter,
    startPendingTextFormatter,
    getAllReport,
    getAllTextFormatter,
    deleteAllTextFormatter
} = require('../services/textFormatter.services');

Controller.postTextFormatter = async (req, res, next) => {
    const text = req.body?.request;
    const userId = req.userId;
    const result =  await postTextFormatter(text, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-TextFormatter", result.statusCode);
}

Controller.getPendingTextFormatter = async (req, res, next) => {
    const result =  await getPendingTextFormatter();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-TextFormatter", result.statusCode);
}

Controller.runPendingTextFormatter = async (req, res, next) => {
    const result =  await startPendingTextFormatter();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-TextFormatter", result.statusCode);
}

Controller.getTextFormatter = async (req, res, next) => {
    const userId = req.userId;
    const formatterUuid = req.params.textformatterUuid;
    const result =  await getAllReport(formatterUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-TextFormatter-By-Uuid", result.statusCode);
}

Controller.getAllTextFormatter = async (req, res, next) => {
    const userId = req.userId;
    const result =  await getAllTextFormatter(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-TextFormatter", result.statusCode);
}

Controller.deleteAllTextFormatter = async (req, res, next) => {
    const userId = req.userId;
    const result =  await deleteAllTextFormatter(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-TextFormatter", result.statusCode);
}

module.exports = Controller;
