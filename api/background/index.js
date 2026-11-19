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

if (process.env.BP_HOURLY_RESTRICTION === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.HourlyResctrictions) {
                flags.HourlyResctrictions = false;
                await Rooms.HourlyResctrictions();
                flags.HourlyResctrictions = true;
            } else {
                console.log("process is still running");
            }
            console.log("running HourlyResctrictions every 15 seconds");
        } catch (e) {
            flags.HourlyResctrictions = true;
            console.log("process failed due to ", e.message);
        }

    });
}

if (process.env.BP_GET_FINAL_SUMMARY === 'true') {
    cron.schedule("0 */5 * * * *", async function () {
        try {
            if (flags.GetFinalSummary) {
                flags.GetFinalSummary = false;
                await Rooms.getFinalSummaryBP();
                flags.GetFinalSummary = true;
            } else {
                console.log("process is still running");
            }
            console.log("running BP_GET_FINAL_SUMMARY every 5 minutes");
        } catch (e) {
            flags.GetFinalSummary = true;
            console.log("process failed due to ", e.message);
        }
    });
}
console.log("not ring");

if (process.env.DELETE_KOLABRYA_AGENT_DATA === 'true') {
    cron.schedule("0 0 */12 * * *", async function () {
        try {
            if (flags.deleteAgentData) {
                flags.deleteAgentData = false;
                await Rooms.deleteAgentData();
                flags.deleteAgentData = true;
            } else {
                console.log("process is still running for deleteAgentData");
            }
            console.log("running deleteAgentData every day");
        } catch (e) {
            flags.deleteAgentData = true;
            console.log("process failed due to deleteAgentData", e.message);
        }
    });
}

if (process.env.BP_SEND_REPORT_DAILY === 'true') {
    cron.schedule("0 0 */12 * * *", async function () {
        try {
            if (flags.SendReportDaily) {
                flags.SendReportDaily = false;
                await Rooms.SendReportDaily();
                flags.SendReportDaily = true;
            } else {
                console.log("process is still running");
            }
            console.log("running SendReportDaily every day");
        } catch (e) {
            flags.SendReportDaily = true;
            console.log("process failed due to ", e.message);
        }
    });

    cron.schedule("0 0 */12 * * *", async function () {
        try {
            if (flags.SendPromptDaily) {
                flags.SendPromptDaily = false;
                await Rooms.SendPromptDaily();
                flags.SendPromptDaily = true;
            } else {
                console.log("process is still running");
            }
            console.log("running SendPromptDaily every day");
        } catch (e) {
            flags.SendPromptDaily = true;
            console.log("process failed due to ", e.message);
        }
    });

    cron.schedule("0 0 */10 * * *", async function () {
        try {
            if (flags.SendPromptDaily) {
                flags.SendPromptDaily = false;
                await Rooms.SendPromptDaily();
                flags.SendPromptDaily = true;
            } else {
                console.log("process is still running");
            }
            console.log("running SendPromptDaily every day");
        } catch (e) {
            flags.SendPromptDaily = true;
            console.log("process failed due to ", e.message);
        }
    });

    cron.schedule("0 0 */16 * * *", async function () {
        try {
            if (flags.SendPromptDaily) {
                flags.SendPromptDaily = false;
                await Rooms.SendPromptDaily();
                flags.SendPromptDaily = true;
            } else {
                console.log("process is still running");
            }
            console.log("running SendPromptDaily every day");
        } catch (e) {
            flags.SendPromptDaily = true;
            console.log("process failed due to ", e.message);
        }
    });

    cron.schedule("0 0 */20 * * *", async function () {
        try {
            if (flags.SendPromptDaily) {
                flags.SendPromptDaily = false;
                await Rooms.SendPromptDaily();
                flags.SendPromptDaily = true;
            } else {
                console.log("process is still running");
            }
            console.log("running SendPromptDaily every day");
        } catch (e) {
            flags.SendPromptDaily = true;
            console.log("process failed due to ", e.message);
        }
    });

} else {
    console.log("not runing report");
}


if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.MeetingSchedule) {
                flags.MeetingSchedule = false; 
                await Rooms.DisableOtp();
                await Rooms.AgendaAutoJoin();
                flags.MeetingSchedule = true;
            } else {
                console.log("process is still running for kolabrya feature's other than thread's");
            }
        } catch (e) {
            flags.MeetingSchedule = true;
            console.log("process failed due to ", e.message);
        }
    });
} else {
    console.log("not running MeetingSchedule events");
}


