const Controller = {}
const { sendStatus } = require('../../utils')
const {
    CanadianLawServices
} = require('../services')

Controller.getChatHistory = async (req, res, next) => {
    var result = await CanadianLawServices.getChatHistory(req.userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "GetChatHistory", result.statusCode);
}

Controller.createNewPrompt = async (req, res, next) => {
    var result = await CanadianLawServices.createRequest(req.userId, req.jsonObject);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "createNewPrompt", result.statusCode);
}

Controller.getRequestStatus = async (req, res, next) => {
    var result = await CanadianLawServices.getRequestStatus(req.userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "getRequestStatus", result.statusCode);
}

Controller.processRequest = async (req, res, next) => {
    var result = await CanadianLawServices.getPendingData();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "processRequest", result.statusCode);
}

Controller.clearOut = async (req, res, next) => {
    var result = await CanadianLawServices.clearOut(req.userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "clearOut", result.statusCode);
}

module.exports = Controller;