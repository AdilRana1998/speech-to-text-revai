const CaseDocAssistantServices = {};
const {
    JsonAssistantQueries,
    CaseDocAssistantQueries,
    UserQueries,
    CaseReportGeneratorQueries,
    CaseFilesQueries
} = require('../queries');
const {
    runThreads,
    getAssistantResponse,
    makeMessage,
    validateThreadStatus,
    makeThreadsForReport,
    retrieveThread
} = require('../external/ChatGPT')
const {
    responseCleaningForAnalysis,
} = require('./chatGpt.services')
const {
    isValidJSON,
} = require('./rooms.services')
const { Strings, Logger } = require('../../utils')
const { slack } = require('../../utils/Webhook');
const retryLimit = process.env.API_CALL_LIMITS;
const kolabryaDocAssistant = process.env.KOLABRYA_DOCUMENT_ASSISTANT;
const currentDate = new Date();

CaseDocAssistantServices.getFiles = async () => {
    try {
        const data = await CaseDocAssistantQueries.getPendingFileData()
        if (data.length > 0) {
            const promptOne = await UserQueries.getPromptByType(37);
            if (promptOne.length > 0) {
                const typeOne = JSON.parse(promptOne[0].prompt);
                console.log("*********************************************");
                console.log("Job Started For Getting File Names For Prompt");
                console.log("*********************************************");
                for (const element of data) {
                    const fileName = element.fileName
                    const record = {
                        caseId: element.caseId,
                        fileId: element.id,
                        userId: element.userId,
                        request: typeOne[0] + fileName + " " + typeOne[1],
                    }
                    const add = await CaseDocAssistantQueries.add(record);
                    if (add) {
                        await CaseFilesQueries.updateData({ isDocProcessed: true }, element.fileUuid)
                    }
                    else {
                        console.log("Failed to insert");
                    }
                }
                console.log("*******************************************");
                console.log("Job Ended For Getting File Names For Prompt");
                console.log("*******************************************");
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: data
                }
            }
            else {
                console.log("No Prompt Found for document assistant");
                return {
                    message: Strings.PROMPT.NO_PROMPT_FOUND,
                    statusCode: 200,
                    obj: {}
                }
            }
        } else {
            console.log("*************************************************");
            console.log("No Record Found For Getting File Names For Prompt");
            console.log("*************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get Files for Doc Assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDocAssistantServices.startKolabryaDocAnalysis = async () => {
    try {
        const data = await CaseDocAssistantQueries.getPendingData();
        if (data.length > 0) {
            console.log("*****************************************");
            console.log("Job Started For Pending Kolabrya Case Doc");
            console.log("*****************************************");
            const results = [];
            for (const element of data) {
                if (await CaseDocAssistantQueries.getPendingReportsByUserId(element.userId, element.requestUuid)) {
                    console.log("Queue Details Kolabrya Case Doc", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else {
                    const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const assistantId = kolabryaDocAssistant
                        const result = await CaseDocAssistantServices.runChatGPT(assistantId, element, checkCaseFileAvaiablity[0])
                        results.push(result);
                    }
                    else {
                        console.log("***********************************");
                        console.log("Waiting for Vector Store to Upload");
                        console.log("***********************************");
                    }
                }
            }
            console.log("*******************************************");
            console.log("Job Completed For Pending Kolabrya Case Doc");
            console.log("*******************************************");
            Logger.data.OpenAI({ request: results, methodName: "startKolabryaDocAnalysis" }, "Sending-Kolabrya-Doc-Analysis-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("*********************************************");
            console.log("No Record Found For Pending Kolabrya Case Doc");
            console.log("*********************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
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

CaseDocAssistantServices.runChatGPT = async (assistantId, details, vectorId) => {
    try {
        const getPayload = {
            tool_resources: {
                "file_search": {
                    "vector_store_ids": [vectorId]
                }
            }
        }
        const getThreadId = await CaseDocAssistantServices.createOrFindThread(getPayload, details.caseId, vectorId, details.userId);
        Logger.data.OpenAI({ request: getPayload, response: getThreadId, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "createOrFindThread" }, "Add-Content-In-Thread-For-Kolabrya-Doc-Analysis");
        if (getThreadId.statusCode == '200') {
            const prompts = {
                role: "user",
                content: [
                    {
                        "type": "text",
                        "text": details.request
                    }
                ]
            };
            const addMessage = await makeMessage(prompts, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: details.userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Kolabrya-Doc-Analysis");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Kolabrya-Doc-Analysis-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0
                    }
                    const getId = await CaseDocAssistantQueries.update(data, details.requestUuid, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for Kolabrya Doc Analysis", response: threadStep, requestUuid: details.requestUuid, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for Kolabrya Doc Analysis", response: addMessage, requestUuid: details.requestUuid, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "getThreadId for Kolabrya Doc Analysis", response: getThreadId, requestUuid: details.requestUuid, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        console.log("error", error);
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT for Kolabrya Doc Analysis", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDocAssistantServices.createOrFindThread = async (record, caseId, vectorId, userId) => {
    try {
        // enable it when you want to use thread memory
        const findThreadId = await CaseDocAssistantQueries.findThreadId(caseId, userId);
        const data = findThreadId?.threadId;
        let matchedThreadId = null;
        if (data != '' && data) {
            const retriveThread = await retrieveThread(data)
            // console.log("retriveThread", retriveThread);
            Logger.data.OpenAI({ request: data, response: retriveThread, vectorId: vectorId, userId: userId, methodName: "retriveThread" }, "RetriveThread-Open-AI-Kolabrya-Doc-Analysis");
            if (retriveThread.id == data) {
                const findVectorId = retriveThread?.tool_resources?.file_search?.vector_store_ids
                if (findVectorId.length > 0) {
                    for (const element of findVectorId) {
                        if (element == vectorId) {
                            console.log("**********************************************************");
                            console.log("using thread_id from db =>", data);
                            console.log("**********************************************************");
                            Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Kolabrya-Doc-Analysis");
                            matchedThreadId = data;
                            break; // exit the loop
                        }
                    }
                }
                if (matchedThreadId) {
                    return {
                        statusCode: 200,
                        message: Strings.SUCCESS,
                        obj: {
                            threadId: matchedThreadId
                        }
                    };
                } else {
                    const threads = await makeThreadsForReport(JSON.stringify(record));
                    if (threads.id && threads.id != '') {
                        console.log("*************************************************************************************");
                        console.log("Creating a New thread_id for Kolabrya Doc Analysis new =>", threads.id);
                        console.log("*************************************************************************************");
                        Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreadsForReport" }, "Create-Thread-For-Kolabrya-Doc-Analysis-Open-AI");
                        return {
                            statusCode: 200,
                            message: Strings.SUCCESS,
                            obj: {
                                threadId: threads.id
                            }
                        };
                    } else {
                        Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreadsForReport" }, "Create-Thread-For-Kolabrya-Doc-Analysis-Error-Open-AI");
                        slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Doc Analysis", response: threads, userId: userId }));
                        return {
                            statusCode: 400,
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            obj: threads.error
                        };
                    }
                }
            }
            else {
                const threads = await makeThreadsForReport(JSON.stringify(record))
                if (threads.id && threads.id != '') {
                    console.log("*************************************************************************************");
                    console.log("Creating a New thread_id for Kolabrya Doc Analysis old =>", threads.id);
                    console.log("*************************************************************************************");
                    Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreadsForReport" }, "Create-Thread-For-Kolabrya-Doc-Analysis-Open-AI");
                    return {
                        statusCode: 200,
                        message: Strings.SUCCESS,
                        obj: {
                            threadId: threads.id
                        }
                    }
                } else {
                    Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreadsForReport" }, "Create-Thread-For-Kolabrya-Doc-Analysis-Error-Open-AI");
                    slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Doc Analysis", response: threads, userId: userId }));
                    return {
                        statusCode: 400,
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        obj: threads.error
                    }
                }
            }
        }
        else {
            const threads = await makeThreadsForReport(JSON.stringify(record))
            if (threads.id && threads.id != '') {
                console.log("*****************************************************************************************");
                console.log("Creating a New thread_id for Kolabrya Doc Analysis old =>", threads.id);
                console.log("*****************************************************************************************");
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreadsForReport" }, "Create-Thread-For-Kolabrya-Doc-Analysis-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreadsForReport" }, "Create-Thread-For-Kolabrya-Doc-Analysis-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Doc Analysis", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for Kolabrya Doc Analysis.', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDocAssistantServices.runPendingDocAnalysis = async () => {
    try {
        const data = await CaseDocAssistantQueries.startPendingReports();
        if (data.length > 0) {
            console.log("*************************************");
            console.log("Job Started For Kolabrya Doc Analysis");
            console.log("*************************************");
            const results = [];
            for (const element of data) {
                const result = await CaseDocAssistantServices.startThread(element.threadId, element.runId, element.requestUuid, element.id, element.userId, element.caseId)
                results.push(result);
            }
            console.log("***************************************");
            console.log("Job Completed For Kolabrya Doc Analysis");
            console.log("***************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("*****************************************");
            console.log("No Record Found For Kolabrya Doc Analysis");
            console.log("*****************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while run Pending Doc Analysis", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDocAssistantServices.startThread = async (threadId, runId, requestUuid, id, userId, caseId) => {
    try {
        const validateStatus = await validateThreadStatus(threadId, runId);
        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Retrive-Run-Kolabrya-Doc-Analysis")
        data = {
            jsonResponse: JSON.stringify(validateStatus)
        }
        await CaseDocAssistantQueries.updateThreadById(data, runId);
        if (!validateStatus.error) {
            const getCompleteStatus = validateStatus.status == 'completed';
            const getInProgressStatus = validateStatus.status == 'in_progress';
            const getFailedStatus = validateStatus.status == 'failed';
            const getExpiredStatus = validateStatus.status == 'expired';
            const getQueuedStatus = validateStatus.status == 'queued';

            console.log("");
            console.log("===== Kolabrya-Doc-Analysis-Assistant =====");
            console.log("getCompleteStatus               *", getCompleteStatus);
            console.log("getInProgressStatus            **", getInProgressStatus);
            console.log("getFailedStatus               ***", getFailedStatus);
            console.log("getExpiredStatus             ****", getExpiredStatus);
            console.log("getQueuedStatus             *****", getQueuedStatus);
            console.log("");

            if (getCompleteStatus) {
                const getanswer = await getAssistantResponse(threadId);
                const getResponse = getanswer?.data[0]?.content[0]?.text?.value
                const record = await responseCleaningForAnalysis(getResponse, 'removeTripleHashes');
                obj = {
                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                    status: 0, //make it '1' to disable json assistant
                    messageId: getanswer?.data[0]?.id,
                    response: record ? record : {},
                    updatedAt: currentDate
                }
                Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Kolabrya-Doc-Analysis-Assistant-Open-AI")
                await CaseDocAssistantQueries.updateThreadById(obj, runId);
                //commnet the below line till line no 392 to disable json assistant
                const list = {
                    request: JSON.stringify(record),
                    requestId: id,
                    roomId: caseId,
                    userId: userId
                }
                await JsonAssistantQueries.add(list)
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                        requestUuid: requestUuid,
                        userId: userId,
                        runId: runId,
                        threadId: threadId
                    }
                }
            }
            else if (getInProgressStatus || getQueuedStatus) {
                obj = {
                    status: 0,
                    updatedAt: currentDate
                }
                await CaseDocAssistantQueries.updateThreadById(obj, runId);
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
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Failed-Kolabrya-Doc-Analysis-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Doc-Analysis-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                console.log("validate run failed Kolabrya-Analysis", validateStatus);
                console.log("check status", validateStatus.status);
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseDocAssistantQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else if (getExpiredStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Expired-Kolabrya-Doc-Analysis-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Doc-Analysis-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseDocAssistantQueries.updateThreadById(obj, runId);
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
                await CaseDocAssistantQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
        } else {
            console.log("validate run error Kolabrya Doc Analysis Assistant", validateStatus?.error);
            slack.webhook(JSON.stringify({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }), "validate run error Kolabrya-Doc-Analysis-Assistant");
            slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus?.error}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            obj = {
                retry: true,
                status: 2,
                response: null,
                jsonResponse: JSON.stringify(validateStatus?.error),
                updatedAt: currentDate
            }
            await CaseDocAssistantQueries.updateThreadById(obj, runId);
            return {
                message: Strings.ERROR.ERROR_RE_TRY,
                statusCode: 400,
                obj: obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for startThread Kolabrya Doc Analysis assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDocAssistantServices.getDocument = async (caseUuid, isFirm, firmAssistant, firmId, groupUsers, userId) => {
    try {
        if (caseUuid) {
            let data;
            if (isFirm && firmAssistant && firmId) {
                data = await CaseDocAssistantQueries.getFileOnlyStatusForFirm(caseUuid);
            } 
            else if (groupUsers?.length > 0) {
                data = await CaseDocAssistantQueries.getFileOnlyStatus(caseUuid, groupUsers);
            }
            else {
                data = await CaseDocAssistantQueries.getFileOnlyStatus(caseUuid, userId);
            }
            if (data.length > 0) {
                let i = 1;
                for (const element of data) {
                    if (element.status == '0' && element.retryCount == 0) { 
                        element.message = Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE
                    }
                    else if ((element.status == '2' || element.status == '0') && element.retryCount < retryLimit) {
                        element.message = Strings.ERROR.ERROR_RE_TRY
                    }
                    else if (element.status == '2' && element.retryCount == retryLimit) {
                        element.message = Strings.ERROR.ERROR_LOGOUT
                    }
                    else if (element.status == '1' && element.retryCount <= retryLimit) {
                        element.message = Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE
                        const check = await isValidJSON(element.response)
                        if (check) {
                            element.response = JSON.parse(element.response)
                        } else {
                            element.response = element.response
                        }
                    }
                    delete element.retryCount;
                    if (element.status !== 1) {
                        delete element.userNote;
                        delete element.response;
                    }
                    if(element.status == null){
                        element.message = Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE
                        element.status = 0
                    }
                    element.id = i++
                }
                return {
                    message: Strings.SUCCESS,
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while getting all for documnet", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDocAssistantServices.getFailedRecords = async () => {
    try {
        const data = await CaseDocAssistantQueries.getFailedReports();
        if (data.length > 0) {
            console.log("******************************************************");
            console.log("Job Started For Failed Record of Kolabrya Doc Analysis");
            console.log("******************************************************");
            const results = [];
            for (const element of data) {
                const findUsage = await CaseDocAssistantQueries.checkUsage(element.userId);
                console.log("==============================");
                console.log("Kolabrya Doc Analysis Usage", findUsage);
                console.log("==============================");
                if (await CaseDocAssistantQueries.getPendingReportsByUserId(element.userId, element.requestUuid) && findUsage > 0) {
                    console.log("Kolabrya Doc Analysis Queue Details", { "UserId": element.userId, "requestUuid": element.requestUuid });
                }
                else if (findUsage == 0) {
                    const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const assistantId = kolabryaDocAssistant
                        const result = await CaseDocAssistantServices.runFailedRequest(assistantId, element, checkCaseFileAvaiablity[0])
                        results.push(result);
                    }
                    else {
                        console.log("***********************************");
                        console.log("Waiting for Vector Store to Upload");
                        console.log("***********************************");
                    }
                }
            }
            console.log("********************************************************");
            console.log("Job Completed For Failed Record of Kolabrya Doc Analysis");
            console.log("********************************************************");
            Logger.data.OpenAI({ request: results, methodName: "getFailedRecords" }, "Sending-Kolabrya-Doc-Analysis-Failed-Records-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("**********************************************************");
            console.log("No Record Found For Failed Record of Kolabrya Doc Analysis");
            console.log("**********************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
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

CaseDocAssistantServices.runFailedRequest = async (assistantId, details, vectorId) => {
    try {
        const getPayload = {
            tool_resources: {
                "file_search": {
                    "vector_store_ids": [vectorId]
                }
            }
        }
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for Kolabrya Doc Analysis", userId: details.userId, requestUuid: details.requestUuid, retryCount: details.retryCount }));
        const getThreadId = await CaseDocAssistantServices.createOrFindThread(getPayload, details.caseId, vectorId, details.userId);
        if (getThreadId.statusCode == '200') {
            const prompts = {
                role: "user",
                content: [
                    {
                        "type": "text",
                        "text": details.request
                    }
                ]
            };
            const addMessage = await makeMessage(prompts, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-Kolabrya-Doc-Analysis-Failed-Record-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: details.userId, requestUuid: details.requestUuid, methodName: "runThreads" }, "Run-Thread-Kolabrya-Doc-Analysis-Failed-Record-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Kolabrya-Doc-Analysis-Failed-Record-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        messageId: addMessage.id,
                        runId: threadStep.id,
                        status: 0, //waiting to run the next job 
                        retryCount: details.retryCount + 1, //upating retry
                    }
                    const getId = await CaseDocAssistantQueries.updateFailed(data, details.requestUuid, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "Thread Step for Kolabrya Doc Analysis", response: threadStep, requestUuid: details.requestUuid, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "Add Message for Kolabrya Doc Analysis", response: addMessage, requestUuid: details.requestUuid, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "Kolabrya Doc Analysis getThreadId", response: getThreadId, requestUuid: details.requestUuid, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for Kolabrya Doc Analysis", error: error.message, requestUuid: details.requestUuid, userId: details.userId }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseDocAssistantServices.updateUserNotes = async (userNote, requestUuid, caseUuid, userId) => {
    try {
        if (userNote && requestUuid && caseUuid) {
            const record = await CaseDocAssistantQueries.findRecord(requestUuid, caseUuid, userId)
            if (record.length > 0) {
                const obj = {
                    userNote: userNote
                }
                const data = await CaseDocAssistantQueries.updateUserNotes(obj, requestUuid, userId)
                if (data[0] == '1') {
                    return {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                        statusCode: 200,
                        obj: {}
                    };
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    };
                }
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                };
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
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

CaseDocAssistantServices.getAll = async (userId) => {
    try {
        if (userId) {
            const data = await CaseDocAssistantQueries.getAllByUserId(userId)
            if (data.length > 0) {
                return {
                    message: Strings.SUCCESS,
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
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

module.exports = CaseDocAssistantServices;