//JOB_CREATE_THREAD_ONLY
if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.CreateThread) {
                flags.CreateThread = false;
                await Rooms.CreateThread();
                flags.CreateThread = true;
            } else {
                console.log("process is still running for kolabrya feature's to create thread's");
                flags.CreateThread = true;
            }
        } catch (e) {
            flags.CreateThread = true;
            console.log("Create Thread process failed due to ", e.message);
        }
    });
} else {
    console.log("not running Create Thread events");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.CheckThreadStatus) {
                flags.CheckThreadStatus = false;
                await Rooms.CheckThreadStatus();
                flags.CheckThreadStatus = true;
            } else {
                console.log("process is still running for kolabrya feature's to check thread status");
                flags.CheckThreadStatus = true;
            }
        } catch (e) {
            flags.CheckThreadStatus = true;
            console.log("Check Thread Status process failed due to ", e.message);
        }
    });
} else {
    console.log("not running Check Thread Status events");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.RunFailedThread) {
                flags.RunFailedThread = false;
                await Rooms.RunFailedThread();
                flags.RunFailedThread = true;
            } else {
                console.log("process is still running for kolabrya feature's to re-run the failed threads");
                flags.RunFailedThread = true;
            }
        } catch (e) {
            flags.RunFailedThread = true;
            console.log("Run Failed Thread process failed due to ", e.message);
        }
    });
} else {
    console.log("not running Check Run Failed Thread");
}


if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.combineKolabryaData) {
                flags.combineKolabryaData = false; 
                await Rooms.CombineKolabryaDashboardData();
                flags.combineKolabryaData = true;
            } else {
                console.log("process is still running for combining kolabrya dashboard data");
                flags.combineKolabryaData = true;
            }
        } catch (e) {
            flags.combineKolabryaData = true;
            console.log("process failed due to ", e.message);
        }
    });
} else {
    console.log("not running for combining kolabrya dashboard data");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.sendKolabryaData) {
                flags.sendKolabryaData = false; 
                await Rooms.SendKolabryaDashboardData();
                flags.sendKolabryaData = true; 
            } else {
                flags.sendKolabryaData = true;
                console.log("process is still running for sending kolabrya dashboard data");
            }
        } catch (e) {
            flags.sendKolabryaData = true;
            console.log("process failed due to ", e.message);
        }
    });
} else {
    console.log("not running for sending kolabrya dashboard data");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.retrieveKolabryaData) {
                flags.retrieveKolabryaData = false; 
                await Rooms.RetrieveKolabryaDashboardData();
                flags.retrieveKolabryaData = true;
            } else {
                console.log("process is still running for retrieve kolabrya dashboard data");
                flags.retrieveKolabryaData = true;
            }
        } catch (e) {
            flags.retrieveKolabryaData = true;
            console.log("process failed due to ", e.message);
        }
    });
} else {
    console.log("not running for retrieve kolabrya dashboard data");
}


if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.combineKolabryaDataUpdate) {
                flags.combineKolabryaDataUpdate = false; 
                await Rooms.CombineKolabryaDashboardDataUpdate();
                flags.combineKolabryaDataUpdate = true;
            } else {
                console.log("process is still running for combining kolabrya dashboard data on update");
                flags.combineKolabryaDataUpdate = true;
            }
        } catch (e) {
            flags.combineKolabryaDataUpdate = true;
            console.log("process failed due to ", e.message);
        }
    });
} else {
    console.log("not running for combining kolabrya dashboard data on update");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.ReRunFailedDashboardRecord) {
                flags.ReRunFailedDashboardRecord = false; 
                await Rooms.ReRunFailedDashboardRecord();
                flags.ReRunFailedDashboardRecord = true;
            } else {
                console.log("process is still running for re Run failed dashboard record");
                flags.ReRunFailedDashboardRecord = true;
            }
        } catch (e) {
            flags.ReRunFailedDashboardRecord = true;
            console.log("process failed due to ", e.message);
        }
    });
} else {
    console.log("not running for re Run failed dashboard record");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.TranscriptEnhancer) {
                flags.TranscriptEnhancer = false; 
                await Rooms.TranscriptEnhancer();
                flags.TranscriptEnhancer = true;
            } else {
                console.log("process is still running for transcript enhancer");
                flags.TranscriptEnhancer = true;
            }
        } catch (e) {
            flags.TranscriptEnhancer = true;
            console.log("process failed for transcript enhancer due to ", e.message);
        }
    });
} else {
    console.log("not running for transcript enhancer");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.SendTimeLineData) {
                flags.SendTimeLineData = false; 
                await Rooms.sendTimeLineData();
                flags.SendTimeLineData = true;
            } else {
                console.log("process is still running for Send Time Line Data");
                flags.SendTimeLineData = true;
            }
        } catch (e) {
            flags.SendTimeLineData = true;
            console.log("process failed for Send Time Line Data", e.message);
        }
    });
} else {
    console.log("not running for Send Time Line Data");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.GetTimeLineData) {
                flags.GetTimeLineData = false; 
                await Rooms.getTimeLineData();
                flags.GetTimeLineData = true;
            } else {
                console.log("process is still running for Get Time Line Data");
                flags.GetTimeLineData = true;
            }
        } catch (e) {
            flags.GetTimeLineData = true;
            console.log("process failed for for Get Time Line Data", e.message);
        }
    });
} else {
    console.log("not running for Get Time Line Data");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.sendCombineData) {
                flags.sendCombineData = false; 
                await Rooms.sendCombineData();
                flags.sendCombineData = true;
            } else {
                console.log("process is still running for send Combine Data");
                flags.sendCombineData = true;
            }
        } catch (e) {
            flags.sendCombineData = true;
            console.log("process failed for send Combine Data", e.message);
        }
    });
} else {
    console.log("not running for send Combine Data");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.startPendingReport) {
                flags.startPendingReport = false; 
                await Rooms.startPendingReport();
                flags.startPendingReport = true;
            } else {
                console.log("process is still running for start Pending Report");
                flags.startPendingReport = true;
            }
        } catch (e) {
            flags.startPendingReport = true;
            console.log("process failed for start Pending Report", e.message);
        }
    });
} else {
    console.log("not running for start Pending Report");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.runFailedTocData) {
                flags.runFailedTocData = false; 
                await Rooms.runFailedTocData();
                flags.runFailedTocData = true;
            } else {
                console.log("process is still running for run Failed Toc Data");
                flags.runFailedTocData = true;
            }
        } catch (e) {
            flags.runFailedTocData = true;
            console.log("process failed for run Failed Toc Data", e.message);
        }
    });
} else {
    console.log("not running for run Failed Toc Data");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.runFailedReport) {
                flags.runFailedReport = false; 
                await Rooms.runFailedReport();
                flags.runFailedReport = true;
            } else {
                console.log("process is still running for Failed Report");
                flags.runFailedReport = true;
            }
        } catch (e) {
            flags.runFailedReport = true;
            console.log("process failed for Failed Report", e.message);
        }
    });
} else {
    console.log("not running for Failed Report");
}


