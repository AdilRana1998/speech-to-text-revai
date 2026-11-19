const Controller = {}
const { sendStatus, Strings} = require('../../utils')
const {
    UserServices
} = require('../services')

Controller.getUsageInfo = async (req, res, next) => {
    try {
        const result = await UserServices.getUsageInfo();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getUserInfo", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        var handledErrorMessage = ErrorHandling.sequelError(e.errors);
        e.message = handledErrorMessage ? handledErrorMessage : e.message;
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.allPromptUsageInfo = async (req, res, next) => {
    try {
        const result = await UserServices.getAllPrompt();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getAllPrompt", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
        next(e);
    }
}

module.exports = Controller;
