const CaseReportServices = {};
const {
    CaseNamesQueries,
    CaseReportGeneratorQueries,
    UserQueries,
    CaseIntelligentMapQueries
} = require('../queries');
const {
    createDocx
} = require('../services/chatGpt.services');
const { makeDirectory } = require('../../utils/fs.utility');
const { Strings, Logger } = require('../../utils')
const { slack } = require('../../utils/Webhook');
const {
    makeThreads,
    postDocxPython,
    createResponse,
    getOpenAIResponse
} = require('../external/ChatGPT')
const path = require('path');
const caseReportDirectory = process.env.CASE_REPORT_DIRECTORY;

CaseReportServices.createCaseTimeLine = async (isFirm, firmId, caseUuid, groupUsers, userId) => {
    try {
        let getCaseId;
        if (groupUsers?.length > 0) {
            getCaseId = await CaseNamesQueries.getCasesIdForGroup(caseUuid, groupUsers)   
        } else {
            getCaseId = await CaseNamesQueries.getCasesIdForGroup(caseUuid, userId)
        }
        if (getCaseId.length > 0) {
            const caseId = getCaseId[0].id
            const findTimeLine = await CaseReportGeneratorQueries.findTimeLine(caseId, userId)       
            if (findTimeLine.length <= 0) {
                console.log("Creating the table of content first time");
                const record = await UserQueries.getPromptByType(31);
                if (record.length > 0) {
                    const types = JSON.parse(record[0].prompt);
                    const combinedQueryResponses = [];
                    for (const element of types) {
                        let combiningData
                        if ((isFirm && firmId) || (groupUsers?.length > 0)) {
                            combiningData = await CaseReportGeneratorQueries.findQueryByQueryIdForFirm(element, caseId);
                        } else {
                            combiningData = await CaseReportGeneratorQueries.findQueryByQueryId(element, caseId, userId);
                        }
                        if (combiningData != null && combiningData.response != null) {
                            const getQuery = await CaseReportGeneratorQueries.findQueryOnly(element);
                            const sentence = "Question: "+ getQuery.prompt +" Answer: "+combiningData.response                            
                            combinedQueryResponses.push(sentence);
                        }
                    }
                    if (combinedQueryResponses.length > 0) {
                        const obj = {
                            caseId: caseId,
                            userId: userId,
                            request: combinedQueryResponses.join(', ')
                        }
                        await CaseReportGeneratorQueries.add(obj);
                        return {
                            message: Strings.SUCCESS,
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
                }
                else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    };
                }
            }
            else if(findTimeLine.length > 0){
                console.log("Checking for updated records For TOC");
                const record = await UserQueries.getPromptByType(31);
                if (record.length > 0) {
                    const types = JSON.parse(record[0].prompt);
                    const combinedQueryResponses = [];
                    for (const element of types) {
                        let combiningData
                        if ((isFirm && firmId) || (groupUsers?.length > 0)) {
                            combiningData = await CaseReportGeneratorQueries.findQueryByQueryIdForUpdateFirm(element, caseId);
                        } else {
                            combiningData = await CaseReportGeneratorQueries.findQueryByQueryIdForUpdate(element, caseId, userId);
                        }
                        if (combiningData != null && combiningData.response != null) {
                            const getQuery = await CaseReportGeneratorQueries.findQueryOnly(element);
                            const sentence = "Question: "+ getQuery.prompt +" Answer: "+combiningData.response                            
                            combinedQueryResponses.push(sentence);
                        }
                    }
                    if (combinedQueryResponses.length > 0) {
                        console.log("Updated Record Found For TOC");
                        const data = {
                            isActivated: false
                        }
                        const record = await CaseReportGeneratorQueries.deactivateCaseTOC(data, findTimeLine[0].id, caseId, userId);
                        if (record[0] == '1') {
                            await CaseReportGeneratorQueries.deactivateCaseReport({isActivated: false}, findTimeLine[0].id, userId);
                            await CaseReportGeneratorQueries.updateQueryAfterTOCUsed({isUsedByToc: true}, 4, caseId, userId);                            
                            const obj = {
                                caseId: caseId,
                                userId: userId,
                                request: combinedQueryResponses.join(', ')
                            }
                            await CaseReportGeneratorQueries.add(obj);
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {}
                            };
                        } else {
                            console.log("TOC old Record is still in progress");
                            return {
                                message: Strings.CASE_REPORT_GENERATOR.TOC.PREVIOUS_RECORD_INPROGRESS,
                                statusCode: 200,
                                obj: {}
                            };
                        }
                    } else {
                        console.log("No Updated Reocrd Found For TOC");
                        return {
                            message: Strings.ERROR.RECORD_ALREADY_EXSIST,
                            statusCode: 200,
                            obj: {}
                        };
                    }
                }
                else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    };
                }
            }
            else {
                return {
                    message: Strings.ERROR.RECORD_ALREADY_EXSIST,
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
    } catch (error) {
        console.log("Error in Create Case table of content:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.startPendingDashboard = async () => {
    try {
        const data = await CaseReportGeneratorQueries.startPendingDashboard();
        if (data.length > 0) {
            console.log("******************************************************");
            console.log("Job Started For Posting Kolabrya Table Of Content Data");
            console.log("******************************************************");
            const results = [];
            for (const element of data) {
                if (await CaseReportGeneratorQueries.pendingDataQueue(element.caseId, element.userId)) {
                    console.log("Queue Details On OpenAI For Posting Kolabrya table of content Data", { "requestUuid": element.requestUuid, "caseId": element.caseId, "UserId": element.userId, });
                }
                const result = await CaseReportServices.startThread(element.responseId, element.retryCount, element.requestUuid, element.userId)
                results.push(result);
            }
            if (results.length > 0) {
                console.log("***************************************************************");
                console.log("Job Completed For Posting Kolabrya Case Report Table Of Content");
                console.log("***************************************************************");
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        results
                    }
                };
            }
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        } else {
            console.log("*********************************************************");
            console.log("No Record Found For Kolabrya Case Report Table Of Content");
            console.log("*********************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while start pending  Report Time-Line", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.viewReportData = async (groupUsers, isFirm, firmId, caseUuid, userId) => {
    try {
        if (caseUuid) {
            if (((groupUsers?.length > 0) || (isFirm && firmId)) && userId) {
                const data = await CaseNamesQueries.getCasesIdForGroup(caseUuid)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const record = await CaseReportGeneratorQueries.getTimeLine(caseId, userId)
                    if (record.length > 0) {
                        if (record[0].status == '0' || record[0].status == null) {
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                                    status: 0,
                                }
                            }
                        } else if (record[0].status == '1') {
                            await CaseReportServices.combineJSONDataToGenerateReport();
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                                    status: 1,
                                    response: record[0].response,
                                    requestUuid: record[0].requestUuid
                                }
                            }
                        } else {
                            //have to add the retry logic also
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
            }
            else {
                const data = await CaseReportGeneratorQueries.getCasesId(caseUuid, userId)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const record = await CaseReportGeneratorQueries.getTimeLine(caseId, userId)
                    if (record.length > 0) {
                        if (record[0].status == '0' || record[0].status == null) {
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                                    status: 0,
                                }
                            }
                        } else if (record[0].status == '1') {
                            await CaseReportServices.combineJSONDataToGenerateReport();
                            await CaseReportServices.combineJSONDataToGenerateReportOnNewFiles(caseId);
                            await CaseReportServices.combineJSONDataToGenerateReportOnDeleteFiles(caseId);
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                                    status: 1,
                                    response: record[0].response,
                                    requestUuid: record[0].requestUuid
                                }
                            }
                        } else {
                            //have to add the retry logic also
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
            }
        }
    } catch (error) {
        console.log("Error in view a table of content data response:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.startThread = async (responseId, retryCount, requestUuid, userId) => {
    try {
        if (requestUuid && responseId) {
            console.log("******************************************");
            console.log("Job Started Update Status For Kolabrya TOC");
            console.log("******************************************");
            const results = [];
            const response = await getOpenAIResponse(responseId)
            console.log("");
            console.log("========= Kolabrya TOC ========");
            console.log("Status              *", response?.status);
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
                        await CaseReportGeneratorQueries.update(obj, requestUuid, userId)
                    } else {
                        slack.webhook(JSON.stringify({ action: "Kolabrya TOC Status Bad Response", response: response, requestUuid: requestUuid, userId: userId }));
                        const obj = {
                            status: 2
                        }
                        await CaseReportGeneratorQueries.update(obj, requestUuid, userId)
                        slack.webhook(JSON.stringify({ action: "Kolabrya TOC Status Failed", response: actualText, status: response?.status, requestUuid: requestUuid, userId: userId }));
                    }
                }
                else if (response?.status == "in_progress") {
                    await CaseReportGeneratorQueries.update({ status: false }, requestUuid, userId)
                }
                else if (response?.status == "queued") {
                    await CaseReportGeneratorQueries.update({ status: false }, requestUuid, userId)
                }
                else {
                    const obj = {
                        status: 2
                    }
                    await CaseReportGeneratorQueries.update(obj, requestUuid, userId)
                    slack.webhook(JSON.stringify({ action: "Kolabrya TOC Status Failed", response: response, status: response?.status, requestUuid: requestUuid, userId: userId }));
                }
            }
            else {
                const obj = {
                    status: 2
                }
                await CaseReportGeneratorQueries.update(obj, requestUuid, userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya TOC Status Logical Error", response: response, requestUuid: requestUuid, retryCount: retryCount, userId: userId }));
            }
            results.push(response)
            Logger.data.OpenAI({ request: responseId, response: response, requestUuid: requestUuid, retryCount: retryCount, userId: userId, methodName: "updateStatus" }, "Kolabrya-TOC-Update-Status");
            console.log("********************************************");
            console.log("Job Completed Update Status For Kolabrya TOC");
            console.log("********************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: results
            };
        } else {
            console.log("**********************************************");
            console.log("No Record Found Update Status For Kolabrya TOC");
            console.log("**********************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for validate run error kolabrya table of content data assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.combineJSONDataToGenerateReport = async () => {
    try {
        const data = await CaseReportGeneratorQueries.gatherData();
        if (data.length > 0) {
            console.log("************************************************");
            console.log("Job Started To Gather Data For Report Generation");
            console.log("************************************************");
            const results = [];
            for (const element of data) {
                if (await CaseReportGeneratorQueries.gatherDataQueue(element.caseId, element.userId)) {
                    console.log("Queue Details On Gather Data for Report", { "requestUuid": element.requestUuid, "caseId": element.caseId, "UserId": element.userId});
                }
                const result = await CaseReportServices.startCombining(element.response, element.id, element.caseId, element.userId)
                results.push(result);
                
            }
            console.log("**************************************************");
            console.log("Job Completed To Gather Data For Report Generation");
            console.log("**************************************************");
            Logger.data.OpenAI({ request: results, methodName: "combineJSONDataToGenerateReport" }, "Send-Pending-Report-Data");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("****************************************************");
            console.log("No Record Found For Gather Data For Report Generation");
            console.log("****************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while running combine JSON Data To Generate Report",error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.combineJSONDataToGenerateReportOnNewFiles = async (caseId) => {
    try {
        const data = await CaseReportGeneratorQueries.gatherDataForNewFiles(caseId);
        const checkEditFiles = await CaseReportGeneratorQueries.countEditFiles(caseId)
        if (data.length > 0 && checkEditFiles > 0) {
            console.log("**********************************************************");
            console.log("Job Started To Gather Data For Report Generation New Files");
            console.log("**********************************************************");
            const results = [];
            for (const element of data) {
                    await CaseReportGeneratorQueries.deactivateEditFiles({isReport: true}, element.caseId);
                    await CaseReportGeneratorQueries.deactivateCaseReport({isActivated: false}, element.id, element.userId);
                const result = await CaseReportServices.startCombining(element.response, element.id, element.caseId, element.userId)
                results.push(result);
            }
            console.log("************************************************************");
            console.log("Job Completed To Gather Data For Report Generation New Files");
            console.log("************************************************************");
            Logger.data.OpenAI({ request: results, methodName: "combineJSONDataToGenerateReport" }, "Send-Pending-Report-Data");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("**************************************************************");
            console.log("No Record Found For Gather Data For Report Generation New Files");
            console.log("**************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while running combine JSON Data To Generate Report New Files",error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.combineJSONDataToGenerateReportOnDeleteFiles = async (caseId) => {
    try {
        const data = await CaseReportGeneratorQueries.gatherDataForNewFiles(caseId);
        const checkEditFiles = await CaseReportGeneratorQueries.countDeletedFiles(caseId)
        if (data.length > 0 && checkEditFiles > 0) {
            console.log("****************************************************************");
            console.log("Job Started To Gather Data For Report Generation On Delete Files");
            console.log("****************************************************************");
            const results = [];
            for (const element of data) {
                    await CaseReportGeneratorQueries.updateReportOnDeletedFiles({isReport: true}, element.caseId);
                    await CaseReportGeneratorQueries.deactivateCaseReport({isActivated: false}, element.id, element.userId);
                const result = await CaseReportServices.startCombining(element.response, element.id, element.caseId, element.userId)
                results.push(result);
            }
            console.log("******************************************************************");
            console.log("Job Completed To Gather Data For Report Generation On Delete Files");
            console.log("******************************************************************");
            Logger.data.OpenAI({ request: results, methodName: "combineJSONDataToGenerateReport" }, "Send-Pending-Report-Data");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("*********************************************************************");
            console.log("No Record Found For Gather Data For Report Generation On Delete Files");
            console.log("*********************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while running combine JSON Data To Generate Report Delete Files",error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.startCombining = async (list, id, caseId, userId) => {
    try {
        const data = JSON.parse(list);
        const allData = [];

        // Loop through all issues
        for (const issueObj of data.data) {
            const issue = issueObj.issue; // Current issue
            for (const key in issueObj) {
                if (Object.hasOwn(issueObj, key)) {
                    const value = issueObj[key];
                    if (Array.isArray(value)) {
                        for (const element of value) {
                            allData.push({
                                nature: key,
                                title: element,
                                issue: issue,
                            });
                        }
                    } else {
                        // Log or notify about non-array keys if necessary
                        console.log(`Non-array value for key: ${key}`, value);
                    }
                }
            }
        }

        if (allData.length > 0) {
            await CaseReportServices.combinePromptForReport(allData, id, caseId, userId);
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: allData,
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {},
            };
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for retry start combining JSON", error: error.message }));
        console.log("In Catch for retry start combining JSON", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message,
            },
        };
    }
};

CaseReportServices.combinePromptForReport = async (list, id, caseId, userId) => {
    try {
        const record = await UserQueries.getPromptByType(32);
        if (record.length > 0) {
            const types = JSON.parse(record[0].prompt);
            const statOne = types[0];
            const statTwo = types[1];
            const statThree = types[2];
            const statFour = types[3];
            const statFive = types[4];
            const statSix = types[5];
            for (const [index, element] of list.entries()) {
                const isLastIteration = index === list.length - 1; // Check if this is the last iteration
                const sentence = statOne + element.nature +" "+ element.title +" "+ statTwo +" "+ element.issue + statThree+ element.nature +" "+ element.title + statFour+ element.nature +" "+ element.title + statFive + element.issue + statSix                
                const obj = {
                    request: sentence,
                    timeLineId: id,
                    caseId: caseId,
                    userId: userId,
                }
                await CaseReportGeneratorQueries.addReport(obj);
                if (isLastIteration) {
                    const record = {
                        isProcessed: true
                    }
                    await CaseReportGeneratorQueries.updateCaseTOC(record, caseId, userId)
                }
            }
            return types        
        }else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for combine Prompt For Report", error: error.message }));
        console.log("In Catch for combine Prompt For Report", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.sendCombineData = async () => {
    try {
        const data = await CaseReportGeneratorQueries.getReportPendingDataForOpenAI();
        if (data.length > 0) {
            console.log("***************************************************************");
            console.log("Job Started For Sending Data To OpenAI For Kolabrya Case Report");
            console.log("***************************************************************");
            const results = [];
            for (const element of data) {
                const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                if (checkCaseFileAvaiablity.length > 0) {
                    if (await CaseReportGeneratorQueries.getReportPendingDataForOpenAIByUserId(element.userId)) {
                        console.log("Queue Details On OpenAI For Case Report", { "requestUuid": element.requestUuid, "UserId": element.userId});
                    }
                    else {
                         const result = await CaseReportServices.runChatGPTForReport(element, checkCaseFileAvaiablity[0], checkCaseFileAvaiablity[1])
                        results.push(result);
                    }
                }
            }
            if (results.length > 0) {
                console.log("*****************************************************************");
                console.log("Job Completed For Sending Data To OpenAI For Kolabrya Case Report");
                console.log("*****************************************************************");
                Logger.data.OpenAI({ request: results, methodName: "sendCombineData" }, "Send-Pending-Kolabrya-Report-Data");
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
            console.log("************************************************");
            console.log("No Record Found For Pending Kolabrya Case Report");
            console.log("************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error While send Combine Data ", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
} 

CaseReportServices.runChatGPTForReport = async (details, vectorId, fileName) => {
    try {
        const getPrompt = await CaseIntelligentMapQueries.getOpenAIPromptsByType(5);
        if (getPrompt.length > 0) {
            console.log("********************************************************");
            console.log("Job Started For Kolabrya Report Generation Prompt Making");
            console.log("********************************************************");
            const promptSentence = "Using only the uploaded file name's"
            const commaSeparatedFileNames = fileName.map(f => f.fileName).join(", ");
            const content = `${promptSentence} ${commaSeparatedFileNames} ${details.request}`;
            const findPreviousResponseId = await CaseReportGeneratorQueries.findPreviousResponseId(details.id, details.userId);
            const prompt = JSON.parse(getPrompt[0].prompt);
            prompt.tools[0].vector_store_ids = [vectorId]
            prompt.input = content
            if (findPreviousResponseId?.responseId) {
                prompt.previous_response_id = findPreviousResponseId.responseId;
            }
            // console.log("prompt", prompt);
            const response = await createResponse(prompt)
            if (!response.error) {
                if (response?.status === 'queued') {
                    const obj = {
                        responseId: response.id,
                        status: false,
                        request: JSON.stringify(prompt)
                    }
                    await CaseReportGeneratorQueries.updateReport(obj, details.requestUuid, details.userId)
                } else {
                    const obj = {
                        status: 2,
                        request: JSON.stringify(prompt),
                    }
                    await CaseReportGeneratorQueries.updateReport(obj, details.requestUuid, details.userId)
                    slack.webhook(JSON.stringify({ action: "Kolabrya Report Generation Failed", response: response, status: response?.status, requestUuid: details.requestUuid, userId: details.userId }));
                }
            }
            else {
                const obj = {
                    status: 2,
                    request: JSON.stringify(prompt),
                }
                await CaseReportGeneratorQueries.updateReport(obj, details.requestUuid, details.userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya Report Generation Logical Error", response: response, requestUuid: details.requestUuid, userId: details.userId }));
            }
            Logger.data.OpenAI({ request: prompt, response: response, requestUuid: details.requestUuid, userId: details.userId, methodName: "createResponse" }, "Create-Response-Open-AI-For-Kolabrya Report Generator");
            console.log("**********************************************************");
            console.log("Job Completed For Kolabrya Report Generation Prompt Making");
            console.log("**********************************************************");
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
            console.log("No Response API Prompt Found For Kolabrya Report Generation");
            slack.webhook(JSON.stringify({ action: "No Response API Prompt Found For Kolabrya Report Generation" }));
        }
    } catch (error) {
        console.log("error", error);
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT for Kolabrya Report Generation", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}


CaseReportServices.startPendingReport = async () => {
    try {
        const data = await CaseReportGeneratorQueries.startPendingReport();
        if (data.length > 0) {
            console.log("********************************************");
            console.log("Job Started For Posting Kolabrya Case Report");
            console.log("********************************************");
            const results = [];
            for (const element of data) {
                if (await CaseReportGeneratorQueries.pendingReportDataQueue(element.userId)) {
                    console.log("Queue Details On OpenAI For Posting Kolabrya Report Data", { "requestUuid": element.requestUuid, "UserId": element.userId });
                }
                const result = await CaseReportServices.startReportThread(element.responseId, element.retryCount, element.requestUuid, element.userId)
                results.push(result);
            }
            console.log("**********************************************");
            console.log("Job Completed For Posting Kolabrya Case Report");
            console.log("**********************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("****************************************");
            console.log("No Record Found For Kolabrya Case Report");
            console.log("****************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while start pending report", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.startReportThread = async (responseId, retryCount, requestUuid, userId) => {
    try {
        if (requestUuid && responseId) {
            console.log("*******************************************************");
            console.log("Job Started Update Status For Kolabrya Report Generator");
            console.log("*******************************************************");
            const results = [];
            const response = await getOpenAIResponse(responseId)
            console.log("");
            console.log("======= Kolabrya-Report-Generator =======");
            console.log("Status                                  *", response?.status);
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
                        await CaseReportGeneratorQueries.updateReport(obj, requestUuid, userId)
                    } else {
                        slack.webhook(JSON.stringify({ action: "Kolabrya Report Generator Status Bad Response", response: response, requestUuid: requestUuid, userId: userId }));
                        const obj = {
                            status: 2
                        }
                        await CaseReportGeneratorQueries.updateReport(obj, requestUuid, userId)
                        slack.webhook(JSON.stringify({ action: "Kolabrya Report Generator Status Failed", response: actualText, status: response?.status, requestUuid: requestUuid, userId: userId }));
                    }
                }
                else if (response?.status == "in_progress") {
                    await CaseReportGeneratorQueries.updateReport({ status: false }, requestUuid, userId)
                }
                else if (response?.status == "queued") {
                    await CaseReportGeneratorQueries.updateReport({ status: false }, requestUuid, userId)
                }
                else {
                    const obj = {
                        status: 2
                    }
                    await CaseReportGeneratorQueries.updateReport(obj, requestUuid, userId)
                    slack.webhook(JSON.stringify({ action: "Kolabrya Report Generator Status Failed", response: response, status: response?.status, requestUuid: requestUuid, userId: userId }));
                }
            }
            else {
                const obj = {
                    status: 2
                }
                await CaseReportGeneratorQueries.updateReport(obj, requestUuid, userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya Report Generator Status Logical Error", response: response, requestUuid: requestUuid, retryCount: retryCount, userId: userId }));
            }
            results.push(response)
            Logger.data.OpenAI({ request: responseId, response: response, requestUuid: requestUuid, retryCount: retryCount, userId: userId, methodName: "updateStatus" }, "Kolabrya-Report-Generator-Update-Status");
            console.log("*********************************************************");
            console.log("Job Completed Update Status For Kolabrya Report Generator");
            console.log("*********************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: results
            };
        } else {
            console.log("***********************************************************");
            console.log("No Record Found Update Status For Kolabrya Report Generator");
            console.log("***********************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }        
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for validate run error kolabrya case report", requestUuid: requestUuid, error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.downloadReport = async (isGroup, groupUsers, groupName, reportUuid, userId) => {
    try {
        if (reportUuid) {
            const count = await CaseReportGeneratorQueries.countReportData(reportUuid, userId)
            if (count <= 0) {
                const data = await CaseReportGeneratorQueries.findReportData(reportUuid, userId)
                if (data.length > 0) {
                    const record = []
                    const timeLineId = data[0]['caseReportGeneratorDetails.timeLineId'];
                    const toc = await CaseReportGeneratorQueries.findReportToc(timeLineId)
                    const parsedResponse = toc[0]?.response;
                    for (const element of data) {
                        record.push(
                            element['caseReportGeneratorDetails.response']
                        )
                    }
                    if (record.length > 0) {
                        const caseName = await CaseNamesQueries.findCasesByIdOnly(data[0].caseId)
                        const fileName = `${caseName[0]?.caseName || reportUuid}.docx`;
                        const makePayload = await CaseReportServices.makeDocxPython(parsedResponse, record);
                        if (makePayload.statusCode == '200' && makePayload.obj.length > 0) {
                            const list = {
                                filename: caseName[0]?.caseName || reportUuid,
                                data: makePayload.obj
                            }              
                            // console.log("list", list);
                            const getDocxResponse = await postDocxPython(list) 
                            Logger.data.OpenAI({ request: list, response: getDocxResponse, requestUuid: reportUuid, userId: userId, methodName: "downloadReport" }, "Getting-Formatted-DOCX-File-From-Python");
                            // console.log("getDocxResponse", getDocxResponse);
                            if (getDocxResponse.statusCode == '200') {
                                return {
                                    message: Strings.SUCCESS,
                                    statusCode: 200,
                                    obj: {
                                        message: Strings.FILE.FILE_CREATED,
                                        fileName: fileName,
                                        requestUuid: reportUuid
                                    }
                                };
                            }else {
                                const text = record.join(' ')
                                const file = await CaseReportServices.writeReport(text, fileName, reportUuid)
                                if (file.statusCode == '200') {
                                    return file
                                } else {
                                    return {
                                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                        statusCode: 400,
                                        obj: {
                                            error: file.obj.error
                                        }
                                    }
                                }
                            }
                        } else {
                            const text = record.join(' ')
                            const file = await CaseReportServices.writeReport(text, fileName, reportUuid)
                            if (file.statusCode == '200') {
                                return file
                            } else {
                                return {
                                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                    statusCode: 400,
                                    obj: {
                                        error: file.obj.error
                                    }
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
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            } else {
                const getId = await CaseReportGeneratorQueries.getReportIdByUuid(reportUuid, userId)
                let percentage = 0;
                if (getId.length > 0) {
                    const getTotal = await CaseReportGeneratorQueries.totalCount(getId[0].id, userId)
                    const getPending = await CaseReportGeneratorQueries.pendingCount(getId[0].id, userId)
                    percentage = Math.floor((getPending / getTotal) * 100)
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        progress: percentage,
                        status: 0
                    }
                }
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in download Report", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.writeReport = async (text, fileName, reportUuid) => {
    try {
        slack.webhook(JSON.stringify({ action: "Failed to generate the case report from Python while creating the DOCX file in Node.js", reportUuid: reportUuid}));
        await makeDirectory(caseReportDirectory)
        const filePath = path.join(caseReportDirectory, fileName);
        const check = await createDocx(filePath, text);        
        if (check.statusCode == '200') {
            slack.webhook(JSON.stringify({ action: "The case report DOCX file was successfully generated in Node.js", reportUuid: reportUuid}));
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.FILE.FILE_CREATED,
                    fileName: fileName,
                    requestUuid: reportUuid
                }
            };
        } else {
            return check
        }
    } catch (error) {
        console.log("Error in write Report", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.runFailedTocData = async () => {
    try {
        const data = await CaseReportGeneratorQueries.startFailedToc();
        if (data.length > 0) {
            console.log("************************************************");
            console.log("Job Started For Posting Failed Kolabrya Toc Data");
            console.log("************************************************");
            const results = [];
            for (const element of data) {
                const count = await CaseReportGeneratorQueries.pendingDataQueueCount(element.caseId, element.userId)
                if (count.length && count[0].count > 0) {
                    console.log("Data Is Still In Queue To Process Not Failed Data For Kolabrya Toc Data", { "requestUuid": element.requestUuid, "caseId": element.caseId, "UserId": element.userId, });
                } else {
                    const result = await CaseReportServices.runChatGPTocRecords(element)
                    results.push(result);
                }
            }
            if (results.length > 0) {
                console.log("**************************************************");
                console.log("Job Completed For Posting Failed Kolabrya Toc Data");
                console.log("**************************************************");
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        results
                    }
                };   
            }
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        } else {
            console.log("********************************************");
            console.log("No Record Found For Failed Kolabrya Toc Data");
            console.log("********************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while start failed record of toc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.runChatGPTocRecords = async (details) => {
    try {
        const results = [];
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for Kolabrya Toc Data", userId: details.userId, requestUuid: details.requestUuid, retryCount: details.retryCount }));        
        console.log("***********************************");
        console.log("Job Started For Failed Kolabrya TOC");
        console.log("***********************************");
        const prompt = JSON.parse(details?.request)
        const response = await createResponse(prompt)
        if (!response.error) {
            if (response?.status === 'queued') {
                const obj = {
                    responseId: response.id,
                    status: false,
                    retryCount: details.retryCount + 1
                }
                await CaseReportGeneratorQueries.update(obj, details.requestUuid, details.userId)
            } else {
                const obj = {
                    status: 2,
                    retryCount: details.retryCount + 1
                }
                await CaseReportGeneratorQueries.update(obj, details.requestUuid, details.userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya TOC Failed Job", response: response, status: response?.status, requestUuid: details.requestUuid, userId: details.userId }));
            }
        }
        else {
            const obj = {
                status: 2,
                retryCount: details.retryCount + 1
            }
            await CaseReportGeneratorQueries.update(obj, details.requestUuid, details.userId)
            slack.webhook(JSON.stringify({ action: "Kolabrya TOC Logical Error At Failure Job", response: response, requestUuid: details.requestUuid, userId: details.userId }));
        }
        results.push(response)
        Logger.data.OpenAI({ request: prompt, response: response, requestUuid: details.requestUuid, retryCount: details.retryCount, userId: details.userId, methodName: "createResponse" }, "Kolabrya-TOC-Failure-Method");
        console.log("*************************************");
        console.log("Job Completed For Failed Kolabrya TOC");
        console.log("*************************************");
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: results
        };

    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for retry runChatGPT kolabrya toc data", error: error.message }));
        console.log("In Catch for retry runChatGPT kolabrya toc data", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.runFailedReport = async () => {
    try {
        const data = await CaseReportGeneratorQueries.startFailedReport();
        if (data.length > 0) {
            console.log("***************************************************");
            console.log("Job Started For Posting Failed Kolabrya Report Data");
            console.log("***************************************************");
            const results = [];
            for (const element of data) {
                const count = await CaseReportGeneratorQueries.reportPendingQueue(element.userId)
                    if (count.length && count[0].count > 0) {
                        console.log("Data Is Still In Queue To Process Not Failed Data For Kolabrya Report Data", { "requestUuid": element.requestUuid, "UserId": element.userId});
                    }else {
                        const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                        if (checkCaseFileAvaiablity.length > 0) {
                            const result = await CaseReportServices.runChatGPReportRecords(element)
                            results.push(result);
                        }
                    }    
            }
            console.log("*****************************************************");
            console.log("Job Completed For Posting Failed Kolabrya Report Data");
            console.log("*****************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("***********************************************");
            console.log("No Record Found For Failed Kolabrya Report Data");
            console.log("***********************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while start failed record of kolabrya report data", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.runChatGPReportRecords = async (details) => {
    try {
        const results = [];
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for Kolabrya Report Generator", userId: details.userId, requestUuid: details.requestUuid, retryCount: details.retryCount }));
        console.log("************************************************");
        console.log("Job Started For Failed Kolabrya Report Generator");
        console.log("************************************************");
        const prompt = JSON.parse(details?.request);
        const response = await createResponse(prompt)
        if (!response.error) {
            if (response?.status === 'queued') {
                const obj = {
                    responseId: response.id,
                    status: false,
                    retryCount: details.retryCount + 1
                }
                await CaseReportGeneratorQueries.updateReport(obj, details.requestUuid, details.userId)
            } else {
                const obj = {
                    status: 2,
                    retryCount: details.retryCount + 1
                }
                await CaseReportGeneratorQueries.updateReport(obj, details.requestUuid, details.userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya Report Generator Failed Job", response: response, status: response?.status, requestUuid: details.requestUuid, userId: details.userId }));
            }
        }
        else {
            const obj = {
                status: 2,
                retryCount: details.retryCount + 1
            }
            await CaseReportGeneratorQueries.updateReport(obj, details.requestUuid, details.userId)
            slack.webhook(JSON.stringify({ action: "Kolabrya Report Generator Logical Error At Failure Job", response: response, requestUuid: details.requestUuid, userId: details.userId }));
        }
        results.push(response)
        Logger.data.OpenAI({ request: prompt, response: response, requestUuid: details.requestUuid, retryCount: details.retryCount, userId: details.userId, methodName: "createResponse" }, "Kolabrya-TOC-Failure-Method");
        console.log("**************************************************");
        console.log("Job Completed For Failed Kolabrya Report Generator");
        console.log("**************************************************");
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: results
        };

    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for retry runChatGPT kolabrya Report Data", error: error.message }));
        console.log("In Catch for retry runChatGPT kolabrya Report Data", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.makeDocxPython = async (list, record) => {
    try {
        const data = JSON.parse(list);
        const allData = [];
        let recordIndex = 0;        
        // Loop through all issues
        for (const issueObj of data.data) {
            // Create a base object with non-array key-value pairs
            const baseObject = {};
            for (const key in issueObj) {
                if (Object.hasOwn(issueObj, key) && !Array.isArray(issueObj[key])) {
                    baseObject[key] = issueObj[key]; // Add non-array keys to the base object
                }
            }

            // Iterate through each key-value pair in the issue object
            for (const key in issueObj) {
                if (Object.hasOwn(issueObj, key) && Array.isArray(issueObj[key])) {
                    // If the value is an array, create separate objects for each element
                    for (const element of issueObj[key]) {
                        allData.push({
                            ...baseObject, // Include the non-array keys
                            [key]: element, // Add the dynamic key-value pair for the current array element
                            "response": record[recordIndex]
                        });
                        recordIndex++;
                    }
                }
            }
        }
        if (allData.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: allData,
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {},
            };
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for make Docx Python", error: error.message }));
        console.log("In Catch for make Docx Python", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message,
            },
        };
    }
};

CaseReportServices.sendPendingDashboardData = async () => {
    try {
        const data = await CaseReportGeneratorQueries.getPendingDataForOpenAI();
        if (data.length > 0) {
            console.log("********************************************************************");
            console.log("Job Started For Sending Data To OpenAI For Kolabrya Report Time-Line");
            console.log("********************************************************************");
            const results = [];
            for (const element of data) {
                if (await CaseReportGeneratorQueries.getPendingDataForOpenAIByUserId(element.caseId, element.userId)) {
                    console.log("Queue Details On OpenAI For Kolabrya Report Time Line", { "requestUuid": element.requestUuid, "caseId": element.caseId, "UserId": element.userId});
                }
                const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                if (checkCaseFileAvaiablity.length > 0) {
                    const result = await CaseReportServices.runChatGPT(element, checkCaseFileAvaiablity[0])
                    results.push(result);
                }
                else {
                    console.log("***********************************************");
                    console.log("Waiting for Vector Store to Upload Kolabrya Toc");
                    console.log("***********************************************");
                }
            }
            console.log("**********************************************************************");
            console.log("Job Completed For Sending Data To OpenAI For Kolabrya Report Time-Line");
            console.log("**********************************************************************");

            if(results.length > 0){
                Logger.data.OpenAI({ request: results, methodName: "sendPendingDashboardData" }, "Send-Pending-Kolabrya-Report-Data");
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
            console.log("*****************************************************");
            console.log("No Record Found For Pending Kolabrya Report Time-Line");
            console.log("*****************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error while running send Pending Kolabrya Report Time-Line",error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseReportServices.runChatGPT = async (details, vectorId) => {
    try {
        const getPrompt = await CaseIntelligentMapQueries.getOpenAIPromptsByType(4);
        if (getPrompt.length > 0) {
            console.log("*************************************************");
            console.log("Job Started For Kolabrya Report TOC Prompt Making");
            console.log("*************************************************");
            const prompt = JSON.parse(getPrompt[0].prompt);
            prompt.tools[0].vector_store_ids = [vectorId]
            prompt.input = details.request       
            const response = await createResponse(prompt)
            if (!response.error) {
                if (response?.status === 'queued') {
                    const obj = {
                        responseId: response.id,
                        status: false,
                        request: JSON.stringify(prompt)
                    }
                    await CaseReportGeneratorQueries.update(obj, details.requestUuid, details.userId)
                } else {
                    const obj = {
                        status: 2,
                        request: JSON.stringify(prompt),
                    }
                    await CaseReportGeneratorQueries.update(obj, details.requestUuid, details.userId)
                    slack.webhook(JSON.stringify({ action: "Kolabrya Report TOC Failed", response: response, status: response?.status, requestUuid: details.requestUuid, userId: details.userId }));
                }
            }
            else {
                const obj = {
                    status: 2,
                    request: JSON.stringify(prompt)
                }
                await CaseReportGeneratorQueries.update(obj, details.requestUuid, details.userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya Report TOC Logical Error", response: response, requestUuid: details.requestUuid, userId: details.userId }));
            }
            Logger.data.OpenAI({ request: prompt, response: response, requestUuid: details.requestUuid, userId: details.userId, methodName: "createResponse" }, "Create-Response-Open-AI-For-Kolabrya-TOC");
            console.log("***************************************************");
            console.log("Job Completed For Kolabrya Report TOC Prompt Making");
            console.log("***************************************************");
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
            console.log("No Response API Prompt Found For Kolabrya Report TOC ");
            slack.webhook(JSON.stringify({ action: "No Response API Prompt Found For Kolabrya Report TOC" }));
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT Kolabrya Report Time-Line", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = CaseReportServices;