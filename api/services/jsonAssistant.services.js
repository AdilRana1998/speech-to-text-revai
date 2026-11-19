const JsonAssistantServices = {};
const {
    JsonAssistantQueries,
    CaseInterviewQueries,
    RoomQueries,
    CaseDocAssistantQueries
} = require('../queries');
const {
    runThreads,
    getAssistantResponse,
    makeMessage,
    validateThreadStatus,
    makeThreads
} = require('../external/ChatGPT')
const {
    responseCleaningForAnalysis
} = require('../services/chatGpt.services')
const { Strings, Logger } = require('../../utils')
const { slack } = require('../../utils/Webhook');
const kolabryaJsonAssistant = process.env.KOLABRYA_JSON_ASSISTANT;
const currentDate = new Date();
const { updateFrontend } = require('../external/index')

JsonAssistantServices.generateJson = async (request, requestId, userId) => {
    try {
        const list = {
            request: JSON.stringify(request),
            requestId: requestId,
            userId: userId
        }
        const add = await JsonAssistantQueries.add(list)
        if (add.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                    requestUuid: add[0]
                }
            };
        } else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                    error: record
                }
            }
        }
    } catch (error) {
        console.log("Error in Inserting Json Data for Assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}


JsonAssistantServices.startJsonGeneration = async () => {
    try {
        const data = await JsonAssistantQueries.getPendingJsonData();
        if (data.length > 0) {
            console.log("**************************************");
            console.log("Job Started For Pending Json Assistant");
            console.log("**************************************");
            const results = [];
            for (const element of data) {
                if (await JsonAssistantQueries.getPendingJsonByUserId(element.userId, element.requestUuid)) {
                    console.log("Queue Details Json Assistant", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else {
                    const assistantId = kolabryaJsonAssistant
                    const result = await JsonAssistantServices.runChatGPT(assistantId, element)
                    results.push(result);
                }
            }
            console.log("****************************************");
            console.log("Job Completed For Pending Json Assistant");
            console.log("****************************************");
            Logger.data.OpenAI({ request: results, methodName: "startJsonAssistant" }, "Sending-Json-Assistant-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("******************************************");
            console.log("No Record Found For Pending Json Assistant");
            console.log("******************************************");
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

JsonAssistantServices.runChatGPT = async (assistantId, details) => {
    try {
        const getThreadId = await JsonAssistantServices.createOrFindThread(details.roomId, details.userId);
        const getPayload = ""
        Logger.data.OpenAI({ request: getPayload, response: getThreadId, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "createOrFindThread" }, "Add-Content-In-Thread-For-Kolabrya-Analysis");
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
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: details.userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Kolabrya-Analysis");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Kolabrya-Analysis-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0
                    }
                    const getId = await JsonAssistantQueries.update(data, details.requestUuid, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for Json Assistant", response: threadStep, requestUuid: details.requestUuid, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for Json Assistant", response: addMessage, requestUuid: details.requestUuid, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "getThreadId for Json Assistant", response: getThreadId, requestUuid: details.requestUuid, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }
    } catch (error) {
        console.log("error while run chatgpt", error);
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT for Json Assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

JsonAssistantServices.createOrFindThread = async (roomId, userId) => {
    try {
        // enable it when you want to use thread memory
        const findThreadId = await JsonAssistantQueries.findThreadId(roomId, userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Json-Assistant");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Json-Assistant-Error");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: data
                }
            }
        } else {
            const threads = await makeThreads();
            if (threads.id && threads.id != '') {
                console.log("******************************************************************************");
                console.log("Creating a New thread_id for Json Assistant =>", threads.id);
                console.log("******************************************************************************");
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Json Assistant" }, "Create-Thread-For-Json-Assistant-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Json Assistant" }, "Create-Thread-For-Json-Assistant-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Json Assistant", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for Json Assistant.', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

JsonAssistantServices.startPendingJsonGeneration = async () => {
    try {
        const data = await JsonAssistantQueries.startPendingJson();
        if (data.length > 0) {
            console.log("******************************");
            console.log("Job Started For Json Assistant");
            console.log("******************************");
            const results = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const result = await JsonAssistantServices.startThread(element.threadId, element.runId, element.requestUuid, element.requestId, element.roomId, element.userId)
                results.push(result);
            }
            console.log("********************************");
            console.log("Job Completed For Json Assistant");
            console.log("********************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("**********************************");
            console.log("No Record Found For Json Assistant");
            console.log("**********************************");
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

JsonAssistantServices.startThread = async (threadId, runId, requestUuid, requestId, roomId, userId) => {
    try {
        const validateStatus = await validateThreadStatus(threadId, runId);
        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, requestId: requestId, roomId: roomId, userId: userId }, "Retrive-Run-Json-Analysis")
        data = {
            jsonResponse: JSON.stringify(validateStatus)
        }
        await JsonAssistantQueries.updateThreadById(data, runId);
        if (!validateStatus.error) {
            const getCompleteStatus = validateStatus.status == 'completed';
            const getInProgressStatus = validateStatus.status == 'in_progress';
            const getFailedStatus = validateStatus.status == 'failed';
            const getExpiredStatus = validateStatus.status == 'expired';
            const getQueuedStatus = validateStatus.status == 'queued';

            console.log("");
            console.log("===== Kolabrya-Json-Assistant =====");
            console.log("getCompleteStatus           *", getCompleteStatus);
            console.log("getInProgressStatus        **", getInProgressStatus);
            console.log("getFailedStatus           ***", getFailedStatus);
            console.log("getExpiredStatus         ****", getExpiredStatus);
            console.log("getQueuedStatus         *****", getQueuedStatus);
            console.log("");

            if (getCompleteStatus) {
                const getanswer = await getAssistantResponse(threadId);
                const getResponse = getanswer?.data[0]?.content[0]?.text?.value
                const record = await responseCleaningForAnalysis(getResponse, 'removeTripleHashes');
                obj = {
                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                    status: 1,
                    messageId: getanswer?.data[0]?.id,
                    response: record ? record : {},
                    updatedAt: currentDate
                }

                entries = {
                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                    status: 1,
                    response: record ? record : {},
                    updatedAt: currentDate
                }
                Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-JSON-Assistant-Open-AI")
                await JsonAssistantQueries.updateThreadById(obj, runId);
                await CaseDocAssistantQueries.updateById(entries, requestId);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                        requestUuid: requestUuid,
                        requestId: requestId,
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
                await JsonAssistantQueries.updateThreadById(obj, runId);
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
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Failed-Kolabrya-Analysis-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Json-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                console.log("validate run failed Json-Assistant", validateStatus);
                console.log("check status", validateStatus.status);
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await JsonAssistantQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else if (getExpiredStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Expired-Json-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Json-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await JsonAssistantQueries.updateThreadById(obj, runId);
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
                await JsonAssistantQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
        } else {
            console.log("validate run error Json Assistant", validateStatus?.error);
            slack.webhook(JSON.stringify({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }), "validate run error Json-Assistant");
            slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus?.error}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            obj = {
                retry: true,
                status: 2,
                response: null,
                jsonResponse: JSON.stringify(validateStatus?.error),
                updatedAt: currentDate
            }
            await JsonAssistantQueries.updateThreadById(obj, runId);
            return {
                message: Strings.ERROR.ERROR_RE_TRY,
                statusCode: 400,
                obj: obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for startThread Json assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

JsonAssistantServices.getFailedJsonRecords = async () => {
    try {
        const data = await JsonAssistantQueries.getFailedJson();
        if (data.length > 0) {
            console.log("***********************************************");
            console.log("Job Started For Failed Record of Json Assistant");
            console.log("***********************************************");
            const results = [];
            for (const element of data) {
                const findUsage = await JsonAssistantQueries.checkUsage(element.userId);
                console.log("=========================");
                console.log("Json Assistant Usage", findUsage);
                console.log("=========================");
                if (await JsonAssistantQueries.getPendingJsonByUserId(element.userId, element.requestUuid) && findUsage > 0) {
                    console.log("Json Assistant Queue Details", { "UserId": element.userId, "requestUuid": element.requestUuid });
                }
                else if (findUsage == 0) {
                    const assistantId = kolabryaJsonAssistant
                    const result = await JsonAssistantServices.runFailedRequest(assistantId, element)
                    results.push(result);
                }
            }
            console.log("*************************************************");
            console.log("Job Completed For Failed Record of Json Assistant");
            console.log("*************************************************");
            Logger.data.OpenAI({ request: results, methodName: "getFailedRecords" }, "Sending-Json-Assistant-Failed-Records-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("***************************************************");
            console.log("No Record Found For Failed Record of Json Assistant");
            console.log("***************************************************");
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

JsonAssistantServices.runFailedRequest = async (assistantId, details) => {
    try {
        const getPayload = ""
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for JSON Assistant", userId: details.userId, requestUuid: details.requestUuid, retryCount: details.retryCount }));
        const getThreadId = await JsonAssistantServices.createOrFindThread(details.requestId, details.userId);
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
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, requestId: details.requestId, userId: details.userId, requestUuid: details.requestUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-Json-Assistant-Failed-Record-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, requestId: details.requestId, userId: details.userId, requestUuid: details.requestUuid, methodName: "runThreads" }, "Run-Thread-Json-Assistant-Failed-Record-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, requestId: details.requestId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Json-Assistant-Failed-Record-Open-AI");
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
                    const getId = await JsonAssistantQueries.updateFailed(data, details.requestUuid, details.requestId, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "Thread Step for Json Assistant", response: threadStep, requestUuid: details.requestUuid, requestId: details.requestId, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "Add Message for Json Assistant", response: addMessage, requestUuid: details.requestUuid, requestId: details.requestId, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "Json Assistant getThreadId", response: getThreadId, requestUuid: details.requestUuid, requestId: details.requestId, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for Json Assistant", error: error.message, requestUuid: details.requestUuid, requestId: details.requestId, userId: details.userId }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = JsonAssistantServices;