if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.uploadFileToOpenAI) {
                flags.uploadFileToOpenAI = false; 
                await Rooms.uploadFileToOpenAI();
                flags.uploadFileToOpenAI = true;
            } else {
                console.log("process is still running for upload File To OpenAI");
            }
        } catch (e) {
            flags.uploadFileToOpenAI = true;
            console.log("process failed for upload File To OpenAI", e.message);
        }
    });
} else {
    console.log("not running for upload File To OpenAI");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.createVectorStore) {
                flags.createVectorStore = false; 
                await Rooms.createVectorStore();
                flags.createVectorStore = true;
            } else {
                console.log("process is still running for create vector store at OpenAI");
                flags.createVectorStore = true;
            }
        } catch (e) {
            flags.createVectorStore = true;
            console.log("process failed for create vector store at OpenAI", e.message);
        }
    });
} else {
    console.log("not running for create vector store at OpenAI");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.startKolabryaAnalysis) {
                flags.startKolabryaAnalysis = false; 
                await Rooms.startKolabryaAnalysis();
                flags.startKolabryaAnalysis = true;
            } else {
                console.log("process is still running for start kolabrya analysis");
                flags.startKolabryaAnalysis = true;
            }
        } catch (e) {
            flags.startKolabryaAnalysis = true;
            console.log("process failed for start kolabrya analysis", e.message);
        }
    });
} else {
    console.log("not running for start kolabrya analysis");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.startPendingAnalysis) {
                flags.startPendingAnalysis = false; 
                await Rooms.startPendingAnalysis();
                flags.startPendingAnalysis = true;
            } else {
                console.log("process is still running for start pending analysis");
                flags.startPendingAnalysis = true;
            }
        } catch (e) {
            flags.startPendingAnalysis = true;
            console.log("process failed for start pending analysis", e.message);
        }
    });
} else {
    console.log("not running for start pending analysis");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.getFailedRecords) {
                flags.getFailedRecords = false; 
                await Rooms.getFailedRecords();
                flags.getFailedRecords = true;
            } else {
                console.log("process is still running for getting analysis failed records");
                flags.getFailedRecords = true;
            }
        } catch (e) {
            flags.getFailedRecords = true;
            console.log("process failed for getting analysis failed records", e.message);
        }
    });
} else {
    console.log("not running for getting analysis failed records");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.startKolabryaVisuals) {
                flags.startKolabryaVisuals = false; 
                await Rooms.startKolabryaVisuals();
                flags.startKolabryaVisuals = true;
            } else {
                console.log("process is still running for getting start kolabrya visuals");
                flags.startKolabryaVisuals = true;
            }
        } catch (e) {
            flags.startKolabryaVisuals = true;
            console.log("process failed for getting start kolabrya visuals", e.message);
        }
    });
} else {
    console.log("not running for getting start kolabrya visuals");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.startPendingVisuals) {
                flags.startPendingVisuals = false; 
                await Rooms.startPendingVisuals();
                flags.startPendingVisuals = true;
            } else {
                console.log("process is still running for getting start pending visuals");
                flags.startPendingVisuals = true;
            }
        } catch (e) {
            flags.startPendingVisuals = true;
            console.log("process failed for getting start pending visuals", e.message);
        }
    });
} else {
    console.log("not running for getting start pending visuals");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.getFailedRecordsVisuals) {
                flags.getFailedRecordsVisuals = false; 
                await Rooms.getFailedRecordsVisuals();
                flags.getFailedRecordsVisuals = true;
            } else {
                console.log("process is still running for getting failed records visuals");
                flags.getFailedRecordsVisuals = true;
            }
        } catch (e) {
            flags.getFailedRecordsVisuals = true;
            console.log("process failed for getting failed records visuals", e.message);
        }
    });
} else {
    console.log("not running for getting failed records visuals");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.retriveVectorStore) {
                flags.retriveVectorStore = false; 
                await Rooms.retriveVectorStore();
                flags.retriveVectorStore = true;
            } else {
                console.log("process is still running for getting retrive vector store");
                flags.retriveVectorStore = true;
            }
        } catch (e) {
            flags.retriveVectorStore = true;
            console.log("process failed for getting retrive vector store", e.message);
        }
    });
} else {
    console.log("not running for getting retrive vector store");
}


