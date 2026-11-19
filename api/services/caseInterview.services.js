const CaseInterViewServices = {};
const {
    CaseNamesQueries,
    CaseInterviewQueries,
    CaseReportGeneratorQueries,
    JsonAssistantQueries,
    CaseAssigneesQueries,
    UserQueries,
    RoomQueries,
    UserGroupQueries
} = require('../queries');
const {
    fetchOnlyCase
} = require('../services/caseFile.services');
const {
    fetchOnlyCaseAssignee
} = require('../services/caseAssignees.services');
const {
    findFileForCase
} = require('../services/kolabryaAnalysis.services');
const {
    generateAzureRecallUrl
} = require('../services/rooms.services');
const {
    runThreads,
    getAssistantResponse,
    makeMessage,
    validateThreadStatus,
    makeThreadsForReport,
    makeThreads,
    updateBotRecall,
    deleteBotRecall
} = require('../external/ChatGPT')
const Encryptions = require('../../utils/Encryptions');
const { Strings, Logger } = require('../../utils')
const currentDate = new Date();
const moment = require('moment');
const caseFileIncAssistant = process.env.KOLABRYA_CASE_FILE_INC;
const meetingBatchLimit = Number(process.env.MEETING_BATCH_LIMIT);
const caseFileMeetingInc = process.env.KOLABRYA_CASE_FILE_MEETING_INC;
const crypto = require('crypto');
const {
    responseCleaningForAnalysis,
} = require('../services/chatGpt.services')
const { slack } = require('./../../utils/Webhook');
const { updateFrontend } = require('../external/index')
const { azureRecallHealth } = require("../../utils/Azure");   

