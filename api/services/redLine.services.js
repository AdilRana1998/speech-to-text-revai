const redLineServices = {};
const {
    WriteReportQueries,
    WriteReportAssistant,
    CaseNamesQueries,
    UserQueries
} = require('../queries');
const { Strings, Logger } = require('../../utils')
const { makeDirectory } = require('../../utils/fs.utility');
const {
    writeMultipleFile
} = require('./writeReport.services');
const currentDate = new Date();
const writeFile = process.env.REDLINE_READ_WRITE;
const { v4: uuidv4 } = require('uuid');
const fsnew = require('fs');
const redLineAssitant = process.env.KOLABRYA_REDLINE_ASSISTANT;
const {
    makeThreads,
    runThreads,
    getAssistantResponse,
    makeMessage,
    validateThreadStatus,
} = require('../external/ChatGPT')
const { slack } = require('../../utils/Webhook');
const retryLimit = process.env.API_CALL_LIMITS;
const mammoth = require("mammoth");

redLineServices.postRedLine = async (reportAttachments, caseData, userId) => {
    try {
        const validator = (caseData == 'false' && reportAttachments.length > 0) && writeFile != '';
        const generatedUuid = uuidv4();
        let directory;
        if (validator == true) {
            const path = writeFile + `${generatedUuid}`;
            await makeDirectory(path);
            const makeFile = await writeMultipleFile(reportAttachments, path)
            if (makeFile.every(file => file.statusCode != '200')) {
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        error: makeFile.obj
                    }
                };
            }
            const fileName = makeFile[0].obj.fileName;
            const filePath = makeFile[0].obj.filePath;
            const fileType = makeFile[0].obj.fileType == 'application/pdf' ? '1' : '0';
            if (fileType == 0) {
                directory = filePath
            } else {
                directory = filePath.replace("docx", "pdf")
            }
            const reportData = {
                reportUuid: generatedUuid,
                userId: userId,
                reportName: fileName,
                reportPath: filePath,
                pagesCount: null,
                status: true
            }
            const getPasedText = await redLineServices.parseFileText(directory);            
            if (getPasedText.obj.length > 0) {                
                const result = await WriteReportQueries.add(reportData);
                const promises = getPasedText.obj.map(async (element) => {
                    const data = {
                        request: element.plainText,
                        requestHtml: JSON.stringify(element.htmlText),
                        pageNumber: null,
                        reportId: result.dataValues.id,
                        userId: userId,
                        type: true
                    };
                    await WriteReportAssistant.add(data);
                })
                await Promise.all(promises);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                        reportUuid: generatedUuid
                    }
                };
            } else {
                return getPasedText;
            }
        }
        else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in creating a RedLine:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

