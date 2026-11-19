const Rooms = require('./room.background');
const cron = require("node-cron");
let flags = {
    HourlyResctrictions: true,
    GetFinalSummary: true,
    SendReportDaily: true,
    SendPromptDaily: true,
    MeetingSchedule: true,
    CreateThread: true,
    CheckThreadStatus: true,
    RunFailedThread: true,
    deleteAgentData: true,
    combineKolabryaData: true,
    sendKolabryaData: true,
    retrieveKolabryaData: true,
    combineKolabryaDataUpdate: true,
    ReRunFailedDashboardRecord: true,
    TranscriptEnhancer: true,
    SendTimeLineData: true,
    GetTimeLineData: true,
    combineJSONDataToGenerateReport: true,
    sendCombineData: true,
    startPendingReport: true,
    runFailedReport: true,
    runFailedTocData: true,
    uploadFileToOpenAI: true,
    createVectorStore: true,
    startKolabryaAnalysis: true,
    startPendingAnalysis: true,
    getFailedRecords: true,
    startKolabryaVisuals: true,
    startPendingVisuals: true,
    getFailedRecordsVisuals: true,
    retriveVectorStore: true,
    caseInterview: true,
    jsonAssistant: true,
    startDoc: true,   
    pendingDoc: true,   
    failedDoc: true,
    intelligentMap: true,
    canadianLawSource: true,
    externalDoc: true
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.revTranscript) {
                flags.revTranscript = false; 
                await Rooms.revTranscript();
                flags.revTranscript = true;
            } else {
                console.log("process is still running for rev Transcript");
                flags.revTranscript = true;
            }
        } catch (e) {
            flags.revTranscript = true;
            console.log("process failed for rev Transcript", e.message);
        }
    });
} else {
    console.log("not running for rev Transcript");
}