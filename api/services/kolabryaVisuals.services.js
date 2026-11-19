const KolabryaVisualsServices = {};
const {
    UserQueries,
    KolabryaVisualsQueries,
    CaseNamesQueries,
    CaseReportGeneratorQueries
} = require('../queries');
const {
    runThreads,
    getAssistantResponse,
    makeMessage,
    validateThreadStatus,
    makeThreadsForReport, 
} = require('../external/ChatGPT')
const { responseCleaning, addAccordianCaseAnswers } = require('../services/chatGpt.services')
const { findFileForCase, findDetailedFileForGroupCase } = require('../services/kolabryaAnalysis.services')
const { Strings } = require('../../utils')
const { Logger } = require('../../utils');
const { slack } = require('../../utils/Webhook');
const retryLimit = process.env.API_CALL_LIMITS;
const analysisAttachmentLimit = process.env.KOLABRYA_ANALYSIS_ATTACHMENT_LIMIT;
const kolabryaVisuals = process.env.KOLABRYA_VISUALS;
const currentDate = new Date();

KolabryaVisualsServices.generateVisuals = async (caseData, userQuery, promptType, kolabryaType, requestUuid, text, isGroup, groupId, isFirm, firmAssistant, firmId, groupUsers, userId) => {
    try {
        if (caseData || userQuery || promptType || kolabryaType || text) {
            const findFeature = await KolabryaVisualsQueries.findFeature(kolabryaType)
            if (findFeature.length > 0) {
                if (caseData.caseDetails.length <= analysisAttachmentLimit) {
                    const record = await findFileForCase(caseData, isFirm, firmAssistant, firmId, groupUsers, userId)
                    if (record.statusCode == '200' && record.obj.length > 0) {
                        let sentence, userSentence;
                        const caseId = record.obj[1];
                        const statOne = record.obj[0].map(f => f).join(", ");
                        if (kolabryaType == '4') {
                            const promptOne = await UserQueries.getPromptByType(19);
                            const promptTwo = await UserQueries.getPromptByType(35);
                            const promptThree = await UserQueries.getPromptByType(18);
                            if (promptOne.length > 0 && promptThree.length > 0 && promptTwo.length > 0) {
                                const typeOne = JSON.parse(promptOne[0].prompt);
                                const typeTwo = JSON.parse(promptTwo[0].prompt);
                                const typeThree = JSON.parse(promptThree[0].prompt);
                                let answers;
                                const caseAnswers = await addAccordianCaseAnswers(caseId, userId)                                
                                if (caseAnswers.obj.length > 0) {
                                    answers = caseAnswers.obj.join(', ');
                                }                                      
                                if (userQuery) {
                                    sentence = typeTwo[0] + statOne +" "+ userQuery+" "+ answers 
                                    userSentence = userQuery
                                } else {
                                    sentence = typeTwo[0] + statOne +" "+ answers +" "+ typeOne[promptType]
                                    userSentence = typeThree[promptType].key
                                }
                            }
                            else {
                                return {
                                    message: Strings.PROMPT.NO_PROMPT_FOUND,
                                    statusCode: 400,
                                    obj: {}
                                }
                            }
                        }
                        else {
                            return {
                                message: Strings.UNVALID_STATUS,
                                statusCode: 400,
                                obj: {}
                            }
                        }
                        const list = {
                            request: sentence,
                            userQuery: userSentence,
                            fileDetails: JSON.stringify(caseData),
                            featureType: kolabryaType,
                            caseId: caseId,
                            userId: userId
                        }
                        const add = await KolabryaVisualsQueries.add(list)
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
                    } else {
                        return record;
                    }
                } else {
                    return {
                        message: Strings.FILE.CASE_DOC_LIMIT,
                        statusCode: 400,
                        obj: {}
                    }
                }
            } else {
                return {
                    message: Strings.UNVALID_STATUS,
                    statusCode: 400,
                    obj: {}
                }
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in generate visuals", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaVisualsServices.startKolabryaVisuals = async () => {
    try {
        const data = await KolabryaVisualsQueries.getPendingData();
        if (data.length > 0) {
            console.log("****************************************");
            console.log("Job Started For Pending Kolabrya Visuals");
            console.log("****************************************");
            const results = [];
            for (const element of data) {
                if (await KolabryaVisualsQueries.getPendingReportsByUserId(element.userId, element.requestUuid)) {
                    console.log("Queue Details Kolabrya Visuals", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else {
                    const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const assistantId = kolabryaVisuals
                        const result = await KolabryaVisualsServices.runChatGPT(assistantId, element, checkCaseFileAvaiablity[0])
                        results.push(result);
                    }
                    else {
                        console.log("***********************************");
                        console.log("Waiting for Vector Store to Upload");
                        console.log("***********************************");
                    }
                }
            }
            console.log("******************************************");
            console.log("Job Completed For Pending Kolabrya Visuals");
            console.log("******************************************");
            Logger.data.OpenAI({ request: results, methodName: "startKolabryaVisuals" }, "Sending-Kolabrya-Visuals-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("********************************************");
            console.log("No Record Found For Pending Kolabrya Visuals");
            console.log("********************************************");
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

KolabryaVisualsServices.runChatGPT = async (assistantId, details, vectorId) => {
    try {
        const getPayload = {
            tool_resources: {
                "file_search": {
                    "vector_store_ids": [vectorId]
                }
            }
        }
        const getThreadId = await KolabryaVisualsServices.createOrFindThread(getPayload, details.caseId, details.userId);
        Logger.data.OpenAI({ request: getPayload, response: getThreadId, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "createOrFindThread" }, "Add-Content-In-Thread-For-Kolabrya-Visuals");
        if (getThreadId.statusCode == '200') {
            // const prompts = {
            //     role: "user",
            //     content: details.request
            // };

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
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: details.userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Kolabrya-Visuals");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Kolabrya-Visuals-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0
                    }
                    const getId = await KolabryaVisualsQueries.update(data, details.requestUuid, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for kolabrya visuals", response: threadStep, requestUuid: details.requestUuid, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for kolabrya visuals", response: addMessage, requestUuid: details.requestUuid, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "getThreadId for kolabrya visuals", response: getThreadId, requestUuid: details.requestUuid, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        console.log("error", error);
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT for kolabrya visuals", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaVisualsServices.createOrFindThread = async (record, caseId, userId) => {
    try {
        // enable it when you want to use thread memory
        const findThreadId = await KolabryaVisualsQueries.findThreadId(caseId, userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Kolabrya-Visuals");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Kolabrya-Visuals-Error");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: data
                }
            }
        } else {
            const threads = await makeThreadsForReport(JSON.stringify(record))
            if (threads.id && threads.id != '') {
                console.log("*********************************************************************************");
                console.log("Creating a New thread_id for Kolabrya Visuals =>", threads.id);
                console.log("*********************************************************************************");
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Kolabrya Visuals" }, "Create-Thread-For-Kolabrya-Visuals-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Kolabrya Visuals" }, "Create-Thread-For-Kolabrya-Visuals-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Visuals", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for Kolabrya Visuals', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaVisualsServices.startPendingVisuals = async () => {
    try {
        const data = await KolabryaVisualsQueries.startPendingReports();
        if (data.length > 0) {
            console.log("********************************");
            console.log("Job Started For Kolabrya Visuals");
            console.log("********************************");
            const results = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const result = await KolabryaVisualsServices.startThread(element.threadId, element.runId, element.requestUuid, element.userId)
                results.push(result);
            }
            console.log("**********************************");
            console.log("Job Completed For Kolabrya Visuals");
            console.log("**********************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("************************************");
            console.log("No Record Found For Kolabrya Visuals");
            console.log("************************************");
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

KolabryaVisualsServices.startThread = async (threadId, runId, requestUuid, userId) => {
    try {
        const validateStatus = await validateThreadStatus(threadId, runId);
        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Retrive-Run-Kolabrya-Visuals")
        data = {
            jsonResponse: JSON.stringify(validateStatus)
        }
        await KolabryaVisualsQueries.updateThreadById(data, runId);
        if (!validateStatus.error) {
            const getCompleteStatus = validateStatus.status == 'completed';
            const getInProgressStatus = validateStatus.status == 'in_progress';
            const getFailedStatus = validateStatus.status == 'failed';
            const getExpiredStatus = validateStatus.status == 'expired';
            const getQueuedStatus = validateStatus.status == 'queued';

            console.log("");
            console.log("===== Kolabrya-Visuals-Assistant =====");
            console.log("getCompleteStatus               *", getCompleteStatus);
            console.log("getInProgressStatus            **", getInProgressStatus);
            console.log("getFailedStatus               ***", getFailedStatus);
            console.log("getExpiredStatus             ****", getExpiredStatus);
            console.log("getQueuedStatus             *****", getQueuedStatus);
            console.log("");

            if (getCompleteStatus) {
                const getanswer = await getAssistantResponse(threadId);
                const getResponse = getanswer?.data[0]?.content[0]?.text?.value
                const record = await responseCleaning(getResponse);
                obj = {
                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                    status: 1,
                    messageId: getanswer?.data[0]?.id,
                    response: record ? record : {},
                    updatedAt: currentDate
                }
                Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Kolabrya-Visuals-Assistant-Open-AI")
                await KolabryaVisualsQueries.updateThreadById(obj, runId);
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
                await KolabryaVisualsQueries.updateThreadById(obj, runId);
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
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Failed-Kolabrya-Visuals-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Visuals-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                console.log("validate run failed Kolabrya-Visuals", validateStatus);
                console.log("check status", validateStatus.status);
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await KolabryaVisualsQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else if (getExpiredStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Expired-Kolabrya-Visuals-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Visuals-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await KolabryaVisualsQueries.updateThreadById(obj, runId);
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
                await KolabryaVisualsQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
        } else {
            console.log("validate run error Kolabrya Visuals Assistant", validateStatus?.error);
            slack.webhook(JSON.stringify({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }), "validate run error Kolabrya-Visuals-Assistant");
            slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus?.error}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            obj = {
                retry: true,
                status: 2,
                response: null,
                jsonResponse: JSON.stringify(validateStatus?.error),
                updatedAt: currentDate
            }
            await KolabryaVisualsQueries.updateThreadById(obj, runId);
            return {
                message: Strings.ERROR.ERROR_RE_TRY,
                statusCode: 400,
                obj: obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for startThread kolabrya visuals assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaVisualsServices.getVisualsById = async (requestUuid, userId) => {
    try {
        const data = await KolabryaVisualsQueries.getDataByUuid(requestUuid, userId);
        if (data.length > 0) {
            if (data[0].status == '0' && data[0].retryCount == 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        status: 0
                    }
                }
            } 
            else if ((data[0].status == '2' || data[0].status == '0') && data[0].retryCount < retryLimit) {
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: {
                        retry: true
                    }
                }
            } 
            else if (data[0].status == '2' && data[0].retryCount == retryLimit) {
                return {
                    message: Strings.ERROR.ERROR_LOGOUT,
                    statusCode: 400,
                    obj: {
                        retry: false
                    }
                }
            }
            else if (data[0].status == '1' && data[0].retryCount <= retryLimit) { 
                const dataFomatting = await KolabryaVisualsQueries.getAllData(data[0].caseId, userId);
                const getAllData = await Promise.all(dataFomatting.map(async (element) => {
                    const regex = /<table\b[^>]*>/i;
                    const result = regex.test(element.response);
                    result == true ? element.visuals = false : element.visuals = true
                    const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
                    const { caseId, id, featureType, ...rest } = element;
                    return {
                        ...rest,
                        caseDetails: element.featureType == 4 ? getCaseDetails : []
                    };
                }));
                if (getAllData.length > 0) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: getAllData
                    };
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            }
            else {
                return {
                    message: Strings.ERROR.ERROR_LOGOUT,
                    statusCode: 400,
                    obj: {
                        retry: false
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
        console.log("Error while get all for visuals by request uuid", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaVisualsServices.getVisuals = async (caseUuid, isFirm, firmId, userId) => {
    try {
        if (caseUuid) {
            const getCaseId = await CaseNamesQueries.getCasesId(caseUuid)
            if (getCaseId.length > 0) {
                let data
                if (isFirm && firmId) {
                    data = await KolabryaVisualsQueries.getAllData(getCaseId[0]?.id, userId);
                } else {
                    data = await KolabryaVisualsQueries.getAllData(getCaseId[0]?.id, userId);
                }
                if (data.length > 0) {
                    const getAllData = await Promise.all(data.map(async (element) => {
                        const regex = /<table\b[^>]*>/i;
                        const result = regex.test(element.response);
                        result == true ? element.visuals = false : element.visuals = true
                        const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
                        const { caseId, id, featureType, ...rest } = element;
                        return {
                            ...rest,
                            caseDetails: element.featureType == 4 ? getCaseDetails : []
                        };
                    }));
                    if (getAllData.length > 0) {
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: getAllData
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
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while getting all for visuals", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaVisualsServices.getFailedRecords = async () => {
    try {
        const data = await KolabryaVisualsQueries.getFailedReports();
        if (data.length > 0) {
            console.log("**************************************************");
            console.log("Job Started For Failed Record of Kolabrya Visuals");
            console.log("**************************************************");
            const results = [];
            for (const element of data) {
                const findUsage = await KolabryaVisualsQueries.checkUsage(element.userId);
                console.log("=========================");
                console.log("Kolabrya Visuals Usage", findUsage);
                console.log("=========================");
                if (await KolabryaVisualsQueries.getPendingReportsByUserId(element.userId, element.requestUuid) && findUsage > 0) {
                    console.log("Kolabrya Visuals Queue Details", { "UserId": element.userId, "requestUuid": element.requestUuid });
                }
                else if (findUsage == 0) {
                    const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const assistantId = kolabryaVisuals
                        const result = await KolabryaVisualsServices.runFailedRequest(assistantId, element, checkCaseFileAvaiablity[0])
                        results.push(result);
                    }
                    else {
                        console.log("***********************************");
                        console.log("Waiting for Vector Store to Upload");
                        console.log("***********************************");
                    }
                }
            }
            console.log("****************************************************");
            console.log("Job Completed For Failed Record of Kolabrya Visuals");
            console.log("****************************************************");
            Logger.data.OpenAI({ request: results, methodName: "getFailedRecords" }, "Sending-Kolabrya-Visuals-Failed-Records-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("******************************************************");
            console.log("No Record Found For Failed Record of Kolabrya Visuals");
            console.log("******************************************************");
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

KolabryaVisualsServices.runFailedRequest = async (assistantId, details, vectorId) => {
    try {
        const getPayload = {
            tool_resources: {
                "file_search": {
                    "vector_store_ids": [vectorId]
                }
            }
        }
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for Kolabrya Visuals", userId: details.userId, requestUuid: details.requestUuid, retryCount: details.retryCount }));
        const getThreadId = await KolabryaVisualsServices.createOrFindThread(getPayload, details.featureType, details.userId);
        if (getThreadId.statusCode == '200') {
            // const prompts = {
            //     role: "user",
            //     content: details.request
            // };
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
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-Kolabrya-Visuals-Failed-Record-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: details.userId, requestUuid: details.requestUuid, methodName: "runThreads" }, "Run-Thread-Kolabrya-Visuals-Failed-Record-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Kolabrya-Visuals-Failed-Record-Open-AI");
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
                    const getId = await KolabryaVisualsQueries.updateFailed(data, details.requestUuid, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "Thread Step for Kolabrya Visuals", response: threadStep, requestUuid: details.requestUuid, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "Add Message for Kolabrya Visuals", response: addMessage, requestUuid: details.requestUuid, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "Kolabrya Visuals getThreadId", response: getThreadId, requestUuid: details.requestUuid, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for Kolabrya Visuals", error: error.message, requestUuid: details.requestUuid, userId: details.userId }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaVisualsServices.deleteVisuals = async (userId) => {
    try {
        const data = {
            isActivated: false,
            updatedAt: currentDate
        }
        const parentRecord = await KolabryaVisualsQueries.deleteVisuals(data, userId);
        if (parentRecord[0] > 0) {
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

module.exports = KolabryaVisualsServices;