CaseInterViewServices.createForm = async (record) => {
    try {
        if (record.length > 0) {
            for (let index = 0; index < record.length; index++) {
                const element = record[index];
                await CaseInterviewQueries.addFormFields(element);
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in create interview form", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.createType = async (record) => {
    try {
        if (record.length > 0) {
            for (let index = 0; index < record.length; index++) {
                const element = record[index];
                await CaseInterviewQueries.addInterviewTypes(element);
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in create interview type", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.getForm = async (caseUuid, isFirm, firmAssistant, firmUsers, groupUsers, userId) => {
    try {
        let getCaseDetails
        if (isFirm && firmAssistant && firmUsers?.length > 0 && userId) {
            getCaseDetails = await fetchOnlyCaseAssignee(caseUuid, isFirm, firmAssistant, firmUsers, userId)
        }
        // else if(groupUsers?.length > 0) {
        //     getCaseDetails = await fetchOnlyCase(groupUsers, caseUuid, userId)
        // }
        else {
            getCaseDetails = await fetchOnlyCase('', caseUuid, userId)
        }
        const records = await CaseInterviewQueries.getInterviewForm();
        if (records.length > 0 && getCaseDetails.statusCode == '200' && getCaseDetails.obj.length > 0) {
            const fileNames = getCaseDetails.obj[0].caseFiles;
            const groupedRecords = await CaseInterViewServices.groupInterviewDetails(records, fileNames)
            return groupedRecords
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error while get form", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseInterViewServices.groupInterviewDetails = async (records, fileNames) => {
    try {
        const groupedRecords = records.reduce((acc, item) => {
            const { requestUuid, title, type, required, key, placeholder } = item;
            if (item["interviewTypeDetails.requestUuid"]) {
                const interviewDetail = {
                    "requestUuid": item["interviewTypeDetails.requestUuid"],
                    "title": item["interviewTypeDetails.title"]
                };
                const existingRecord = acc.find(record => record.requestUuid === requestUuid);
                if (existingRecord) {
                    existingRecord.interviewTypeDetails.push(interviewDetail);
                } else {
                    acc.push({
                        requestUuid,
                        title,
                        key,
                        type,
                        required: required === 1,
                        placeholder,
                        interviewTypeDetails: [interviewDetail]
                    });
                }
            } else {
                acc.push({
                    requestUuid,
                    title,
                    key,
                    type,
                    required: required === 1,
                    placeholder
                });
            }
            return acc;
        }, []);
        // Adding fileNames to "Select Files For Cross-Examination"
        const fileRecord = groupedRecords.find(record => record.type === "multi-dropdown");
        if (fileRecord && fileNames.length > 0) {
            fileRecord.fileNames = fileNames.map(file => ({
                fileUuid: file.fileUuid,
                fileName: file.fileName
            }));
        }
        if (groupedRecords.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: groupedRecords
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error while group Interview Details", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseInterViewServices.createInterview = async (interviewType, caseData, interviewRole, interviewName, interviewGoal, interviewQuestion, interviewDate, interviewLink, isFirm, firmAssistant, firmId, userId) => {
    try {
        if (interviewType && caseData && interviewRole && interviewName && userId) {
            const record = await findFileForCase(caseData, isFirm, firmAssistant, firmId, '', userId)            
            if (record.statusCode == '200' && record.obj.length > 0) {
                const caseId = record.obj[1];
                const findInterviewtypeId = await CaseInterviewQueries.findinterviewTypeByUuid(interviewType)
                if (findInterviewtypeId.length > 0) {
                    const interviewType = findInterviewtypeId[0].id
                    const find = await CaseInterViewServices.checkDuplicate(interviewName, caseId, userId)
                    if (true) {
                        const formattedDate = moment(interviewDate, moment.ISO_8601, true).isValid()
                            ? moment(interviewDate).format("YYYY-MM-DD HH:mm:ss")
                            : null;
                        const obj = {
                            fileDetails: JSON.stringify(caseData),
                            interviewRole: interviewRole,
                            interviewName: interviewName,
                            interviewGoal: interviewGoal,
                            interviewQuestion: JSON.stringify(interviewQuestion),
                            interviewDate: formattedDate,
                            interviewLink: interviewLink,
                            interviewType: interviewType,
                            caseId: caseId,
                            userId: userId
                        }
                        //ad the check of dupicate
                        const create = await CaseInterviewQueries.addInterview(obj)
                        if (create) {
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                                    requestUuid: create[0]
                                }
                            }
                        } else {
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 400,
                                obj: {
                                    error: record
                                }
                            }
                        }
                    } else {
                        return {
                            message: Strings.ERROR.RECORD_ALREADY_EXSIST,
                            statusCode: 400,
                            obj: {}
                        };
                    }
                } else {
                    //no interview id found
                    return {
                        message: Strings.UNVALID_STATUS,
                        statusCode: 400,
                        obj: {}
                    }
                }
            }
            else {
                return record;
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in create interview", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.checkDuplicate = async (interviewName, caseId, userId) => {
    try {
        const data = Encryptions.encryptSensitiveData(interviewName);
        const existingCase = await CaseInterviewQueries.checkDuplicate(data, caseId, userId)
        if (existingCase) {
            return false;
        }
        else {
            return true;
        }

    } catch (error) {
        console.log("Error while check Duplicate", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseInterViewServices.getInterview = async (isFirm, firmId, firmAssistant, caseUuid, userId) => {
    try {
        let getData;
        if (isFirm == true && firmId && firmAssistant?.length > 0) {
            getData = await CaseAssigneesQueries.verifyAssistantCaseAssignessByCaseUuid(caseUuid, firmAssistant, userId)
            if (getData?.length <= 0) {
                getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
            }
        } else {
            getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
        }
        if (getData.length > 0) {
            const caseId = getData[0].id
            const records = await CaseInterviewQueries.getInterviewByUuid(caseId, userId);
            if (records.length > 0) {
                for (const element of records) {

                    console.log("botId:", element.botId);
                    console.log("isEnhanced:", element.isEnhanced);
                    console.log("botStatus:", element.botStatus);
                    

                    if (element.botId) {
                        if (element.isEnhanced === 0) {
                            element.transcriptStatus = 0; // hit the api on every 15 second
                        } else if (element.isEnhanced === 1) {
                            element.transcriptStatus = 1; // Show the transcript after enhancment
                        } else if (element.isEnhanced === 2) {
                            element.transcriptStatus = 1; // Show the transcript that was not enhanced
                        } else if (element.isEnhanced == null) {
                            element.transcriptStatus = 0; // hit the api on every 15 second
                        }
                        if (element.botStatus === null) {
                            element.botStatus = 1; // for disable(bot not joined yet due to time) 3:40
                        } else if (element.botStatus === 'in_call_recording') {
                            element.botStatus = 2; // for meeting in progress (bot joined the meeting and user can seee the real time transcript)
                        } else if (element.botStatus === 'done') {
                            element.botStatus = 3; // meeting completed (bot leaved the meeting and now you can see the meeting history)
                        }
                    }
                    element.interviewQuestion = JSON.parse(element.interviewQuestion)
                    element.interviewDate = element.interviewDate != null ? moment(element.interviewDate).format("YYYY-MM-DD HH:mm:ss") : '';
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: records
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


    } catch (error) {
        console.log("Error while get Interview", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseInterViewServices.interviewDetails = async (interviewUuid, userId) => {
    try {
        const records = await CaseInterviewQueries.interviewDetails(interviewUuid, userId);
        if (records.length > 0) {
            let enableMedia = false, videoUrl;
            const getVideoType = await UserQueries.getVideoType(userId)
            if (getVideoType[0]?.recallMediaEnable === 1) {
                enableMedia = true
                //recall video url
                const botId = records[0]?.botId
                const fileName = `${botId}.mp4`
                if (records[0]?.recallVideoStatus === 1 && azureRecallHealth) {
                    const list = await generateAzureRecallUrl(records[0]?.startTime, records[0]?.endTime, fileName)
                    if (list.statusCode == 200 && list?.obj?.videoUrl) {
                        videoUrl = list?.obj?.videoUrl
                    } else {
                        videoUrl = ""
                    }
                } else {
                    const baseUrl = process.env.URL_BACKEND.replace(/\/api\/?$/, "");
                    videoUrl = `${baseUrl}/videos/${fileName}`
                }
            }
            let transcript
            if (records[0].isEnhanced == 1 && records[0].enhancedTranscript != null) {
                transcript = records[0].enhancedTranscript
            } else {
                transcript = records[0].transcript //have to add the enhance transcript
            }
            const all = await CaseInterviewQueries.getAllIncById(records[0].id);
            const record = []
            if (all.length > 0) {
                for (const element of all) {
                    const response = JSON.parse(element.response)
                    const requestUuid = element.requestUuid
                    if (response?.Matches?.length > 0 || response?.Inconsistencies?.length > 0) {
                        const transformedResponse = {
                            Matches: response.Matches.map(({ Status, ...match }) => ({
                                ...match,
                                status: "success",
                            })),
                            Inconsistencies: response.Inconsistencies.map(({ Status, ...inconsistency }) => ({
                                ...inconsistency,
                                status: "error",
                            }))
                        };
                        // console.log("Found the record");
                        record.push({
                            requestUuid,
                            ...transformedResponse,
                        });
                    } else {
                        // console.log("Empty response from openAI {}", response);
                    }
                }
                if (record.length > 0) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            fileInc: record,
                            transcript: records[0].transcript,
                            coreTranscript: records[0]?.coreTranscript != null ? JSON.parse(records[0]?.coreTranscript) : "",
                            botId: records[0]?.botId,
                            enableMedia: enableMedia,
                            videoUrl: videoUrl
                        }
                    };
                }
                else if (transcript) {
                    console.log("2");
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            fileInc: record,
                            transcript: records[0].transcript,
                            coreTranscript: records[0]?.coreTranscript != null ? JSON.parse(records[0]?.coreTranscript) : "",
                            botId: records[0]?.botId,
                            enableMedia: enableMedia,
                            videoUrl: videoUrl
                        }
                    };
                }
                else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    };
                }
            }
            else if (transcript) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        fileInc: record,
                        transcript: records[0].transcript,
                        coreTranscript: records[0]?.coreTranscript != null ? JSON.parse(records[0]?.coreTranscript) : "",
                        botId: records[0]?.botId,
                        enableMedia: enableMedia,
                        videoUrl: videoUrl
                    }
                };
            }
            else {
                console.log("No Record found for meeting inconsistencies");
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
    } catch (error) {
        console.log("Error while get interview Details", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseInterViewServices.deleteInterview = async (isFirm, firmId, firmAssistant, requestUuid, caseUuid, userId) => {
    try {
        let getData
        if (isFirm == true && firmId && firmAssistant?.length > 0) {
            getData = await CaseAssigneesQueries.verifyAssistantCaseAssignessByCaseUuid(caseUuid, firmAssistant, userId)
            if (getData?.length <= 0) {
                getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
            }
        } else {
            getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
        }
        if (getData.length > 0) {
            const caseId = getData[0].id
            const obj = {
                status: false,
                updatedAt: currentDate
            }
            const getInterview = await CaseInterviewQueries.getInterview(requestUuid, caseId, userId);
            const records = await CaseInterviewQueries.deActivateInterview(obj, requestUuid, caseId, userId);
            if (records[0] == '1') {
                if (getInterview.length > 0 && getInterview[0]?.botId && getInterview[0]?.botStatus === null && getInterview[0]?.interviewDate !== null) {
                    const deleteBot = await deleteBotRecall(getInterview[0]?.botId)
                    Logger.data.ReCall({ response: deleteBot, botId: getInterview[0]?.botId }, "delete-bot")
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_DELETED_SUCCESS
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
            };
        }
    } catch (error) {
        console.log("Error while get Interview", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseInterViewServices.fetchInterview = async (requestUuid, caseUuid, userId) => {
    try {
        const getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
        if (getData.length > 0) {
            const caseId = getData[0].id
            const records = await CaseInterviewQueries.getInterview(requestUuid, caseId, userId);
            if (records.length > 0) {
                for (const element of records) {
                    element.interviewQuestion = JSON.parse(element.interviewQuestion)
                    element.interviewDate = element.interviewDate != null ? moment(element.interviewDate).format("YYYY-MM-DD HH:mm:ss") : '';
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: records
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
    } catch (error) {
        console.log("Error while fetch Interview", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseInterViewServices.editInterview = async (interviewType, caseData, interviewRole, interviewName, interviewGoal, interviewQuestion, interviewDate, interviewLink, joinAt, requestUuid, caseUuid, userId, isFirm, firmId, firmAssistant) => {
    try {
        const caseUpdatePromises = [];
        let getData
        if (isFirm == true && firmId && firmAssistant?.length > 0) {
            getData = await CaseAssigneesQueries.verifyAssistantCaseAssignessByCaseUuid(caseUuid, firmAssistant, userId)
            if (getData?.length <= 0) {
                getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
            }
        } else {
            getData = await CaseNamesQueries.findCaseId(caseUuid, userId)
        }
        if (getData.length > 0) {
            const caseId = getData[0].id
            const records = await CaseInterviewQueries.getInterview(requestUuid, caseId, userId);            
            if (records.length > 0) {
                if (interviewType) {
                    const findInterviewtypeId = await CaseInterviewQueries.findinterviewTypeByUuid(interviewType)
                    if (findInterviewtypeId.length > 0) {
                        const interviewType = findInterviewtypeId[0].id
                        const obj = {
                            interviewType: interviewType,
                            isUpdated: true,
                            isPromptProcessed: false
                        }
                        caseUpdatePromises.push(CaseInterviewQueries.updateInterview(obj, requestUuid, caseId, userId));
                    }
                }
                if (interviewRole) {
                    const obj = {
                        interviewRole: interviewRole,
                        isUpdated: true,
                        isPromptProcessed: false
                    }
                    caseUpdatePromises.push(CaseInterviewQueries.updateInterview(obj, requestUuid, caseId, userId));
                }
                if (interviewName) {
                    const obj = {
                        interviewName: interviewName,
                        isUpdated: true,
                        isPromptProcessed: false
                    }
                    caseUpdatePromises.push(CaseInterviewQueries.updateInterview(obj, requestUuid, caseId, userId));
                }
                if (interviewGoal) {
                    const obj = {
                        interviewGoal: interviewGoal
                    }
                    caseUpdatePromises.push(CaseInterviewQueries.updateInterview(obj, requestUuid, caseId, userId));
                }
                if (interviewQuestion) {
                    const obj = {
                        interviewQuestion: JSON.stringify(interviewQuestion)
                    }
                    caseUpdatePromises.push(CaseInterviewQueries.updateInterview(obj, requestUuid, caseId, userId));
                }
                if (interviewDate && joinAt) {
                    const formattedDate = moment(interviewDate, moment.ISO_8601, true).isValid()
                        ? moment(interviewDate).format("YYYY-MM-DD HH:mm:ss")
                        : null;
                        const obj = {
                            interviewDate: formattedDate,
                        }
                        console.log("records interviewDate case", records);
                        console.log("botId", records[0]?.botId);
                        console.log("botStatus", records[0]?.botStatus);
                        console.log("interviewDate", records[0]?.interviewDate);
                        if (records[0]?.botId && records[0]?.botStatus === null && records[0]?.interviewDate !== null) {
                            console.log("formattedDate", formattedDate);
                            console.log("interviewDate", interviewDate);                            
                            console.log("joinAt edit", joinAt);                            
                            const localTime = moment.parseZone(joinAt);
                            const recallObj = {
                                join_at: localTime.toISOString()
                            }
                            const updateRecall = await updateBotRecall(records[0]?.botId, recallObj)
                            Logger.data.ReCall({ request: recallObj, response: updateRecall, botId: records[0]?.botId }, "update-bot-join-time")

                            console.log("updateRecall interviewDate", updateRecall);
                        }

                    caseUpdatePromises.push(CaseInterviewQueries.updateInterview(obj, requestUuid, caseId, userId));
                }
                if (interviewLink) {
                    const obj = {
                        interviewLink: interviewLink
                    }
                    //if interview date is there and botStatus was null
                    console.log("records interviewDate case", records);
                    console.log("botId", records[0]?.botId);
                    console.log("botStatus", records[0]?.botStatus);
                    console.log("interviewDate", records[0]?.interviewDate);
                    if (records[0]?.botId && records[0]?.botStatus === null && records[0]?.interviewDate !== null) {
                        const recallObj = {
                            meeting_url: interviewLink
                        }
                        const updateRecall = await updateBotRecall(records[0]?.botId, recallObj);
                        Logger.data.ReCall({ request: recallObj, response: updateRecall, botId: records[0]?.botId }, "update-bot-meeting-link")
                        console.log("updateRecall meeting link", updateRecall);
                    }
                    caseUpdatePromises.push(CaseInterviewQueries.updateInterview(obj, requestUuid, caseId, userId));
                }
                if (caseData) {
                    const obj = {
                        fileDetails: JSON.stringify(caseData)
                    }
                    caseUpdatePromises.push(CaseInterviewQueries.updateInterview(obj, requestUuid, caseId, userId));
                }
                await Promise.all(caseUpdatePromises);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
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
    } catch (error) {
        console.log("Error while fetch Interview", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseInterViewServices.startCaseInterviewFileInc = async () => {
    try {
        const data = await CaseInterviewQueries.getPendingData();
        if (data.length > 0) {
            console.log("***********************************************************");
            console.log("Job Started For Pending Case Interview File Inconsistencies");
            console.log("***********************************************************");
            const results = [];
            for (const element of data) {
                if (await CaseInterviewQueries.getPendingReportsByUserId(element.userId)) {
                    console.log("Queue Details Case Interview File Inconsistencies", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else {
                    const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const assistantId = caseFileIncAssistant;
                        const result = await CaseInterViewServices.runChatGPT(assistantId, element, checkCaseFileAvaiablity[0])
                        results.push(result);
                    }
                    else {
                        console.log("***********************************");
                        console.log("Waiting for Vector Store to Upload");
                        console.log("***********************************");
                    }
                }
            }
            console.log("*************************************************************");
            console.log("Job Completed For Pending Case Interview File Inconsistencies");
            console.log("*************************************************************");
            Logger.data.OpenAI({ request: results, methodName: "startCaseInterviewFileInc" }, "Sending-Case-Interview-File-Inconsistencies-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("***************************************************************");
            console.log("No Record Found For Pending Case Interview File Inconsistencies");
            console.log("***************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while start Case Interview File Inc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.runChatGPT = async (assistantId, details, vectorId) => {
    try {
        const getPayload = {
            tool_resources: {
                "file_search": {
                    "vector_store_ids": [vectorId]
                }
            }
        }
        const getThreadId = await CaseInterViewServices.createOrFindThread(getPayload, details.userId);
        Logger.data.OpenAI({ request: getPayload, response: getThreadId, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "createOrFindThread" }, "Add-Content-In-Thread-For-Case-Interview-File-Inconsistencies");
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
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: details.userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Case-Interview-File-Inconsistencies");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Case-Interview-File-Inconsistencies-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0
                    }
                    const getId = await CaseInterviewQueries.update(data, details.requestUuid, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for case Interview file Inc", response: threadStep, requestUuid: details.requestUuid, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for case Interview file Inc", response: addMessage, requestUuid: details.requestUuid, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "getThreadId for case Interview file Inc", response: getThreadId, requestUuid: details.requestUuid, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }

    } catch (error) {
        console.log("error", error);
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT for case Interview file Inc", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.createOrFindThread = async (record, userId) => {
    try {
        // enable it when you want to use thread memory
        // const findThreadId = await CaseInterviewQueries.findThreadId(userId);
        // const data = findThreadId?.threadId;
        if (false) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Case-Interview-File-Inconsistencies");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Case-Interview-File-Inconsistencies-Error");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: data
                }
            }
        } else {
            const threads = await makeThreadsForReport(JSON.stringify(record))
            if (threads.id && threads.id != '') {
                console.log("***************************************************************************************************");
                console.log("Creating a New thread_id for Case Interview File Inconsistencies =>", threads.id);
                console.log("***************************************************************************************************");
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Case Interview File Inconsistencies" }, "Create-Thread-For-Case-Interview-File-Inconsistencies-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Case Interview File Inconsistencies" }, "Create-Thread-For-Case-Interview-File-Inconsistencies-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Case Interview File Inconsistencies", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for case Interview file Inc', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.createOrFindThreadFileMeetingInc = async (interviewIncId, roomId, userId) => {
    try {
        // enable it when you want to use thread memory
        const findThreadId = await CaseInterviewQueries.findThreadId(interviewIncId, roomId, userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Case-Interview-File-Meeting-Inconsistencies");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Open-AI-Case-Interview-File-Meeting-Inconsistencies-Error");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: data
                }
            }
        } else {
            const threads = await makeThreads()
            if (threads.id && threads.id != '') {
                console.log("***************************************************************************************************");
                console.log("Creating a New thread_id for Case Interview File Meeting Inconsistencies =>", threads.id);
                console.log("***************************************************************************************************");
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Case Interview File Meeting Inconsistencies" }, "Create-Thread-For-Case-Interview-File-Meeting-Inconsistencies-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "make Threads For Case Interview File Meeting Inconsistencies" }, "Create-Thread-For-Case-Interview-File-Meeting-Inconsistencies-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Case Interview File Meeting Inconsistencies", response: threads, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for case Interview file Meeting Inc', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}
 
CaseInterViewServices.postIncPrompt = async () => {
    try {
        const data = await CaseInterviewQueries.getDetails();
        if (data.length > 0) {
            console.log("***********************************************************************");
            console.log("Job Started For Getting Records To Make Prompt For File Inconsistencies");
            console.log("***********************************************************************");
            const results = [];
            let findFile
            for (const element of data) {
                const interviewType = element['interviewTypeInfo.title'];
                const interviewName = element.interviewName;
                const interviewRole = element.interviewRole;
                const fileDetails = element.fileDetails;
                const caseId = element.caseId;
                const userId = element.userId;
                const interviewId = element.id;
                const requestUuid = element.requestUuid;
                //add the if else check for prompt handling
                const promptOne = await UserQueries.getPromptByType(36);
                const typeOne = JSON.parse(promptOne[0].prompt);
                const promptTwo = await UserQueries.getPromptByType(35);
                const getEmailAddress = await UserQueries.getUser(userId)
                if (getEmailAddress?.firmId) {
                    const firmAssistant = [];
                    const getFirmDetails = await UserGroupQueries.getAllFirmRecordsById(getEmailAddress?.firmId);
                    for (let index = 0; index < getFirmDetails.length; index++) {
                        const element = getFirmDetails[index];
                        if (element.userTypeId == 3){
                            firmAssistant.push(element.userId);
                        }
                    }
                    findFile = await findFileForCase(JSON.parse(fileDetails), true, firmAssistant, getEmailAddress?.firmId, '', userId)
                    // console.log("findFile 1 firm user", findFile);
                } else {
                    findFile = await findFileForCase(JSON.parse(fileDetails), '', '', '', '', userId)
                    // console.log("findFile 2 individual user", findFile);
                }

                const typeTwo = JSON.parse(promptTwo[0].prompt);
                const statOne = findFile.obj[0].map(f => f).join(", ");
                const sentence =
                    typeOne[0] +
                    interviewName +
                    typeOne[1] +
                    interviewRole +
                    typeOne[2];
                const obj = {
                    request: sentence,
                    interviewId: interviewId,
                    userId: userId,
                }
                const record = await CaseInterviewQueries.addFileInc(obj);
                if (record) {
                    const list = {
                        isPromptProcessed: true
                    }
                    CaseInterviewQueries.updateInterview(list, requestUuid, caseId, userId)
                }
                results.push(element);
            }
            console.log("*************************************************************************");
            console.log("Job Completed For Getting Records To Make Prompt For File Inconsistencies");
            console.log("*************************************************************************");
            Logger.data.OpenAI({ request: results, methodName: "postIncPrompt" }, "postIncPrompt");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("***************************************************************************");
            console.log("No Record Found For Getting Records To Make Prompt For File Inconsistencies");
            console.log("***************************************************************************");
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

CaseInterViewServices.runCaseInterviewFileInc = async () => {
    try {
        const data = await CaseInterviewQueries.startCaseInterviewFileIncs();
        if (data.length > 0) {
            console.log("****************************************");
            console.log("Job Started For Case Interview File Incs");
            console.log("****************************************");
            const results = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const result = await CaseInterViewServices.startThread(element.threadId, element.runId, element.requestUuid, element.userId)
                results.push(result);
            }
            console.log("******************************************");
            console.log("Job Completed For Case Interview File Incs");
            console.log("******************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("********************************************");
            console.log("No Record Found For Case Interview File Incs");
            console.log("********************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while run Case Interview File Inc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.startThread = async (threadId, runId, requestUuid, userId) => {
    try {
        const validateStatus = await validateThreadStatus(threadId, runId);
        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Retrive-Run-Case-Interview-File-Incs")
        data = {
            jsonResponse: JSON.stringify(validateStatus)
        }
        await CaseInterviewQueries.updateThreadById(data, runId);
        if (!validateStatus.error) {
            const getCompleteStatus = validateStatus.status == 'completed';
            const getInProgressStatus = validateStatus.status == 'in_progress';
            const getFailedStatus = validateStatus.status == 'failed';
            const getExpiredStatus = validateStatus.status == 'expired';
            const getQueuedStatus = validateStatus.status == 'queued';

            console.log("");
            console.log("===== Case-Interview-File-Incs =====");
            console.log("getCompleteStatus            *", getCompleteStatus);
            console.log("getInProgressStatus         **", getInProgressStatus);
            console.log("getFailedStatus            ***", getFailedStatus);
            console.log("getExpiredStatus          ****", getExpiredStatus);
            console.log("getQueuedStatus          *****", getQueuedStatus);
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
                Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Case-Interview-File-Incs-Assistant-Open-AI")
                await CaseInterviewQueries.updateThreadById(obj, runId);
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
                await CaseInterviewQueries.updateThreadById(obj, runId);
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
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Failed-Case-Interview-File-Incs-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Case-Interview-File-Incs-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                console.log("validate run failed Case-Interview-File-Incs", validateStatus);
                console.log("check status", validateStatus.status);
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseInterviewQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else if (getExpiredStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Expired-Case-Interview-File-Incs-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Case-Interview-File-Incs-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseInterviewQueries.updateThreadById(obj, runId);
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
                await CaseInterviewQueries.updateThreadById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
        } else {
            console.log("validate run error Case Interview File Incs Assistant", validateStatus?.error);
            slack.webhook(JSON.stringify({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }), "validate run error Case-Interview-File-Incs-Assistant");
            slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus?.error}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            obj = {
                retry: true,
                status: 2,
                response: null,
                jsonResponse: JSON.stringify(validateStatus?.error),
                updatedAt: currentDate
            }
            await CaseInterviewQueries.updateThreadById(obj, runId);
            return {
                message: Strings.ERROR.ERROR_RE_TRY,
                statusCode: 400,
                obj: obj
            }
        }
    } catch (error) {
        console.log("Error while start Thread", error);
        slack.webhook(JSON.stringify({ action: "In Catch for startThread case interview file incs assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.getRoomData = async () => {
    try {
        const data = await CaseInterviewQueries.getTranscript();
        if (data.length > 0) {
            console.log("**************************************************");
            console.log("Job Started For Case Interview Transcript Batching");
            console.log("**************************************************");
            for (const element of data) {
                let cleanedTranscript = element.transcript.replace(/ \\n /g, '').replace(/\s+/g, ' ').trim();
                let structuredTranscript = [];
                let regex = /\[([^\]]+)\]:\s*([^[]+)/g;
                let match;
                while ((match = regex.exec(cleanedTranscript)) !== null) {
                    let speaker = match[1].trim();
                    let text = match[2].trim();
                    structuredTranscript.push({ speaker, text });
                }
                // console.log("Structured Transcript:", structuredTranscript);
                let speakerBatches = [];
                for (let i = 0; i < structuredTranscript.length; i += meetingBatchLimit) {
                    speakerBatches.push(structuredTranscript.slice(i, i + meetingBatchLimit));
                }
                console.log("Structured Transcript Batches:", speakerBatches.length);
                if (speakerBatches.length > 0) {
                    for (const batch of speakerBatches) {
                        const requestData = JSON.stringify(batch);
                        // console.log("requestData", batch.length);
                        if (batch.length == meetingBatchLimit) {
                            const hash = crypto.createHash('md5').update(requestData).digest('hex');
                            const find = await CaseInterviewQueries.checkDuplicateTranscript(
                                hash, element.interviewIncId, element.roomId, element.userId
                            );
                            if (find == null && element.interviewIncId != null) {
                                const getFileInc = await CaseInterviewQueries.caseInterviewInc(element.interviewIncId, element.userId);
                                const obj = {
                                    request: "Excerpt of Interview: " + requestData + (getFileInc != null ? "List of references: " + getFileInc[0].response : ""),
                                    interviewIncId: element.interviewIncId,
                                    roomId: element.roomId,
                                    transcriptHash: hash,
                                    userId: element.userId
                                };
                                await CaseInterviewQueries.addcaseInterviewFileMeetingInc(obj);
                                console.log("************************************************");
                                console.log("Inserting Transcript For Meeting Inconsistencies");
                                console.log("************************************************");
                            } else {
                                // console.log("***********************************");
                                // console.log("Duplicate Transcript For Room ", element.roomId);
                                // console.log("***********************************");
                            }
                        }
                        else {
                            // console.log("********************************");
                            // console.log("Unable To Insert Batch For Room");
                            // console.log("Batch Length", batch.length);
                            // console.log("User Id", element.userId);
                            // console.log("Room Id", element.roomId);
                            // console.log("Interview Inconsistences Id", element.interviewIncId);
                            // console.log("********************************");
                        }
                    }
                } else {
                    console.log("************************");
                    console.log("No Speakers Found For");
                    console.log("User Id", element.userId);
                    console.log("Room Id", element.roomId);
                    console.log("Interview Inconsistences Id", element.interviewIncId);
                    console.log("************************");
                }
            }
            console.log("******************************************");
            console.log("Job Completed For Case Interview File Incs");
            console.log("******************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            };
        } else {
            console.log("******************************************************");
            console.log("No Record Found For Case Interview Transcript Batching");
            console.log("******************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("error while running get Room Data", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};


CaseInterViewServices.caseMeetingFileInc = async () => {
    try {
        const data = await CaseInterviewQueries.getPendingMeetingFileInc();
        if (data.length > 0) {
            console.log("***********************************************************************");
            console.log("Job Started For Pending Case Interview File And Meeting Inconsistencies");
            console.log("***********************************************************************");
            const results = [];
            for (const element of data) {
                if (await CaseInterviewQueries.getQueueMeetingFileInc(element.userId)) {
                    console.log("Queue Details Case Interview File And Meeting Inconsistencies", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else {
                    const assistantId = caseFileMeetingInc;
                    const result = await CaseInterViewServices.runOpenAIFileMeetingInc(assistantId, element)
                    results.push(result);
                }
            }
            console.log("*************************************************************************");
            console.log("Job Completed For Pending Case Interview File And Meeting Inconsistencies");
            console.log("*************************************************************************");
            Logger.data.OpenAI({ request: results, methodName: "caseMeetingFileInc" }, "Sending-Case-Interview-File-Meeting-Inconsistencies-Data-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("***************************************************************************");
            console.log("No Record Found For Pending Case Interview File And Meeting Inconsistencies");
            console.log("***************************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while start Case Meeting File Inc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.runOpenAIFileMeetingInc = async (assistantId, details) => {
    try {
        const getThreadId = await CaseInterViewServices.createOrFindThreadFileMeetingInc(details.interviewIncId, details.roomId, details.userId);
        Logger.data.OpenAI({ request: details, response: getThreadId, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "createOrFindThread" }, "Add-Content-In-Thread-For-Case-Interview-File-Meeting-Inconsistencies");
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
            Logger.data.OpenAI({ request: prompts, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: details.userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Case-Interview-File-Meeting-Inconsistencies");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Case-Interview-File-Meeting-Inconsistencies-Open-AI");
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0
                    }
                    const getId = await CaseInterviewQueries.updateFileMeetingInc(data, details.requestUuid, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "threadStep for case Interview file meeting Inc", response: threadStep, requestUuid: details.requestUuid, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "addMessage for case Interview file meeting Inc", response: addMessage, requestUuid: details.requestUuid, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "getThreadId for case Interview file meeting Inc", response: getThreadId, requestUuid: details.requestUuid, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }
    } catch (error) {
        console.log("error", error);
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT for case Interview file meeting Inc", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.runCaseMeetingFileInc = async () => {
    try {
        const data = await CaseInterviewQueries.startCaseInterviewFileMeetingIncs();
        if (data.length > 0) {
            console.log("************************************************");
            console.log("Job Started For Case Interview File Meeting Incs");
            console.log("************************************************");
            const results = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const result = await CaseInterViewServices.startThreadFileMeetingInc(element.id, element.threadId, element.runId, element.requestUuid, element.roomId, element.userId)
                results.push(result);
            }
            console.log("**************************************************");
            console.log("Job Completed For Case Interview File Meeting Incs");
            console.log("**************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("****************************************************");
            console.log("No Record Found For Case Interview Meeting File Incs");
            console.log("****************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while run Case Meeting File Inc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.startThreadFileMeetingInc = async (id, threadId, runId, requestUuid, roomId, userId) => {
    try {
        const validateStatus = await validateThreadStatus(threadId, runId);
        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Retrive-Run-Case-Interview-File-Meeting-Incs")
        data = {
            jsonResponse: JSON.stringify(validateStatus)
        }
        await CaseInterviewQueries.updateThreadFileMeetingById(data, runId);
        if (!validateStatus.error) {
            const getCompleteStatus = validateStatus.status == 'completed';
            const getInProgressStatus = validateStatus.status == 'in_progress';
            const getFailedStatus = validateStatus.status == 'failed';
            const getExpiredStatus = validateStatus.status == 'expired';
            const getQueuedStatus = validateStatus.status == 'queued';

            console.log("");
            console.log("===== Case-Interview-File-Meeting-Incs =====");
            console.log("getCompleteStatus                    *", getCompleteStatus);
            console.log("getInProgressStatus                 **", getInProgressStatus);
            console.log("getFailedStatus                    ***", getFailedStatus);
            console.log("getExpiredStatus                  ****", getExpiredStatus);
            console.log("getQueuedStatus                  *****", getQueuedStatus);
            console.log("");
            if (getCompleteStatus) {
                const getanswer = await getAssistantResponse(threadId);
                const getResponse = getanswer?.data[0]?.content[0]?.text?.value
                const record = await responseCleaningForAnalysis(getResponse, 'removeTripleHashes');
                if (record) {
                    const data = JSON.parse(record);
                    if (data?.Matches?.length == '0' && data?.Inconsistencies?.length == '0') {
                    // if (false) {
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            response: record ? record : {},
                            updatedAt: currentDate
                        }
                    } else {
                        // const list = {
                        //     request: JSON.stringify(record),
                        //     requestId: id,
                        //     roomId: roomId,
                        //     userId: userId
                        // }
                        // await JsonAssistantQueries.add(list)
                        // obj = {
                        //     message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                        //     status: 0,
                        //     messageId: getanswer?.data[0]?.id,
                        //     response: record ? record : {},
                        //     updatedAt: currentDate
                        // }

                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            response: record ? record : {},
                            updatedAt: currentDate
                        }
                        const all = await CaseInterviewQueries.getAllByBotId(roomId);
                        // console.log("ALL", all);
                        // console.log("all.length", all.length);
                        if (all.length > 0) {
                            const list = await RoomQueries.findBotId(roomId)
                            // console.log("list", list);
                            const record = []
                            for (const element of all) {
                                const response = JSON.parse(element.response)
                                const requestUuid = element.requestUuid
                                if (response?.Matches?.length > 0 || response?.Inconsistencies?.length > 0) {
                                    const transformedResponse = {
                                        Matches: response.Matches.map(({ Status, ...match }) => ({
                                            ...match,
                                            status: "success",
                                        })),
                                        Inconsistencies: response.Inconsistencies.map(({ Status, ...inconsistency }) => ({
                                            ...inconsistency,
                                            status: "error",
                                        }))
                                    };
                                    // console.log("Found the record");
                                    record.push({
                                        requestUuid,
                                        // ...response,
                                        ...transformedResponse
                                    });
                                } else {
                                    // console.log("Empty response from openAI {}", response);
                                }
                            }
                            if (record.length > 0) {
                                record[0].isNew = "true";
                                for (let i = 1; i < record.length; i++) {
                                    record[i].isNew = "false";
                                }
                                // console.log("Emitting to FE", JSON.stringify(record));
                                updateFrontend({ meetingfileinc: JSON.stringify(record), botId: list.botId });
                            }
                        } else {
                            console.log("No Record found for meeting inconsistencies");
                        }
                    }
                }
                Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Case-Interview-File-Meeting-Incs-Assistant-Open-AI")
                await CaseInterviewQueries.updateThreadFileMeetingById(obj, runId);
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
                await CaseInterviewQueries.updateThreadFileMeetingById(obj, runId);
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
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Failed-Case-Interview-File-Meeting-Incs-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Case-Interview-File-Meeting-Incs-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                console.log("validate run failed Case-Interview-File-Meeting-Incs", validateStatus);
                console.log("check status", validateStatus.status);
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseInterviewQueries.updateThreadFileMeetingById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
            else if (getExpiredStatus) {
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }, "Thread-Status-Expired-Case-Interview-File-Meeting-Incs-Assistant-Open-AI")
                slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Case-Interview-File-Meeting-Incs-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus.status}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
                obj = {
                    retry: true,
                    status: 2,
                    response: null,
                    jsonResponse: JSON.stringify(validateStatus),
                    updatedAt: currentDate
                }
                await CaseInterviewQueries.updateThreadFileMeetingById(obj, runId);
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
                await CaseInterviewQueries.updateThreadFileMeetingById(obj, runId);
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: obj
                }
            }
        } else {
            console.log("validate run error Case Interview File Meeting Incs Assistant", validateStatus?.error);
            slack.webhook(JSON.stringify({ response: validateStatus, threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }), "validate run error Case-Interview-File-Meeting-Incs-Assistant");
            slack.webhook(JSON.stringify({ action: "We are getting " + `${validateStatus?.error}` + " for", threadId: threadId, runId: runId, requestUuid: requestUuid, userId: userId }));
            obj = {
                retry: true,
                status: 2,
                response: null,
                jsonResponse: JSON.stringify(validateStatus?.error),
                updatedAt: currentDate
            }
            await CaseInterviewQueries.updateThreadFileMeetingById(obj, runId);
            return {
                message: Strings.ERROR.ERROR_RE_TRY,
                statusCode: 400,
                obj: obj
            }
        }
    } catch (error) {
        console.log("error while start Thread File Meeting Inc", error);
        slack.webhook(JSON.stringify({ action: "In Catch for start Thread File Meeting Inc Case Interview File Meeting Incs assistant", error: error.message }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseInterViewServices.post = async () => {
    try {
        const data = await CaseInterviewQueries.getAll();
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

CaseInterViewServices.postFileInc = async () => {
    try {
        const data = await CaseInterviewQueries.getAllIntInc();
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

CaseInterViewServices.getFailedInterviewIncRecords = async () => {
    try {
        const data = await CaseInterviewQueries.getFailedInterviewInc();
        if (data.length > 0) {
            console.log("**********************************************");
            console.log("Job Started For Failed Record of Interview Inc");
            console.log("**********************************************");
            const results = [];
            for (const element of data) {
                const findUsage = await CaseInterviewQueries.checkUsage(element.userId);
                console.log("=========================");
                console.log("Interview Inc Usage", findUsage);
                console.log("=========================");
                if (await CaseInterviewQueries.getPendingInterviewIncUserId(element.userId, element.requestUuid) && findUsage > 0) {
                    console.log("Interview Inc Queue Details", { "UserId": element.userId, "requestUuid": element.requestUuid });
                }
                else if (findUsage == 0) {
                    const checkCaseFileAvaiablity = await CaseReportGeneratorQueries.checkCaseFileAvaiablity(element.caseId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const assistantId = caseFileIncAssistant;
                        const result = await CaseInterViewServices.runFailedRequest(assistantId, element, checkCaseFileAvaiablity[0])
                        results.push(result);
                    }
                    else {
                        console.log("**********************************");
                        console.log("Waiting for Vector Store to Upload");
                        console.log("**********************************");
                    }
                }
            }
            console.log("************************************************");
            console.log("Job Completed For Failed Record of Interview Inc");
            console.log("************************************************");
            Logger.data.OpenAI({ request: results, methodName: "getFailedRecords" }, "Sending-Interview-Inc-Failed-Records-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("**************************************************");
            console.log("No Record Found For Failed Record of Interview Inc");
            console.log("**************************************************");
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

CaseInterViewServices.runFailedRequest = async (assistantId, details, vectorId) => {
    try {
        const getPayload = {
            tool_resources: {
                "file_search": {
                    "vector_store_ids": [vectorId]
                }
            }
        }        
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for Interview Inc", userId: details.userId, requestUuid: details.requestUuid, retryCount: details.retryCount }));
        const getThreadId = await CaseInterViewServices.createOrFindThread(getPayload, details.userId);
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
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, requestId: details.requestId, userId: details.userId, requestUuid: details.requestUuid, methodName: "makeMessage" }, "Add-Message-To-Thread-Interview-Inc-Failed-Record-Open-AI");
            if (addMessage.id) {
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, requestId: details.requestId, userId: details.userId, requestUuid: details.requestUuid, methodName: "runThreads" }, "Run-Thread-Interview-Inc-Failed-Record-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, requestId: details.requestId, userId: details.userId, requestUuid: details.requestUuid, methodName: "threadStep" }, "Thread-Step-Interview-Inc-Failed-Record-Open-AI");
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
                    const getId = await CaseInterviewQueries.updateFailed(data, details.requestUuid, details.requestId, details.userId);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
                    slack.webhook(JSON.stringify({ action: "Thread Step for Interview Inc", response: threadStep, requestUuid: details.requestUuid, requestId: details.requestId, userId: details.userId }));
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
                slack.webhook(JSON.stringify({ action: "Add Message for Interview Inc", response: addMessage, requestUuid: details.requestUuid, requestId: details.requestId, userId: details.userId }));
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
            slack.webhook(JSON.stringify({ action: "Interview Inc getThreadId", response: getThreadId, requestUuid: details.requestUuid, requestId: details.requestId, userId: details.userId }));
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for Interview Inc", error: error.message, requestUuid: details.requestUuid, requestId: details.requestId, userId: details.userId }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = CaseInterViewServices;