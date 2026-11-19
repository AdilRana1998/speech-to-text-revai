const Controller = {}
const { sendStatus } = require('../../utils')
const {
    PaymentServices
} = require('../services')

Controller.checkout = async (req, res, next) => {
    try {
        var result = await PaymentServices.checkout(req.userId, req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "checkout", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.manageBilling = async (req, res, next) => {
    try {
        var result = await PaymentServices.createBilling(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "manageBilling", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}


Controller.getProducts = async (req, res, next) => {
    try {
        var result = await PaymentServices.getProducts(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getProducts", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.webhook = async (req, res, next) => {
    try {
       await PaymentServices.webhook(res, req, next);
    } catch (e) {
        console.log(e.message);
        next(e);
    }
}
module.exports = Controller;