const Controller = {}
const { sendStatus } = require('../../utils')
const {
    getAllThreadAssResponses,
    getAllResponses,
    deleteFile,
    getAllThreadDocResponses,
    getAllResponsesDoc,
    getTranscriptResponse,
    cleanTranscript,
    storeVideo,
    getBase,
    mdToPdf,
    getAllReportsResponses,
    getAllThreadReportResponses,
    encryptThread,
    deleteFileOpenAI,
    makeVectorStore,
    fetchRecords,
    deleteVectorOpenAI,
    improvePrompt,
    getImprovedPrompt,
    addFeedback,
    getCaseFile,
    runChatGPT,
    getData,
    getAllReWriteReportsResponses,
    getReWriteReportsResponses,
    researchBegin,
    getAllResearchResponses,
    getResearchResponses,
    getAllPrompts,
    getAllEmpLawResponses,
    getEmpLaw,
    getPrompts,
    getLastPrompts,
    getAllActivities,
    postKolabryAgent,
    getAllAgentResponses,
    getAgentResponses,
    deleteAgentData,
    getAllGuideResponses,
    getCaidiResponses,
    deleteCaidiThreads,
    generateVisual,
    getVisuals,
    fetchVisuals,
    addAccordianCaseAnswers,
    getPendingData,
    retriveVectorStore,
    sendCiteDocumnets,
    editFileCitation,
    fileUploadStatusCitation,
    uploadFileCitationBulk,
    updateVectorStore,
    deleteFileFromVectorStore,
    deActivateOldRecords,
    getAllThreadAssResponsesIns,
    getAllResponsesIns,
    getMCPServerResponse,
    createQuery,
    presignedUrls,
    addFile,
    getAnalysis,
    getAnalysisById,
    deleteAnalysis,
    getBatch,
    recentBatch,
    removeFile
} = require('../services/chatGpt.services');

