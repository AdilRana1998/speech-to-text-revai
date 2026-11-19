const Controller = {}
const { sendStatus } = require('../../utils')
const {
    pushObjectives,
    getRoomObjectives,
    getRoomAllObjectives,
    deleteObjective,
    updateObjective
} = require('../services/interviewObjectives.services');

Controller.addobjectives = async (req, res, next) => {
    const userId = req.userId;
    const all_objectives = req.jsonObject.add_objective;
    const result = await pushObjectives(all_objectives, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-All-Objective-For-Each-Room", result.statusCode);
}

Controller.roomobjectives = async (req, res, next) => {
    const botId = req.params.botId;
    const userId = req.userId;
    const result = await getRoomObjectives(botId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Objectives", result.statusCode);
}

Controller.roomallobjectives = async (req, res, next) => {
    const userId = req.userId;
    const result = await getRoomAllObjectives(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Room-All-Objectives", result.statusCode);
}

Controller.deleteobjectives = async (req, res, next) => {
    const userId = req.userId
    const delete_objective = req.jsonObject.delete_objective;
    const result = await deleteObjective(userId, delete_objective)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Room-Objectives", result.statusCode);
}

Controller.updateobjectives = async (req, res, next) => {
    const userId = req.userId
    const objective = req.jsonObject.objective;
    const objectiveId = req.jsonObject.id;
    const result = await updateObjective(userId, objectiveId, objective)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Room-Objectives-By-Id", result.statusCode);
}

module.exports = Controller;
