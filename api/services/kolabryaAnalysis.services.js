const KolabryaAnalysisServices = {};
const {
    UserQueries,
    KolabryaAssistantsQueries,
    CaseNamesQueries,
    CaseReportGeneratorQueries,
    CaseFilesQueries,
    CaseAssigneesQueries,
    CaseIntelligentMapQueries
} = require('../queries');
const {
    runThreads,
    getAssistantResponse,
    makeMessage,
    validateThreadStatus,
    makeThreadsForReport,
    getCiteResponse,
    createResponse,
    getOpenAIResponse
} = require('../external/ChatGPT')
const { 
    responseCleaningForAnalysis, 
    addAccordianCaseAnswers,
    responseCleaningForAnalysisCite 
} = require('../services/chatGpt.services')
const { Strings, Logger } = require('../../utils')
const { slack } = require('../../utils/Webhook');
const retryLimit = process.env.API_CALL_LIMITS;
const analysisAttachmentLimit = process.env.KOLABRYA_ANALYSIS_ATTACHMENT_LIMIT;
const currentDate = new Date();

KolabryaAnalysisServices.generateAnalysis = async (caseData, userQuery, promptType, kolabryaType, requestUuid, text, isGroup, groupId, isFirm, firmAssistant, firmId, groupUsers, userId) => {
    try {
        if (caseData || userQuery || promptType || kolabryaType || text) {
            const findFeature = await KolabryaAssistantsQueries.findFeature(kolabryaType)
            if (findFeature.length > 0) {
                if (caseData.caseDetails.length <= analysisAttachmentLimit) {
                    const record = await KolabryaAnalysisServices.findFileForCase(caseData, isFirm, firmAssistant, firmId, groupUsers, userId)
                    if (record.statusCode == '200' && record.obj.length > 0) {
                        let sentence, userSentence;
                        const caseId = record.obj[1];
                        const statOne = record.obj[0].map(f => f).join(", ");
                        if (kolabryaType == '1') {
                            const promptOne = await UserQueries.getPromptByType(33);
                            const promptTwo = await UserQueries.getPromptByType(35);
                            const promptThree = await UserQueries.getPromptByType(34);
                            if (promptOne.length > 0 && promptTwo.length > 0 && promptThree.length > 0) {
                                const typeOne = JSON.parse(promptOne[0].prompt);
                                const typeTwo = JSON.parse(promptTwo[0].prompt);
                                if (promptType === 0 || promptType === 1 || promptType === 6) {
                                    const typeThree = JSON.parse(promptThree[0].prompt);
                                    if (userQuery && typeThree[promptType]) {
                                        sentence = typeTwo[0] + statOne + typeThree[promptType] + typeTwo[1] + userQuery
                                        userSentence = typeOne[promptType].key + typeTwo[1] + userQuery
                                    }
                                    else if (userQuery) {
                                        sentence = typeTwo[0] + statOne + typeTwo[1] + userQuery
                                        userSentence = userQuery
                                    }
                                    else {
                                        sentence = typeTwo[0] + statOne + typeTwo[1] + typeThree[promptType]
                                        userSentence = typeOne[promptType].key
                                    }
                                    // console.log("sentence", sentence);
                                    // console.log("userSentence", userSentence);
                                } else {
                                    if (userQuery && typeOne[promptType]) {
                                        sentence = typeTwo[0] + statOne + typeOne[promptType].key + typeTwo[1] + userQuery
                                        userSentence = typeOne[promptType].key + typeTwo[1] + userQuery
                                    }
                                    else if (userQuery) {
                                        sentence = typeTwo[0] + statOne + typeTwo[1] + userQuery
                                        userSentence = userQuery
                                    }
                                    else {
                                        sentence = typeTwo[0] + statOne + typeTwo[1] + typeOne[promptType].key
                                        userSentence = typeOne[promptType].key
                                    }           
                                }     
                            }
                            else {
                                return {
                                    message: Strings.PROMPT.NO_PROMPT_FOUND,
                                    statusCode: 400,
                                    obj: {}
                                }
                            }
                        } else if (kolabryaType == '2') {
                            const promptOne = await UserQueries.getPromptByType(17);
                            const promptTwo = await KolabryaAssistantsQueries.getVisualsData(requestUuid, userId);
                            const promptThree = await UserQueries.getPromptByType(21);
                            if (promptOne.length > 0 && promptTwo.length > 0 && promptThree.length > 0) {
                                const typeOne = promptOne[0].prompt;
                                const typeTwo = promptTwo[0].response;
                                const typeThree = JSON.parse(promptThree[0].prompt);
                                sentence = typeOne + typeTwo
                                userSentence = typeThree[0]
                            }
                            else {
                                return {
                                    message: Strings.PROMPT.NO_PROMPT_FOUND,
                                    statusCode: 400,
                                    obj: {}
                                }
                            }
                        } else if (kolabryaType == '3') {
                            const promptOne = await UserQueries.getPromptByType(20);
                            const promptThree = await UserQueries.getPromptByType(21);
                            if (promptOne.length > 0 && promptThree.length > 0) {
                                const typeOne = JSON.parse(promptOne[0].prompt);
                                const typeThree = JSON.parse(promptThree[0].prompt);
                                sentence = typeOne[0] + " '" + text + "' " + typeOne[1] + " " + statOne + " " + typeOne[2]
                                userSentence = typeThree[1]
                            }
                            else {
                                return {
                                    message: Strings.PROMPT.NO_PROMPT_FOUND,
                                    statusCode: 400,
                                    obj: {}
                                }
                            }
                        } 
                        else if (kolabryaType == '4') {
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
                                    sentence = typeTwo[0] + statOne +" "+ answers +" "+ userQuery
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
                        const add = await KolabryaAssistantsQueries.add(list)
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
        console.log("Error in generate analysis", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.findFileForCase = async (caseData, isFirm, firmAssistant, firmId, groupUsers, userId) => {
    try {
        const caseUuid = caseData.caseUuid
        const caseFiles = caseData.caseDetails
        let getData
        if (isFirm == true && firmId && firmAssistant.length > 0) {
            getData = await CaseAssigneesQueries.verifyAssistantCaseAssignessByCaseUuid(caseUuid, firmAssistant, userId)
            if (getData?.length > 0 && getData[0]?.createdByUserId) {
                // console.log("hit for a case assigned by the assistant to the assignee", getData);
                userId =  getData[0].createdByUserId
            }
            else {
                 getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
                // console.log("Firm Assignees Hit For their own individaul case", getData);
            }
        }
        else if (groupUsers?.length > 0) {
            getData = await CaseNamesQueries.findCaseId(caseUuid, groupUsers)
            // console.log("group user hit", getData);
        }
        else {
            getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
            // console.log("normal user hit", getData);
        }        
        if (getData.length > 0) {
            const caseId = getData[0].id
            let record
            if (groupUsers?.length > 0) {
                record = await CaseNamesQueries.getCaseId(caseId, groupUsers)
            } else {
                record = await CaseNamesQueries.getCaseId(caseId, userId)
            }
            if (record.length > 0) {
                const recordFileUuids = record.map(file => file['caseDetails.fileUuid']);
                const missingFiles = caseFiles
                    .filter(file => !recordFileUuids.includes(file.fileUuid))
                    .map(file => file.fileUuid);
                if (missingFiles.length > 0) {
                    const commaSeparatedFileNames = missingFiles.map(f => f).join(", ");
                    return {
                        message: Strings.FILE.CASE_FILE_NOT_FOUND,
                        statusCode: 400,
                        obj: {
                            error: Strings.FILE.FOR_CASE + caseUuid + Strings.FILE.CASE_FILES_NOT_FOUND + commaSeparatedFileNames

                        }
                    };
                }
                const fileNames = caseFiles.map(file => file.fileName);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: [
                        fileNames,
                        caseId
                    ]
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
        console.log("Error in find File For Case", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.findDetailedFileForCase = async (caseData, userId) => {
    try {
        const caseUuid = caseData.caseUuid
        const caseFiles = caseData.caseDetails
        const getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
        if (getData.length > 0) {
            const caseId = getData[0].id
            const record = await CaseNamesQueries.getCaseId(caseId, userId)
            if (record.length > 0) {
                const recordFileUuids = record.map(file => file['caseDetails.fileUuid']);
                const missingFiles = caseFiles
                    .filter(file => !recordFileUuids.includes(file.fileUuid))
                    .map(file => file.fileUuid);
                if (missingFiles.length > 0) {
                    const commaSeparatedFileNames = missingFiles.map(f => f).join(", ");
                    return {
                        message: Strings.FILE.CASE_FILE_NOT_FOUND,
                        statusCode: 400,
                        obj: {
                            error: Strings.FILE.FOR_CASE + caseUuid + Strings.FILE.CASE_FILES_NOT_FOUND + commaSeparatedFileNames

                        }
                    };
                }
                const caseFilesWithId = caseFiles.map(file => ({
                    ...file,
                    caseId: caseId
                }));                
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: caseFilesWithId
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
        console.log("Error in find File For Case", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.findDetailedFileForGroupCase = async (caseData) => {
    try {
        const caseUuid = caseData.caseUuid
        const caseFiles = caseData.caseDetails
        const getData = await CaseNamesQueries.getCasesId(caseUuid)
        if (getData.length > 0) {
            const caseId = getData[0].id
            const record = await CaseNamesQueries.getCaseIdGroup(caseId)
            if (record.length > 0) {
                const recordFileUuids = record.map(file => file['caseDetails.fileUuid']);
                const missingFiles = caseFiles
                    .filter(file => !recordFileUuids.includes(file.fileUuid))
                    .map(file => file.fileUuid);
                if (missingFiles.length > 0) {
                    const commaSeparatedFileNames = missingFiles.map(f => f).join(", ");
                    return {
                        message: Strings.FILE.CASE_FILE_NOT_FOUND,
                        statusCode: 400,
                        obj: {
                            error: Strings.FILE.FOR_CASE + caseUuid + Strings.FILE.CASE_FILES_NOT_FOUND + commaSeparatedFileNames

                        }
                    };
                }
                const caseFilesWithId = caseFiles.map(file => ({
                    ...file,
                    caseId: caseId
                }));                
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: caseFilesWithId
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
        console.log("Error in find File For Case", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.startKolabryaAnalysis = async () => {
    try {
        const data = await KolabryaAssistantsQueries.getPendingData();
        if (data.length > 0) {
            console.log("*****************************************");
            console.log("Job Started For Pending Kolabrya Analysis");
            console.log("*****************************************");
            const results = [];
            for (const element of data) {
                if (await KolabryaAssistantsQueries.getPendingReportsByUserId(element.userId, element.requestUuid)) {
                    console.log("Queue Details Kolabrya Analysis", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else {
                    const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const result = await KolabryaAnalysisServices.runChatGPT(element, checkCaseFileAvaiablity[0])
                        results.push(result);
                    }
                    else {
                        console.log("****************************************************");
                        console.log("Waiting for Vector Store to Upload Kolabrya Analysis");
                        console.log("****************************************************");
                    }
                }
            }
            console.log("*******************************************");
            console.log("Job Completed For Pending Kolabrya Analysis");
            console.log("*******************************************");
            if (results.length > 0) {
                Logger.data.OpenAI({ request: results, methodName: "startKolabryaAnalysis" }, "Sending-Kolabrya-Analysis-Data-To-OpenAI");
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        data: results,
                    }
                };
            }
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        } else {
            console.log("*********************************************");
            console.log("No Record Found For Pending Kolabrya Analysis");
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

KolabryaAnalysisServices.runChatGPT = async (details, vectorId) => {
    try {
        const getPrompt = await CaseIntelligentMapQueries.getOpenAIPromptsByType(2);
        if (getPrompt.length > 0) {
            console.log("*************************************************************");
            console.log("Job Started For Kolabrya Analysis Investigation Prompt Making");
            console.log("*************************************************************");
            const validation = JSON?.parse(details?.fileDetails)
            var sentence = 'Given the uploaded documents of '
            if (validation.caseDetails) {
                 const fileNames = validation.caseDetails.map(el => el?.fileName)
                const commaSeparated = fileNames?.join(', ')
                sentence += commaSeparated
            }
            const findPreviousResponseId = await KolabryaAssistantsQueries.findPreviousResponseId(details.caseId, details.userId);
            const prompt = JSON.parse(getPrompt[0].prompt);
            prompt.tools[0].vector_store_ids = [vectorId]
            prompt.input = sentence +" "+ details.request
            if (findPreviousResponseId?.responseId) {
                prompt.previous_response_id = findPreviousResponseId.responseId;
            }
            const response = await createResponse(prompt)
            if (!response.error) {
                if (response?.status === 'queued') {
                    const obj = {
                        responseId: response.id,
                        status: false,
                        request: JSON.stringify(prompt)
                    }
                    await KolabryaAssistantsQueries.update(obj, details.requestUuid, details.userId)
                } else {
                    const obj = {
                        status: 2,
                        request: JSON.stringify(prompt),
                        //jsonResponse: JSON.stringify(response)
                    }
                    await KolabryaAssistantsQueries.update(obj, details.requestUuid, details.userId)
                    slack.webhook(JSON.stringify({ action: "Kolabrya Analysis Failed", response: response, status: response?.status, requestUuid: details.requestUuid, userId: details.userId }));
                }
            }
            else {
                const obj = {
                    status: 2,
                    request: JSON.stringify(prompt),
                    //jsonResponse: JSON.stringify(response)
                }
                await KolabryaAssistantsQueries.update(obj, details.requestUuid, details.userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya Analysis Logical Error", response: response, requestUuid: details.requestUuid, userId: details.userId }));
            }
            Logger.data.OpenAI({ request: prompt, response: response, requestUuid: details.requestUuid, userId: details.userId, methodName: "createResponse" }, "Create-Response-Open-AI-For-Kolabrya-Analysis");
            console.log("***************************************************************");
            console.log("Job Completed For Kolabrya Analysis Investigation Prompt Making");
            console.log("***************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    requestUuid: details.requestUuid,
                    userId: details.userId,
                    caseId: details.caseId,
                    request: prompt,
                    response: response
                }
            };
        }
        else {
            console.log("No Response API Prompt Found For Kolabrya Analysis Investigation");
            slack.webhook(JSON.stringify({ action: "No Response API Prompt Found For Kolabrya Analysis Investigation" }));
        }
    } catch (error) {
        console.log("error", error);
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT for kolabrya analysis", error: error }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.createOrFindThread = async (record, caseId, userId) => {
    try {
        // enable it when you want to use thread memory
        const findThreadId = await KolabryaAssistantsQueries.findThreadId(caseId, userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Kolabrya-Analysis");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Kolabrya-Analysis-Error");
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
                console.log("Creating a New thread_id for Kolabrya Analysis =>", threads.id);
                console.log("*********************************************************************************");
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Kolabrya Analysis" }, "Create-Thread-For-Kolabrya-Analysis-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Kolabrya Analysis" }, "Create-Thread-For-Kolabrya-Analysis-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Analysis", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for Kolabrya analysis.', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.startPendingAnalysis = async () => {
    try {
        const data = await KolabryaAssistantsQueries.startPendingReports();
        if (data.length > 0) {
            console.log("*********************************");
            console.log("Job Started For Kolabrya Analysis");
            console.log("*********************************");
            const results = [];
            for (const element of data) {
                const result = await KolabryaAnalysisServices.startThread(element.responseId, element.retryCount, element.requestUuid, element.userId)
                results.push(result);
            }
            console.log("***********************************");
            console.log("Job Completed For Kolabrya Analysis");
            console.log("***********************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("*************************************");
            console.log("No Record Found For Kolabrya Analysis");
            console.log("*************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in start Pending Analysis", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.startThread = async (responseId, retryCount, requestUuid, userId) => {
    try {
        if (requestUuid && responseId) {
            console.log("***********************************************");
            console.log("Job Started Update Status For Kolabrya-Analysis");
            console.log("***********************************************");
            const results = [];
            const response = await getOpenAIResponse(responseId)
            console.log("");
            console.log("========= Kolabrya-Analysis ========");
            console.log("Status                   *", response?.status);
            console.log("");
            if (!response.error) {
                if (response?.status === 'completed') {
                    const actualTextIndex = response.output.findIndex(item => item.type === 'message');
                    const actualText = response.output[actualTextIndex].content.find(part => part.type === 'output_text').text;
                    if (actualText) {
                        const obj = {
                            response: actualText,
                            responseId: response?.id,
                            status: true
                        }
                        await KolabryaAssistantsQueries.update(obj, requestUuid, userId)
                    } else {
                        slack.webhook(JSON.stringify({ action: "Kolabrya Analysis Status Bad Response", response: response, requestUuid: requestUuid, userId: userId }));
                        const obj = {
                            status: 2
                        }
                        await KolabryaAssistantsQueries.update(obj, requestUuid, userId)
                        slack.webhook(JSON.stringify({ action: "Kolabrya Analysis Status Failed", response: actualText, status: response?.status, requestUuid: requestUuid, userId: userId }));
                    }
                }
                else if (response?.status == "in_progress") {
                    await KolabryaAssistantsQueries.update({ status: false }, requestUuid, userId)
                }
                else if (response?.status == "queued") {
                    await KolabryaAssistantsQueries.update({ status: false }, requestUuid, userId)
                }
                else {
                    const obj = {
                        status: 2
                    }
                    await KolabryaAssistantsQueries.update(obj, requestUuid, userId)
                    slack.webhook(JSON.stringify({ action: "Kolabrya Analysis Status Failed", response: response, status: response?.status, requestUuid: requestUuid, userId: userId }));
                }
            }
            else {
                const obj = {
                    status: 2
                }
                await KolabryaAssistantsQueries.update(obj, requestUuid, userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya Analysis Status Logical Error", response: response, requestUuid: requestUuid, retryCount: retryCount, userId: userId }));
            }
            results.push(response)
            Logger.data.OpenAI({ request: responseId, response: response, requestUuid: requestUuid, retryCount: retryCount, userId: userId, methodName: "updateStatus" }, "Kolabrya-Analysis-Update-Status");
            console.log("*************************************************");
            console.log("Job Completed Update Status For Kolabrya Analysis");
            console.log("*************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: results
            };
        } else {
            console.log("***************************************************");
            console.log("No Record Found Update Status For Kolabrya Analysis");
            console.log("***************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in start Thread for Kolabrya Analysis", error);
        slack.webhook(JSON.stringify({ action: "In Catch for start Thread kolabrya analysis assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.getAnalysisById = async (requestUuid, caseUuid, userId) => {
    try {
        let data, caseId;
        if (caseUuid) {
            const record = await CaseNamesQueries.getCasesId(caseUuid, userId)
            caseId = record[0].id
            data = await KolabryaAssistantsQueries.getDataByCaseIdUuid(requestUuid, caseId, userId);
        } else {
            data = await KolabryaAssistantsQueries.getDataByUuid(requestUuid, userId);
        }
        if (data.length > 0) {
            if ((data[0].status == '0' || data[0].status == null) && data[0].retryCount == 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        status: 0
                    }
                }
            }
            else if ((data[0].status == '2' || data[0].status == '0' || data[0].status == null) && data[0].retryCount < retryLimit) {
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: {
                        retry: true
                    }
                }
            }
            else if (data[0].status == '0' && data[0].retryCount == retryLimit) {
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
                if (caseUuid) {
                    list = await KolabryaAssistantsQueries.getAllDataByCaseId(caseId, userId);   
                } else {
                    list = await KolabryaAssistantsQueries.getAllData(userId);
                }
                const getAllData = await Promise.all(list.map(async (element) => {
                    if (element.featureType == 1) {
                        element.visuals = true //only for analysis hits
                    }
                    if (element.featureType == 2) {
                        //do this while updating data in db as get from open ai
                        element.response = element.response.replace(/\\\"/g, '"');
                        element.response = element.response.replace(/\n/g, '');
                    }
                    //generate visual, save, cite button is  only for analusis hits
                    //for cite request, generate visual donot show any button
                    const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
                    const { caseId, id, kolabryaAssistant, featureType, ...rest } = element;
                    return {
                        ...rest,
                        caseDetails: element.featureType == 1 ? getCaseDetails : []
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
        console.log("Error while get all for analysis by request uuid", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.getFailedRecords = async () => {
    try {
        const data = await KolabryaAssistantsQueries.getFailedReports();
        if (data.length > 0) {
            console.log("**************************************************");
            console.log("Job Started For Failed Record of Kolabrya Analysis");
            console.log("**************************************************");
            const results = [];
            for (const element of data) {
                const findUsage = await KolabryaAssistantsQueries.checkUsage(element.userId);
                console.log("=========================");
                console.log("Kolabrya Analysis Usage", findUsage);
                console.log("=========================");
                if (await KolabryaAssistantsQueries.getPendingReportsByUserId(element.userId, element.requestUuid) && findUsage > 0) {
                    console.log("Kolabrya Analysis Queue Details", { "UserId": element.userId, "requestUuid": element.requestUuid });
                }
                else if (findUsage == 0) {
                    const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const result = await KolabryaAnalysisServices.runFailedRequest(element)
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
            console.log("Job Completed For Failed Record of Kolabrya Analysis");
            console.log("****************************************************");
            if (results.length > 0) {
                Logger.data.OpenAI({ request: results, methodName: "getFailedRecords" }, "Sending-Kolabrya-Analysis-Failed-Records-To-OpenAI");
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        data: results,
                    }
                };   
            }
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        } else {
            console.log("******************************************************");
            console.log("No Record Found For Failed Record of Kolabrya Analysis");
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

KolabryaAnalysisServices.runFailedRequest = async (details) => {
    try {
        const results = [];
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for Kolabrya Analysis", userId: details.userId, requestUuid: details.requestUuid, retryCount: details.retryCount }));
        console.log("****************************************");
        console.log("Job Started For Failed Kolabrya Analysis");
        console.log("****************************************");
        const prompt = JSON.parse(details?.request)
        const response = await createResponse(prompt)
        if (!response.error) {
            if (response?.status === 'queued') {
                const obj = {
                    responseId: response.id,
                    status: false,
                    retryCount: details.retryCount + 1
                }
                await KolabryaAssistantsQueries.update(obj, details.requestUuid, details.userId)
            } else {
                const obj = {
                    status: 2,
                    retryCount: details.retryCount + 1
                }
                await KolabryaAssistantsQueries.update(obj, details.requestUuid, details.userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya Analysis Failed Job", response: response, status: response?.status, requestUuid: details.requestUuid, userId: details.userId }));
            }
        }
        else {
            const obj = {
                status: 2,
                retryCount: details.retryCount + 1
            }
            await KolabryaAssistantsQueries.update(obj, details.requestUuid, details.userId)
            slack.webhook(JSON.stringify({ action: "Kolabrya Analysis Logical Error At Failure Job", response: response, requestUuid: details.requestUuid, userId: details.userId }));
        }
        results.push(response)
        Logger.data.OpenAI({ request: prompt, response: response, requestUuid: details.requestUuid, retryCount: details.retryCount, userId: details.userId, methodName: "createResponse" }, "Kolabrya-Analysis-Failure-Method");
        console.log("******************************************");
        console.log("Job Completed For Failed Kolabrya Analysis");
        console.log("******************************************");
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: results
        };
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for Kolabrya Analysis Retry", error: error.message, requestUuid: details.requestUuid, userId: details.userId }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaAnalysisServices.deleteAnalysis = async (caseUuid, userId) => {
    try {
        let parentRecord;
        const data = {
            isActivated: false,
            updatedAt: currentDate
        }
        if (caseUuid) {
            const record = await CaseNamesQueries.getCasesId(caseUuid, userId)
            const caseId = record[0].id
            parentRecord = await KolabryaAssistantsQueries.deleteAnalysisByCaseId(data, caseId, userId);
        } else {
            parentRecord = await KolabryaAssistantsQueries.deleteAnalysis(data, userId);
        }
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

KolabryaAnalysisServices.getAnalysis = async (caseUuid, userId) => {
    try {
        let data;
        if (caseUuid) {
            const record = await CaseNamesQueries.getCasesId(caseUuid, userId)
            const caseId = record[0].id
            data = await KolabryaAssistantsQueries.getAllDataByCaseId(caseId, userId);   
        } else {
            data = await KolabryaAssistantsQueries.getAllData(userId);
        }
        const getAllData = await Promise.all(data.map(async (element) => {
            if (element.featureType == 1) {
                element.visuals = true //only for analysis hits
            }
            if (element.featureType == 2) {
                //do this while updating data in db as get from open ai
                element.response = element.response.replace(/\\\"/g, '"');
                element.response = element.response.replace(/\n/g, '');
            }
            const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
            const { caseId, id, kolabryaAssistant, featureType, ...rest } = element;
            return {
                ...rest,
                caseDetails: element.featureType == 1 ? getCaseDetails : []
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
    } catch (error) {
        console.log("Error while getting all for analysis", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = KolabryaAnalysisServices;