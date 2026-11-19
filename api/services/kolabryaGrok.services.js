const KolabryaGrokServices = {};
const {
    KolabryaGrokQueries,
    UserQueries
} = require('../queries');
const writeFile = process.env.GROK_EXTERNAL_DIRECTORY;
const { Strings, Logger } = require('../../utils')
const { slack } = require('../../utils/Webhook');
const currentDate = new Date();
const { writeMultipleFile } = require('../services/caseFile.services');
const { computeMD5 } = require('../services/chatGpt.services');
const { makeDirectory } = require('../../utils/fs.utility');
const {
    uploadFileGrok,
    createThreadGrok,
    addMessageGrok,
    deleteFileGrok
} = require('../../api/external/ChatGPT')

KolabryaGrokServices.postExternal = async (files, userQuery, text, jurisdiction, subscription, promptType, userId) => {
    try {
        const countUsage = await KolabryaGrokQueries.countPublicUsage(subscription, userId)
        const getUser = await UserQueries.getUserForLLM(userId)        
        //for public user
        if (countUsage >= 10 && subscription === false && getUser == null) {
            return {
                message: Strings.GROK.PUBLIC_PROMPT_ONE_USAGE_EXCEDDED,
                statusCode: 400,
                obj: {
                    publicExceed: true
                }
            }
        }//for free sign up user
        else if(getUser != null && countUsage >= 20) {
            return {
                message: Strings.GROK.NON_PUBLIC_PROMPT_FIVE_USAGE_EXCEDDED,
                statusCode: 400,
                obj: {
                    exceed: true
                }
            }
        }
        else {
            const fileDetails = [];
            const record = await UserQueries.getPromptByType(40);
            const types = JSON.parse(record[0].prompt);
            const promptOne = types[promptType][0] ? types[promptType][0] : ''
            const promptTwo = types[promptType][1] ? types[promptType][1] : ''
            if (files.length > 0 && userQuery && userId) {
                const record = {
                    request: promptOne + text + promptTwo,
                    jurisdiction: jurisdiction,
                    userQuery: userQuery,
                    grokThreadHistoryId: null,
                    subscription: subscription,
                    userId: userId
                }
                const add = await KolabryaGrokQueries.add(record)
                if (add.length > 0) {
                    const duplicateCheck = await KolabryaGrokServices.duplicateFileCheck(files, userId)
                    if (duplicateCheck.obj.length > 0 && (files.length == duplicateCheck.obj.length)) {
                        console.log("File Already Found");
                        for (const element of duplicateCheck.obj) {
                            element.grokThreadId = add[1]
                            await KolabryaGrokQueries.addFile(element)
                        }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                requestUuid: add[0]
                            }
                        };
                    } else {
                        console.log("New Files");
                        const path = writeFile + `${add[0]}`
                        await makeDirectory(path)
                        const makeFile = await writeMultipleFile(files, path)
                        if (makeFile.every(file => file.statusCode != '200')) {
                            slack.webhook(JSON.stringify({ action: "Post External New File's", response: makeFile.obj, requestUuid: add[0], userId: userId }));
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: makeFile.obj
                                }
                            };
                        }
                        for (const [index, value] of makeFile.entries()) {
                            const fileText = files[index].buffer.toString('utf-8')
                            const currentFileMD5 = await computeMD5(fileText);
                            const fileData = {
                                userId: userId,
                                fileName: value.obj.fileName,
                                filePath: value.obj.filePath,
                                grokThreadId: add[1],
                                fileHash: currentFileMD5
                            }
                            const getFileData = await KolabryaGrokQueries.addFile(fileData);
                            if (getFileData.length > 0) {
                                const list = {
                                    fileUuid: getFileData[0],
                                    fileName: getFileData[1]
                                }
                                fileDetails.push(list);
                            }
                        }
                        const payload = {
                            userId: userId.toString(),
                            caseUuid: add[0],
                            isExternalUpload: true,
                            featureType: "1",
                            caseDetails: fileDetails
                        }
                        console.log("payload", payload);
                        const uploadFile = await uploadFileGrok(payload);
                        Logger.data.Grok({ request: payload, response: uploadFile, requestUuid: add[0], userId: userId }, "Upload-File-Grok")
                        console.log("******************* Request - 1 - Grok File Upload *******************");
                        console.log(uploadFile)
                        console.log("******************* Request - 1 - Grok File Upload *******************");
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
                            await KolabryaGrokQueries.updateByRequestUuid({ status: 2, isActivated: 0, updatedAt: currentDate, jsonResponse: JSON.stringify(uploadFile) }, add[0], userId)
                            slack.webhook(JSON.stringify({ action: "Post External Upload File", response: uploadFile, requestUuid: add[0], userId: userId }));
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: uploadFile
                                }
                            }
                        }
                    }
                }
            } else if (files.length <= 0 && userQuery && userId) {
                    const record = {
                        request: promptOne + text + promptTwo,
                        jurisdiction: jurisdiction,
                        grokThreadHistoryId: null,
                        userQuery: userQuery,
                        subscription: subscription,
                        userId: userId
                    }
                    const add = await KolabryaGrokQueries.add(record)
                    const getThreadId = await KolabryaGrokServices.createOrFindThread(add[0], userId)
                    if (getThreadId.statusCode == '200') {
                        const list = {
                            threadId: getThreadId.obj.threadId
                        }
                        await KolabryaGrokQueries.updateByRequestUuid(list, add[0], userId)
                        const [country = '', state = '', lawType = ''] = (jurisdiction || '').split(',').map(x => x.trim());
                        const fetchState = state.split(" ");
                        const record = {
                            threadId: getThreadId.obj.threadId,
                            fileUuid: [],
                            content: userQuery,
                            jurisdiction: country,
                            jurisdictionLevel: fetchState.length > 0 ? fetchState[0] : '',
                            stateName: fetchState.length > 0 ? fetchState[1] : '',
                            practiceAreas: lawType,
                            role: "user",
                            isDocumentUploaded: false
                        }
                        console.log("Add-Message-Grok-Without-File", record);
                        const addMessage = await addMessageGrok(record)
                        Logger.data.Grok({ request: record, response: addMessage }, "Add-Message-Grok-Without-File")
                        console.log("******************* Request - 3 - Grok Add Message *******************");
                        console.log(JSON.stringify(addMessage))
                        console.log("******************* Request - 3 - Grok Add Message *******************");
                        if (addMessage.statusCode == '200' && addMessage.obj.messageId) {
                            const list = {
                                messageId: addMessage.obj.messageId,
                                jsonResponse: JSON.stringify(addMessage)
                            }
                            await KolabryaGrokQueries.updateByRequestUuid(list, add[0], userId)
                        } else {
                            const list = {
                                status: 2,
                                isActivated: 0,
                                updatedAt: currentDate,
                                jsonResponse: JSON.stringify(addMessage)
                            }
                            await KolabryaGrokQueries.updateByRequestUuid(list, add[0], userId)
                        }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                requestUuid: add[0]
                            }
                        };
                    } else {
                        await KolabryaGrokQueries.updateByRequestUuid({ status: 2, isActivated: 0, updatedAt: currentDate, jsonResponse: JSON.stringify(getThreadId) }, add[0], userId)
                        return getThreadId
                    }
            }
            else {
                return {
                    message: Strings.UNVALID_STATUS,
                    statusCode: 400,
                    obj: {}
                }
            }
        }
    } catch (error) {
        console.log("Error in post External", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaGrokServices.duplicateFileCheck = async (content, userId) => {
    try {
        if (content.length > 0) {
            const list = []
            for (const element of content) {
                const fileText = element.buffer.toString('utf-8')
                const md5 = await computeMD5(fileText);
                const record = await KolabryaGrokQueries.validateContent(md5, userId)
                if (record != null) {
                    const all = {
                        filePath: record[0].filePath,
                        fileUuid: record[0].fileUuid,
                        fileName: record[0].fileName,
                        fileHash: record[0].fileHash,
                        isProcessed: record[0].isProcessed,
                        status: record[0].status,
                        userId: record[0].userId,
                    }
                    list.push(all)
                }
            }
            if (list.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: list
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
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in duplicate File Check", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaGrokServices.fileStatus = async (requestUuid, caseDetails, userId) => {
    try {
        if (requestUuid && caseDetails.length > 0 && userId) {
            const data = await KolabryaGrokQueries.getFileRecords(requestUuid, userId)
            if (data.length > 0) {
                const fileUuidCheck = []
                for (const [index, value] of data.entries()) {
                    if (value.fileUuid == caseDetails[index].fileUuid) {
                        fileUuidCheck.push(value.fileUuid)
                        console.log("Matching Found");
                    } else {
                        console.log("File Uuid is not matching from python to node js db");
                        slack.webhook(JSON.stringify({ action: "File Uuid is not matching from python to node js db", fileId: value.fileUuid, requestUuid: requestUuid, userId: userId }));
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
                            await KolabryaGrokQueries.updateByFileUuid(list, element.fileUuid, userId)
                        }
                        else {
                            list.isProcessed = 2
                            await KolabryaGrokQueries.updateByFileUuid(list, element.fileUuid, userId)
                            await KolabryaGrokQueries.updateByRequestUuid({ status: 2, updatedAt: currentDate, jsonResponse: JSON.stringify(element) }, requestUuid, userId)
                            slack.webhook(JSON.stringify({ action: "Error in File Uploading to Pinecone", response: element, requestUuid: requestUuid, userId: userId }));                   
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
                    console.log("Error in matching received file length");
                    slack.webhook(JSON.stringify({ action: "Error in matching received file length", requestUuid: requestUuid, userId: userId }));
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
        console.log("Error in file Status", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaGrokServices.addMessage = async () => {
    try {
        const data = await KolabryaGrokQueries.getRecordToAddMessage();
        if (data.length > 0) {
            console.log("********************************");
            console.log("Job Started For Add Message Grok");
            console.log("********************************");
            const mergedRecords = Object.values(
                data.reduce((acc, record) => {
                    const [country = '', state = '', lawType = ''] = (record.jurisdiction || '').split(',').map(x => x.trim());
                    const fetchState = state.split(" ");
                    if (!acc[record.requestUuid]) {
                        acc[record.requestUuid] = {
                            threadId: record.threadId,
                            content: record.request,
                            jurisdiction: country,
                            jurisdictionLevel: fetchState.length > 0 ? fetchState[0] : '',
                            stateName: fetchState.length > 0 ? fetchState[1] : '',
                            practiceAreas: lawType,
                            role: "user",
                            requestUuid: record.requestUuid,
                            userId: record.userId,
                            isDocumentUploaded: true,
                            fileUuids: []
                        };
                    }
                    acc[record.requestUuid].fileUuids.push(record.fileUuid);
                    return acc;
                }, {})
            );
            if (mergedRecords.length > 0) {
                for (const element of mergedRecords) {
                    console.log("Add-Message-Grok-With-File", element);
                    const getThreadId = await KolabryaGrokServices.createOrFindThread(element.requestUuid, element.userId)
                    if (getThreadId.statusCode == '200') {
                        const list = {
                            threadId: getThreadId.obj.threadId
                        }
                        element.threadId = getThreadId.obj.threadId
                        await KolabryaGrokQueries.updateByRequestUuid(list, element.requestUuid, element.userId)
                        const addMessage = await addMessageGrok(element)
                        Logger.data.Grok({ request: element, response: addMessage }, "Add-Message-Grok-With-File")
                        console.log("******************* Request - 3 - Grok Add Message *******************");
                        console.log(JSON.stringify(addMessage))
                        console.log("******************* Request - 3 - Grok Add Message *******************");
                        if (addMessage.statusCode == '200' && addMessage.obj.messageId) {
                            const list = {
                                messageId: addMessage.obj.messageId,
                                jsonResponse: JSON.stringify(addMessage)
                            }
                            await KolabryaGrokQueries.updateByRequestUuid(list, element.requestUuid, element.userId)
                        } else {
                            const list = {
                                status: 2,
                                isActivated: 0,
                                updatedAt: currentDate,
                                jsonResponse: JSON.stringify(addMessage)
                            }
                            await KolabryaGrokQueries.updateByRequestUuid(list, element.requestUuid, element.userId)
                        }
                    }
                    else {
                        const list = {
                            status: 2,
                            isActivated: 0,
                            updatedAt: currentDate,
                            jsonResponse: JSON.stringify(getThreadId)
                        }
                        await KolabryaGrokQueries.updateByRequestUuid(list, element.requestUuid, element.userId)
                    }
                }
                console.log("******************************");
                console.log("Job Ended For Add Message Grok");
                console.log("******************************");
            } else {
                console.log("************************************");
                console.log("No Record Found After Record Merging");
                console.log("************************************");
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: { mergedRecords }
            }
        } else {
            console.log("************************************");
            console.log("No Record Found For Add Message Grok");
            console.log("************************************");
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

KolabryaGrokServices.postMessage = async (messageId, threadId, response, payload) => {
    try {
        if (messageId && threadId && Object.keys(response || {}).length > 0) {
            const data = await KolabryaGrokQueries.findByMessageId(messageId, threadId)
            if (data.length > 0) {
                const obj = {
                    response: response,
                    status: true,
                    updatedAt: currentDate,
                    jsonResponse: payload
                }
                const record = await KolabryaGrokQueries.updateByThreadId(obj, messageId, threadId)
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
        else if (messageId && threadId && Object.keys(response || {}).length === 0) {
            const data = await KolabryaGrokQueries.findByMessageId(messageId, threadId)
            if (data.length > 0) {
                const obj = {
                    response: null,
                    status: 2,
                    updatedAt: currentDate,
                    jsonResponse: JSON.stringify(payload)
                }
                const record = await KolabryaGrokQueries.updateByThreadId(obj, messageId, threadId)
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
        console.log("Error in post message", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaGrokServices.getExternalByUuid = async (requestUuid, subscription, userId) => {
    try {
        const data = await KolabryaGrokQueries.getDataByUuid(requestUuid, subscription, userId);
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
                const list = await KolabryaGrokQueries.getAllDataPageLoad(subscription, userId);
                if (list.length > 0) {
                    let index = 0;
                    for (const element of list) {
                        const countUsage = await KolabryaGrokQueries.countPublicUsage(subscription, userId)
                        const getUser = await UserQueries.getUserForLLM(userId)
                        //index will be increase if the counrUsage is increasing
                        if (index === 1 && countUsage >= 10 && subscription === false && getUser == null) {
                            element.blur = true
                        }
                        if (element.response && typeof element.response === 'object') {
                            element.response.answer = await KolabryaGrokServices.formatAnswer(element.response.answer);
                        }
                        index++;
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
        console.log("Error while get external by uuid", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaGrokServices.getAll = async (subscription, userId) => {
    try {
        const list = await KolabryaGrokQueries.getAllDataPageLoad(subscription, userId);
        if (list.length > 0) {
            let index = 0;
            for (const element of list) {
                const countUsage = await KolabryaGrokQueries.countPublicUsage(subscription, userId)
                const getUser = await UserQueries.getUserForLLM(userId)
                if (index === 1 && countUsage >= 10 && subscription === false && getUser == null) {
                    element.blur = true
                }
                if (element.response && typeof element.response === 'object') {
                    element.response.answer = await KolabryaGrokServices.formatAnswer(element.response.answer);
                }
                index++;
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
        console.log("Error while get external all", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaGrokServices.createOrFindThread = async (requestUuid, userId) => {
    try {
        const findThreadId = await KolabryaGrokQueries.findThreadId(userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.Grok({ request: userId, response: data, requestUuid: requestUuid, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Kolabrya-Grok");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                slack.webhook(JSON.stringify({ action: "createOrFindThread", request: userId, response: data, requestUuid: requestUuid, userId: userId }));
                Logger.data.Grok({ request: userId, response: data, requestUuid: requestUuid, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Kolabrya-Grok-Error");
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
            const createThread = await createThreadGrok(pineconePayload)
            Logger.data.Grok({ request: pineconePayload, response: createThread, requestUuid: requestUuid, userId: userId }, "Create-Thread-Grok")
            console.log("******************* Request - 2 - Grok Create Thread *******************");
            console.log(createThread)
            console.log("******************* Request - 2 - Grok Create Thread *******************");
            if (createThread.statusCode == '200' && createThread.obj.threadId) {
                console.log("*********************************************************************************");
                console.log("Creating a New thread_id for Kolabrya Grok =>", createThread.obj.threadId);
                console.log("*********************************************************************************");
                Logger.data.Grok({ request: pineconePayload, response: createThread, requestUuid: requestUuid, userId: userId, methodName: "createThreadGrok" }, "Create-Thread-For-Kolabrya-Grok-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: createThread.obj.threadId
                    }
                }
            } else {
                Logger.data.Grok({ request: pineconePayload, response: createThread, requestUuid: requestUuid, userId: userId, methodName: "createThreadGrok" }, "Create-Thread-For-Kolabrya-Grok-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Grok", response: createThread, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: createThread
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for Kolabrya Grok.', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaGrokServices.deleteThread = async (userId) => {
    try {
        const data = {
            isActivated: false,
            updatedAt: currentDate
        }
        const deleteThread = await KolabryaGrokQueries.deleteThread(data, userId.toString());
        const deleteFile = await KolabryaGrokQueries.deleteFile(data, userId.toString());
        if (deleteThread[0] > 0 || deleteFile[0] > 0) {
            if (deleteFile[1].length > 0) {
                const record = {
                    userId: userId.toString(),
                    fileUuids: deleteFile[1]
                }
                const deletePineConeFile = await deleteFileGrok(record)
                Logger.data.Grok({ request: deletePineConeFile, response: deletePineConeFile, userId: userId, methodName: "deleteThread" }, "Delete-File-From-PineCone");
            }
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

KolabryaGrokServices.countRecord = async () => {
    try {        
        const record = await KolabryaGrokQueries.count()
        if (record) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    totalRecord: record[0],
                    successRecord: record[1],
                    ActiveRecord: record[2],
                    DeActiveRecord: record[5],
                    pendingRecord: record[3],
                    errorRecord: record[4],
                    totalSessions: record[6],
                    totalActiveSessions: record[7],
                    totalDeActiveSessions: record[8]
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

KolabryaGrokServices.getRecord = async () => {
    try {        
        const record = await KolabryaGrokQueries.getRecord()
        if (record.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: record
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

KolabryaGrokServices.formatAnswer = async (answer) => {
    return answer
        .replace(/\n(\d+)./g, '\n\n$1')
        .replace(/\n-/g, '\n\n-')
        .replace(/\n\n*/g, '\n\n')
        .replace(/:\*\*\n\n\s*\*/g, ':**\n\n')
        .replace(/\)\.\n\n\*\s/g, ').\n\n')
        .replace(/\n\n(\d+)/g, '\n\n $1')
        .replace(/\n\n\s+-/g, '\n\n-')
        .replace(/\n\n\s*(\d+)\./g, '\n\n $1')
        .replace(/\n\n\s*\*(?=\s)/g, '\n\n')
        .replace(/\*\.(\n\n-?)/g, '**.$1');
}

module.exports = KolabryaGrokServices;