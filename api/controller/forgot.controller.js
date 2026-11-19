const Controller = {}
const { sendStatus } = require('../../utils')
const {
    ForgotPasswordServices
} = require('../services')

Controller.post = async (req, res, next) => {
    try {
        const result = await ForgotPasswordServices.post(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "postForgot", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.verifyEmail = async (req, res, next) => {
    try {
        const result = await ForgotPasswordServices.verify(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "verifyEmail", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

module.exports = Controller;