redLineServices.redLineFailedRequestes = async () => {
    try {
        const data = await WriteReportAssistant.getFailedRedLine();
        if (data.length > 0) {
            console.log("******************************");
            console.log("Job Started For Failed RedLine");
            console.log("******************************");
            const results = [];
            for (const element of data) {
                const findUsage = await WriteReportAssistant.checkUsageRedLine(element.userId);
                console.log("=======================================");
                console.log("Redline Usage", findUsage);
                console.log("=======================================");
                if (await WriteReportAssistant.getPendingRedLineByUserId(element.userId, element.reWriteUuid) && findUsage > 0) {
                    console.log("Failed Queue Details RedLine Generator", { "UserId": element.userId, "reWriteUuid": element.reWriteUuid });
                } else if (findUsage == 0) {
                    console.log({ "UserId": element.userId, "reWriteUuid": element.reWriteUuid, "Usage": findUsage });
                    const result = await redLineServices.runFailedRequest(redLineAssitant, element)
                    results.push(result);
                }
            }
            console.log("*****************************************");
            console.log("Job Completed For Failed RedLine");
            console.log("*****************************************");
            Logger.data.OpenAI({ request: results, methodName: "reWriteFailedReport" }, "Sending-Report-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("**********************************");
            console.log("No Record Found For Failed RedLine");
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

redLineServices.runFailedRequest = async (assistantId, allPendingReports) => {
    try {
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        payload.messages[0].content = allPendingReports.requestHtml;
        const getPayload = payload?.messages[0];
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for RedLine Generator", userId: allPendingReports.userId, reWriteReportUuid: allPendingReports.reWriteUuid, retryCount: allPendingReports.retryCount }));
        const getThreadId = await redLineServices.createOrFindThread(allPendingReports.userId);
        if (getThreadId.statusCode == '200') {
            const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, reWriteReportUuid: allPendingReports.reWriteUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-ReWrite-Failed-Report-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: allPendingReports.userId, reWriteReportUuid: allPendingReports.reWriteUuid, methodName: "runThreads" }, "Run-Thread-ReWrite-Failed-Report-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, reWriteReportUuid: allPendingReports.reWriteUuid, methodName: "threadStep" }, "Thread-Step-ReWrite-Failed-Report-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0, //waiting to run the next job,
                        retryCount: allPendingReports.retryCount + 1, //upating retry
                    }
                    const getId = await WriteReportAssistant.updateFailed(data, allPendingReports.reWriteUuid, allPendingReports.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for retry redline", response: threadStep, reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for retry redline", response: addMessage, reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
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
            slack.webhook(JSON.stringify({ action: "retry redline getThreadId", response: getThreadId, reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        slack.webhook(JSON.stringify({ action: "retry redline In Catch", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

redLineServices.getPendingRedLine = async () => {
    try {
        const data = await WriteReportAssistant.getPendingRedLines();
        if (data.length > 0) {
            console.log("*******************************");
            console.log("Job Started For Pending RedLine");
            console.log("*******************************");
            const results = [];
            for (const element of data) {
                if (await WriteReportAssistant.getPendingRedLineByUserId(element.userId, element.reWriteUuid)) {
                    console.log("Queue Details RedLine Generator", { "UserId": element.userId, "reWriteUuid": element.reWriteUuid });
                } else {
                    const result = await redLineServices.runChatGPT(redLineAssitant, element)
                    results.push(result);
                }
            }
            console.log("*********************************");
            console.log("Job Completed For Pending RedLine");
            console.log("*********************************");
            Logger.data.OpenAI({ request: results, methodName: "getPendingRedLine" }, "Sending-RedLine-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("***********************************");
            console.log("No Record Found For Pending RedLine");
            console.log("***********************************");
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

redLineServices.runChatGPT = async (assistantId, allPendingReports) => {
    try {
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        payload.messages[0].content = allPendingReports.requestHtml;
        const getPayload = payload?.messages[0];
        const getThreadId = await redLineServices.createOrFindThread(allPendingReports.userId);
        if (getThreadId.statusCode == '200') {
            const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, reWriteReportUuid: allPendingReports.reWriteUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-RedLine-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: allPendingReports.userId, reWriteReportUuid: allPendingReports.reWriteUuid, methodName: "runThreads" }, "Run-Thread-RedLine-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: allPendingReports.userId, reWriteReportUuid: allPendingReports.reWriteUuid, methodName: "threadStep" }, "Thread-Step-RedLine-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0, //waiting to run the next job
                    }

                    const getId = await WriteReportAssistant.update(data, allPendingReports.reWriteUuid, allPendingReports.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for redline", response: threadStep, reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for redline", response: addMessage, reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
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
            slack.webhook(JSON.stringify({ action: "getThreadId", response: getThreadId , reWriteUuid: allPendingReports.reWriteUuid, userId: allPendingReports.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT redline", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

redLineServices.createOrFindThread = async (userId) => {
    try {
        const findThreadId = await WriteReportAssistant.findThreadIdRedLine(userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-DB-Open-AI-Redline-Assistant");
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
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreads redline" }, "Create-Thread-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreads  redline" }, "Create-Thread-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "makeThreads for redline", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.error('An error occurred while Create Or Find Thread for RedLine', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

redLineServices.startPendingRedLine = async () => {
    try {
        const data = await WriteReportAssistant.startPendingRedLine();
        if (data.length > 0) {
            console.log("***********************");
            console.log("Job Started For RedLine");
            console.log("***********************");
            const results = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const result = await redLineServices.startThread(element.threadId, element.runId, element.reWriteUuid, element.userId)
                results.push(result);
            }
            console.log("*************************");
            console.log("Job Completed For RedLine");
            console.log("*************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("***************************");
            console.log("No Record Found for RedLine");
            console.log("***************************");
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

redLineServices.startThread = async (threadId, runId, reWriteUuid, userId) => {
    try {
        const validateStatus = await validateThreadStatus(threadId, runId);
        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }, "Retrive-Run-ReWrite-Report")
        data = {
            jsonResponse: JSON.stringify(validateStatus)
        }
        await WriteReportAssistant.updateThreadById(data, runId);
        if (!validateStatus.error) {
            const getCompleteStatus = validateStatus.status == 'completed';
            const getInProgressStatus = validateStatus.status == 'in_progress';
            const getFailedStatus = validateStatus.status == 'failed';
            const getExpiredStatus = validateStatus.status == 'expired';
            const getQueuedStatus = validateStatus.status == 'queued';

            console.log("");
            console.log("===== RedLine Assistant ======");
            console.log("getCompleteStatus      *", getCompleteStatus);
            console.log("getInProgressStatus   **", getInProgressStatus);
            console.log("getFailedStatus      ***", getFailedStatus);
            console.log("getExpiredStatus    ****", getExpiredStatus);
            console.log("getQueuedStatus    *****", getQueuedStatus);
            console.log("");

            if (getCompleteStatus) {
                const getanswer = await getAssistantResponse(threadId);
                obj = {
                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                    status: 1,
                    messageId: getanswer?.data[0]?.id,
                    response: JSON.stringify(getanswer?.data[0]?.content[0]?.text?.value) || {},
                    updatedAt: currentDate
                }
                Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-RedLine-Assistant-Open-AI")
                await WriteReportAssistant.updateThreadById(obj, runId);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                        reWriteUuid: reWriteUuid,
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
                await WriteReportAssistant.updateThreadById(obj, runId);
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
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }, "Thread-Status-Failed-RedLine-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-RedLine-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }));
                console.log("validate run failed case RedLine assistant", validateStatus);
                console.log("check status", validateStatus.status);
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await WriteReportAssistant.updateThreadById(obj, runId);
                
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else if (getExpiredStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }, "Thread-Status-Expired-RedLine-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-RedLine-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await WriteReportAssistant.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else {
                slack.webhook(JSON.stringify({ response: validateStatus, threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await WriteReportAssistant.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
        } else {
            console.log("validate run error RedLine assistant", validateStatus?.error);
            slack.webhook(JSON.stringify({ action: "Validate run error RedLine assistant", response: validateStatus, threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }));
            slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus?.error}` + " for", threadId: threadId, runId: runId, reWriteReportUuid: reWriteUuid, userId: userId }));
            obj = {
                retry: true,
                status: 2,
                response: null,
                jsonResponse: JSON.stringify(validateStatus?.error),
                updatedAt: currentDate
            }
            await WriteReportAssistant.updateThreadById(obj, runId);
            return {
                message: Strings.ERROR.ERROR_RE_TRY,
                statusCode: 400,
                obj: obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for validate run error RedLine assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

redLineServices.getAllReport = async (reportUuid, userId) => {
    try {
        const allReports = [];
        const data = await WriteReportQueries.getReport(reportUuid, userId);
        if (data.length > 0) {
            const result = await WriteReportAssistant.getAllReportsFromAssistant(data[0].id, userId);
            if (result.length > 0) {
                const getCount = await WriteReportAssistant.countCompletedRequest(data[0].id, userId);
                const lastIndexWithUuid = result.reduce((lastIndex, element, index) => {
                    return element.status == '1' && element.reWriteUuid ? index : lastIndex;
                }, -1);
                for (let index = 0; index < result.length; index++) {
                    const element = result[index];
                    if (element.status == '0') {
                        allReports.push(
                            {
                                message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                                status: 0,
                            }
                        )
                    }
                    else if (element.status == '1') {
                        const payload = JSON.parse(JSON.parse(element.response));                        
                        payload.RedlinedText = await addColorAndStriker(payload.RedlinedText)
                        const report = {
                            reWriteUuid: element.reWriteUuid,
                            response: JSON.stringify(payload),
                            contentHTML: element.requestHtml,
                            status: 1,
                        };
                        if (index === lastIndexWithUuid) {
                            report.progress = `${getCount}/${result.length} records completed`;
                        }
                        allReports.push(report);
                    }
                    else {
                        if (element.retryCount < retryLimit) {
                            allReports.push(
                                {
                                    message: Strings.ERROR.ERROR_RE_TRY_FROM_BACKGROUND_JOB+"redline",
                                    status: 2,
                                    retry: true
                                }
                            )
                        } else {
                            allReports.push(
                                {
                                    message: Strings.ERROR.ERROR_RE_TRY_COUNT_FINISHED_v1+`${index+1}`+Strings.ERROR.ERROR_RE_TRY_COUNT_FINISHED_v1_1,
                                    status: 2,
                                    retry: false
                                }
                            )
                        }
                    }
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allReports
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

redLineServices.getSuccessReport = async (userId) => {
    try {
        const result = await WriteReportAssistant.getAllRedLineByUserId(userId);
        if (result.length > 0) {
            const lastIndex = result.length - 1;
            const getAllData = await Promise.all(result.map(async (element, index) => {
                const getCaseDetails = await CaseNamesQueries.findCasesById(element.caseId, userId);
                const { caseId, requestHtml, reportId, retryCount, userQuery, promptType, ...rest } = element;
                const payload = JSON.parse(JSON.parse(rest.response));                
                payload.RedlinedText = await addColorAndStriker(JSON.stringify(payload.RedlinedText))
                rest.response = JSON.stringify(payload)
                rest.contentHTML = element.requestHtml
                return {
                    ...rest,
                    caseDetails: lastIndex == index ? getCaseDetails : []
                };
            }));
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: getAllData
            }
        }
        else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
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

// async function addColorAndStriker(data) {
//     let applyCss;
//     //add red colour
//     const highlightText = data
//         .replace(/\[/g, '<span style="color:red;">')
//         .replace(/\]/g, '</span>')

//     //add striker
//     const textStriker = highlightText
//         .replace(/\*#/g, '<del>')
//         .replace(/#\*/g, '</del>')

//     const getCss = await UserQueries.getPromptByType(16)

//     if (getCss.length > 0) {
//         const fetchPrompts = JSON.parse(getCss[0].prompt);
//         for (let index = 0; index < fetchPrompts.length; index++) {
//             console.log("fetchPrompts", fetchPrompts);
            
//             const element = fetchPrompts[index];
//             Object.entries(element).forEach(([tag, style]) => {

//                 console.log("element", element);
//                 console.log("[tag, style]", [tag, style]);
                

//                 const regex = new RegExp(`${tag}`);
//                 applyCss = textStriker.replace(regex, `${tag.replace(">", '')} style="${style}"` + '>');
//             })
//         }
//     }


//     // applyCss =  textStriker.replace(/<ul>/, '<ul style=margin-block-start: 1em;margin-block-end: 1em;margin-inline-start: 0px;margin-inline-end: 0px;padding-inline-start: 40px;unicode-bidi: isolate;>')
//     return applyCss;
// }

async function addColorAndStriker(data) {    
    //add red colour
    const highlightText = data
        .replace(/\[/g, '<span style="color:red;">')
        .replace(/\]/g, '</span>')

    //add striker
    const textStriker = highlightText
        .replace(/\*#/g, '<del>')
        .replace(/#\*/g, '</del>')
    const applyCss =  textStriker.replace(/<ul>/, '<ul style="margin-block-start: 1em; margin-block-end: 1em; margin-inline-start: 0px; margin-inline-end: 0px; padding-inline-start: 40px; unicode-bidi: isolate;list-style: disc;">')    
    return applyCss;
}

redLineServices.deleteReport = async (userId) => { 
    try {
        const data = {
            status: 3,
            updatedAt: currentDate
        }
        const parentRecord = await WriteReportQueries.deleteRedLine(data, userId);
        const childRecord = await WriteReportAssistant.deleteRedLineInfo(data, userId);
        if (parentRecord[0] == '1' || childRecord[0] == '1') {
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

redLineServices.parseFileText = async (source) => {
    try {
        if (source) {
            const segments = [];
            const data = await mammoth.convertToHtml({ path: source });
            const htmlContent = data.value;
            if (htmlContent != '') {
                // For example, you might want to split based on headings (e.g., <h1>, <h2>, etc.)
                const pages = await splitHtmlIntoPages(htmlContent);
                // Log each page's HTML content
                pages.forEach((page, index) => {
                    segments.push({ htmlText: page, plainText: page.replace(/<\/?[^>]+(>|$)/g, "") })
                });                
                if (segments.length > 0) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: segments
                    };
                } else {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.ROOM.EMPTY,
                        }
                    }
                }
            }
            else {                
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ROOM.EMPTY,
                    }
                }
            }
        }
        else {
            console.log("******************************************");
            console.log("No Record Found In file to parse the words");
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
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

async function splitHtmlIntoPages(htmlContent) {
    // Split based on <p> tags
    const paragraphSeparator = /<\/p>/g; // Use closing </p> tag for splitting
    const splitContent = htmlContent.split(paragraphSeparator);
    // Reconstruct the pages, grouping paragraphs together
    const pages = [];
    let currentPage = '';
    // Define a limit for the number of paragraphs per page (adjust as needed)
    const maxParagraphsPerPage = 5;
    splitContent.forEach((content, index) => { 
        // Trim whitespace from the content
        const trimmedContent = content.trim();
        if (trimmedContent) {
            // Add the paragraph to the current page
            currentPage += `${trimmedContent}`;
            // Check if we reached the max limit for paragraphs per page
            if ((index + 1) % maxParagraphsPerPage === 0) {
                pages.push(currentPage); // Save the current page
                currentPage = ''; // Reset for the next page
            }
        }
    });
    // Add any remaining content as the last page
    // if (currentPage) { 
    //     pages.push(currentPage);
    // }
    return pages;
};

module.exports = redLineServices;