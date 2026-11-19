const TextFormatterServices = {};
const {
    AssistantThreadsQueries
} = require('../queries');
const { Strings, Logger } = require('../../utils')
require('./chatGpt.services');
const currentDate = new Date();
const { v4: uuidv4 } = require('uuid');
const textFormatterAssitant = process.env.KOLABRYA_TEXT_FORMATTER_ASSISTANT;
const {
    makeThreads,
    runThreads,
    getAssistantResponse,
    makeMessage,
    validateThreadStatus,
} = require('../external/ChatGPT')
const { slack } = require('../../utils/Webhook');
const retryLimit = process.env.API_CALL_LIMITS;

TextFormatterServices.postTextFormatter = async (text, userId) => {
    try {
        if (text) {
            const generatedUuid = uuidv4();
            const data = {
                assistantId: textFormatterAssitant,
                threadId: null,
                runId: null,
                caseId: null,
                status: false,
                question: text,
                userQuery: null,
                userId: userId,
                kolabryaAssistant: 24,
                requestUuid: generatedUuid,
            }
            await AssistantThreadsQueries.createThread(data);
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                    textFormatterUuid: generatedUuid
                }
            };
        }
        else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in generating a text formatter", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

TextFormatterServices.TextFormatterFailedRequestes = async () => {
    try {
        const data = await AssistantThreadsQueries.getFailedTextFormatter();
        if (data.length > 0) {
            console.log("*************************************");
            console.log("Job Started For Failed Text-Formatter");
            console.log("*************************************");
            const results = [];
            for (const element of data) {
                const findUsage = await AssistantThreadsQueries.checkUsage(element.userId);
                console.log("=======================================");
                console.log("Text-Formatter Usage", findUsage);
                console.log("=======================================");
                if (findUsage > 0) {
                    console.log("Failed Queue Details TextFormatter", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else if (findUsage == 0) {
                    console.log({ "UserId": element.userId, "requestUuid": element.requestUuid, "Usage": findUsage, "retryCount": element.retryCount});
                    const result = await TextFormatterServices.runFailedRequest(textFormatterAssitant, element)
                    results.push(result);
                }
            }
            console.log("***************************************");
            console.log("Job Completed For Failed Text-Formatter");
            console.log("***************************************");
            Logger.data.OpenAI({ request: results, methodName: "Text-FormatterFailedReport" }, "Sending-Report-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("*****************************************");
            console.log("No Record Found For Failed Text-Formatter");
            console.log("*****************************************");
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

TextFormatterServices.runFailedRequest = async (assistantId, allPendingReports) => {
    try {
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        payload.messages[0].content = allPendingReports.question;
        const getPayload = payload?.messages[0];
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for TextFormatter", userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, retryCount: allPendingReports.retryCount}));
        const getThreadId = await TextFormatterServices.createOrFindThread(allPendingReports.userId);
        if (getThreadId.statusCode == '200') {
            const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-Text-Formatter-Failed-Report-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "runThreads" }, "Run-Thread-Text-Formatter-Failed-Report-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, requestUuid: allPendingReports.requestUuid, methodName: "threadStep" }, "Thread-Step-Text-Formatter-Failed-Report-Open-AI");
                console.log("threadStep", threadStep.status);
                // console.log("threadStep", threadStep);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: false, //waiting to run the next job
                        retryCount: allPendingReports.retryCount + 1, //upating retry 
                    }
                    await AssistantThreadsQueries.updateFailed(data, allPendingReports.requestUuid, allPendingReports.userId);    
                    return {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        statusCode: 200,
                        obj: data
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for retry TextFormatter", response: threadStep, reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for retry TextFormatter", response: addMessage, reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
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
            slack.webhook(JSON.stringify({ action: "retry TextFormatter getThreadId", response: getThreadId, reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        slack.webhook(JSON.stringify({action: "retry TextFormatter In Catch", error: error.message}));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

TextFormatterServices.getPendingTextFormatter = async () => {
    try {
        const data = await AssistantThreadsQueries.getPendingTextFormatter();
        if (data.length > 0) {
            console.log("*************************************");
            console.log("Job Started For Pending Text-Formatter");
            console.log("*************************************");
            const results = [];
            for (const element of data) {
                if (await AssistantThreadsQueries.getPendingRecordsByUserId(element.userId)) {
                    console.log("Queue Details Text Formatter", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else {
                    const result = await TextFormatterServices.runChatGPT(element.assistantId, element)
                    results.push(result);
                }
            }
            console.log("****************************************");
            console.log("Job Completed For Pending Text-Formatter");
            console.log("****************************************");
            Logger.data.OpenAI({ request: results, methodName: "getPendingTextFormatter" }, "Sending-TextFormatter-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("******************************************");
            console.log("No Record Found For Pending Text-Formatter");
            console.log("******************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("error", error);

        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

TextFormatterServices.runChatGPT = async (assistantId, details) => {
    try {
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        payload.messages[0].content = details.question;
        const getPayload = payload?.messages[0];
        const getThreadId = await TextFormatterServices.createOrFindThread(details.userId);
        if (getThreadId.statusCode == '200') {
            const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-TextFormatter-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: details.userId, requestUuid: details.requestUuid, methodName: "runThreads" }, "Run-Thread-TextFormatter-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-TextFormatter-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: false, //waiting to run the next job
                    }

                    const getId = await AssistantThreadsQueries.updateAssistantThreads(data, details.requestUuid, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for TextFormatter", response: threadStep, reWriteUuid: details.requestUuid, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for TextFormatter", response: addMessage, reWriteUuid: details.requestUuid, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "getThreadId for Text Formatter", response: getThreadId, reWriteUuid: details.requestUuid, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for Text Formatter", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

TextFormatterServices.createOrFindThread = async (userId) => {
    try {
        const findThreadId = await AssistantThreadsQueries.findThreadIdTextFormatter(userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db for TextFormatter =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-DB-TextFormatter-Assistant");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-DB-Error-TextFormatter-Assistant");
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
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreads TextFormatter" }, "Create-Thread-Open-AI-TextFormatter-Assistant");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreads  TextFormatter" }, "Create-Thread-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "makeThreads for TextFormatter", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads
                }
            }
        }
    } catch (error) {
        console.error('An error occurred while Create Or Find Thread for TextFormatter', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

TextFormatterServices.startPendingTextFormatter = async () => {
    try {
        const data = await AssistantThreadsQueries.startPendingTextFormatter();
        if (data.length > 0) {
            console.log("*****************************");
            console.log("Job Started For Text-Formatter");
            console.log("*****************************");
            const results = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const result = await TextFormatterServices.startThread(element.threadId, element.runId, element.requestUuid, element.userId)
                results.push(result);
            }
            console.log("********************************");
            console.log("Job Completed For Text-Formatter");
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
            console.log("No Record Found For Text-Formatter");
            console.log("**********************************");
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

TextFormatterServices.startThread = async (threadId, runId, requestUuid, userId) => {
    try {
        const validateStatus = await validateThreadStatus(threadId, runId);
        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Retrive-Run-Text-Formatter")
        data = {
            jsonResponse: JSON.stringify(validateStatus)
        }
        await AssistantThreadsQueries.updateThreadById(data, runId);
        if (!validateStatus.error) {
            const getCompleteStatus = validateStatus.status == 'completed';
            const getInProgressStatus = validateStatus.status == 'in_progress';
            const getFailedStatus = validateStatus.status == 'failed';
            const getExpiredStatus = validateStatus.status == 'expired';
            const getQueuedStatus = validateStatus.status == 'queued';

            console.log("");
            console.log("===== Text-Formatter Assistant ======");
            console.log("getCompleteStatus              *", getCompleteStatus);
            console.log("getInProgressStatus           **", getInProgressStatus);
            console.log("getFailedStatus              ***", getFailedStatus);
            console.log("getExpiredStatus            ****", getExpiredStatus);
            console.log("getQueuedStatus            *****", getQueuedStatus);
            console.log("");

            if (getCompleteStatus) {
                const getanswer = await getAssistantResponse(threadId);
                obj = {
                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                    status: true,
                    messageId: getanswer?.data[0]?.id,
                    answer: getanswer?.data[0]?.content[0]?.text?.value || {},
                    updatedAt: currentDate
                }
                Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-TextFormatter-Assistant-Open-AI")
                await AssistantThreadsQueries.updateThreadById(obj, runId);
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
                    status: false,
                    updatedAt: currentDate
                }
                await AssistantThreadsQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        status: false,
                        threadId: threadId
                    }
                }
            }
            else if (getFailedStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Failed-TextFormatter-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-TextFormatter-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                console.log("validate run failed case TextFormatter assistant", validateStatus);
                console.log("check status", validateStatus.status);
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    answer: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await AssistantThreadsQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else if (getExpiredStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Expired-TextFormatter-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-TextFormatter-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    answer: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await AssistantThreadsQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else {
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    answer: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await AssistantThreadsQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
        } else {
            console.log("validate run error TextFormatter assistant", validateStatus?.error);
            slack.webhook(JSON.stringify({ action: "validate run error TextFormatter assistant", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            slack.webhook(JSON.stringify({ action: "We are getting " + JSON.stringify(validateStatus?.error) + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            obj = {
                retry: true,
                status: 2,
                answer: null,
                jsonResponse: JSON.stringify(validateStatus?.error),
                updatedAt: currentDate
            }
            await AssistantThreadsQueries.updateThreadById(obj, runId);
            return {
                message: Strings.ERROR.ERROR_RE_TRY,
                statusCode: 400,
                obj: obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In catch validate run error TextFormatter assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

TextFormatterServices.getAllReport = async (requestUuid, userId) => {
    try {
        const data = await AssistantThreadsQueries.getTextFormatterData(requestUuid, userId);
        if (data.length > 0) {
            if (data[0].status == 0) {
                const obj = {
                    message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                    status: 0
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: obj
                };
            }else {
                const response = await AssistantThreadsQueries.getTextFormatterAllData(userId);
                if (response.length > 0) {
                    const allData = [];
                    for (let index = 0; index < response.length; index++) {
                        const element = response[index];
                        // if (element.status == '0') {
                        //     allData.push(
                        //         {
                        //             message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        //             status: 0,
                        //         }
                        //     )
                        // }
                        // else 
                        
                        if (element.status == '1') {
                            const report = {
                                question: element.question,
                                answer: element.answer,
                                status: 1,
                                requestUuid: element.requestUuid,
                            };
                            allData.push(report);
                        }
                        else {
                            if (element.retryCount < retryLimit) {
                                allData.push(
                                    {
                                        message: Strings.ERROR.ERROR_RE_TRY_FROM_BACKGROUND_JOB+"text formatter",
                                        status: 2,
                                        retry: true,
                                        requestUuid: element.requestUuid
                                    }
                                )
                            } else {
                                allData.push(
                                    {
                                        message: Strings.ERROR.ERROR_RE_TRY_COUNT_FINISHED_v2,
                                        status: 2,
                                        retry: false,
                                        requestUuid: element.requestUuid
                                    }
                                )
                            }
                        }
                    }
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: allData
                    };
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            }           
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while getting bulk data for text formatter", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

TextFormatterServices.getAllTextFormatter = async (userId) => {
    try {
        const response = await AssistantThreadsQueries.getTextFormatterDataPageLoad(userId);
        if (response.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: response
            };
        } else {
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

TextFormatterServices.deleteAllTextFormatter = async (userId) => {
    try {
        const data = {
            status: 3,
            updatedAt: currentDate
        }
        const record = await AssistantThreadsQueries.deleteTextFormatter(data, userId);        
        if (record[0] == '1') {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ASSISTANT.ASSISTANT_CLEAR_THREAD
                }
            };
        } else {
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

module.exports = TextFormatterServices;