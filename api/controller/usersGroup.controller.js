const Controller = {}
const { sendStatus } = require('../../utils')
const {
    generateGroup,
    getGroup,
    updateGroup,
    generateCompany,
    getCompany,
    updateCompany,
    generateFirm,
    updateFirm,
    getFirm
} = require('../services/usersGroup.services');

Controller.generateGroup = async (req, res, next) => {
    const groupName = req.jsonObject.groupName;
    const groupEmails = req.jsonObject.usersEmail;
    const userId = req.userId;
    const result =  await generateGroup(groupName, groupEmails, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Group", result.statusCode);
}

Controller.getGroup = async (req, res, next) => {
    const result =  await getGroup();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Group", result.statusCode);
}

Controller.updateGroup = async (req, res, next) => {
    const groupUuid = req.jsonObject.groupUuid;
    const groupEmails = req.jsonObject.usersEmail;
    const result =  await updateGroup(groupUuid, groupEmails);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Group", result.statusCode);
}

Controller.generateCompany = async (req, res, next) => {
    const companyName = req.jsonObject.companyName;
    const ownerEmails = req.jsonObject.ownerEmails;
    const userEmails = req.jsonObject.userEmails;
    const result =  await generateCompany(companyName, ownerEmails, userEmails);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Company", result.statusCode);
}

Controller.getCompany = async (req, res, next) => {
    const result =  await getCompany();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Group", result.statusCode);
}

Controller.updateCompany = async (req, res, next) => {
    const companyUuid = req.body.companyUuid;
    const usersEmail = req.body.usersEmail;
    const result =  await updateCompany(companyUuid, usersEmail);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Company-Users-Owner", result.statusCode);
}

Controller.addFirm = async (req, res, next) => {
    const firmName = req.jsonObject.firmName;
    const assistantEmail = req.jsonObject.assistantEmail;
    const userEmails = req.jsonObject.userEmails;
    const result =  await generateFirm(firmName, assistantEmail, userEmails);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Firm", result.statusCode);
}

Controller.getFirm = async (req, res, next) => {
    const result =  await getFirm();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Firm", result.statusCode);
}

Controller.updateFirm = async (req, res, next) => {
    const requestUuid = req.body.firmUuid;
    const usersEmail = req.body.usersEmail;
    const assistantEmail = req.body.assistantEmail;
    const result =  await updateFirm(requestUuid, usersEmail, assistantEmail);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Firm-Users-Only", result.statusCode);
}

module.exports = Controller;