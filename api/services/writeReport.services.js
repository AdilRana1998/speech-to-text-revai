const writeReportServices = {};
const {
    UserQueries,
    WriteReportQueries,
    WriteReportAssistant,
    CaseFilesQueries,
} = require('../queries');
const { Strings } = require('../../utils')
const {
    findDetailedFileForCase,
    findDetailedFileForGroupCase
} = require('../services/kolabryaAnalysis.services');
const currentDate = new Date();
const { Logger } = require('../../utils');
const { slack } = require('./../../utils/Webhook');
const {
    uploadFileGrok,
    createThreadGemini,
    addMessageGemini,
    deleteFileGrok
} = require('../../api/external/ChatGPT')
const fsPromise = require('fs').promises;

writeReportServices.reWriteReport = async (prompt, caseData, userQuery, isGroup, groupId, isFirm, firmAssistant, firmId, userId) => {
    try {
        if (prompt && caseData) {
            let record, fileId;
            if (isGroup || isFirm) {
                record = await findDetailedFileForGroupCase(caseData)
            }
            else if(isFirm) {
                record = await findDetailedFileForGroupCase(caseData)
            }
            else {
                record = await findDetailedFileForCase(caseData, userId)
            }
            //add the group logic here
            const promptOne = await UserQueries.getPromptByType(43);
            const getBePrompt = JSON.parse(promptOne[0]?.prompt)
            if (record.statusCode == '200' && record.obj.length > 0 && getBePrompt.length > 0) {
                let additionalInstruction = '';
                if (typeof userQuery === 'string' && userQuery.trim() !== '') {
                    additionalInstruction = getBePrompt[4][0] + userQuery
                }
                const userPrompt = JSON.parse(prompt)
                const promptOne = getBePrompt[3][0]
                const promptTwo = getBePrompt[userPrompt[1][0]][userPrompt[1][1]]
                const promptThree = getBePrompt[userPrompt[0][0]][userPrompt[0][1]]
                const promptFour = getBePrompt[userPrompt[2][0]][userPrompt[2][1]]
                const allPrompt = promptOne + additionalInstruction + promptTwo + promptThree + promptFour
                const fileDetails = [];
                if (isGroup || isFirm) {
                    fileId = await CaseFilesQueries.getFileIdGroup(record.obj[0].fileUuid, record.obj[0].caseId)
                } else {
                    fileId = await CaseFilesQueries.getFileId(record.obj[0].fileUuid, record.obj[0].caseId, userId)
                }
                const data = {
                    userQuery: userQuery != undefined ? userQuery : null,
                    prompt: prompt,
                    request: allPrompt,
                    caseId: record.obj[0].caseId,
                    userId: userId
                }
                const add = await WriteReportQueries.add(data)
                if (add.length > 0) {
                    const findFile = await WriteReportAssistant.findFile(fileId[0].id, userId)
                    if (findFile.length > 0) {
                        console.log("File already found");
                        const record = {
                            fileId: findFile[0].fileId,
                            summaryId: add[1],
                            userId: userId,
                            isProcessed: true,
                            status: true,
                            isActivated: true,
                        }
                        const fileData = await WriteReportAssistant.add(record)
                        if (fileData) {
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                    requestUuid: add[0]
                                }
                            };
                        } else {
                            await WriteReportQueries.updateByRequestUuid({ status: 2, isActivated: 0, updatedAt: currentDate, jsonResponse: JSON.stringify(uploadFile) }, add[0], userId)
                            await WriteReportAssistant.updateByRequestUuid({ status: 2, isActivated: 0, updatedAt: currentDate }, fileData[0], userId)
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: fileData
                                }
                            }
                        }
                    } else {
                        console.log("New File");
                        const record = {
                            fileId: fileId[0].id,
                            summaryId: add[1],
                            userId: userId
                        }
                        const fileData = await WriteReportAssistant.add(record)
                        if (fileData) {
                            const list = {
                                fileUuid: fileId[0].fileUuid,
                                fileName: fileId[0].fileName
                            }
                            fileDetails.push(list);
                            const payload = {
                                userId: userId.toString(),
                                caseUuid: fileId[0].caseUuid,
                                isExternalUpload: false,
                                featureType: "2",
                                caseDetails: fileDetails
                            }
                            console.log("payload", payload);
                            const uploadFile = await uploadFileGrok(payload);
                            Logger.data.Gemini({ request: payload, response: uploadFile, requestUuid: add[0], userId: userId }, "Upload-File-Gemini")
                            console.log("******************* Request - 1 - Gemini File Upload *******************");
                            console.log(uploadFile)
                            console.log("******************* Request - 1 - Gemini File Upload *******************");
                            if (uploadFile.statusCode == '200' && uploadFile.obj.status == true) {
                                return {
                                    message: Strings.SUCCESS,
                                    statusCode: 200,
                                    obj: {
                                        message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                        requestUuid: add[0]
                                    }
                                };
                            } else {
                                await WriteReportQueries.updateByRequestUuid({ status: 2, isActivated: 0, updatedAt: currentDate, jsonResponse: JSON.stringify(uploadFile) }, add[0], userId)
                                await WriteReportAssistant.updateByRequestUuid({ status: 2, isActivated: 0, updatedAt: currentDate }, fileData[0], userId)
                                slack.webhook(JSON.stringify({ action: "Post External Upload File", response: uploadFile, requestUuid: add[0], userId: userId }));
                                return {
                                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                    statusCode: 400,
                                    obj: {
                                        error: uploadFile
                                    }
                                }
                            }
                        } else {
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: fileData
                                }
                            }
                        }
                    }
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
            }
            else {
                return record;
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
        console.log("Error in reWrite Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.addMessage = async () => {
    try {
        const data = await WriteReportQueries.getRecordToAddMessage();
        if (data.length > 0) {
            console.log("**********************************");
            console.log("Job Started For Add Message Gemini");
            console.log("**********************************");
            for (const element of data) {
                console.log("Add-Message-Gemini-With-File", element);
                const getThreadId = await writeReportServices.createOrFindThread(element.requestUuid, element.caseId, element.userId)
                if (getThreadId.statusCode == '200') {
                    const list = {
                        threadId: getThreadId.obj.threadId
                    }
                    element.threadId = getThreadId.obj.threadId
                    await WriteReportQueries.updateByRequestUuid(list, element.requestUuid, element.userId)

                    const record = {
                        threadId: element.threadId,
                        fileUuids: [element.fileUuid],
                        content: element.content,
                        role: "user"
                    }
                    console.log("record", record);
                    const addMessage = await addMessageGemini(record)
                    Logger.data.Gemini({ request: record, response: addMessage }, "Add-Message-Gemini-With-File")
                    console.log("******************* Request - 3 - Gemini Add Message *******************");
                    console.log(JSON.stringify(addMessage))
                    console.log("******************* Request - 3 - Gemini Add Message *******************");
                    if (addMessage.statusCode == '200' && addMessage.obj.messageId) {
                        const list = {
                            messageId: addMessage.obj.messageId,
                            jsonResponse: JSON.stringify(addMessage)
                        }
                        await WriteReportQueries.updateByRequestUuid(list, element.requestUuid, element.userId)
                    } else {
                        const list = {
                            status: 2,
                            isActivated: 0,
                            updatedAt: currentDate,
                            jsonResponse: JSON.stringify(addMessage)
                        }
                        await WriteReportQueries.updateByRequestUuid(list, element.requestUuid, element.userId)
                    }
                }
                else {
                    const list = {
                        status: 2,
                        isActivated: 0,
                        updatedAt: currentDate,
                        jsonResponse: JSON.stringify(getThreadId)
                    }
                    await WriteReportQueries.updateByRequestUuid(list, element.requestUuid, element.userId)
                }
            }
            console.log("********************************");
            console.log("Job Ended For Add Message Gemini");
            console.log("********************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: { data }
            }
        } else {
            console.log("**************************************");
            console.log("No Record Found For Add Message Gemini");
            console.log("**************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in add Message", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.createOrFindThread = async (requestUuid, caseId, userId) => {
    try {
        const findThreadId = await WriteReportQueries.findThreadId(caseId, userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("***************************************************************");
                console.log("using thread_id from db =>", data);
                console.log("***************************************************************");
                Logger.data.Gemini({ request: userId, response: data, requestUuid: requestUuid, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Kolabrya-Gemini");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                slack.webhook(JSON.stringify({ action: "createOrFindThread", request: userId, response: data, requestUuid: requestUuid, userId: userId }));
                Logger.data.Gemini({ request: userId, response: data, requestUuid: requestUuid, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Kolabrya-Gemini-Error");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: data
                }
            }
        } else {
            const pineconePayload = {
                pineconeNamespace: userId.toString()
            }
            const createThread = await createThreadGemini(pineconePayload)
            Logger.data.Gemini({ request: pineconePayload, response: createThread, requestUuid: requestUuid, userId: userId }, "Create-Thread-Gemini")
            console.log("******************* Request - 2 - Gemini Create Thread *******************");
            console.log(createThread)
            console.log("******************* Request - 2 - Gemini Create Thread *******************");
            if (createThread.statusCode == '200' && createThread.obj.threadId) {
                console.log("************************************************************************************");
                console.log("Creating a New thread_id for Kolabrya Gemini =>", createThread.obj.threadId);
                console.log("************************************************************************************");
                Logger.data.Gemini({ request: pineconePayload, response: createThread, requestUuid: requestUuid, userId: userId, methodName: "createThreadGrok" }, "Create-Thread-For-Kolabrya-Gemini-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: createThread.obj.threadId
                    }
                }
            } else {
                Logger.data.Gemini({ request: pineconePayload, response: createThread, requestUuid: requestUuid, userId: userId, methodName: "createThreadGrok" }, "Create-Thread-For-Kolabrya-Gemini-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Gemini", response: createThread, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: createThread
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for Kolabrya Gemini.', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.getAllReport = async (caseUuid, reportUuid, userId) => {
    try {
        const data = await WriteReportQueries.getData(reportUuid, userId);
        if (data.length > 0) {
            if (data[0].status == '0') {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        status: 0
                    }
                }
            }
            else if (data[0].status == '2') {
                return {
                    message: Strings.ERROR.ERROR_LOGOUT_LLM,
                    statusCode: 400,
                    obj: {
                        retry: false
                    }
                }
            }
            else if (data[0].status == '1') {
                const list = await WriteReportQueries.getDataOnComplete(caseUuid, userId);
                if (list.length > 0) {
                    for (const element of list) {
                        element.response = element.response.replace(/\n\s*\*(?=\s)/g, '\n\n-')
                    }
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: list
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
        console.log("While get all Report 15 second api", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.getSuccessReport = async (caseUuid, userId) => {
    try {
        const list = await WriteReportQueries.getDataOnComplete(caseUuid, userId);
        if (list.length > 0) {
            for (const element of list) {
                element.response = element.response.replace(/\n\s*\*(?=\s)/g, '\n\n-')
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: list
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("While get all Report", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.deleteReport = async (userId) => {
    try {
        const data = {
            isActivated: false,
            updatedAt: currentDate
        }
        const parentRecord = await WriteReportQueries.deleteReport(data, userId);
        const childRecord = await WriteReportAssistant.deleteReport(data, userId);
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

writeReportServices.getPrompt = async (type) => {
    try {
        const data = await UserQueries.getPromptByType(type)
        if (data.length > 0) {
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: data
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
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.fileStatus = async (caseUuid, caseDetails, userId) => {
    try {
        if (caseUuid && caseDetails.length > 0 && userId) {
            let data;
            const getEmailAddress = await UserQueries.getUser(userId)
            if (getEmailAddress.groupId || getEmailAddress.firmId) {
                //add the group logic
                data = await WriteReportQueries.getFileRecordsGroup(caseUuid, caseDetails[0].fileUuid)
            } else {
                data = await WriteReportQueries.getFileRecords(caseUuid, caseDetails[0].fileUuid, userId)
            }
            console.log("data", data);
            if (data.length > 0) {
                const fileUuidCheck = []
                for (const [index, value] of data.entries()) {
                    caseDetails[index].summaryFileUuid = data[0].summaryFileUuid;
                    caseDetails[index].summaryRequestUuid = data[0].summaryRequestUuid;
                    if (value.fileUuid == caseDetails[index].fileUuid) {
                        fileUuidCheck.push(value.fileUuid)
                        console.log("Matching Found Gemini");
                    } else {
                        console.log("File Uuid is not matching from python to node js db Gemini");
                        slack.webhook(JSON.stringify({ action: "File Uuid is not matching from python to node js db Gemini", fileId: value.fileUuid, requestUuid: data[0].summaryRequestUuid, userId: userId }));
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: {
                                message: Strings.GROK.FILE_UUID_NOT_MATCHING,
                                fileId: value.fileUuid
                            }
                        }
                    }
                }
                if (fileUuidCheck.length == caseDetails.length) {
                    for (const element of caseDetails) {
                        const list = {
                            status: element.status
                        }
                        if (element.status == true) {
                            list.isProcessed = true
                            await WriteReportAssistant.updateByFileUuid(list, element.summaryFileUuid, userId)
                        }
                        else {
                            list.isProcessed = 2
                            list.isActivated = false
                            await WriteReportAssistant.updateByFileUuid(list, element.summaryFileUuid, userId)
                            await WriteReportQueries.updateByRequestUuid({ status: 2, isActivated: false, updatedAt: currentDate, jsonResponse: JSON.stringify(element) }, data[0].summaryRequestUuid, userId)
                            slack.webhook(JSON.stringify({ action: "Error in File Uploading to Pinecone Gemini", response: element, requestUuid: data[0].summaryRequestUuid, userId: userId }));
                        }
                    }
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.RECORD_UPDATE_SUCCESS
                        }
                    }
                } else {
                    console.log("Error in matching received file length Gemini");
                    slack.webhook(JSON.stringify({ action: "Error in matching received file length Gemini", requestUuid: data[0].summaryRequestUuid, userId: userId }));
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            message: Strings.GROK.FILE_UUID_NOT_MATCHING,
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
        }
        else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in file Status Gemini", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.postMessage = async (messageId, threadId, response, status, payload) => {
    try {
        if (messageId && threadId && response != null && status == true) {
            const data = await WriteReportQueries.findByMessageId(messageId, threadId)
            if (data.length > 0) {
                const obj = {
                    response: response,
                    status: true,
                    updatedAt: currentDate,
                    jsonResponse: payload
                }
                const record = await WriteReportQueries.updateByThreadId(obj, messageId, threadId)
                if (record[0] == '1') {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.RECORD_UPDATE_SUCCESS
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
        else if (messageId && threadId && (response == null || status == false)) {
            const data = await WriteReportQueries.findByMessageId(messageId, threadId)
            if (data.length > 0) {
                const obj = {
                    response: null,
                    status: 2,
                    updatedAt: currentDate,
                    jsonResponse: JSON.stringify(payload)
                }
                const record = await WriteReportQueries.updateByThreadId(obj, messageId, threadId)
                if (record[0] == '1') {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.RECORD_UPDATE_SUCCESS
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
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in post message gemini", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.writeContent = async (fileNameAndPath, fileContent, fileName, fileType) => {
    try {
        await fsPromise.writeFile(fileNameAndPath, fileContent);
        return {
            message: Strings.FILE.FILE_WRITTEN_SUCCESS,
            statusCode: 200,
            obj: {
                fileName: fileName,
                filePath: fileNameAndPath,
                fileType: fileType
            }
        };
    } catch (error) {
        console.log("Error in writing Content", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

writeReportServices.writeMultipleFile = async (reportAttachments, path) => {
    try {
        const writePromises = reportAttachments.map(async (file) => {
            const fileNameAndPath = path + "/" + file.originalname;
            const fileName = file.originalname;
            const fileContent = file.buffer;
            const fileType = file.mimetype;
            return await writeReportServices.writeContent(fileNameAndPath, fileContent, fileName, fileType)
        });
        return await Promise.all(writePromises);
    } catch (error) {
        console.log("Error in writing multiple file", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = writeReportServices;