Controller.createQuery = async (req, res, next) => {
    const userQuery = req.body?.userQuery;
    const caseDetails = req.body?.caseDetails;
    const prompt = req.body?.prompt;
    const requestUuid = req.body?.requestUuid;
    const userId = req.userId;
    const result =  await createQuery(userQuery, prompt, caseDetails, requestUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Query", result.statusCode);
}

Controller.presignedUrls = async (req, res, next) => {
    const caseUuid = req.body?.requestUuid;
    const fileNames = req.body?.files;
    const userId = req.userId;
    const result = await presignedUrls(fileNames, caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Azure-Blob-Storage-Pre-Signed-Url-Investigation-External-Doc", result.statusCode);
}

Controller.addFile = async (req, res, next) => {
    const requestUuid = req.body?.requestUuid;
    const caseFiles = req.body?.caseFiles;
    const userId = req.userId;
    const result = await addFile(caseFiles, requestUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-File-Investigation-External-Doc", result.statusCode);
}

Controller.getAnalysis = async (req, res, next) => {
    const userId = req.userId;
    const result =  await getAnalysis(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Response-External-Doc", result.statusCode);
}

Controller.getAnalysisById = async (req, res, next) => {
    const requestUuid = req.params.requestUuid;
    const userId = req.userId;
    const result =  await getAnalysisById(requestUuid, userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-External-Doc-By-Uuid", result.statusCode);
}

Controller.deleteAnalysis = async (req, res, next) => {
    const userId = req.userId;
    const result =  await deleteAnalysis(userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-External-Doc", result.statusCode);
}

Controller.getBatch = async (req, res, next) => {
    const requestUuid = req.params.requestUuid;
    const userId = req.userId;
    const result =  await getBatch(requestUuid, userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Batch-Details-By-Uuid", result.statusCode);
}

Controller.recentBatch = async (req, res, next) => {
    const userId = req.userId;
    const result =  await recentBatch(userId);    
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Recen-tBatch-Details-By-Uuid", result.statusCode);
}

Controller.removeFile = async (req, res, next) => {
    const requestUuid = req.body.requestUuid;
    const fileUuid = req.body.fileUuid;
    const userId = req.userId;
    const result = await removeFile(requestUuid, fileUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-User-Active-File-Batch", result.statusCode);
}

//

Controller.chatgpt = async (req, res, next) => {
    const query = req.body?.question;
    const userQuery = req.body?.userQuery;
    const botId = "fb9c9ffb-d208-47e3-8115-df4de55cb54c";
    const transcriptAttachments = req.files;
    const documentAssistant = req.body?.documentAssistant;
    const validator = query != '' && botId != ''
    const getCase = req.body?.caseAssistant;
    const getResponseDetails = req.body?.combineResponse;
    const reWriteReport = req.body?.reWriteAssistant;
    const empLawAnalysisAssist = req.body?.empLawAnalysisAssist;
    const caseAudio = req.body?.caseAudio;
    const caseData = req.body?.data;
    const sampleData = req.body?.sampleData; 
    const visuals = req.body?.visuals; 
    const textHighLighter = req.body?.textHighLighter; 
    const text = req.body?.text; 
    const selectedPrompt = req.body?.prompt; 
    const isGroup = req.isGroup;
    const groupId = req.groupId;
    const userId = req.userId; 
    const result = await runChatGPT(query, userQuery, botId, transcriptAttachments, documentAssistant, validator, getCase, caseData, sampleData, reWriteReport, empLawAnalysisAssist, getResponseDetails, caseAudio, visuals, textHighLighter, text, isGroup, groupId, selectedPrompt, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Create-Thread", result.statusCode);    
}

Controller.getanswer = async (req, res, next) => {
    const threadId = req.params.thread
    const userId = req.userId;
    const result = await getAllThreadAssResponses(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Check-Status", result.statusCode);
}

Controller.a2ajMCP = async (req, res, next) => {
    const data = req.jsonObject
    const result = await getMCPServerResponse(data)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Check-Status", result.statusCode);
}

Controller.getAnswerIns = async (req, res, next) => {
    const requestUuid = req.params.requestUuid
    const userId = req.userId;
    const result = await getAllThreadAssResponsesIns(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Check-Status-Ins", result.statusCode);
}

Controller.getanswerdoc = async (req, res, next) => {
    const threadId = req.params.requestUuid
    const userId = req.userId
    const result = await getAllThreadDocResponses(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Document", result.statusCode);
}

Controller.getanswereport = async (req, res, next) => {
    const threadId = req.params.thread
    const userId = req.userId
    const result = await getAllThreadReportResponses(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Report", result.statusCode);
}

Controller.getall = async (req, res, next) => {
    const botId = req.params.botId
    const userId = req.userId
    const result = await getAllResponses(botId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-For-Re-Write-Report", result.statusCode);
}

Controller.getAllIns = async (req, res, next) => {
    const userId = req.userId
    const result = await getAllResponsesIns(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-For-Ins", result.statusCode);
}

Controller.getalldoc = async (req, res, next) => {
    const userId = req.userId
    const result = await getAllResponsesDoc(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-Document-Assistant", result.statusCode);
}

Controller.getallreports = async (req, res, next) => {
    const botId = req.params.botId
    const userId = req.userId
    const result = await getAllReportsResponses(botId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-Report-Assistant", result.statusCode);
}

Controller.clearThread = async (req, res, next) => {
    const botId = req.params.botId
    const userId = req.userId
    const result = await deleteFile(botId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Delete-Thread", result.statusCode);
}

Controller.set_Transcript = async (req, res, next) => {
    return await getTranscriptResponse()
}

Controller.get_Transcript = async (req, res, next) => {
    const botId = req.params.botId
    const result = await cleanTranscript(botId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Get-Transcript", result.statusCode);
}

Controller.downloadVideo = async (req, res, next) => {
    const botId = req.body.botId
    const result = await storeVideo(botId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Recall-Download-Video", result.statusCode);
}

Controller.convertFile = async (req, res, next) => {
    const botId = req.params.botId;
    const result = await getBase(botId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "GET-Video-Base-64", result.statusCode);
}

Controller.formatFile = async (req, res, next) => {
    const botId = req.params.botId;
    const userId = req.userId
    const result = await mdToPdf(userId, botId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Mark-Down-To-Pdf", result.statusCode);
}

Controller.encryptData = async (req, res, next) => {
    const result = await encryptThread();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Encrypt-Thread-Question-Answer", result.statusCode);
}

Controller.getAndDeletFile = async (req, res, next) => {
    const userId = req.userId;
    const result = await deleteFileOpenAI(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Delete-All-Files", result.statusCode);
}

Controller.getAndDeletVector = async (req, res, next) => {
    const userId = req.userId;
    const result = await deleteVectorOpenAI(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Delete-All-Vector", result.statusCode);
}

Controller.createVectorStore = async (req, res, next) => {
    const userId = req.userId;
    const result = await makeVectorStore()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Make-Vector-Store", result.statusCode);
}

Controller.getAll = async (req, res, next) => {
    const userId = req.userId;
    const result = await fetchRecords()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-All-Request-Response-OpenAI", result.statusCode);
}

Controller.prompt = async (req, res, next) => {
    const prompt = req.jsonObject.prompt;
    const userId = req.userId;
    const result = await improvePrompt(prompt, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Improved-Prompt", result.statusCode);
}

Controller.getPrompt = async (req, res, next) => {
    const threadId = req.params.thread
    const userId = req.userId;
    const result = await getImprovedPrompt(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Get-Improved-Prompt", result.statusCode);
}

Controller.feedback = async (req, res, next) => {
    const like = req.jsonObject.like;
    const feedBack = req.jsonObject.feedBack;
    const runId = req.jsonObject.runId;
    const userId = req.userId;
    const result = await addFeedback(like, feedBack, runId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Add-Feed-Back-In-Threads-OpenAI", result.statusCode);
}

Controller.readCase = async (req, res, next) => {
    const data = req.jsonObject;
    const userId = req.userId;
    const result = await getCaseFile(data, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Create-Thread-Case-Analysis", result.statusCode);
}

Controller.getUserData = async (req, res, next) => {
    const data = req.jsonObject;
    const userId = req.userId;
    const result = await getData(data, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Create-Thread-Case-Analysis", result.statusCode);
}

Controller.getrewritereport = async (req, res, next) => {
    const threadId = req.params.thread
    const userId = req.userId
    const result = await getAllReWriteReportsResponses(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Re-Write-Report", result.statusCode);
}

Controller.getallrewritereport = async (req, res, next) => {
    const botId = req.params.botId
    const userId = req.userId
    const result = await getReWriteReportsResponses(botId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-Report-Assistant", result.statusCode);
}

Controller.startResearch = async (req, res, next) => {
    const query = req.jsonObject.question;
    const userQuery = req.jsonObject.userQuery;
    const userId = req.userId;
    const result = await researchBegin(query, userQuery, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Create-Thread-Research-Assistant", result.statusCode);
}

Controller.getResearch = async (req, res, next) => {
    const threadId = req.params.thread
    const userId = req.userId
    const result = await getAllResearchResponses(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Research-Assistant", result.statusCode);
}

Controller.getAllResearch = async (req, res, next) => {
    const botId = req.params.botId
    const userId = req.userId
    const result = await getResearchResponses(botId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-Report-Assistant", result.statusCode);
}

Controller.getUsersPrompts = async (req, res, next) => {
    const userId = req.userId
    const result = await getAllPrompts(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Users-All-Prompts", result.statusCode);
}

Controller.getEmpLaw = async (req, res, next) => {
    const threadId = req.params.thread
    const userId = req.userId
    const result = await getAllEmpLawResponses(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Emp-Law-Assistant", result.statusCode);
}

Controller.getAllEmpLaw = async (req, res, next) => {
    const botId = req.params.botId
    const userId = req.userId
    const result = await getEmpLaw(botId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-Report-Assistant", result.statusCode);
}

Controller.allPrompts = async (req, res, next) => {
    const userId = req.userId
    const result = await getPrompts(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-All-Prompts", result.statusCode);
}

Controller.lastPrompts = async (req, res, next) => {
    const userId = req.userId
    const result = await getLastPrompts(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Last-Prompts", result.statusCode);
}

Controller.allActivity = async (req, res, next) => {
    const userId = req.userId
    const result = await getAllActivities(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-User-Last-Prompts", result.statusCode);
}

Controller.askAgent = async (req, res, next) => {
    const kolabryAgent = req.jsonObject.agent;
    const caidiAgent = req.jsonObject.guide;
    const query = req.jsonObject.question;
    const userQuery = req.jsonObject.userQuery;
    const promptType = req.jsonObject.option;
    const state = req.jsonObject.state;
    const caseData = JSON.stringify(req.body?.caseDetails);
    const userId = req.userId;
    const result = await postKolabryAgent(kolabryAgent, query, userQuery, promptType, caidiAgent, state, caseData, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Ask-Kolabrya-Agent", result.statusCode);
}

Controller.getAgentData = async (req, res, next) => {
    const requestUuid = req.params.requestUuid
    const userId = req.userId
    const result = await getAllAgentResponses(requestUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Agent-Assistant", result.statusCode);
}

Controller.getGuideData = async (req, res, next) => {
    const threadId = req.params.thread
    const userId = req.userId
    const result = await getAllGuideResponses(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Caidi-Assistant", result.statusCode);
}

Controller.getAllAgentData = async (req, res, next) => {
    const userId = req.userId
    const result = await getAgentResponses(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-Agent-Assistant", result.statusCode);
}

Controller.getAllGuideData = async (req, res, next) => {
    const userId = req.userId
    const result = await getCaidiResponses(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-Caidi-Assistant", result.statusCode);
}

Controller.deleteAgentThreads = async (req, res, next) => {
    const result = await deleteAgentData()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Threads-For-Agent", result.statusCode);
}

Controller.deleteCaidiThreads = async (req, res, next) => {
    const userId = req.userId
    const result = await deleteCaidiThreads(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-All-Threads-For-Caidi-Agent", result.statusCode);
}

Controller.generateVisual = async (req, res, next) => {
    const requestUuid = req.body.requestUuid;
    const visuals = req.body.visuals;
    const userId = req.userId; 
    const result = await generateVisual(requestUuid, visuals, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Visual-OpneAI", result.statusCode);    
}

Controller.getVisuals = async (req, res, next) => {
    const threadId = req.params.thread
    const userId = req.userId
    const result = await getVisuals(threadId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Render-All-Responses-Success-Visuals-Assistant", result.statusCode);
}

Controller.fetchVisuals = async (req, res, next) => {
    const userId = req.userId
    const result = await fetchVisuals(userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Open-AI-Responses-On-Page-Load-Visuals-Assistant", result.statusCode);
}
 
Controller.combineData = async (req, res, next) => {
    const result = await addAccordianCaseAnswers()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Visual-OpneAI", result.statusCode);    
}

Controller.createVector = async (req, res, next) => {
    const result = await getPendingData()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-And-Add-Files-In-Vector-Store", result.statusCode);    
}

Controller.retriveVectorStore = async (req, res, next) => {
    const result = await retriveVectorStore()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Retrive-Vector-Store-Status", result.statusCode);    
}

Controller.uploadFileCitation = async (req, res, next) => {
    const result = await sendCiteDocumnets()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Upload-File-Citation-Python", result.statusCode);    
}

Controller.editFileCitation = async (req, res, next) => {
    const result = await editFileCitation()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Upload-File-Citation-Python", result.statusCode);    
}

Controller.fileUploadStatusCitation = async (req, res, next) => {
    const result = await fileUploadStatusCitation(req.body)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Upload-File-Citation-Python", result.statusCode);    
}

Controller.uploadFileCitationBulk = async (req, res, next) => {
    const result = await uploadFileCitationBulk()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Upload-File-Citation-Python-Bulk", result.statusCode);    
}

Controller.updateVectorStore = async (req, res, next) => {
    const result = await updateVectorStore()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Upload-Vector-Store", result.statusCode);    
}

Controller.deleteFileFromVectorStore = async (req, res, next) => {
    const result = await deleteFileFromVectorStore()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-File-From-Vector-Store", result.statusCode);    
}

Controller.deActivateOldRecords = async (req, res, next) => {
    const result = await deActivateOldRecords()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Deactivate-Old-Records", result.statusCode);    
}

module.exports = Controller;
