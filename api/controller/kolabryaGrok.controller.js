const Controller = {}
const { sendStatus } = require('../../utils')
const {
    postExternal,
    fileStatus,
    addMessage,
    postMessage,
    getExternalByUuid,
    getAll,
    deleteThread,
    countRecord,
    getRecord
} = require('../services/kolabryaGrok.services');

Controller.postExternal = async (req, res, next) => {    
    const files = req?.files;
    const userQuery = req.body?.userQuery;
    const text = req.body?.text;
    const jurisdiction = req.body?.jurisdiction;
    const promptType = req.body?.promptType;
    const userId = req.userId;    
    const subscription = req.subscription    
    const result =  await postExternal(files, userQuery, text, jurisdiction, subscription, promptType, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Kolabrya-External-Analysis-Grok", result.statusCode);
}

Controller.fileStatus = async (req, res, next) => {
    const userId = req.body?.userId;
    const requestUuid = req.body?.caseUuid;
    const caseDetails = req.body?.caseDetails;
    const result =  await fileStatus(requestUuid, caseDetails, userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "File-Status-Grok", result.statusCode);
}

Controller.addMessage = async (req, res, next) => {
    const result =  await addMessage();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Records-For-Add-Message-Grok", result.statusCode);
}

Controller.postMessage = async (req, res, next) => {
    const messageId = req.body?.messageId;
    const threadId = req.body?.threadId;
    const response = req.body?.response;
    const result =  await postMessage(messageId, threadId, response, req.body);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Message-Response-Grok", result.statusCode);
}

Controller.getExternalByUuid = async (req, res, next) => {
    const userId = req.userId;
    const subscription = req.subscription;    
    const requestUuid = req.params.requestUuid;
    const result =  await getExternalByUuid(requestUuid, subscription, userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-External-By-Uuid", result.statusCode);
}

Controller.getAll = async (req, res, next) => {
    const userId = req.userId;
    const subscription = req.subscription;    
    const result =  await getAll(subscription, userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-External", result.statusCode);
}

Controller.deleteThread = async (req, res, next) => {
    const userId = req.userId;
    const result =  await deleteThread(userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-External", result.statusCode);
}

Controller.countRecord = async (req, res, next) => { 
    const result =  await countRecord();    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Count-Record", result.statusCode);
}

Controller.getRecord = async (req, res, next) => { 
    const result =  await getRecord();    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Record", result.statusCode);
}

module.exports = Controller;