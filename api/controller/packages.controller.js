const Controller = {}
const { sendStatus } = require('../../utils')
const {
    PackagesServices
} = require('../services')

Controller.createPackages = async (req, res, next) => {
    try {
        var result = await PackagesServices.create(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "createPackages", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

module.exports = Controller;