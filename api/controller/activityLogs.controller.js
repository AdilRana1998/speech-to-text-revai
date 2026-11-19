const Controller = {}
const { sendStatus } = require('../../utils')
const {
    createActivity,
    createActivityType,
    getAllActivityTypes,
    getActivityTypeId,
    getUserScreen,
    getUserLoginCount
} = require('../services/activityLogs.services');

Controller.create = async (req, res, next) => {
    const data = req.jsonObject;
    const result = await createActivity(data)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Activity", result.statusCode);    
}

Controller.createType = async (req, res, next) => {
    const route = req.jsonObject.route;
    const title = req.jsonObject.title;
    const description = req.jsonObject.description;
    const result = await createActivityType(route, title, description)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Activity-Types", result.statusCode);    
}

Controller.getTypes = async (req, res, next) => {
    const result = await getAllActivityTypes()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Activity-Types", result.statusCode);
}

Controller.getTypesByRoute = async (req, res, next) => {
    const route = req.params.getRoute;
    console.log("route", route);
    const result = await getActivityTypeId(route)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Type-Id", result.statusCode);
}

Controller.findScreen = async (req, res, next) => {
    const userId = req.userId;
    const result = await getUserScreen(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Find-User-Screen", result.statusCode);    
}

Controller.countLogin = async (req, res, next) => {
    const userId = req.userId;
    const result = await getUserLoginCount(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Find-User-Screen", result.statusCode);    
}

module.exports = Controller;
