const Controller = {}
const { sendStatus} = require('../../utils')
const {
    AdminServices
} = require('../services')

Controller.create = async (req, res, next) => { 
    const userId = req.userId;
    const email = req.jsonObject.email;
    var result = await AdminServices.createAdmin(email, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Admin", result.statusCode);
}

Controller.edit = async (req, res, next) => { 
    const userId = req.userId;
    const adminEmail = req.jsonObject.admin_email;
    const userEmails = req.jsonObject.users_email;
    var result = await AdminServices.editAdmin(adminEmail, userEmails, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Users-For-Admin", result.statusCode);
}

Controller.get = async (req, res, next) => { 
    const userId = req.userId;
    const userType = req.userType;
    var result = await AdminServices.getAdminAllUser(userType, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "All-Users-Under-Admin", result.statusCode);
}

Controller.delete = async (req, res, next) => { 
    const userId = req.userId; 
    const userUUid = req.params.userUUid
    var result = await AdminServices.deletAdminUser(userUUid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Users-Under-Admin", result.statusCode);
}

Controller.verify = async (req, res, next) => { 
    const userId = req.userId;
    const email = req.email;
    const password = req.jsonObject.password
    var result = await AdminServices.verifyAdmin(email, password, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Verify-Admin-Credentials", result.statusCode);
}

Controller.getAll = async (req, res, next) => { 
    const userId = req.userId;
    var result = await AdminServices.getAdminsWithUsers();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "All-Users-Under-Admin", result.statusCode);
}

Controller.userCase = async (req, res, next) => { 
    const userId = req.userId; 
    const userUUid = req.params.userUUid
    const userType = req.userType; 
    var result = await AdminServices.AdminUsersCase(userType, userUUid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Admin-Getting-Users-Cases", result.statusCode);
}

Controller.userResponses = async (req, res, next) => { 
    const userId = req.userId; 
    const caseUUid = req.params.caseUUid
    const userType = req.userType;
    var result = await AdminServices.AdminUsersResponses(userType, caseUUid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Admin-Getting-Users-Cases-Responses", result.statusCode);
}

module.exports = Controller;
