const CaseDashboardServices = {};
const {
    CaseNamesQueries,
    CaseFilesQueries,
    CaseResponsesQueries,
    CaseTypesQueries,
    CaseDashboardQueries,
    UserQueries
} = require('../queries');
const { Strings, Logger } = require('../../utils')
const currentDate = new Date();
const { slack } = require('../../utils/Webhook');
const {
    makeThreads,
    runThreads,
    getAssistantResponse,
    makeMessage,
    validateThreadStatus,
} = require('../external/ChatGPT')
const caseDashboardAssistant = process.env.KOLABRYA_CASE_DASHBOARD_ASSISTANT;

CaseDashboardServices.createCaseDashboardMap = async (record) => { 
    try {
        for (let index = 0; index < record.length; index++) {
            const element = record[index];
            const obj = {
                tableName: element.tableName,
                tableType: element.tableType,
                tablePrompt: element.tablePrompt,
                combineAccordian: element.combineAccordian,
            }            
            await CaseDashboardQueries.addcaseDashboardMap(obj);
        }
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {}
        };
    } catch (error) {
        console.log("Error in create Case Dashboard Map:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.getCaseDashboardMap = async () => {
    try {
        const data = await CaseDashboardQueries.getGaseDashboardMap();
        if (data.length > 0) {
            return {
                message: Strings.RECORD_UPDATE_SUCCESS,
                statusCode: 200,
                obj: data
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }

    } catch (error) {
        console.log("Error in Get Case Dashboard Map", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.combineCaseDashboardData = async (caseId, userId) => {
    try {
        const data = await CaseDashboardQueries.getGaseDashboardMap();
        if (data.length > 0) {
            const all = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const list = JSON.parse(element.combineAccordian);
                for (let listIndex = 0; listIndex < list.length; listIndex++) {
                    const record = list[listIndex];
                    const getIds = await CaseDashboardQueries.getIntakeQueriesIds(record);
                    const combinedQueryResponses = [];
                    for (let queryIndex = 0; queryIndex < getIds.length; queryIndex++) {
                        const queryId = getIds[queryIndex];
                        const combiningData = await CaseDashboardQueries.findQueryByQueryId(queryId.id, caseId, userId);                        
                        if (combiningData != null && combiningData.response != null) {
                            const getQuery = await CaseDashboardQueries.findQueryOnly(queryId.id);                        
                            const sentence = "Question: "+ getQuery.prompt +" Answer: "+combiningData.response                            
                            // const sentence = " Answer: "+combiningData.response                            
                            combinedQueryResponses.push(sentence);
                        } 
                    }
                    if (combinedQueryResponses.length > 0) {
                        const existingIndex = all.findIndex(item => item.mapId === element.id);
                        if (existingIndex !== -1) {
                            all[existingIndex].request += `, ${combinedQueryResponses.join(', ')}`;
                        } else {
                            all.push({
                                caseId: caseId,
                                userId: userId,
                                mapId: element.id,
                                request: element.tablePrompt +' '+combinedQueryResponses.join(', '),  // Join the responses for this set
                                isReady: true
                            });
                        }
                    }
                }
            }
            if (all.length > 0) {
                await CaseDashboardQueries.updateCaseById({ isProcessed: false }, caseId, userId)
                for (const element of all) {
                    await CaseDashboardQueries.addCaseDashboard(element)
                    await CaseDashboardQueries.disableIntakeAnswers({status: false}, element.caseId, element.userId)
                }
                return {
                    message: Strings.RECORD_UPDATE_SUCCESS,
                    statusCode: 200,
                    obj: all
                };
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: []
            };
        }
    } catch (error) {
        console.log("Error in Combine Case Dashboard Data", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseDashboardServices.getPendingDashboardData = async () => {
    try {
        const data = await CaseDashboardQueries.getPendingData();
        if (data.length > 0) {
            console.log("**********************************************");
            console.log("Job Started To Combine Kolabrya Dashboard Data");
            console.log("**********************************************");
            const results = [];
            for (const element of data) {
                if (await CaseDashboardQueries.getPendingDashboardData(element.userId)) {
                    console.log("Queue Details For Kolabrya Dashboard", { "UserId": element.userId, "requestUuid": element.caseUuid });
                } else {
                    const result = await CaseDashboardServices.combineCaseDashboardData(element.id, element.userId)
                    results.push(result);
                }
            }
            console.log("*****************************************************");
            console.log("Job Completed For Combinining Kolabrya Dashboard Data");
            console.log("*****************************************************");
            Logger.data.OpenAI({ request: results, methodName: "getPendingdashboard" }, "Sending-CasedashBoard-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("**********************************************");
            console.log("No Record Found For Combine Kolabrya Dashboard");
            console.log("**********************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("error while runnnign job for Kolabrya Dashboard", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.sendPendingDashboardData = async () => {
    try {
        const data = await CaseDashboardQueries.getPendingDataForOpenAI();
        if (data.length > 0) {
            console.log("*************************************************************");
            console.log("Job Started For Sending Data To OpenAI For Kolabrya Dashboard");
            console.log("*************************************************************");
            const results = [];
            for (const element of data) {
                if (await CaseDashboardQueries.getPendingDataForOpenAIByUserId(element.caseId, element.userId)) {
                    console.log("Queue Details On OpenAI For Kolabrya Dashboard", { "requestUuid": element.requestUuid, "caseId": element.caseId, "UserId": element.userId, });
                }
                const result = await CaseDashboardServices.runChatGPT(caseDashboardAssistant, element)
                results.push(result);
                
            }
            console.log("***************************************************************");
            console.log("Job Completed For Sending Data To OpenAI For Kolabrya Dashboard");
            console.log("***************************************************************");
            Logger.data.OpenAI({ request: results, methodName: "sendPendingDashboardData" }, "Send-Pending-Dashboard-Data");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("**********************************************");
            console.log("No Record Found For Pending Kolabrya Dashboard");
            console.log("**********************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.runChatGPT = async (assistantId, allPendingReports) => {
    try {        
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        payload.messages[0].content = allPendingReports.request;
        const getPayload = payload?.messages[0];
        const getThreadId = await CaseDashboardServices.createOrFindThread(allPendingReports.userId);
        if (getThreadId.statusCode == '200') {
            const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-CasedashBoard-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "runThreads" }, "Run-Thread-CasedashBoard-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "threadStep" }, "Thread-Step-CasedashBoard-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0,
                        isProcessed: true
                    }                    
                    const getId = await CaseDashboardQueries.update(data, allPendingReports.requestUuid, allPendingReports.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for dashboard", response: threadStep, requestUuid: allPendingReports.requestUuid, userId: allPendingReports.userId }));
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            message: threadStep?.error?.message,
                            type: threadStep?.error?.type,
                            param: threadStep?.error?.param,
                            code: threadStep?.error?.code
                        }
                    }
                }
            } else {
                slack.webhook(JSON.stringify({ action: "addMessage for dashboard", response: addMessage, requestUuid: allPendingReports.requestUuid, userId: allPendingReports.userId }));
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        message: addMessage?.error?.message,
                        type: addMessage?.error?.type,
                        param: addMessage?.error?.param,
                        code: addMessage?.error?.code
                    }
                }
            }
        } else {
            slack.webhook(JSON.stringify({ action: "getThreadId", response: getThreadId , requestUuid: allPendingReports.requestUuid, userId: allPendingReports.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT dashboard", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.createOrFindThread = async (userId) => {
    try {
        // enable it when you want to use thread memory
        // const findThreadId = await CaseDashboardQueries.findThreadIdRedLine(userId);
        // const data = findThreadId?.threadId;
        // if (data != '' && data) {
        if (false) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-DB-Open-AI-Casedashboard-Assistant");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-DB-Open-AI-Error");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: data
                }
            }
        } else {
            const threads = await makeThreads()
            if (threads.id && threads.id != '') {
                console.log("**********************************************************");
                console.log("creating new thread_id  =>", threads.id);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreads dashboard" }, "Create-Thread-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreads  dashboard" }, "Create-Thread-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "makeThreads for dashboard", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.error('An error occurred while Create Or Find Thread for Case Dashboard', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.startPendingDashboard = async () => {
    try {
        const data = await CaseDashboardQueries.startPendingDashboard();
        if (data.length > 0) {
            console.log("***********************************************");
            console.log("Job Started For Posting Kolabrya Dashboard Data");
            console.log("***********************************************");
            const results = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                if (await CaseDashboardQueries.pendingDataQueue(element.caseId, element.userId)) {
                    console.log("Queue Details On OpenAI For Posting Kolabrya Dashboard Data", { "requestUuid": element.requestUuid, "caseId": element.caseId, "UserId": element.userId, });
                }
                const result = await CaseDashboardServices.startThread(element.threadId, element.runId, element.requestUuid, element.caseId, element.userId)
                results.push(result);
            }
            console.log("*************************************************");
            console.log("Job Completed For Posting Kolabrya Dashboard Data");
            console.log("*************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("*******************************************");
            console.log("No Record Found For Kolabrya Case Dashboard");
            console.log("*******************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while start pending dashboard", error);
        
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.startThread = async (threadId, runId, requestUuid, caseId, userId) => {
    try {
        const validateStatus = await validateThreadStatus(threadId, runId);
        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Retrive-Run-Case-Dashboard")
        data = {
            jsonResponse: JSON.stringify(validateStatus)
        }
        await CaseDashboardQueries.updateThreadById(data, runId);
        if (!validateStatus.error) {
            const getCompleteStatus = validateStatus.status == 'completed';
            const getInProgressStatus = validateStatus.status == 'in_progress';
            const getFailedStatus = validateStatus.status == 'failed';
            const getExpiredStatus = validateStatus.status == 'expired';
            const getQueuedStatus = validateStatus.status == 'queued';

            console.log("");
            console.log("===== Kolabrya Case Dashboard ======");
            console.log("getCompleteStatus            *", getCompleteStatus);
            console.log("getInProgressStatus         **", getInProgressStatus);
            console.log("getFailedStatus            ***", getFailedStatus);
            console.log("getExpiredStatus          ****", getExpiredStatus);
            console.log("getQueuedStatus          *****", getQueuedStatus);
            console.log("");

            if (getCompleteStatus) {
                const getanswer = await getAssistantResponse(threadId);
                obj = {
                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                    status: 1,
                    messageId: getanswer?.data[0]?.id,
                    response: getanswer?.data[0]?.content[0]?.text?.value || null,
                    updatedAt: currentDate
                }
                Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Kolabrya-Case-Dashboard-Assistant-Open-AI")
                await CaseDashboardQueries.updateThreadById(obj, runId);
                const updateCaseAfterCompletion = await CaseDashboardQueries.checkUsage(caseId, userId);
                if (updateCaseAfterCompletion <= 0) {
                    await CaseDashboardQueries.updateCaseById({ isProcessed: true }, caseId, userId)
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                        requestUuid: requestUuid,
                        userId: userId,
                        runId: runId,
                        threadId: threadId,
                    }
                }
            }
            else if (getInProgressStatus || getQueuedStatus) {
                obj = {
                    status: 0,
                    updatedAt: currentDate
                }
                await CaseDashboardQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        status: 0,
                        threadId: threadId
                    }
                }
            }
            else if (getFailedStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Failed-Kolabrya-Case-Dashboard-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Case-Dashboard-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                console.log("validate run failed case kolabrya case dashboard assistant", validateStatus);
                console.log("check status", validateStatus.status);
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseDashboardQueries.updateThreadById(obj, runId);
                
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else if (getExpiredStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Expired-Kolabrya-Case-Dashboard-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Case-Dashboard-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseDashboardQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else {
                slack.webhook(JSON.stringify({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseDashboardQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
        } else {
            console.log("validate run error kolabrya case dashboard assistant", validateStatus?.error);
            slack.webhook(JSON.stringify({ action: "Validate run error kolabrya case dashboard assistant", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus?.error}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            obj = {
                retry: true,
                status: 2,
                response: null,
                jsonResponse: JSON.stringify(validateStatus?.error),
                updatedAt: currentDate
            }
            await CaseDashboardQueries.updateThreadById(obj, runId);
            return {
                message: Strings.ERROR.ERROR_RE_TRY,
                statusCode: 400,
                obj: obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for validate run error kolabrya case dashboard assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.viewData = async (isGroup, groupUsers, isFirm, firmId, caseUuid, userId) => {
    try {
        if (caseUuid) {
            if (((isGroup === true && groupUsers.length > 0) || (isFirm && firmId)) && userId) {
                const data = await CaseNamesQueries.getCasesIdForGroup(caseUuid)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const getResponse = await CaseDashboardQueries.getCaseResponsesForGroup(caseId)
                    if (getResponse.length > 0) {
                        const dashboardData = {};
                        getResponse.forEach((response) => {
                            const tableName = response["caseMappingDetails.caseDashboardInfo.tableName"];
                            const graphData = JSON.parse(response["caseMappingDetails.response"]);
                            dashboardData[tableName] = graphData;
                        });
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                caseName: getResponse[0].caseName,
                                caseUuid: getResponse[0].caseUuid,
                                dashboardData
                            }
                        };
                    } else {
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            }
            else {
                const data = await CaseDashboardQueries.getCasesId(caseUuid, userId)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const getResponse = await CaseDashboardQueries.getCaseResponses(caseId, userId)
                    if (getResponse.length > 0) {
                        const dashboardData = {};
                        getResponse.forEach((response) => {
                            const tableName = response["caseMappingDetails.caseDashboardInfo.tableName"];
                            const graphData = JSON.parse(response["caseMappingDetails.response"]);
                            dashboardData[tableName] = graphData;
                        });
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                caseName: getResponse[0].caseName,
                                caseUuid: getResponse[0].caseUuid,
                                dashboardData
                            }
                        };
                    } else {
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            }
        }
    } catch (error) {
        console.log("Error in view a case dashboard response:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.getPendingDashboardDataUpdate = async () => {
    try {
        const data = await CaseDashboardQueries.getPendingDataUpdate();
        if (data.length > 0) {
            const results = [];
            for (const element of data) {
                if (await CaseDashboardQueries.getPendingDashboardData(element.userId)) {
                    console.log("Queue Details For Kolabrya Dashboard For Update", { "UserId": element.userId, "CaseUuid": element.caseUuid });
                } else {
                    const result = await CaseDashboardServices.combineCaseDashboardDataUpdate(element.id, element.userId)
                    results.push(result);
                }
            }
            console.log("***************************************************************");
            console.log("Job Completed For Combinining Kolabrya Dashboard Data On Update");
            console.log("***************************************************************");
            Logger.data.OpenAI({ request: results, methodName: "getPendingdashboard" }, "Sending-CasedashBoard-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("************************************************************");
            console.log("No Record Found For Combinining Kolabrya Dashboard On Update");
            console.log("************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("error while running job for Combinining Kolabrya Dashboard", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.combineCaseDashboardDataUpdate = async (caseId, userId) => {
    try {
        const data = await CaseDashboardQueries.getGaseDashboardMap();
        if (data.length > 0) {
            const all = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const list = JSON.parse(element.combineAccordian);
                for (let listIndex = 0; listIndex < list.length; listIndex++) {
                    const record = list[listIndex];
                    const getIds = await CaseDashboardQueries.getIntakeQueriesIds(record);
                    const combinedQueryResponses = [];
                    for (let queryIndex = 0; queryIndex < getIds.length; queryIndex++) {
                        const queryId = getIds[queryIndex];
                        const combiningData = await CaseDashboardQueries.findQueryByQueryIdOnUpdate(queryId.id, caseId, userId);
                        if (combiningData != null && combiningData.response != null) {
                            const getQuery = await CaseDashboardQueries.findQueryOnly(queryId.id);
                            const sentence = "Question: "+ getQuery.prompt +" Answer: "+combiningData.response                            
                            // const sentence = " Answer: "+combiningData.response    
                            combinedQueryResponses.push(sentence);
                            // combinedQueryResponses.push(combiningData.response);
                        }
                    }
                    if (combinedQueryResponses.length > 0) {
                        const existingIndex = all.findIndex(item => item.mapId === element.id);
                        if (existingIndex !== -1) {
                            all[existingIndex].request += `, ${combinedQueryResponses.join(', ')}`;
                        } else {
                            all.push({
                                caseId: caseId,
                                userId: userId,
                                mapId: element.id,
                                tablePrompt: element.tablePrompt,  // Join the responses for this set
                                isReady: true
                            });
                        }
                    }
                }
            }
            if (all.length > 0) {
                const list = await CaseDashboardServices.reverseFunction(all, caseId, userId)
                return {
                    message: Strings.RECORD_UPDATE_SUCCESS,
                    statusCode: 200,
                    obj: list.obj
                };
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                };
            }
        }
    } catch (error) {
        console.log("Error in Combine Case Dashboard Data", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseDashboardServices.reverseFunction = async (all, caseId, userId) => {
    try {
        if (all.length > 0) {
            const finalizedData = []
            await CaseDashboardQueries.updateCaseById({ isProcessed: false }, caseId, userId)
            for (const element of all) {
                const combinedQueryResponsesAll = []
                const record = {
                    isReady: false,
                    status: false
                }
                const getMap = await CaseDashboardQueries.getMap(element.mapId)
                const accrdData = JSON.parse(getMap[0].combineAccordian)
                for (let index = 0; index < accrdData.length; index++) {
                    const id = accrdData[index];
                    const getIds = await CaseDashboardQueries.getIntakeQueriesIds(id);
                    for (let queryIndex = 0; queryIndex < getIds.length; queryIndex++) {
                        const queryId = getIds[queryIndex];
                        const combiningData = await CaseDashboardQueries.findQueryByQuery(queryId.id, caseId, userId);
                        if (combiningData != null && combiningData.response != null) {
                            const getQuery = await CaseDashboardQueries.findQueryOnly(queryId.id);
                            const sentence = "Question: "+ getQuery.prompt +" Answer: "+combiningData.response                            
                            // const sentence = " Answer: "+combiningData.response    
                            combinedQueryResponsesAll.push(sentence);
                        }
                    }
                }
                const obj = {
                    caseId: caseId,
                    userId: userId,
                    mapId: element.mapId,
                    request: element.tablePrompt + ' ' + combinedQueryResponsesAll.join(', '),  // Join the responses for this set
                    isReady: true
                }
                finalizedData.push(obj);
                await CaseDashboardQueries.addCaseDashboardOnUpdate(record, element.mapId, element.caseId, element.userId)
                await CaseDashboardQueries.addCaseDashboard(obj);
                await CaseDashboardQueries.disableIntakeAnswers({ status: false }, element.caseId, element.userId)
            }
            return {
                message: Strings.RECORD_UPDATE_SUCCESS,
                statusCode: 200,
                obj: finalizedData
            };
        }
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: []
        };
    } catch (error) {
        console.log("Error in reverseFunction", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }

}

CaseDashboardServices.runFailedDashboardData = async () => {
    try {
        const data = await CaseDashboardQueries.startFailedDashboard();
        if (data.length > 0) {
            console.log("******************************************************"); 
            console.log("Job Started For Posting Failed Kolabrya Dashboard Data");
            console.log("******************************************************");
            const results = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const count = await CaseDashboardQueries.pendingDataQueueCount(element.caseId, element.userId)
                if (count.length && count[0].count > 0) {
                    console.log("Data Is Still In Queue To Process Not Failed Data For Kolabrya Dashboard Data", { "requestUuid": element.requestUuid, "caseId": element.caseId, "UserId": element.userId, });
                }else {
                    const result = await CaseDashboardServices.runChatGPTFailedRecords(caseDashboardAssistant, element)
                    results.push(result);
                }
            }
            console.log("********************************************************");
            console.log("Job Completed For Posting Failed Kolabrya Dashboard Data");
            console.log("********************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("**************************************************");
            console.log("No Record Found For Failed Kolabrya Case Dashboard");
            console.log("**************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while start failed record of dashboard", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

// CaseDashboardServices.startThread = async (threadId, runId, requestUuid, caseId, userId) => {
//     try {
//         const validateStatus = await validateThreadStatus(threadId, runId);
//         Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Retrive-Run-Case-Dashboard")
//         data = {
//             jsonResponse: JSON.stringify(validateStatus)
//         }
//         await CaseDashboardQueries.updateThreadById(data, runId);
//         if (!validateStatus.error) {
//             const getCompleteStatus = validateStatus.status == 'completed';
//             const getInProgressStatus = validateStatus.status == 'in_progress';
//             const getFailedStatus = validateStatus.status == 'failed';
//             const getExpiredStatus = validateStatus.status == 'expired';
//             const getQueuedStatus = validateStatus.status == 'queued';

//             console.log("");
//             console.log("===== Kolabrya Case Dashboard ======");
//             console.log("getCompleteStatus            *", getCompleteStatus);
//             console.log("getInProgressStatus         **", getInProgressStatus);
//             console.log("getFailedStatus            ***", getFailedStatus);
//             console.log("getExpiredStatus          ****", getExpiredStatus);
//             console.log("getQueuedStatus          *****", getQueuedStatus);
//             console.log("");

//             if (getCompleteStatus) {
//                 const getanswer = await getAssistantResponse(threadId);
//                 obj = {
//                     message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
//                     status: 1,
//                     messageId: getanswer?.data[0]?.id,
//                     response: getanswer?.data[0]?.content[0]?.text?.value || {},
//                     updatedAt: currentDate
//                 }
//                 Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Kolabrya-Case-Dashboard-Assistant-Open-AI")
//                 await CaseDashboardQueries.updateThreadById(obj, runId);
//                 const updateCaseAfterCompletion = await CaseDashboardQueries.checkUsage(caseId, userId);
//                 if (updateCaseAfterCompletion <= 0) {
//                     await CaseDashboardQueries.updateCaseById({ isProcessed: true }, caseId, userId)
//                 }
//                 return {
//                     message: Strings.SUCCESS,
//                     statusCode: 200,
//                     obj: {
//                         message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
//                         requestUuid: requestUuid,
//                         userId: userId,
//                         runId: runId,
//                         threadId: threadId,
//                     }
//                 }
//             }
//             else if (getInProgressStatus || getQueuedStatus) {
//                 obj = {
//                     status: 0,
//                     updatedAt: currentDate
//                 }
//                 await CaseDashboardQueries.updateThreadById(obj, runId);
//                 return {
//                     message: Strings.SUCCESS,
//                     statusCode: 200,
//                     obj: {
//                         message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
//                         status: 0,
//                         threadId: threadId
//                     }
//                 }
//             }
//             else if (getFailedStatus) {
//                 Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Failed-Kolabrya-Case-Dashboard-Assistant-Open-AI")
//                 slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Case-Dashboard-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
//                 console.log("validate run failed case kolabrya case dashboard assistant", validateStatus);
//                 console.log("check status", validateStatus.status);
//                 slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
//                 obj = {
//                     retry: true,
//                     status: 2,
//                     response: null,
//                     jsonResponse: JSON.stringify(validateStatus),
//                     updatedAt: currentDate
//                 }
//                 await CaseDashboardQueries.updateThreadById(obj, runId);
                
//                 return {
//                     message: Strings.ERROR.ERROR_RE_TRY,
//                     statusCode: 400,
//                     obj: obj
//                 }
//             }
//             else if (getExpiredStatus) {
//                 Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Expired-Kolabrya-Case-Dashboard-Assistant-Open-AI")
//                 slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Case-Dashboard-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
//                 slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
//                 obj = {
//                     retry: true,
//                     status: 2,
//                     response: null,
//                     jsonResponse: JSON.stringify(validateStatus),
//                     updatedAt: currentDate
//                 }
//                 await CaseDashboardQueries.updateThreadById(obj, runId);
//                 return {
//                     message: Strings.ERROR.ERROR_RE_TRY,
//                     statusCode: 400,
//                     obj: obj
//                 }
//             }
//             else {
//                 slack.webhook(JSON.stringify({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
//                 slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
//                 obj = {
//                     retry: true,
//                     status: 2,
//                     response: null,
//                     jsonResponse: JSON.stringify(validateStatus),
//                     updatedAt: currentDate
//                 }
//                 await CaseDashboardQueries.updateThreadById(obj, runId);
//                 return {
//                     message: Strings.ERROR.ERROR_RE_TRY,
//                     statusCode: 400,
//                     obj: obj
//                 }
//             }
//         } else {
//             console.log("validate run error kolabrya case dashboard assistant", validateStatus?.error);
//             slack.webhook(JSON.stringify({ action: "Validate run error kolabrya case dashboard assistant", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
//             slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus?.error}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
//             obj = {
//                 retry: true,
//                 status: 2,
//                 response: null,
//                 jsonResponse: JSON.stringify(validateStatus?.error),
//                 updatedAt: currentDate
//             }
//             await CaseDashboardQueries.updateThreadById(obj, runId);
//             return {
//                 message: Strings.ERROR.ERROR_RE_TRY,
//                 statusCode: 400,
//                 obj: obj
//             }
//         }
//     } catch (error) {
//         slack.webhook(JSON.stringify({ action: "In Catch for validate run error kolabrya case dashboard assistant", error: error.message }));
//         return {
//             message: Strings.ERROR.SOME_THING_WENT_WRONG,
//             statusCode: 400,
//             obj: {
//                 error: error.message
//             }
//         }
//     }
// }

CaseDashboardServices.runChatGPTFailedRecords = async (assistantId, allPendingReports) => {
    try {        
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        payload.messages[0].content = allPendingReports.request;
        const getPayload = payload?.messages[0];
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for Kolabrya Dashboard", userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, retryCount: allPendingReports.retryCount }));
        const getThreadId = await CaseDashboardServices.createOrFindThread(allPendingReports.userId);
        if (getThreadId.statusCode == '200') {
            const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-CasedashBoard-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "runThreads" }, "Run-Thread-CasedashBoard-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "threadStep" }, "Thread-Step-CasedashBoard-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0,
                        isProcessed: true,
                        retryCount: allPendingReports.retryCount + 1, //upating retry
                    }                    
                    const getId = await CaseDashboardQueries.updateOnError(data, allPendingReports.requestUuid, allPendingReports.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for retry dashboard", response: threadStep, requestUuid: allPendingReports.requestUuid, userId: allPendingReports.userId }));
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            message: threadStep?.error?.message,
                            type: threadStep?.error?.type,
                            param: threadStep?.error?.param,
                            code: threadStep?.error?.code
                        }
                    }
                }
            } else {
                slack.webhook(JSON.stringify({ action: "retry addMessage for dashboard", response: addMessage, requestUuid: allPendingReports.requestUuid, userId: allPendingReports.userId }));
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        message: addMessage?.error?.message,
                        type: addMessage?.error?.type,
                        param: addMessage?.error?.param,
                        code: addMessage?.error?.code
                    }
                }
            }
        } else {
            slack.webhook(JSON.stringify({ action: "retry getThreadId", response: getThreadId , requestUuid: allPendingReports.requestUuid, userId: allPendingReports.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for retry runChatGPT dashboard", error: error.message }));
        console.log("In Catch for retry runChatGPT dashboard", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDashboardServices.viewReportData = async (isGroup, groupUsers, isFirm, firmId, caseUuid, userId) => {
    try {
        if (caseUuid) {
            if (((isGroup === true && groupUsers.length > 0) || (isFirm && firmId)) && userId) {
                const data = await CaseNamesQueries.getCasesIdForGroup(caseUuid)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const record = await UserQueries.getPromptByType(30);
                    if (record.length > 0) {
                        const types = JSON.parse(record[0].prompt);
                        const dashboardData = {};
                        let caseName, caseUuid;
                        for (const element of types) {
                            const getResponse = await CaseDashboardQueries.getCaseResponsesForGroupWithType(caseId, element)
                            if (getResponse.length > 0) {
                                getResponse.forEach((response) => {
                                    caseName = getResponse[0].caseName;
                                    caseUuid = getResponse[0].caseUuid;
                                    const tableName = response["caseMappingDetails.caseDashboardInfo.tableName"];
                                    const graphData = JSON.parse(response["caseMappingDetails.response"]);
                                    dashboardData[tableName] = {
                                        graphName: response["caseMappingDetails.caseDashboardInfo.graphName"],
                                        graphData,
                                    };
                                });
                            }
                        }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                caseName: caseName,
                                caseUuid: caseUuid,
                                dashboardData
                            }
                        };
                    } else {
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            }
            else {
                const data = await CaseDashboardQueries.getCasesId(caseUuid, userId)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const record = await UserQueries.getPromptByType(30);
                    //add the logic of pending
                    if (record.length > 0) {
                        const types = JSON.parse(record[0].prompt);
                        const dashboardData = {};
                        let caseName, caseUuid;
                        for (const element of types) {
                            const getResponse = await CaseDashboardQueries.getCaseResponsesByType(caseId, element, userId)
                            if (getResponse.length > 0) {
                                getResponse.forEach((response) => {
                                    caseName = getResponse[0].caseName;
                                    caseUuid = getResponse[0].caseUuid;
                                    const tableName = response["caseMappingDetails.caseDashboardInfo.tableName"];
                                    const graphData = JSON.parse(response["caseMappingDetails.response"]);
                                    dashboardData[tableName] = {
                                        graphName: response["caseMappingDetails.caseDashboardInfo.graphName"],
                                        graphData,
                                    };
                                });
                            }
                        }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                caseName: caseName,
                                caseUuid: caseUuid,
                                dashboardData
                            }
                        };
                    } else {
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            }
        }
    } catch (error) {
        console.log("Error in view a case dashboard response:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = CaseDashboardServices;