const Controller = {}
const { sendStatus } = require('../../utils')
const {
    UserPackagesServices
} = require('../services')

Controller.create = async (req, res, next) => {
    try {
        //this will only be created from webhook
        var result = await UserPackagesServices.create(req.jsonObject, req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "createPackage", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getAll = async (req, res, next) => {
    try {
        //this will only be created from webhook
        var result = await UserPackagesServices.getAll();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getAll", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getAllUserPackages = async (req, res, next) => {
    try {
        //this will only be created from webhook
        var result = await UserPackagesServices.getAllUserPackages(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getAllUserPackages", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getUserActivePackage = async (req, res, next) => {
    try {
        //this will only be created from webhook
        var result = await UserPackagesServices.getUserActivePackage(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getUserActivePackage", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}


module.exports = Controller;