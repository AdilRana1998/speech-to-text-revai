const Controller = {}
const { sendStatus } = require('../../utils')
const {
    findRecord,
    getIntelligentMap,
    openAIWebhook,
    findFailedRecord
} = require('../services/caseIntelligentMap.services');

Controller.findRecord = async (req, res, next) => {
    const result =  await findRecord();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Find-Record", result.statusCode);
}

Controller.findFailedRecord = async (req, res, next) => {
    const result =  await findFailedRecord();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Find-Failed-Record", result.statusCode);
}

Controller.getIntelligentMap = async (req, res, next) => {
    const caseUuid = req.params.caseUuid;
    const groupUsers = req.groupUsers;
    const userId = req.userId;
    const result =  await getIntelligentMap(caseUuid, groupUsers, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Intelligent-Map", result.statusCode);
}

Controller.openAIWebhook = async (req, res, next) => {
    const record = req.body;
    const result =  await openAIWebhook(record);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Response-API-Webhook", result.statusCode);
}


module.exports = Controller;