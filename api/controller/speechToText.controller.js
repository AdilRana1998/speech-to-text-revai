const Controller = {}
const { sendStatus } = require('../../utils')
const {
    deleteByRequestUuid,
    getAllByRequestUuid,
    downloadTranscript,
    editByRequestUuid,
    getTranscript,
    convertVoice,
    uploadFile,
    sendFile,
    getFile,
    getAll,
    presignedUrls,
    addFile
} = require('../services/speechToText.services');

Controller.convert = async (req, res, next) => {
    const attachment = req.files;
    const analysis = req.body?.analysis;
    const userId = req.userId;
    const result = await convertVoice(attachment, analysis, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Speech-To-Text", result.statusCode);    
}

Controller.uploadFile = async (req, res, next) => {
    const attachment = req.files;
    const transcriptName = req.body.transcriptName;
    const userId = req.userId;
    const result = await uploadFile(attachment, transcriptName, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Speech-To-Text-Rev-AI", result.statusCode);    
}

Controller.sendFile = async (req, res, next) => {
    const result = await sendFile()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Upload-File-Rev-AI", result.statusCode);    
}

Controller.getFile = async (req, res, next) => {
    const result = await getFile()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-File-Rev-AI", result.statusCode);    
}

Controller.getTranscript = async (req, res, next) => {
    const result = await getTranscript()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Transcript-Rev-AI", result.statusCode);    
}

Controller.getAll = async (req, res, next) => {
    const userId = req.userId;    
    const result = await getAll(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Transcript-For-User", result.statusCode);    
}

Controller.getByRequestUuid = async (req, res, next) => {
    const userId = req.userId;    
    const requestUuid = req.params.requestUuid;
    const result = await getAllByRequestUuid(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Transcript-For-User", result.statusCode);    
}

Controller.deleteByRequestUuid = async (req, res, next) => {
    const userId = req.userId;    
    const requestUuid = req.params.requestUuid;
    const result = await deleteByRequestUuid(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Transcript-For-User", result.statusCode);    
}

Controller.deleteByRequestUuid = async (req, res, next) => {
    const userId = req.userId;    
    const requestUuid = req.params.requestUuid;
    const result = await deleteByRequestUuid(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Transcript-For-User", result.statusCode);    
}

Controller.editByRequestUuid = async (req, res, next) => {
    const userId = req.userId;    
    const requestUuid = req.body.requestUuid;
    const transcript = req.body.transcript;
    const result = await editByRequestUuid(transcript, requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Edit-Transcript-For-User", result.statusCode);    
}

Controller.downloadTranscript = async (req, res, next) => {
    const userId = req.userId;    
    const requestUuid = req.params.requestUuid;
    const result = await downloadTranscript(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Download-Transcript-For-User", result.statusCode);    
}

//

Controller.presignedUrls = async (req, res, next) => {
    const fileNames = req.body?.files;
    const userId = req.userId;
    const result = await presignedUrls(fileNames, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Azure-Blob-Storage-Pre-Signed-Url-Speech-To-Text-Rev-AI", result.statusCode);
}

Controller.addFile = async (req, res, next) => {
    const caseFiles = req.body?.caseFiles;
    const userId = req.userId;
    const result = await addFile(caseFiles, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-File-Speech-To-Text-Rev-AI", result.statusCode);
}


module.exports = Controller;