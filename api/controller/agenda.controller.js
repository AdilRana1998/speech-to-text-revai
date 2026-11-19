const Controller = {}
const { sendStatus, Strings, Emails} = require('../../utils');
const { SUCCESS_MESSAGES, ERROR } = require('../../utils/Strings');
const {
    UserServices
} = require('../services')

const {
    RoomQueries,
} = require('../queries');
const RoomServices = require('./../services/rooms.services')


Controller.syncEmail = async (req, res, next) => {
    try { 
        const result = await UserServices.getUser(req.userId);
        const email = result.obj.email;
        const obj = {}
        if (email) {
            Emails.sendsyncEmail(email);
            obj.to = email;
            obj.status = SUCCESS_MESSAGES.EMAIL_SENT
        } else {
            obj.to = email;
            obj.status = ERROR.EMAIL_NOT_EXISTS;
        }        
        sendStatus.data.sortStatus(res, req, obj, result.message, "syncEmail", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
    }
}

Controller.addAgenda = async (req, res) => {
    try {
        var result = await RoomServices.createRoomAgenda(req.jsonObject, req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "addAgenda", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
    }
};

Controller.roomRedirect = async (req, res) => {
    try {
        var result = await RoomServices.redirectService(req.jsonObject, req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "roomRedirect", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
    }
};

module.exports = Controller;