if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.caseInterview) {
                flags.caseInterview = false; 
                await Rooms.caseInterview();
                flags.caseInterview = true;
            } else {
                console.log("process is still running for getting case Inter view");
                flags.caseInterview = true;
            }
        } catch (e) {
            flags.caseInterview = true;
            console.log("process failed for getting case Inter view", e.message);
        }
    });
} else {
    console.log("not running for getting case Inter view");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.jsonAssistant) {
                flags.jsonAssistant = false; 
                await Rooms.jsonAssistant();
                flags.jsonAssistant = true;
            } else {
                console.log("process is still running for getting json assistant");
                flags.jsonAssistant = true;
            }
        } catch (e) {
            flags.jsonAssistant = true;
            console.log("process failed for getting json assistant", e.message);
        }
    });
} else {
    console.log("not running for getting json assistant");
}

if (process.env.BP_MEETING_SCHEDULE === 'false') {
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

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.startDoc) {
                flags.startDoc = false; 
                await Rooms.startDoc();
                flags.startDoc = true;
            } else {
                console.log("process is still running for start Doc");
                flags.startDoc = true;
            }
        } catch (e) {
            flags.startDoc = true;
            console.log("process failed for start Doc", e.message);
        }
    });
} else {
    console.log("not running for start Doc");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.pendingDoc) {
                flags.pendingDoc = false; 
                await Rooms.pendingDoc();
                flags.pendingDoc = true;
            } else {
                console.log("process is still running for pending Doc");
                flags.pendingDoc = true;
            }
        } catch (e) {
            flags.pendingDoc = true;
            console.log("process failed for pending Doc", e.message);
        }
    });
} else {
    console.log("not running for pending Doc");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.failedDoc) {
                flags.failedDoc = false; 
                await Rooms.failedDoc();
                flags.failedDoc = true;
            } else {
                console.log("process is still running for failed Doc");
                flags.failedDoc = true;
            }
        } catch (e) {
            flags.failedDoc = true;
            console.log("process failed for failed Doc", e.message);
        }
    });
} else {
    console.log("not running for failed Doc");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.intelligentMap) {
                flags.intelligentMap = false; 
                await Rooms.intelligentMap();
                flags.intelligentMap = true;
            } else {
                console.log("process is still running for intelligent Map");
                flags.intelligentMap = true;
            }
        } catch (e) {
            flags.intelligentMap = true;
            console.log("process failed for intelligent Map", e.message);
        }
    });
} else {
    console.log("not running for intelligent Map");
}


if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.canadianLawSource) {
                flags.canadianLawSource = false;
                await Rooms.canadianLawService();
                flags.canadianLawSource = true;
            } else {
                console.log("process is still running");
            }
            // console.log("running canadianLawSource every 15 seconds");
        } catch (e) {
            flags.canadianLawSource = true;
            console.log("process failed canadianLawSource due to ", e.message);
        }
    });
}else {
    console.log("not running for canadianLawSource");
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.externalDoc) {
                flags.externalDoc = false;
                await Rooms.externalDocJobs();
                flags.externalDoc = true;
            } else {
                console.log("process is still running for external Doc");
                flags.externalDoc = true;
            }
        } catch (e) {
            flags.externalDoc = true;
            console.log("process failed for external Doc", e.message);
        }
    });
} else {
    console.log("not running for external Doc");
}