const background = {};
const {    
    RoomServices, 
    UserServices, 
    ChatGptServices, 
    OTPServices, 
    CaseFileServices, 
    RedLineServices,
    TextFormatterService,
    CaseDashboardServices,
    CaseReportGeneratorServices,
    KolabryaAnalysisServices,
    KolabryaVisualsServices,
    CaseInterviewServices,
    JsonAssistantServices,
    speechToText,
    CaseDocAssistantServices,
    KolabryaGrokServices,
    WriteReportServices,
    DocumentEnhanceServices,
    KolabryaMagicLinkServices,
    CaseIntelligentMapServices,
    IncCaseFileServices,
    CanadianLawServices
 } = require('../services')
 

background.HourlyResctrictions = async () => {
    return await RoomServices.hourlyRestrictions();
}

background.getFinalSummaryBP = async () => {
    return await RoomServices.getFinalSummaryBP();
}

background.SendReportDaily = async () => {
    return await RoomServices.SendReportDaily();
}

background.deleteAgentData = async () => {
    return await ChatGptServices.deleteAgentData();
}

background.SendPromptDaily = async () => {
    await IncCaseFileServices.emailReport();
    await ChatGptServices.deActivateOldRecords();
    return await UserServices.getAllPrompt()
}

background.ImapEmail = async () => {
    return await UserServices.FetchEmail() 
}

background.AgendaAutoJoin = async () => {
    return await CaseFileServices.audioToSpeech();
}

background.DisableOtp = async () => {
    await KolabryaMagicLinkServices.disAbleLink()
    return await OTPServices.expireOTP();
}

background.CleanTranscript = async () => {
    return await ChatGptServices.getTranscriptResponse();
}

background.CreateThread = async () => {
    await RedLineServices.getPendingRedLine();
    return await TextFormatterService.getPendingTextFormatter();
}

background.CheckThreadStatus = async () => {
    await RedLineServices.startPendingRedLine();
    return await TextFormatterService.startPendingTextFormatter();
}

background.RunFailedThread = async () => {
    await TextFormatterService.TextFormatterFailedRequestes();
    return await RedLineServices.redLineFailedRequestes();
}


background.CombineKolabryaDashboardData = async () => {
    return await CaseDashboardServices.getPendingDashboardData();
}

background.CombineKolabryaDashboardDataUpdate = async () => {
    return await CaseDashboardServices.getPendingDashboardDataUpdate();
}

background.SendKolabryaDashboardData = async () => {
    return await CaseDashboardServices.sendPendingDashboardData();
}

background.RetrieveKolabryaDashboardData = async () => {
    return await CaseDashboardServices.startPendingDashboard();
}

background.ReRunFailedDashboardRecord = async () => {
    return await CaseDashboardServices.runFailedDashboardData();
}

background.TranscriptEnhancer = async () => {
    return await RoomServices.enhanceTrasncript();
}

background.sendTimeLineData = async () => {
    return await CaseReportGeneratorServices.sendPendingDashboardData();
}

background.getTimeLineData = async () => {
    return await CaseReportGeneratorServices.startPendingDashboard();
}

background.combineJSONDataToGenerateReport = async () => {
    return await CaseReportGeneratorServices.combineJSONDataToGenerateReport();
}

background.sendCombineData = async () => {
    return await CaseReportGeneratorServices.sendCombineData();
}

background.startPendingReport = async () => {
    return await CaseReportGeneratorServices.startPendingReport();
}

background.runFailedTocData = async () => {
    return await CaseReportGeneratorServices.runFailedTocData();
}

background.runFailedReport = async () => {
    return await CaseReportGeneratorServices.runFailedReport();
} 

background.uploadFileToOpenAI = async () => {
    return await CaseFileServices.uploadFileToOpenAI();
}

background.createVectorStore = async () => {
    return await ChatGptServices.getPendingData();
}

background.retriveVectorStore = async () => {
    await ChatGptServices.updateVectorStore();
    await ChatGptServices.deleteFileFromVectorStore();
    return await ChatGptServices.retriveVectorStore();
}

background.externalDocJobs = async () => {
    await ChatGptServices.deleteFileFromVectorStoreExternalDoc()
    await ChatGptServices.updateVectorStoreExternalDoc()
    await ChatGptServices.getFailedExternalDocRecords()
    await ChatGptServices.startKolabryaExternalDocAnalysis()
    await ChatGptServices.startPendingExternalDoc()
    await ChatGptServices.uploadFileToOpenAIExternalDoc()
    await ChatGptServices.retriveVectorStoreExternalDoc();
    return await ChatGptServices.getPendingDataForExternalDoc();
}

background.startKolabryaAnalysis = async () => {
    return await KolabryaAnalysisServices.startKolabryaAnalysis();
}

background.startPendingAnalysis = async () => {
    return await KolabryaAnalysisServices.startPendingAnalysis();
}

background.getFailedRecords = async () => {
    return await KolabryaAnalysisServices.getFailedRecords();
}

background.startKolabryaVisuals = async () => {
    return await KolabryaVisualsServices.startKolabryaVisuals();
}

background.startPendingVisuals = async () => {
    return await KolabryaVisualsServices.startPendingVisuals();
}

background.getFailedRecordsVisuals = async () => {
    return await KolabryaVisualsServices.getFailedRecords();
}

background.caseInterview = async () => {
    await CaseInterviewServices.caseMeetingFileInc();
    await CaseInterviewServices.runCaseMeetingFileInc();
    // await CaseInterviewServices.getRoomData(); //commenting to stop inconsistences interview flow for now
    await CaseInterviewServices.postIncPrompt();
    await CaseInterviewServices.startCaseInterviewFileInc();
  return  await CaseInterviewServices.runCaseInterviewFileInc();
}

background.jsonAssistant = async () => {
    await JsonAssistantServices.startJsonGeneration();
    await JsonAssistantServices.startPendingJsonGeneration();
    return await JsonAssistantServices.getFailedJsonRecords();
}

background.revTranscript = async () => {
    await speechToText.sendFile();
    await speechToText.getFile();
    return await speechToText.getTranscript();
}

background.startDoc = async () => {
    await CaseDocAssistantServices.getFiles();
    return await CaseDocAssistantServices.startKolabryaDocAnalysis();
}

background.pendingDoc = async () => {
    await DocumentEnhanceServices.startDocEnhancement()
    return await CaseDocAssistantServices.runPendingDocAnalysis();
}

background.failedDoc = async () => {
    await KolabryaGrokServices.addMessage();
    await WriteReportServices.addMessage();
    return await CaseDocAssistantServices.getFailedRecords();
}

background.intelligentMap = async () => {
    await CaseIntelligentMapServices.findFailedRecord();
    return await CaseIntelligentMapServices.findRecord();
}

background.canadianLawService = async () => {
    return await CanadianLawServices.getPendingData();
}

module.exports = background