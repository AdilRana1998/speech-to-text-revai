const Controller = {}
const { sendStatus } = require('../../utils')
const {
    addCase,
    fetchCase,
    removeCase,
    sendReport,
    updateReport,
    fetchOnlyCase,
    startDocEnhancement
} = require('../services/documentEnhance.services');

Controller.createCase = async (req, res, next) => {
    const prompt = req.body?.prompt;
    const caseFiles = req.files;
    const userId = req.userId;
    const result =  await addCase(prompt, caseFiles, userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Doc-Enhance", result.statusCode);
}

Controller.getCase = async (req, res, next) => {
    const userId = req.userId;
    const result = await fetchCase(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Active-Doc-Enhances", result.statusCode);
}

Controller.getOnlyCase = async (req, res, next) => {
    const userId = req.userId;    
    const requestUuid = req.params.requestUuid;
    const result = await fetchOnlyCase(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Only-Doc-Enhance-By-Uuid", result.statusCode);
}

Controller.deleteCase = async (req, res, next) => {
    const userId = req.userId;
    const requestUuid = req.params.requestUuid;
    const result = await removeCase(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Doc-Enhance-Active-Case", result.statusCode);
}

Controller.startDocEnhancement = async (req, res, next) => {
    const result =  await startDocEnhancement();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Report-API-Doc-Enhance", result.statusCode);
}

Controller.sendReport = async (req, res, next) => {
    const result =  await sendReport();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Report-API-Doc-Enhance", result.statusCode);
}

Controller.updateReport = async (req, res, next) => {
    const requestUuid = req.body?.caseUuid;
    const jobUuid = req.body?.jobUuid;
    const status = req.body?.status;
    const caseDetails = req.body?.caseDetails;
    const allData = req.body;
    const result =  await updateReport(requestUuid, jobUuid, status, caseDetails, allData);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Response-Webhook-Doc-Enhance", result.statusCode);
}

module.exports = Controller;