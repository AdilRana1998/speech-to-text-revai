const Controller = {}
const { sendStatus } = require('../../utils')
const {
    addSample,
    fetchCase,
    getAllFile,
    removePrompt,
    removeFile,
    getSample,
    alterCase,
    getSampleById
} = require('../services/sampleFile.services');

Controller.createSample = async (req, res, next) => {
    const prompt = req.body?.prompt;
    const promptUuid = req.body?.promptUuid;
    const sampleAttachments = req.files;
    const userId = req.userId;
    const result =  await addSample(prompt, sampleAttachments, promptUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Sample", result.statusCode);
}

Controller.getCase = async (req, res, next) => {
    const userId = req.userId;
    const result = await fetchCase(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Active-Sample", result.statusCode);
}

// searchCase by case name
Controller.sampleCase = async (req, res, next) => {
    const userId = req.userId;
    const sampleName = req.params.sampleName;
    const result = await getSample(sampleName, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Search-Active-Sample-By-Name", result.statusCode);
}

Controller.getSampleAllFile = async (req, res, next) => {
    const userId = req.userId;
    const promptId = req.params.promptId;
    const result = await getAllFile(promptId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Active-File-In-Sample", result.statusCode);
}

Controller.deleteSample = async (req, res, next) => {
    const userId = req.userId;
    const promptId = req.params.promptId;
    const result = await removePrompt(promptId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Active-Sample", result.statusCode);
}

Controller.deleteFile = async (req, res, next) => {
    const userId = req.userId;
    const fileId = req.params.fileId;
    const result = await removeFile(fileId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Active-File", result.statusCode);
}

Controller.updateCase = async (req, res, next) => {
    const caseAttachments = req.files;
    const caseId = req.params.caseId;
    const userId = req.userId;
    const result =  await alterCase(caseAttachments, caseId, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update/Edit-File-In-Sample", result.statusCode);
}

Controller.searchPromptById = async (req, res, next) => {
    const userId = req.userId;
    const promptUuid = req.params.promptUuid;
    const result = await getSampleById(promptUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Search-Active-Sample-By-SampleUuid", result.statusCode);
}

module.exports = Controller;
