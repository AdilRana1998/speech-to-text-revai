const CaseIntelligentMapServices = {};
const {
    CaseIntelligentMapQueries
} = require('../queries');
const {
    showQueries
} = require('../services/caseFile.services');
const { Strings, Logger } = require('../../utils')
const {
    createResponse
} = require('../external/ChatGPT')
const { slack } = require('../../utils/Webhook');
const retryLimit = process.env.API_CALL_LIMITS;

CaseIntelligentMapServices.findRecord = async () => {
    try {
        const data = await CaseIntelligentMapQueries.getPendingData();
        if (data.length > 0) {
            console.log("****************************************");
            console.log("Job Started For Kolabrya Intelligent Map");
            console.log("****************************************");
            const results = [];
            for (const element of data) {
                const obj = {
                    isIntelligentMap: false
                }
                await CaseIntelligentMapQueries.updateCaseById(obj, element.caseId)
                results.push(await CaseIntelligentMapServices.makePrompt(element))
            }
            console.log("******************************************");
            console.log("Job Completed For Kolabrya Intelligent Map");
            console.log("******************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: results
            };
        } else {
            console.log("********************************************");
            console.log("No Record Found For Kolabrya Intelligent Map");
            console.log("********************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in findRecord for intellignet map", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseIntelligentMapServices.makePrompt = async (record) => {
    try {
        const data = await CaseIntelligentMapQueries.getOpenAIPromptsByType(1);
        if (data.length > 0) {
            console.log("******************************************************");
            console.log("Job Started For Kolabrya Intelligent Map Prompt Making");
            console.log("******************************************************");
            const findAllegations = await showQueries(record.caseId, record.userId)
            let allegation
            if (findAllegations.statusCode == 200 && findAllegations.obj.length > 0) {
                for (const element of findAllegations.obj) {
                    if (element.questions[0].response.form === true) {
                       allegation = element.questions[0].response.answer
                    }       
                }
            }
            const results = [];
            const prompt = JSON.parse(data[0].prompt)
            prompt.tools[0].vector_store_ids = [record.vectorId]
            prompt.input = prompt.input +' ' + allegation
            const response = await createResponse(prompt)
            if (response?.status === 'completed') {
                const obj = {
                    isIntelligentMap: true
                }
                await CaseIntelligentMapQueries.updateCaseById(obj, record.caseId)
                const create = {
                    responseId: response?.id,
                    caseId: record.caseId,
                    userId: record.userId,
                    request: JSON.stringify(prompt),
                    response: response?.output[1]?.content[0]?.text,
                    status: true,
                }
                await CaseIntelligentMapQueries.create(create, record.caseId)
            } else {
                const create = {
                    caseId: record.caseId,
                    userId: record.userId,
                    request: JSON.stringify(prompt),
                    status: 2,
                }
                await CaseIntelligentMapQueries.create(create, record.caseId)

                //In case of any response rather than compelted
                const obj = {
                    isIntelligentMap: 2
                }
                await CaseIntelligentMapQueries.updateCaseById(obj, record.caseId)
                slack.webhook(JSON.stringify({ action: "Kolabrya Intelligent Map Failure", response: response?.output?.[0]?.status, caseUuid: record.caseUuid, userId: record.userId }));
            }
            results.push(response)
            Logger.data.OpenAI({ request: prompt, response: response, caseUuid: record.caseUuid, userId: record.userId, methodName: "createResponse" }, "Create-Response-Open-AI");
            console.log("********************************************************");
            console.log("Job Completed For Kolabrya Intelligent Map Prompt Making");
            console.log("********************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: results
            };
        } else {
            return {
                message: Strings.PROMPT.NO_PROMPT_FOUND,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in findRecord for intellignet map", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseIntelligentMapServices.getIntelligentMap = async (caseUuid, groupUsers, userId) => {
    try {
        if (caseUuid) {
            let data
            if (groupUsers?.length > 0) {
                data = await CaseIntelligentMapQueries.getSummaryDataOnComplete(caseUuid, groupUsers);
            } else {
                data = await CaseIntelligentMapQueries.getSummaryDataOnComplete(caseUuid, userId);
            }
            if (data.length > 0) {
                if (data[0].status == '0' && data[0].isIntelligentMap == '0' && data[0].retryCount == 0) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: [{
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            status: 0
                        }]
                    }
                }
                else if (data[0].status == '1' && (data[0].isIntelligentMap == null || data[0].isIntelligentMap == '0')) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: [{
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            status: 0
                        }]
                    }
                }
                else if (data[0].status == '2' || data[0].isIntelligentMap == '2' && data[0].retryCount < retryLimit) {
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: {
                            retry: true,
                            caseUuid: caseUuid
                        }
                    }
                }
                else if (data[0].status == '2' && data[0].retryCount == retryLimit && data[0].isIntelligentMap == '2') {
                    return {
                        message: Strings.ERROR.ERROR_LOGOUT,
                        statusCode: 400,
                        obj: {
                            retry: false
                        }
                    }
                }
                else if (data[0].status == '1' && data[0].retryCount <= retryLimit && data[0].isIntelligentMap == '1') {
                    data[0].response = JSON.parse(data[0]?.response)
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: data
                    };
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error While get Intelligent Map", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseIntelligentMapServices.openAIWebhook = async (record) => {
    try {
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            // obj: [record]
            obj: []
        };
    } catch (error) {
        console.log("Error While open AI Webhook", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error
            }
        }
    }
}

CaseIntelligentMapServices.findFailedRecord = async () => {
    try {
        const data = await CaseIntelligentMapQueries.getPendingFailedData();
        if (data.length > 0) {
            console.log("***********************************************");
            console.log("Job Started For Failed Kolabrya Intelligent Map");
            console.log("***********************************************");
            const results = [];
            for (const element of data) {
                const obj = {
                    isIntelligentMap: false
                }
                await CaseIntelligentMapQueries.updateCaseById(obj, element.caseId)
                results.push(await CaseIntelligentMapServices.makePromptForFailed(element))
            }
            console.log("*************************************************");
            console.log("Job Completed For Failed Kolabrya Intelligent Map");
            console.log("*************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: results
            };
        } else {
            console.log("***************************************************");
            console.log("No Record Found For Failed Kolabrya Intelligent Map");
            console.log("***************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in find Record for failed intellignet map", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseIntelligentMapServices.makePromptForFailed = async (record) => {
    try {
        console.log("*************************************************************");
        console.log("Job Started For Failed Kolabrya Intelligent Map Prompt Making");
        console.log("*************************************************************");
        slack.webhook(JSON.stringify({ action: "Retrying Kolabrya Intelligent Map Failure", retryCount: record.retryCount, caseUuid: record.caseUuid, userId: record.userId }));
        const results = [];
        const prompt = JSON.parse(record?.request)
        const response = await createResponse(prompt)
        if (response.output[0].status === 'completed') {
            const obj = {
                isIntelligentMap: true
            }
            await CaseIntelligentMapQueries.updateCaseById(obj, record.caseId)
            const create = {
                responseId: response?.id,
                response: response.output[0].content[0].text,
                retryCount: record.retryCount + 1,
                status: true,
            }
            await CaseIntelligentMapQueries.updateIntellignetMapByRequestUuid(create, record.requestUuid)
        } else {
            const create = {
                status: 2,
                retryCount: record.retryCount + 1,
            }
            await CaseIntelligentMapQueries.updateIntellignetMapByRequestUuid(create, record.requestUuid)
            //In case of any response rather than compelted
            const obj = {
                isIntelligentMap: 2
            }
            await CaseIntelligentMapQueries.updateCaseById(obj, record.caseId)
            slack.webhook(JSON.stringify({ action: "Kolabrya Intelligent Map Failure While Retry", response: response?.output?.[0]?.status, caseUuid: record.caseUuid, userId: record.userId }));
        }
        results.push(response)
        Logger.data.OpenAI({ request: prompt, response: response, caseUuid: record.caseUuid, userId: record.userId, methodName: "createResponse" }, "Create-Response-Open-AI-Of-Failure");
        console.log("***************************************************************");
        console.log("Job Completed For Failed Kolabrya Intelligent Map Prompt Making");
        console.log("***************************************************************");
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: results
        };

    } catch (error) {
        console.log("Error in make Prompt For Failed intellignet map", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = CaseIntelligentMapServices;