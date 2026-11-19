const Controller = {}
const { sendStatus } = require('../../utils')
const {
    UserTypeServices
} = require('../services')

Controller.getAll = async (req, res, next) => {
    try {
        const result = await UserTypeServices.getAllUserTypes();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getAllUserType", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

module.exports = Controller;