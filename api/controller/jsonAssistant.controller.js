const Controller = {}
const { sendStatus } = require('../../utils')
const {
    generateJson,
    startJsonGeneration,
    startPendingJsonGeneration,
    getFailedJsonRecords
} = require('../services/jsonAssistant.services');


Controller.generateJson = async (req, res, next) => {
    const request = req.body?.request;
    const roomId = req.body?.roomId; 
    const userId = req.userId;   
    const result =  await generateJson(request, roomId, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Json-Assistant-Analysis", result.statusCode);
}

Controller.generatePendingJson = async (req, res, next) => {
    const result =  await startJsonGeneration();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Json-Assistant-Response", result.statusCode);
}

Controller.runPendingJson = async (req, res, next) => {
    const result =  await startPendingJsonGeneration();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-Json-Assistant-Response", result.statusCode);
}

Controller.getFailedJsonRecords = async (req, res, next) => {
    const result =  await getFailedJsonRecords();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Falied-Record-Json-Assistant-Response", result.statusCode);
}

module.exports = Controller;