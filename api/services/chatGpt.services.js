const ChatGptServices = {};
const {
    RoomQueries,
    AssistantThreadsQueries,
    AssistantFilesQueries,
    CaseNamesQueries,
    CaseResponsesQueries,
    UserQueries,
    CaseFilesQueries,
    CaseDashboardQueries,
    VectorStoreManagerQueries,
    CaseIntelligentMapQueries
} = require('../queries');
const { Strings, Features } = require('../../utils')
const {
    makeThreads,
    runThreads,
    getThreadStatus,
    getAssistantResponse,
    getVideoUrl,
    downloadFile,
    deletFileOpenAI,
    makeMessage,
    getAllFileOpenAI,
    makeVector,
    addFileIdToVector,
    deleteFileFromVector,
    validateThreadStatus,
    getAllVectorOpenAI,
    deletVectorOpenAI,
    summaryUpload,
    uploadCiteDocuments,
    getCiteResponse,
    retriveVectorStore,
    getVectorStoreFileDetails,
    getCoreTranscript,
    getAzureFilesStream,
    createResponse,
    getOpenAIResponse
} = require('../../api/external/ChatGPT');
const { getTribunalSummary } = require('../../utils/ChatGPT')
const ActivityLogServices = require('../services/activityLogs.services');
const { makeDirectory } = require('../../utils/fs.utility');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { threadId } = require('worker_threads');
const markdownpdf = require("markdown-pdf");
const { Logger } = require('../../utils');
const fsPromise = require('fs').promises;
const mime = require('mime-types');
const { Document, Packer, Paragraph, TextRun, Bold } = require('docx');
const vectorStoreTimer = process.env.RECREATE_VECTOR_STORE_TIMER;
const kolabryaAssistant = process.env.KOLABRYA_ASSISTANT; //document assistant and kolabrya assistant
const reportProducerAssistant = process.env.REPORT_PRODUCER_ASSISTANT; //report producer assistant
const reWriteReportAssistant = process.env.PROOF_READ_REPORT_ASSISTANT;
const empLawAssistant = process.env.EMP_LAW_ASSISTANT;
const reSearchAssistant = process.env.RESEARCH_ASSISTANT;
const videoDirectory = process.env.VIDEO_READ_WRITE;
const pdfDirectory = process.env.PDF_READ_WRITE;
const readCaseFile = process.env.CASE_READ_WRITE;
const readSampleFile = process.env.SAMPLE_READ_WRITE;
const kolabryAgentAssistant = process.env.KOLABRYA_AGNET_ASSISTANT;
const kolabryCaidiAssistant = process.env.KOLABRYA_CAIDI_ASSISTANT;
const kolabryaVisuals = process.env.KOLABRYA_VISUALS;
const kolabryaTextHighLighter = process.env.KOLABRYA_TEXT_HIGHLIGHTER;
const kolabryaInsLawAssistant = process.env.INS_LAW_ASSISTANT;
const { v4: uuidv4 } = require('uuid');
const currentDate = new Date();
const { slack } = require('./../../utils/Webhook');
const Encryptions = require('../../utils/Encryptions');
const { containerClient, azureRecallHealth } = require("../../utils/Azure");
const { PassThrough } = require('stream');
const { blobServiceClient,
    externalDocContainerClient,
    azureExternalDocHealth,
    generateBlobSASQueryParameters,
    CONTAINER_NAME,
    BlobSASPermissions,
    credentials
} = require("../../utils/InvestigationExternalDocAzureBlob");

const AZURE_ENABLE = process.env.INVESTIGATION_EXTERNAL_DOC_AZURE_ENABLE;
const FILE_SIZE_LIMITS = {
    caseFiles: Number(process.env.CASE_FILE_SIZE) * 1024 * 1024
};
let allowedFile = process.env.CASE_FILE_LIMIT;
const retryLimit = process.env.API_CALL_LIMITS;

const ALLOWED_FILE_TYPES = {
    caseFiles: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'message/rfc822',
        'application/msword'
    ]
};

ChatGptServices.createQuery = async (userQuery, selectedPrompt, caseDetails, requestUuid, userId) => {
    try {
        if ((userQuery || selectedPrompt) && requestUuid && caseDetails) {
            const findBatchId = await AssistantThreadsQueries.findCasesByCaseUuidAndUserId(requestUuid, userId);
            if (findBatchId.length > 0) {
                const finder = await ChatGptServices.findFileForCase(caseDetails, requestUuid, findBatchId[0].id, userId)
                if (finder.statusCode == '200' && finder.obj.length > 0) {
                    let openAIQuery
                    if (selectedPrompt && !userQuery) {
                        const getAIPrompt = await UserQueries.getPromptByType(2);
                        const getOpenAIPrompt = await UserQueries.getPromptByType(46);
                        const fetchOpenAIPrompt = JSON.parse(getOpenAIPrompt[0].prompt)[selectedPrompt]
                        const fetchAIPrompt = JSON.parse(getAIPrompt[0].prompt)[selectedPrompt]?.key
                        openAIQuery = fetchOpenAIPrompt
                        userQuery = fetchAIPrompt
                    }
                    else if (selectedPrompt && userQuery) {
                        const getAIPrompt = await UserQueries.getPromptByType(2);
                        const getOpenAIPrompt = await UserQueries.getPromptByType(46);
                        const fetchOpenAIPrompt = JSON.parse(getOpenAIPrompt[0].prompt)[selectedPrompt]
                        const fetchAIPrompt = JSON.parse(getAIPrompt[0].prompt)[selectedPrompt]?.key
                        openAIQuery = fetchOpenAIPrompt + ' And ' + userQuery
                        userQuery = fetchAIPrompt + ' And ' + userQuery
                    }
                    else {
                        openAIQuery = userQuery
                        userQuery = userQuery
                    }
                    const record = {
                        fileDetails: JSON.stringify(caseDetails),
                        batchId: findBatchId[0].id,
                        request: openAIQuery,
                        userQuery: userQuery,
                        userId: userId
                    }
                    const result = await AssistantThreadsQueries.createQuery(record);
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            requestUuid: result[1],
                            message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS
                        }
                    };
                }
                else {
                    return finder;
                }
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                };
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in creating a query:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.findFileForCase = async (caseDetails, requestUuid, batchId, userId) => {
    try {
        const record = await AssistantThreadsQueries.findFilesByBatchId(requestUuid, userId);
        if (record.length > 0) {
            const recordFileUuids = record.map(file => file['externalDocBatchDetails.fileUuid']);
            const missingFiles = caseDetails
                .filter(file => !recordFileUuids.includes(file.fileUuid))
                .map(file => file.fileUuid);
            if (missingFiles.length > 0) {
                const commaSeparatedFileNames = missingFiles.map(f => f).join(", ");
                return {
                    message: Strings.FILE.CASE_FILE_NOT_FOUND,
                    statusCode: 400,
                    obj: {
                        error: Strings.FILE.FOR_EXTERNAL_DOC_BATCH + requestUuid + Strings.FILE.EXTERNAL_DOC_BATCH_FILES_NOT_FOUND + commaSeparatedFileNames

                    }
                };
            }
            const fileNames = caseDetails.map(file => file.fileName);
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: [
                    fileNames,
                    batchId
                ]
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }

    } catch (error) {
        console.log("Error in find File For Case external doc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.uploadFileToOpenAIExternalDoc = async () => {
    try {
        const data = await AssistantFilesQueries.getPendingTextFiles()
        let result = [];
        if (data.length > 0) {
            console.log("****************************************************************");
            console.log("Job Started For Uploading Case File's To OpenAI For External Doc");
            console.log("****************************************************************");
            for (const element of data) {
                const mimeType = mime.lookup(element.filePath);
                const getFileUrl = await ChatGptServices.generateAzureInvestigationFileUrl('', '', element.filePath)
                if (getFileUrl?.statusCode == '200' && getFileUrl?.obj?.videoUrl) {
                    const { statusCode, stream, message } = await getAzureFilesStream(getFileUrl?.obj?.videoUrl)
                    if (statusCode === 200) {
                        const allFileIds = await summaryUpload([{ buffer: stream, mimetype: mimeType, originalname: element.fileName }]);
                        Logger.data.OpenAI({ filePath: element.filePath, userId: element.userId, response: allFileIds }, "Upload-Files-To-OpenAI-External-Doc");
                        const getFileId = allFileIds[0]?.id;
                        if (getFileId) {
                            const obj = {
                                isOpenAIProcessed: true,
                                openAIFileId: getFileId,
                                updatedAt: currentDate
                            }
                            const recordUpdate = await AssistantFilesQueries.updatePendingTextFiles(obj, element.fileUuid);
                            result.push({ fileUuid: element.fileUuid, filePath: element.filePath, status: recordUpdate[0] == 1 ? 'Updated' : Strings.ROOM.EMPTY, response: allFileIds });
                        } else {
                            const obj = {
                                status: 2
                            }
                            await AssistantFilesQueries.updateFileOnError(obj, element.fileUuid);
                            result.push({ fileUuid: element.fileUuid, filePath: element.filePath, status: 'Failed', error: allFileIds });
                            slack.webhook(JSON.stringify({ action: "Error in uploading text file's to openAI for External Doc", response: allFileIds, requesUuid: element.fileUuid }));
                        }
                    } else {
                        const obj = {
                            status: 2
                        }
                        await AssistantFilesQueries.updateFileOnError(obj, element.fileUuid);
                        result.push({ fileUuid: element.fileUuid, filePath: element.filePath, status: 'Failed', error: message });
                        slack.webhook(JSON.stringify({ action: "Error while creating stream from blob for External Doc", response: message, requesUuid: element.fileUuid }));
                    }
                } else {
                    const obj = {
                        status: 2
                    }
                    await AssistantFilesQueries.updateFileOnError(obj, element.fileUuid);
                    result.push({ fileUuid: element.fileUuid, filePath: element.filePath, status: 'Failed', error: getFileUrl });
                    slack.webhook(JSON.stringify({ action: "Error while generating SAAS URL for file upload at azure for External Doc", response: getFileUrl, requesUuid: element.fileUuid }));
                }
            }
            console.log("Details", result);
            console.log("*****************************************************************");
            console.log("Job Completed For Uploading Text Files To OpenAI For External Doc");
            console.log("*****************************************************************");
            Logger.data.OpenAI({ response: result }, "Upload-Text-Files-To-OpenAI-External-Doc");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result
            }

        } else {
            console.log("*******************************************************************");
            console.log("No Record Found For Uploading Text Files To OpenAI For External Doc");
            console.log("*******************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in uploading case text file to openAI For External Doc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.generateAzureInvestigationFileUrl = async (start, end, fileName) => {
    try {
        const startsOn = new Date(); // current time
        const startTime = new Date();
        const endTime = new Date();
        const durationMs = endTime - startTime;
        const totalDurationWithBuffer = durationMs + (60 * 60 * 1000);
        const expiresOn = new Date(startsOn.getTime() + totalDurationWithBuffer);
        const blobClient = externalDocContainerClient.getBlobClient(fileName);
        const exists = await blobClient.exists();
        if (exists) {
            await blobClient.setHTTPHeaders({
                blobContentDisposition: "inline",
            });
            const sasToken = generateBlobSASQueryParameters({
                containerName: CONTAINER_NAME,
                blobName: fileName,
                permissions: BlobSASPermissions.parse("r"), // read-only
                startsOn,
                expiresOn,
            }, blobServiceClient.credential).toString();
            const videoUrl = `${blobClient.url}?${sasToken}`
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    videoUrl: videoUrl
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
        console.log('An error occurred while generate Azure Investigation file Url for external doc:', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.presignedUrls = async (files, caseUuid, userId) => {
    try {
        if ((files?.length > 0) && AZURE_ENABLE === 'true' && azureExternalDocHealth === true && userId) {
            if (caseUuid) {
                const record = await AssistantThreadsQueries.findCasesByCaseUuidAndUserId(caseUuid, userId);
                if (record.length > 0) {
                    const result = await AssistantFilesQueries.countFiles(record[0].id, userId);
                    let fileCount = allowedFile - result;
                    if (result < allowedFile) {
                        if (files?.length <= fileCount) {
                            const urls = [];
                            for (const file of files) {
                                const { fileName, mimeType, size, fieldName, pageCount } = file;
                                const findDuplicateFile = await AssistantFilesQueries.findDuplicateFile(fileName, record[0].id, userId);
                                if (findDuplicateFile.length > 0) {
                                    return {
                                        message: Strings.ERROR.RECORD_ALREADY_EXSIST,
                                        statusCode: 400,
                                        obj: {}
                                    };
                                }
                                // Validate type
                                if (!ALLOWED_FILE_TYPES[fieldName]?.includes(mimeType)) {
                                    return {
                                        message: Strings.FILE.ACCEPT_FILE_TYPE_ASSISTANT,
                                        statusCode: 400,
                                        obj: {}
                                    };
                                }
                                if (size > FILE_SIZE_LIMITS[fieldName]) {
                                    return {
                                        message: Strings.FILE.CASE_DOC_SIZE_LIMIT,
                                        statusCode: 400,
                                        obj: {}
                                    };
                                }
                                const blobName = `${record[0].requestUuid}/${fileName}`;
                                const blockBlobClient = externalDocContainerClient.getBlockBlobClient(blobName);
                                const sasToken = generateBlobSASQueryParameters(
                                    {
                                        containerName: process.env.INVESTIGATION_EXTERNAL_DOC_CONTAINER,
                                        blobName,
                                        permissions: BlobSASPermissions.parse("cw"), // create+write
                                        expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000), // 15 min expiry
                                    },
                                    credentials
                                ).toString();
                                urls.push({
                                    pageCount,
                                    fileName,
                                    blobPath: blobName,
                                    uploadUrl: `${blockBlobClient.url}?${sasToken}`,
                                });
                            }
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    requestUuid: record[0].requestUuid,
                                    fileDetails: urls
                                }     
                            };
                        }
                        else {
                            return {
                                message: Strings.FILE.FILE_UPLOAD_LIMIT_EXCEEDS,
                                statusCode: 400,
                                obj: {
                                    message: Strings.FILE.ALLOWED_FILES + (fileCount) + " Files",
                                }
                            };
                        }
                    } else {
                        return {
                            message: Strings.FILE.CASE_DOC_LIMIT,
                            statusCode: 400,
                            obj: {
                                message: Strings.FILE.FILE_UPLOAD_QUOTA + (fileCount)
                            }
                        };
                    }
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    };
                }
            }
            else if (!caseUuid) {
                if (files?.length > 0) {
                    const urls = [];
                    let createBatch
                    createBatch = await AssistantThreadsQueries.createBatch({ userId: userId });
                    for (const file of files) {
                        const { fileName, mimeType, size, fieldName, pageCount } = file;
                        // Validate type
                        if (!ALLOWED_FILE_TYPES[fieldName]?.includes(mimeType)) {
                            return {
                                message: Strings.FILE.ACCEPT_FILE_TYPE_ASSISTANT,
                                statusCode: 400,
                                obj: {}
                            };
                        }
                        if (size > FILE_SIZE_LIMITS[fieldName]) {
                            return {
                                message: Strings.FILE.CASE_DOC_SIZE_LIMIT,
                                statusCode: 400,
                                obj: {}
                            };
                        }
                        const blobName = `${createBatch[0]}/${fileName}`;
                        const blockBlobClient = externalDocContainerClient.getBlockBlobClient(blobName);
                        const sasToken = generateBlobSASQueryParameters(
                            {
                                containerName: process.env.INVESTIGATION_EXTERNAL_DOC_CONTAINER,
                                blobName,
                                permissions: BlobSASPermissions.parse("cw"), // create+write
                                expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000), // 15 min expiry
                            },
                            credentials
                        ).toString();
                        urls.push({
                            pageCount,
                            fileName,
                            blobPath: blobName,
                            uploadUrl: `${blockBlobClient.url}?${sasToken}`,
                        });
                    }
                    return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    requestUuid: createBatch[0],
                                    fileDetails: urls
                                }     
                            };
                }
                else {
                    return {
                        message: Strings.UNVALID_STATUS,
                        statusCode: 400,
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in generate Presigned Urls for investigation external doc:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

ChatGptServices.addFile = async (caseFiles, requestUuid, userId) => {
    try {
        if ((caseFiles?.length > 0) && requestUuid && userId) {
            const record = await AssistantThreadsQueries.findCasesByCaseUuidAndUserId(requestUuid, userId);
            if (record.length > 0) {
                const result = await AssistantFilesQueries.countFiles(record[0].id, userId);
                let fileCount = allowedFile - result;
                if (result < allowedFile) {
                    if (caseFiles?.length <= fileCount) {
                        for (const file of caseFiles) {
                            const fileData = {
                                batchId: record[0].id,
                                userId: userId,
                                fileName: file.fileName,
                                filePath: file.blobPath,
                                isFileUpdated: result > 0
                            };
                            await AssistantFilesQueries.createExternalDoc(fileData);
                        }
                        // console.log("let's see required or not");
                        // const vectorId = await AssistantFilesQueries.getVectorId(record[0].id, userId)
                        // if (vectorId.length > 0) {
                        //     console.log("vectorId at external doc file upload", vectorId[0].vectorId);
                        //     const update = {
                        //         isProcessed: false
                        //     }
                        //     await CaseNamesQueries.updateCaseOnUpdateRecord(update, record[0].id, userId);
                        // }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                requestUuid: requestUuid
                            }
                        }
                    } else {
                        return {
                            message: Strings.FILE.FILE_UPLOAD_LIMIT_EXCEEDS,
                            statusCode: 400,
                            obj: {
                                message: Strings.FILE.ALLOWED_FILES + (fileCount) + " Files",
                            }
                        };
                    }
                } else {
                    return {
                        message: Strings.FILE.FILE_UPLOAD_LIMIT_EXCEEDS,
                        statusCode: 400,
                        obj: {
                            message: Strings.FILE.FILE_UPLOAD_QUOTA + (fileCount)
                        }
                    };
                }
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                };
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in adding file in investigation case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getAnalysis = async (userId) => {
    try {
        const data = await AssistantThreadsQueries.getAllData(userId);
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

ChatGptServices.getAnalysisById = async (requestUuid, userId) => {
    try {
        const data = await AssistantThreadsQueries.getDataByUuid(requestUuid, userId);
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
                const data = await AssistantThreadsQueries.getAllData(userId);
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

ChatGptServices.deleteAnalysis = async (userId) => {
    try {
        const data = {
            isActivated: false,
        }
        const parentRecord = await AssistantThreadsQueries.deleteAnalysis(data, userId);
        if (parentRecord[0] > 0) {
            await AssistantThreadsQueries.deleteBatch(data, userId)
            // await AssistantThreadsQueries.deleteVectorStore(data, userId)
            await AssistantThreadsQueries.deleteFiles({status: false}, userId)
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

ChatGptServices.getBatch = async (requestUuid, userId) => {
    try {
        const data = await AssistantThreadsQueries.findBatch(requestUuid, userId);
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
        console.log("Error while getting batch details by request uuid", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.recentBatch = async (userId) => {
    try {
        const data = await AssistantThreadsQueries.findRecentBatch(userId);
        if (data.length > 0) {
            const record = await AssistantThreadsQueries.findBatch(data[0].requestUuid, userId);
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
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while getting recent batch details", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.startKolabryaExternalDocAnalysis = async () => {
    try {
        const data = await AssistantThreadsQueries.getPendingData();
        if (data.length > 0) {
            console.log("******************************************************");
            console.log("Job Started For Pending Kolabrya External Doc Analysis");
            console.log("******************************************************");
            const results = [];
            for (const element of data) {
                if (await AssistantThreadsQueries.getPendingReportsByUserId(element.userId, element.requestUuid)) {
                    console.log("Queue Details Kolabrya External Doc Analysis", { "UserId": element.userId, "requestUuid": element.requestUuid });
                } else {
                    const checkCaseFileAvaiablity = await AssistantThreadsQueries.checkCaseFileAvaiablity(element.batchId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const result = await ChatGptServices.runChatGPTExternal(element, checkCaseFileAvaiablity[0])
                        results.push(result);
                    }
                    else {
                        console.log("*****************************************************************");
                        console.log("Waiting for Vector Store to Upload Kolabrya External Doc Analysis");
                        console.log("*****************************************************************");
                    }
                }
            }
            console.log("********************************************************");
            console.log("Job Completed For Pending Kolabrya External Doc Analysis");
            console.log("********************************************************");
            if (results.length > 0) {
                Logger.data.OpenAI({ request: results, methodName: "startKolabryaExternalDocAnalysis" }, "Sending-Kolabrya-External-Doc-Analysis-Data-To-OpenAI");
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
            console.log("**********************************************************");
            console.log("No Record Found For Pending Kolabrya External Doc Analysis");
            console.log("**********************************************************");
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

ChatGptServices.runChatGPTExternal = async (details, vectorId) => {
    try {
        const getPrompt = await CaseIntelligentMapQueries.getOpenAIPromptsByType(3);
        if (getPrompt.length > 0) {
            console.log("**************************************************************************");
            console.log("Job Started For Kolabrya External Doc Analysis Investigation Prompt Making");
            console.log("**************************************************************************");
            const findPreviousResponseId = await AssistantThreadsQueries.findPreviousResponseId(details.batchId, details.userId);
            const prompt = JSON.parse(getPrompt[0].prompt);
            prompt.tools[0].vector_store_ids = [vectorId]
            prompt.input = details.request
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
                    await AssistantThreadsQueries.update(obj, details.requestUuid, details.userId)
                } else {
                    const obj = {
                        status: 2,
                        request: JSON.stringify(prompt),
                    }
                    await AssistantThreadsQueries.update(obj, details.requestUuid, details.userId)
                    slack.webhook(JSON.stringify({ action: "Kolabrya External Doc Analysis Failed", response: response, status: response?.status, requestUuid: details.requestUuid, userId: details.userId }));
                }
            }
            else {
                const obj = {
                    status: 2,
                    request: JSON.stringify(prompt),
                }
                await AssistantThreadsQueries.update(obj, details.requestUuid, details.userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya External Doc Analysis Logical Error", response: response, requestUuid: details.requestUuid, userId: details.userId }));
            }
            Logger.data.OpenAI({ request: prompt, response: response, requestUuid: details.requestUuid, userId: details.userId, methodName: "createResponse" }, "Create-Response-Open-AI-For-Kolabrya-External-Doc-Analysis");
            console.log("****************************************************************************");
            console.log("Job Completed For Kolabrya External Doc Analysis Investigation Prompt Making");
            console.log("****************************************************************************");
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
            console.log("No Response API Prompt Found For Kolabrya External Doc Analysis Investigation");
            slack.webhook(JSON.stringify({ action: "No Response API Prompt Found For Kolabrya External Doc Analysis Investigation" }));
        }
    } catch (error) {
        console.log("error while runChatGPTExternal", error);
        slack.webhook(JSON.stringify({ action: "In Catch for runChatGPT for Kolabrya External Doc Analysis", error: JSON.stringify(error) }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.startPendingExternalDoc = async () => {
    try {
        const data = await AssistantThreadsQueries.startPendingReports();
        if (data.length > 0) {
            console.log("**********************************************");
            console.log("Job Started For Kolabrya External Doc Analysis");
            console.log("**********************************************");
            const results = [];
            for (const element of data) {
                const result = await ChatGptServices.startThreadExternalDoc(element.responseId, element.retryCount, element.requestUuid, element.userId, element.batchId)
                results.push(result);
            }
            console.log("************************************************");
            console.log("Job Completed For Kolabrya External Doc Analysis");
            console.log("************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    results
                }
            };
        } else {
            console.log("**************************************************");
            console.log("No Record Found For Kolabrya External Doc Analysis");
            console.log("**************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in start olabrya External Doc Analysis Pending", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.startThreadExternalDoc = async (responseId, retryCount, requestUuid, userId, batchId) => {
    try {
        if (requestUuid && responseId) {
            console.log("************************************************************");
            console.log("Job Started Update Status For Kolabrya External Doc Analysis");
            console.log("************************************************************");
            const results = [];
            const response = await getOpenAIResponse(responseId)
            console.log("");
            console.log("==== Kolabrya External Doc Analysis ====");
            console.log("Status                       *", response?.status);
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
                        AssistantThreadsQueries.update(obj, requestUuid, userId)
                    } else {
                        slack.webhook(JSON.stringify({ action: "Kolabrya External Doc Analysis Status Bad Response", response: response, requestUuid: requestUuid, userId: userId }));
                        const obj = {
                            status: 2
                        }
                        AssistantThreadsQueries.update(obj, requestUuid, userId)
                        slack.webhook(JSON.stringify({ action: "Kolabrya External Doc Analysis Status Failed", response: actualText, status: response?.status, requestUuid: requestUuid, userId: userId }));
                    }
                }
                else if (response?.status == "in_progress") {
                    await AssistantThreadsQueries.update({ status: false }, requestUuid, userId)
                }
                else if (response?.status == "queued") {
                    await AssistantThreadsQueries.update({ status: false }, requestUuid, userId)
                }
                else {
                    const obj = {
                        status: 2
                    }
                    AssistantThreadsQueries.update(obj, requestUuid, userId)
                    slack.webhook(JSON.stringify({ action: "Kolabrya External Doc Analysis Status Failed", response: response, status: response?.status, requestUuid: requestUuid, userId: userId }));
                }
            }
            else {
                const obj = {
                    status: 2
                }
                AssistantThreadsQueries.update(obj, requestUuid, userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya External Doc Analysis Status Logical Error", response: response, requestUuid: requestUuid, retryCount: retryCount, userId: userId }));
            }
            results.push(response)
            Logger.data.OpenAI({ request: responseId, response: response, requestUuid: requestUuid, retryCount: retryCount, userId: userId, methodName: "updateStatus" }, "Kolabrya-External-Doc-Analysis-Update-Status");
            console.log("**************************************************************");
            console.log("Job Completed Update Status For Kolabrya External Doc Analysis");
            console.log("**************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: results
            };
        } else {
            console.log("****************************************************************");
            console.log("No Record Found Update Status For Kolabrya External Doc Analysis");
            console.log("****************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in start Thread for Kolabrya External Doc Analysis", error);
        slack.webhook(JSON.stringify({ action: "In Catch for start Thread Kolabrya External Doc Analysis", error: error }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getFailedExternalDocRecords = async () => {
    try {
        const data = await AssistantThreadsQueries.getFailedReports();
        if (data.length > 0) {
            console.log("***************************************************************");
            console.log("Job Started For Failed Record of Kolabrya External Doc Analysis");
            console.log("***************************************************************");
            const results = [];
            for (const element of data) {
                const findUsage = await AssistantThreadsQueries.checkUsage(element.userId);
                console.log("=======================================");
                console.log("Kolabrya External Doc Analysis Usage", findUsage);
                console.log("=======================================");
                if (await AssistantThreadsQueries.getPendingReportsByUserId(element.userId, element.requestUuid) && findUsage > 0) {
                    console.log("Kolabrya External Doc Analysis Queue Details", { "UserId": element.userId, "requestUuid": element.requestUuid });
                }
                else if (findUsage == 0) {
                    const checkCaseFileAvaiablity = await AssistantThreadsQueries.checkCaseFileAvaiablity(element.batchId);
                    if (checkCaseFileAvaiablity.length > 0) {
                        const result = await ChatGptServices.runFailedRequest(element)
                        results.push(result);
                    }
                    else {
                        console.log("**********************************");
                        console.log("Waiting for Vector Store to Upload");
                        console.log("**********************************");
                    }
                }
            }
            console.log("*****************************************************************");
            console.log("Job Completed For Failed Record of Kolabrya External Doc Analysis");
            console.log("*****************************************************************");
            if (results.length > 0) {
                Logger.data.OpenAI({ request: results, methodName: "getFailedRecords" }, "Sending-Kolabrya-External-Doc-Analysis-Failed-Records-To-OpenAI");
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
            console.log("*******************************************************************");
            console.log("No Record Found For Failed Record of Kolabrya External Doc Analysis");
            console.log("*******************************************************************");
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

ChatGptServices.runFailedRequest = async (details) => {
    try {
        const results = [];
        slack.webhook(JSON.stringify({ action: "Retrying Failed Job for Kolabrya External Doc Analysis", userId: details.userId, requestUuid: details.requestUuid, retryCount: details.retryCount }));
        console.log("*****************************************************");
        console.log("Job Started For Failed Kolabrya External Doc Analysis");
        console.log("*****************************************************");
        const prompt = JSON.parse(details?.request)
        const response = await createResponse(prompt)
        if (!response.error) {
            if (response?.status === 'queued') {
                const obj = {
                    responseId: response.id,
                    status: false,
                    retryCount: details.retryCount + 1
                }
                await AssistantThreadsQueries.update(obj, details.requestUuid, details.userId)
            } else {
                const obj = {
                    status: 2,
                    retryCount: details.retryCount + 1
                }
                await AssistantThreadsQueries.update(obj, details.requestUuid, details.userId)
                slack.webhook(JSON.stringify({ action: "Kolabrya External Doc Analysis Failed Job", response: response, status: response?.status, requestUuid: details.requestUuid, userId: details.userId }));
            }
        }
        else {
            const obj = {
                status: 2,
                retryCount: details.retryCount + 1
            }
            await AssistantThreadsQueries.update(obj, details.requestUuid, details.userId)
            slack.webhook(JSON.stringify({ action: "Kolabrya External Doc Analysis Logical Error At Failure Job", response: response, requestUuid: details.requestUuid, userId: details.userId }));
        }
        results.push(response)
        Logger.data.OpenAI({ request: prompt, response: response, requestUuid: details.requestUuid, retryCount: details.retryCount, userId: details.userId, methodName: "createResponse" }, "Kolabrya-External-Doc-Analysis-Failure-Method");
        console.log("*******************************************************");
        console.log("Job Completed For Failed Kolabrya External Doc Analysis");
        console.log("*******************************************************");
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: results
        };
    } catch (error) {
        slack.webhook(JSON.stringify({ action: "In Catch for Kolabrya External Doc Analysis Retry", error: JSON.stringify(error), requestUuid: details.requestUuid, userId: details.userId }));
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.updateVectorStoreExternalDoc = async () => {
    try {
        const data = await VectorStoreManagerQueries.getPendingDataOnCaseUpdateExternalDoc()
        if (data.length > 0) {
            const list = []
            console.log("***************************************************");
            console.log("Job Started For External Doc To Update Vector Store");
            console.log("***************************************************");
            for (const element of data) {
                const getFileId = await AssistantFilesQueries.getFilesForVectorStore(element.batchId, element.userId)
                const formattedFileIds = getFileId.map(file => file.openAIFileId);
                const getVectorId = await VectorStoreManagerQueries.getVectorDetailsExternal(element.batchId, element.userId)
                console.log("Vector Id On Update External Doc", getVectorId);
                if (getVectorId?.vectorId) {
                    const vectorId = getVectorId.vectorId
                    const id = getVectorId.id
                    const currentFileIds = getVectorId.fileIds
                    const currentFileCounts = getVectorId.fileCounts
                    const record = await ChatGptServices.addFilesInVectorStoreExternal(formattedFileIds, id, vectorId, currentFileIds, currentFileCounts, element.batchId, element.userId);
                    list.push(record);
                }
            }
            Logger.data.OpenAI({ response: list, methodName: "updateVectorStore" }, "OpenAI-File-External-Doc-Update-Batching-Service");
            console.log("*****************************************************");
            console.log("Job Completed For External Doc To Update Vector Store");
            console.log("*****************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: data
            }
        } else {
            console.log("*******************************************************");
            console.log("No Record Found For External Doc To Update Vector Store");
            console.log("*******************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in update Vector Store External Doc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.addFilesInVectorStoreExternal = async (fileIds, id, vectorId, currentFileIds, currentFileCounts, batchId, userId) => {
    try {
        console.log("*****************************************************************************");
        console.log("External Doc updating/adding file's in vector store =>", vectorId);
        console.log("*****************************************************************************");
        const list = await ChatGptServices.addFileIdsToVectorStore(vectorId, fileIds, userId)
        Logger.data.OpenAI({ vectorId: vectorId, requestFileIds: fileIds, response: list, userId: userId, methodName: "makeVectorStore" }, "Adding-FileId-To-Vector-Store-External-Doc-");
        if (list.statusCode == '200') {
            const parsedCurrentFileIds = Array.isArray(currentFileIds) ? currentFileIds : JSON.parse(currentFileIds);
            const obj = {
                featureType: 1,
                userId: userId,
                fileIds: JSON.stringify([...fileIds, ...parsedCurrentFileIds]),
                fileCounts: fileIds.length + currentFileCounts,
                status: false,
                jsonResponse: JSON.stringify(list.obj),
                createdAt: currentDate
            }
            const result = await VectorStoreManagerQueries.updateOnEditExternal(obj, id);
            if (result) {
                const file = {
                    vectorId: id,
                    isFileUpdated: false
                }
                await AssistantFilesQueries.updateVectorIdExternalDoc(file, batchId, userId)
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: obj
                }
            }
        }
        else {
            slack.webhook(JSON.stringify({ action: "Error-While-Inserting-Data-In-DB-OR-OpenAI/Vecore-Store-External-Doc", response: list, userId: userId }));
            Logger.data.OpenAI({ response: list, userId: userId, methodName: "makeVectorStore" }, "Error-While-Inserting-Data-In-DB-OR-OpenAI/Vecore-Store-External-Doc-");
            console.log("error while inserting data in db or openAI/vecore store External Doc", list);
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
            console.log("fileIds", fileIds);
            console.log("userId", userId);
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
            return {
                statusCode: 400,
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                obj: list
            }
        }
    } catch (error) {
        console.error('Error while add Files In Vector Store External Doc', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deleteFileFromVectorStoreExternalDoc = async () => {
    try {
        const data = await VectorStoreManagerQueries.getDeletedRecordsOfVectorStoreExternalDoc()
        if (data.length > 0) {
            const list = []
            console.log("***************************************************************");
            console.log("Job Started For External Doc To Delete File's From Vector Store");
            console.log("***************************************************************");
            for (const element of data) {
                const getFileId = await CaseFilesQueries.getFilesForDeleteVectorStoreExternalDoc(element.batchId, element.userId)
                const formattedFileIds = getFileId.map(file => file.openAIFileId);
                const getVectorId = await VectorStoreManagerQueries.getVectorDetailsExternal(element.batchId, element.userId)
                console.log("Vector Id On Delete External Doc", getVectorId);
                if (getVectorId?.vectorId) {
                    const vectorId = getVectorId.vectorId
                    const id = getVectorId.id
                    const currentFileIds = getVectorId.fileIds
                    const currentFileCounts = getVectorId.fileCounts
                    const record = await ChatGptServices.deleteFilesInVectorStoreExternalDoc(formattedFileIds, id, vectorId, currentFileIds, currentFileCounts, element.batchId, element.userId);
                    list.push(record);
                }
            }
            Logger.data.OpenAI({ response: list, methodName: "deleteFileFromVectorStore" }, "OpenAI-File-Delete-From-Vector-Store-External-Doc");
            console.log("*****************************************************************");
            console.log("Job Completed For External Doc To Delete File's From Vector Store");
            console.log("*****************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: data
            }
        } else {
            console.log("*******************************************************************");
            console.log("No Record Found For External Doc To Delete File's From Vector Store");
            console.log("*******************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in delete File From Vector Store External Doc", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}


ChatGptServices.deleteFilesInVectorStoreExternalDoc = async (fileIds, id, vectorId, currentFileIds, currentFileCounts, batchId, userId) => {
    try {
        console.log("**********************************************************************");
        console.log("Delete file's from vector store external doc =>", vectorId);
        console.log("**********************************************************************");
        for (const element of fileIds) {
            const list = await ChatGptServices.deleteFileIdsFromVectorStore(vectorId, element, userId)
            Logger.data.OpenAI({ vectorId: vectorId, requestFileIds: element, response: list, userId: userId, methodName: "deleteFileIdsFromVectorStore" }, "Delete-Files-From-Vector-Store");
            if (list.statusCode == '200') {
                const a = JSON.parse(currentFileIds); // Convert JSON string to array
                const b = fileIds; // Assuming this is already an array
                const bSet = new Set(b);
                const filteredA = a.filter(fileId => !bSet.has(fileId));
                const obj = {
                    fileIds: JSON.stringify(filteredA),
                    fileCounts: currentFileCounts - fileIds.length,
                    jsonResponse: JSON.stringify(list.obj),
                    updatedAt: currentDate
                }
                const result = await VectorStoreManagerQueries.updateOnEditExternal(obj, id);
                if (result) {
                    for (const element of fileIds) {
                        await AssistantFilesQueries.updateFileOnDelete({ isFileDeleted: 0 }, element, batchId, userId)
                    }
                }
            }
            else {
                slack.webhook(JSON.stringify({ action: "Error-While-Delete-File-From-Vector-Store-External-Doc", response: list, userId: userId }));
                Logger.data.OpenAI({ response: list, userId: userId, methodName: "deleteFilesInVectorStoreErrorExternalDoc" }, "Error-While-Delete-File-From-Vector-Store-External-Doc");
                console.log("error while delete file from vector store external doc", list);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
                console.log("fileIds", fileIds);
                console.log("userId", userId);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
                for (const element of fileIds) {
                    const record = await VectorStoreManagerQueries.getDeletedFilesForVectorStoreExternalDoc(element, batchId, userId)
                    if (record) {
                        const entry = await ChatGptServices.deleteFileIdsFromVectorStore(record.vectorId, element, record.userId)
                        Logger.data.OpenAI({ vectorId: record.vectorId, requestFileIds: element, response: entry, userId: userId, methodName: "deleteFileIdsFromOtherVectorStoreExternalDoc" }, "Delete-Files-From-Other-Vector-Store-External-Doc");
                        if (entry.statusCode == '200') {
                            const a = JSON.parse(record.fileIds);
                            const b = fileIds;
                            const bSet = new Set(b);
                            const filteredA = a.filter(fileId => !bSet.has(fileId));
                            const obj = {
                                fileIds: JSON.stringify(filteredA),
                                fileCounts: a.length - [element].length,
                                jsonResponse: JSON.stringify(entry.obj),
                                updatedAt: currentDate
                            }
                            await VectorStoreManagerQueries.updateOnDeleteExternalDoc(obj, record.id);
                            //isActivate false at doc assistant table
                            await AssistantFilesQueries.updateFileOnDelete({ isFileDeleted: 0 }, element, batchId, userId)
                            return {
                                statusCode: 200,
                                message: Strings.SUCCESS,
                                obj: obj
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('An error occurred while delete Files In Vector Store external doc', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.removeFile = async (caseUuid, fileUuid, userId) => {
    try {
        const obj = {
            status: false,
            updatedAt: currentDate,
            isFileDeleted: 1
        }
        const record = await AssistantThreadsQueries.getCaseIdForDelete(caseUuid, fileUuid, userId)
        if (record.length > 0) {
            const data = await AssistantFilesQueries.deActivateFile(obj, fileUuid);
            await AssistantThreadsQueries.deleteAnalysisOnFileDelete({responseId: null}, record[0].id, userId)
            if (data[0] == 1) {
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
            }
        }

    } catch (error) {
        console.log("Error in deleting a file:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}


//

ChatGptServices.executeThreads = async (fileIds, query, userQuery, botId, userId, contentType, content, documentAssistant, checkFile, findId, isGroup, groupId, originalContent, selectedPrompt) => {
    try {
        const sentence = "Given the uploaded document of "
        //file + text area + radio button
        if (selectedPrompt && userQuery && query) {
            const getOpenAIPrompt = await UserQueries.getPromptByType(46);
            const fetchOpenAIPrompt = JSON.parse(getOpenAIPrompt[0].prompt)[selectedPrompt]
            const getAIPrompt = await UserQueries.getPromptByType(2);
            const fetchAIPrompt = JSON.parse(getAIPrompt[0].prompt)[selectedPrompt]?.key
            query = sentence + query + fetchOpenAIPrompt + ' And ' + userQuery
            userQuery = fetchAIPrompt + ' And ' + userQuery
        }

        //file + radio button
        if (selectedPrompt && query && !userQuery) {
            const getAIPrompt = await UserQueries.getPromptByType(2);
            const getOpenAIPrompt = await UserQueries.getPromptByType(46);
            const fetchOpenAIPrompt = JSON.parse(getOpenAIPrompt[0].prompt)[selectedPrompt]
            const fetchAIPrompt = JSON.parse(getAIPrompt[0].prompt)[selectedPrompt]?.key
            query = sentence + query + fetchOpenAIPrompt
            userQuery = fetchAIPrompt
        }

        //cite/ texthighlighter
        if (userQuery && query && documentAssistant == '25') {
            query = query
            userQuery = userQuery
        }

        //file + text area
        //file + below input field
        if (userQuery && query && documentAssistant != '25' && !selectedPrompt) {
            query = sentence + query + ' ' + userQuery
            userQuery = userQuery
        }

        let assistantId;
        let assistantType =
            documentAssistant === undefined ? 1 :
                documentAssistant === 'true' ? 0 :
                    documentAssistant === '3' ? 3 :
                        documentAssistant === '4' ? 4 :
                            documentAssistant === '6' ? 6 :
                                documentAssistant === '8' ? 8 :
                                    documentAssistant === '9' ? 9 :
                                        documentAssistant === '10' ? 10 :
                                            documentAssistant === '23' ? 23 :
                                                documentAssistant === '25' ? 25 :
                                                    documentAssistant === '26' ? 26 : 2

        console.log("");
        console.log("=================");
        console.log("assistantType", assistantType);
        console.log("=================");
        console.log("");

        if (documentAssistant == 'false') {
            assistantId = reportProducerAssistant
        }
        else if (documentAssistant == 'true' && checkFile == 0) {
            assistantId = kolabryaAssistant
        }
        else if (documentAssistant == '6' || documentAssistant == '8') {
            assistantId = reWriteReportAssistant
        }
        else if (documentAssistant == '9' || documentAssistant == '10') {
            assistantId = empLawAssistant
        }
        else if (documentAssistant == '23') {
            assistantId = kolabryaVisuals
        }
        else if (documentAssistant == '25') {
            assistantId = kolabryaTextHighLighter
        }
        else if (documentAssistant == '26') {
            assistantId = kolabryaInsLawAssistant
        }
        else {
            assistantId = kolabryaAssistant
        }
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        payload.messages[0].content = query;
        const getPayload = payload?.messages[0];
        const attachments = fileIds.flatMap(fileId => ([
            {
                file_id: fileId,
                tools: [{ type: "file_search" }]
            }
        ]));

        payload.messages[0].attachments = attachments;
        const getThreadId = await ChatGptServices.createOrFindThread(assistantType, userId)
        if (getThreadId.statusCode == '200') {
            // add message to thread.
            const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Open-AI");
            if (addMessage.id) {
                // run the thread.
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: userId, methodName: "runThreads" }, "Run-Thread-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "threadStep" }, "Thread-Step-Open-AI");
                //Assistant Types
                //0 = document assistant
                //1 = kolabrya assistant
                //2 = report producer assistant
                //3 = document assistant with case analysis
                //4 = report assistant with case analysis
                //5 = for improved prompt *
                //6 = re write the report from case files
                //7 = Research-Assistant *
                //8 = re write the report from external files
                //9 = emp Law Analysis Assist case files
                //10 = emp Law Analysis Assist external files
                //23 = Generate Visual's from External File's and Case File's
                //24 = Generate Text Formatter using a job
                //25 = Generate Highligted Text from External File's and Case File's
                console.log("");
                console.log("=================");
                console.log("threadStep", threadStep.status);
                console.log("=================");
                console.log("");
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        caseId: findId,
                        status: 0,
                        botId: botId,
                        question: query,
                        userQuery: userQuery,
                        userId: userId,
                        kolabryaAssistant: assistantType
                    }
                    if (isGroup == true) {
                        data.groupId = groupId
                    }

                    const getId = await AssistantThreadsQueries.createThreadCite(data);
                    if (content.length > 0) {
                        content.forEach(async (file, index) => {
                            const fileText = file.buffer.toString('utf-8')
                            const filename = file.originalname;
                            const currentFileMD5 = await ChatGptServices.computeMD5(fileText);
                            const fileData = {
                                userId: userId,
                                threadId: getId[0],
                                botId: botId,
                                fileId: fileIds[index],
                                fileHash: currentFileMD5,
                                fileName: filename,
                                status: 1,
                                contentType: contentType
                            }
                            await AssistantFilesQueries.createFile(fileData);
                        });
                    }
                    if (getId) {
                        if (assistantType == '0' || assistantType == '3') {
                            const citation = await UserQueries.getCitation(userId);
                            console.log("Citation:", citation[0]?.isCitation);
                            if (citation[0]?.isCitation === true) {
                                await ChatGptServices.sendCiteDocumnets(originalContent, assistantType, getId[1], userId)
                            }
                        }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                requestUuid: getId[1]
                            }
                        }
                    }
                } else {
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: {
                            message: threadStep?.error?.message,
                            type: threadStep?.error?.type,
                            param: threadStep?.error?.param,
                            code: threadStep?.error?.code,
                            retry: true
                        }
                    }
                }
            } else {
                return {
                    message: Strings.ERROR.ERROR_RE_TRY,
                    statusCode: 400,
                    obj: {
                        message: addMessage?.error?.message,
                        type: addMessage?.error?.type,
                        param: addMessage?.error?.param,
                        code: addMessage?.error?.code,
                        retry: true
                    }
                }
            }
        } else {
            return {
                message: Strings.ERROR.ERROR_WAIT,
                statusCode: 400,
                obj: {
                    ...getThreadId.obj,
                    // retry: true
                }
            }
        }
    } catch (error) {
        console.log("Error in making threads:", error);
        return {
            message: Strings.ERROR.ERROR_WAIT,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

ChatGptServices.roomTranscript = async (botId) => {
    const result = await RoomQueries.getRoomTranscript(botId)
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result[0]?.transcript
    };
}


ChatGptServices.transcriptPayload = async (botId, text) => {
    const buffer = Buffer.from(text, 'utf-8');
    return [
        {
            originalname: botId + '.txt',
            mimetype: 'text/plain',
            buffer: buffer,
        }
    ]
}

ChatGptServices.getMCPServerResponse = async (jsonObject) => {
    try {
        const question = jsonObject.question;
        const data = await getTribunalSummary(question)
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: data
        }
    } catch (error) {
        return {
            message: error.message,
            statusCode: 400,
            obj: {}
        }

    }
}

ChatGptServices.getAllThreadAssResponses = async (threadId, userId) => {
    let obj = {};
    let data = {};
    try {
        if (threadId) {
            const result = await AssistantThreadsQueries.getRunIdByThreadIdAss(threadId, userId)
            if (result.length > 0) {
                const validateStatus = await validateThreadStatus(threadId, result[0].runId);
                // console.log("Validate-Status-Kolabrya Assistant", validateStatus.status);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Retrive-Run")
                data = {
                    jsonResponse: JSON.stringify(validateStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, result[0].runId);
                if (!validateStatus.error) {
                    const getCompleteStatus = validateStatus.status == 'completed';
                    const getInProgressStatus = validateStatus.status == 'in_progress';
                    const getFailedStatus = validateStatus.status == 'failed';
                    const getExpiredStatus = validateStatus.status == 'expired';
                    const getQueuedStatus = validateStatus.status == 'queued';

                    console.log("");
                    console.log("===== Kolabrya Assistant =====");
                    console.log("getCompleteStatus      *", getCompleteStatus);
                    console.log("getInProgressStatus   **", getInProgressStatus);
                    console.log("getFailedStatus      ***", getFailedStatus);
                    console.log("getExpiredStatus    ****", getExpiredStatus);
                    console.log("getQueuedStatus    *****", getQueuedStatus);
                    console.log("");

                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            answer: JSON.stringify(getResponse ? await ChatGptServices.removeAnnotation(getResponse) : {}),
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: result[0].runId }, "Thread-Status-Complete-Kolabrya-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return await getBulkData(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Failed-Kolabrya-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        console.log("validate run failed case kolabrya assistant", validateStatus);
                        console.log("check status", validateStatus.status);
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getExpiredStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Expired-Kolabrya-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else {
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                } else {
                    console.log("validate run error kolabrya assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
                        answer: null,
                        jsonResponse: JSON.stringify(validateStatus?.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: obj
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
        console.log("Error in kolabrya transcript assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

ChatGptServices.getAllThreadDocResponses = async (requestUuid, userId) => {
    let obj = {};
    let data = {};
    try {
        if (requestUuid) {
            const result = await AssistantThreadsQueries.getRunIdByThreadIdDoc(requestUuid, userId)
            if (result.length > 0) {
                const threadId = result[0].threadId;
                const runId = result[0].runId;
                const validateStatus = await validateThreadStatus(threadId, runId);
                console.log("Validate-Status-Document-Assistant", validateStatus.status);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Retrive-Run")
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
                    console.log("===== Document Assistant =====");
                    console.log("getCompleteStatus      *", getCompleteStatus);
                    console.log("getInProgressStatus   **", getInProgressStatus);
                    console.log("getFailedStatus      ***", getFailedStatus);
                    console.log("getExpiredStatus    ****", getExpiredStatus);
                    console.log("getQueuedStatus    *****", getQueuedStatus);
                    console.log("");

                    if (getCompleteStatus) {
                        const allFileName = []
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        const getCiteDetails = await AssistantThreadsQueries.getDetailsForCite(threadId, userId)
                        if (getCiteDetails.length > 0) {
                            const findFileName = await AssistantFilesQueries.findFileNamesById(getCiteDetails[0].id, userId)
                            findFileName.forEach(file => {
                                allFileName.push(Encryptions.decryptFileName(file.fileName));
                            })
                            const citeData = await getCiteResponse(getResponse, allFileName.join(','), 0, getCiteDetails[0].requestUuid, userId);
                            Logger.data.Citation({ openAIResponse: getResponse, fileNames: allFileName.join(','), assistantType: 0, requestUuid: getCiteDetails[0].requestUuid, threadId: threadId, userId: userId }, "Requesting-Parameter-To-Cite")
                            Logger.data.Citation({ citeResponse: citeData, threadId: threadId, userId: userId }, "Response-From-Citation")
                            Logger.data.Citation({ openAIResponse: getResponse, threadId: threadId, userId: userId }, "Response-From-OpenAI")
                            console.log("******************* Request - 2 - citeData *******************");
                            console.log(citeData)
                            console.log("******************* Request - 2 - citeData *******************");
                            if (citeData.statusCode == '200' && citeData.obj.sources.length > 0) {
                                Logger.data.Citation({ citeResponse: citeData, threadId: threadId, userId: userId }, "Showing-The-Data-Of-Citation")
                                const record = await ChatGptServices.responseCleaningForAnalysisCite(citeData.obj.response, 'removeDoubleSingleSlashN');
                                obj = {
                                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                                    status: 1,
                                    messageId: getanswer?.data[0]?.id,
                                    answer: record ? record : {},
                                    citationStatus: true,
                                    updatedAt: currentDate
                                }
                            } else {
                                Logger.data.Citation({ openAIResponse: getResponse, threadId: threadId, runId: runId, userId: userId }, "Showing-The-Data-Of-OpenAI")
                                const record = await ChatGptServices.responseCleaningForAnalysis(getResponse, 'removeDoubleSingleSlashN');
                                obj = {
                                    message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                                    status: 1,
                                    messageId: getanswer?.data[0]?.id,
                                    answer: record ? record : {},
                                    updatedAt: currentDate,
                                    citationStatus: 2,
                                }
                            }
                        } else {
                            const record = await ChatGptServices.responseCleaningForAnalysis(getResponse, 'removeDoubleSingleSlashN');
                            obj = {
                                message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                                status: 1,
                                messageId: getanswer?.data[0]?.id,
                                // answer: getResponse ? await ChatGptServices.removeAnnotation(getResponse) : {},
                                answer: record ? record : {},
                                updatedAt: currentDate
                            }
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Documnet-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, runId);
                        return await getBulkDataDoc(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, runId);
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                                status: 0
                            }
                        }
                    }
                    else if (getFailedStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Thread-Status-Failed-Documnet-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Documnet-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, userId: userId }));
                        console.log("validate run failed case  document assistant", validateStatus);
                        console.log("check status", validateStatus.status);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Thread-Status-Expired-Documnet-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Documnet-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, userId: userId }));
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
                    console.log("validate run error document assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
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
        console.log("Error in kolabrya document assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

ChatGptServices.getAllThreadReportResponses = async (threadId, userId) => {
    let obj = {};
    let data = {};
    try {
        if (threadId) {
            const result = await AssistantThreadsQueries.getRunIdByThreadIdReport(threadId, userId)
            if (result.length > 0) {
                const validateStatus = await validateThreadStatus(threadId, result[0].runId);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Retrive-Run")
                // console.log("Validate-Status-Report-Producer-Assistant", validateStatus.status);
                data = {
                    jsonResponse: JSON.stringify(validateStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, result[0].runId);

                if (!validateStatus.error) {
                    const getCompleteStatus = validateStatus.status == 'completed';
                    const getInProgressStatus = validateStatus.status == 'in_progress';
                    const getFailedStatus = validateStatus.status == 'failed';
                    const getExpiredStatus = validateStatus.status == 'expired';
                    const getQueuedStatus = validateStatus.status == 'queued';

                    console.log("");
                    console.log("===== Report Producer Assistant =====");
                    console.log("getCompleteStatus             *", getCompleteStatus);
                    console.log("getInProgressStatus          **", getInProgressStatus);
                    console.log("getFailedStatus             ***", getFailedStatus);
                    console.log("getExpiredStatus           ****", getExpiredStatus);
                    console.log("getQueuedStatus           *****", getQueuedStatus);
                    console.log("");

                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        const record = await ChatGptServices.responseCleaningForAnalysis(getResponse, 'removeDoubleSingleSlashN');
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            answer: record ? record : {},
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: result[0].runId }, "Thread-Status-Complete-Report-Producer-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return await getBulkDataReport(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Failed-Report-Producer-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Report-Producer-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        console.log("validate run failed case report assistant", validateStatus);
                        console.log("check status", validateStatus.status);
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getExpiredStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Expired-Report-Producer-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Report-Producer-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else {
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }

                } else {
                    console.log("validate run error report assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
                        answer: null,
                        jsonResponse: JSON.stringify(validateStatus?.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: obj
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
        console.log("Error in kolabrya report producer assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

ChatGptServices.transformPayload = async (data) => {
    if (data.length === 0) return null;
    return {
        caseUuid: data[0].caseUuid,
        userId: String(data[0].userId),
        caseDetails: data.map(item => ({
            fileName: item["caseDetails.fileName"],
            fileUuid: item["caseDetails.fileUuid"]
        }))
    };
}

ChatGptServices.sendCiteDocumnets = async (caseId) => {
    try {
        const list = await CaseNamesQueries.getDataForCitation(caseId);
        if (list.length > 0) {
            const transformedData = await ChatGptServices.transformPayload(list);
            const fileDetailes = transformedData?.caseDetails
            const record = await uploadCiteDocuments(transformedData);
            console.log("******************* Request - 1 - Send-Cite-Documnets *******************");
            console.log(JSON.stringify(record));
            console.log("******************* Request - 1 - Send-Cite-Documnets *******************");
            if (record.statusCode == '200' && record.obj.status == true) {
                Logger.data.Citation({ request: transformedData, response: record }, "Send-Cite-Document-Success")
                if (fileDetailes.length > 0) {
                    for (const element of fileDetailes) {
                        const obj = {
                            isCitation: false, //pending Files
                        }
                        await CaseFilesQueries.updateFileForCite(obj, element.fileUuid)
                    }
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: record
                }
            } else {
                if (fileDetailes.length > 0) {
                    for (const element of fileDetailes) {
                        const obj = {
                            isCitation: 2, //failed due to python down
                        }
                        await CaseFilesQueries.updateFileForCite(obj, element.fileUuid)
                    }
                }
                Logger.data.Citation({ request: transformedData, response: record }, "Send-Cite-Document-Failed")
                slack.webhook(JSON.stringify({ action: "Error-While-Sending-Cite-Document", request: transformedData, response: record }));
                return {
                    message: Strings.SUCCESS,
                    statusCode: 400,
                    obj: record
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
        console.log("Error in sending Cite Documnets", error);
        return {
            message: Strings.ERROR.ERROR_WAIT,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

ChatGptServices.editFileCitation = async () => {
    try {
        const record = await CaseFilesQueries.getEditFiles();
        if (record.length > 0) {
            console.log("*******************************************************");
            console.log("Job Started To Upload Edit Files To Python For Citation");
            console.log("*******************************************************");
            const caseId = record[0].caseId
            const list = await CaseNamesQueries.getDataForCitation(caseId);
            if (list.length > 0) {
                const transformedData = await ChatGptServices.transformPayload(list);
                const fileDetailes = transformedData?.caseDetails
                const record = await uploadCiteDocuments(transformedData);
                console.log("******************* Request - 1 - Send-Cite-Documnets *******************");
                console.log(JSON.stringify(record));
                console.log("******************* Request - 1 - Send-Cite-Documnets *******************");
                if (record.statusCode == '200' && record.obj.status == true) {
                    Logger.data.Citation({ request: transformedData, response: record }, "Send-Cite-Document-Success")
                    if (fileDetailes.length > 0) {
                        for (const element of fileDetailes) {
                            const obj = {
                                isCitation: false, //pending Files
                            }
                            await CaseFilesQueries.updateFileForCite(obj, element.fileUuid)
                        }
                    }
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: record
                    }
                } else {
                    if (fileDetailes.length > 0) {
                        for (const element of fileDetailes) {
                            const obj = {
                                isCitation: 2, //failed due to python down
                            }
                            await CaseFilesQueries.updateFileForCite(obj, element.fileUuid)
                        }
                    }
                    Logger.data.Citation({ request: transformedData, response: record }, "Send-Cite-Document-Failed")
                    slack.webhook(JSON.stringify({ action: "Error-While-Sending-Cite-Document", request: transformedData, response: record }));
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 400,
                        obj: record
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
            console.log("***********************************************************");
            console.log("No Record Found For Upload Edit Files To Python For Citation");
            console.log("***********************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in sending Cite Documnets", error);
        return {
            message: Strings.ERROR.ERROR_WAIT,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

ChatGptServices.fileUploadStatusCitation = async (record) => {
    try {
        if (record && record.caseUuid) {
            console.log("*************************************");
            console.log("Job Started For Upload Citation Files");
            console.log("*************************************");
            const data = await CaseNamesQueries.findCaseId(record.caseUuid, record.userId)
            if (data.length > 0) {
                const caseId = data[0].id
                const userId = record.userId
                for (const element of record.caseDetails) {
                    const caseDetails = element
                    const obj = {
                        isCitation: caseDetails.status
                    }
                    await CaseFilesQueries.updateCaseFileByCitation(obj, caseDetails.fileUuid, caseId, userId)
                }
                console.log("***********************************");
                console.log("Job Ended For Upload Citation Files");
                console.log("***********************************");
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {}
                }
            } else {
                console.log("*************");
                console.log("No Case Found");
                console.log("*************");
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        } else {
            console.log("*****************************************");
            console.log("No Record Found For Upload Citation Files");
            console.log("*****************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in file upload status citation", error);
        return {
            message: Strings.ERROR.ERROR_WAIT,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

ChatGptServices.getTranscriptResponse = async () => {
    let obj = {};
    let data = {};

    try {
        const record = await AssistantThreadsQueries.getCleanTrasnscriptRecord();
        if (record && record.length > 0) {
            for (let index = 0; index < record.length; index++) {
                const element = record[index];
                const getQuerieStatus = await getThreadStatus(element.threadId, element.runId);
                data = {
                    jsonResponse: JSON.stringify(getQuerieStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, element.threadId);
                if (!getQuerieStatus.error) {
                    const getCompleteStatus = getQuerieStatus?.data[0]?.status == 'completed';
                    const getInProgressStatus = getQuerieStatus?.data[0]?.status == 'in_progress';
                    const getFailedStatus = getQuerieStatus?.data[0]?.status == 'failed';
                    const getEmptyStatus = getQuerieStatus?.data.length === 0;

                    console.log("");
                    console.log("=== Transcript Assistant ===");
                    console.log("getCompleteStatus      *", getCompleteStatus);
                    console.log("getInProgressStatus   **", getInProgressStatus);
                    console.log("getFailedStatus      ***", getFailedStatus);
                    console.log("getEmptyStatus      ****", getEmptyStatus);
                    console.log("");
                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(element.threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            stepId: getQuerieStatus?.data[0]?.id,
                            answer: JSON.stringify(getResponse ? await ChatGptServices.removeAnnotation(getResponse) : {}),
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ requestPayload: getQuerieStatus, response: getanswer, threadId: threadId, runId: result[0].runId }, "Thread-Status-Complete-Transcript-Assistant-Open-AI");
                        await AssistantThreadsQueries.updateThreadById(obj, element.threadId);
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, element.threadId);
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                                status: 0,
                                threadId: element.threadId
                            }
                        }
                    }
                    else if (getFailedStatus) {
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_FAILED_RESPONSE,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(getQuerieStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, element.threadId);
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getEmptyStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, element.threadId);
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                                status: 0,
                                threadId: element.threadId
                            }
                        }
                    }
                    else {
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_FAILED_RESPONSE,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(getQuerieStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                } else {
                    obj = {
                        message: Strings.ASSISTANT.ASSISTANT_FAILED_RESPONSE,
                        status: 2,
                        answer: null,
                        jsonResponse: JSON.stringify(getQuerieStatus.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, element.threadId);
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: obj
                    }
                }
            }
        }
    } catch (error) {
        console.log("error in kolabrya clean transccript assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }


}


async function getTranscript(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getCleanTranscript(result[0].botId, userId)
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: data
        }
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}


async function getBulkDataReport(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getQNAReport(result[0].botId, userId)
        const getAllData = await Promise.all(data.map(async (element) => {
            const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
            const { caseId, ...rest } = element;
            return {
                ...rest,
                caseDetails: getCaseDetails
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
}

async function getBulkDataDoc(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getQNADoc(userId)
        const getAllData = await Promise.all(data.map(async (element) => {
            if (element.kolabryaAssistant == 0 || element.kolabryaAssistant == 3) {
                element.visuals = true
            }
            if (element.kolabryaAssistant == 22) {
                element.answer = element.answer.replace(/\\\"/g, '"');
                element.answer = element.answer.replace(/\n/g, '');
            }
            const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
            const { caseId, id, kolabryaAssistant, ...rest } = element;
            return {
                ...rest
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
}

async function getBulkData(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getQNA(result[0].botId, userId)
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: data
        }
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

async function getBulkDataIns(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getQNAIns(userId)
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: data
        }
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

async function getImprovedPromptData(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedPromptById(threadId, userId)
    if (result.length > 0) {
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
        }
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

ChatGptServices.getAllResponses = async (botId, userId) => {
    if (botId) {
        const result = await AssistantThreadsQueries.getAllThreadResponses(botId, userId)
        if (result.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result
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
}

ChatGptServices.getAllResponsesIns = async (userId) => {
    const result = await AssistantThreadsQueries.getAllThreadResponsesIns(userId)
    if (result.length > 0) {
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
        };
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

ChatGptServices.getAllReportsResponses = async (botId, userId) => {
    try {
        if (botId) {
            const result = await AssistantThreadsQueries.getAllReports(botId, userId)
            const data = await Promise.all(result.map(async (element) => {
                const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
                const { caseId, ...rest } = element;
                return {
                    ...rest,
                    caseDetails: getCaseDetails
                };
            }));
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
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting data for report assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getFileStatus = async (botId, userId, contentType) => {
    const result = await AssistantFilesQueries.getFileStatus(botId, userId, contentType)
    if (result.length > 0) {
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
        };
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

ChatGptServices.getContent = async (botId, userId, contentType, content) => {
    if (content.length > 0) {
        const promises = content.map(async (file) => {
            const fileText = file.buffer.toString('utf-8')
            const md5 = await ChatGptServices.computeMD5(fileText);
            return await AssistantFilesQueries.validateContent(botId, userId, contentType, md5)
        });

        const results = await Promise.all(promises);
        if (results.length > 0 && results.every(arr => arr.length > 0)) {
            const fileIds = results.map(result => result[0].fileId);
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: fileIds
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

ChatGptServices.cleanTranscript = async (botId) => {
    const result = await AssistantThreadsQueries.getCleanTranscript(botId)
    if (result.length > 0) {
        if (result[0].status == 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                    status: 0,
                    botId: botId
                }
            }
        } else if (result[0].status == 1) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result[0].answer
            };
        }
        else {
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: {}
            };
        }
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

ChatGptServices.deleteFile = async (botId, userId) => {
    try {
        const obj = {
            status: 3,
            updatedAt: currentDate
        }
        const result = await AssistantThreadsQueries.changeStatusDoc(obj, userId)
        if (result[0] > 0) {
            if (Features[6].hardDelete) {
                await ChatGptServices.deleteFileFromOpenAI(userId);
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
        console.log("error in clearing thread and deleting file from openAI", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.startThread = async (botId, userId, contentType, content, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt) => {
    const originalContent = content.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: Buffer.from(file.buffer),
        size: file.size
    }));
    content.forEach(file => {
        // file.originalname = Encryptions.encryptFileName(file.originalname);
    })
    const getFileId = await ChatGptServices.getContent(botId, userId, contentType, content);
    let checkFile;
    if (getFileId.obj.length > 0) {
        console.log("");
        console.log("==================");
        console.log("File Already Found");
        console.log("==================");
        console.log("");
        checkFile = 1;
        return await ChatGptServices.executeThreads(getFileId.obj, query, userQuery, botId, userId, contentType, content, documentAssistant, checkFile, findId, isGroup, groupId, originalContent, selectedPrompt)
    }
    else {
        console.log("");
        console.log("========");
        console.log("New File");
        console.log("========");
        console.log("");
        const allFileIds = await summaryUpload(content);
        if (allFileIds.some(file => file.error)) {
            const errorMessage = allFileIds.find(file => file.error).error;
            return {
                message: Strings.ASSISTANT.ASSISTANT_FILE_UPLOAD_ERROR,
                statusCode: 400,
                obj: {
                    message: errorMessage.message,
                    type: errorMessage.type,
                    param: errorMessage.param,
                    code: errorMessage.code,
                }
            };
        }
        else {
            checkFile = 0;
            const fileIds = allFileIds.map(file => file.id);
            return await ChatGptServices.executeThreads(fileIds, query, userQuery, botId, userId, contentType, content, documentAssistant, checkFile, findId, isGroup, groupId, originalContent, selectedPrompt);
        }
    }
}

ChatGptServices.computeMD5 = async (fileBuffer) => {
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

ChatGptServices.storeVideo = async (botId) => {
    try {
        const fileName = `${botId}.mp4`;
        const data = await getVideoUrl(botId)
        if (data && data?.video_url) {
            const response = await downloadFile(data.video_url)
            if (response.status == 200 && response.statusText == 'OK') {
                if (azureRecallHealth) {
                    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
                    console.log("blockBlobClient", blockBlobClient.url);
                    const passThrough = new PassThrough();
                    response.body.pipe(passThrough);
                    // Upload stream directly to blob
                    const writeAtAzure = await blockBlobClient.uploadStream(passThrough, 4 * 1024 * 1024, 20, {
                        blobHTTPHeaders: { blobContentType: "video/mp4" },
                    });
                    console.log("writeAtAzure", writeAtAzure._response.status);
                    if (writeAtAzure?._response?.status === 201) {
                        await RoomQueries.updateByBot({ recallVideoStatus: 1 }, botId)
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                video_url: blockBlobClient.url,
                                botId: botId
                            }
                        }
                    } else {
                        return await ChatGptServices.writeRecallVideo(response, fileName, botId)
                    }
                } else {
                    return await ChatGptServices.writeRecallVideo(response, fileName, botId)
                }
            } else {
                //add the recall loooger + Slack here
                return {
                    message: Strings.BAD_CODE_MESSAGE,
                    statusCode: 400,
                    obj: {
                        message: Strings.RECALL.FILE_DOWNLOAD_ERROR,
                        botId: botId
                    }
                }
            }
        } else {
            //add the recall loooger + Slack here
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: data
            }
        }
    } catch (error) {
        //add the recall loooger + Slack here
        console.log("An error occurred while downloading video", error)
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.writeRecallVideo = async (response, fileName, botId) => {
    try {
        await RoomQueries.updateByBot({ recallVideoStatus: 2 }, botId)
        //add the recall loooger + Slack here
        //Failed to write a recall video at azure storing it on vm
        await makeDirectory(videoDirectory);
        const filePath = path.join(videoDirectory, fileName)
        const writer = fs.createWriteStream(filePath);
        response.body.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                resolve({
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        video_url: filePath,
                        botId: botId
                    }
                });
            });
            writer.on('error', (err) => {

                console.log("err", err);


                reject({
                    message: Strings.BAD_CODE_MESSAGE,
                    statusCode: 400,
                    obj: {
                        message: err.message,
                        botId: botId
                    }
                });
            });
        });
    } catch (error) {
        console.log("Error While writing recall file on vm", error)
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.downloadCoreTranscript = async (botId) => {
    try {
        if (botId) {
            console.log("*******************************************");
            console.log("Get request for core transcript from recall");
            console.log("*******************************************");
            const data = await getCoreTranscript(botId)
            Logger.data.ReCall({ request: botId, response: data.length > 0 ? Strings.SUCCESS : Strings.ROOM.EMPTY }, "Get-Recall-Core-Transcript")
            if (data) {
                console.log("*************************************************");
                console.log("Successfully fetching core transcript from recall");
                console.log("*************************************************");
                const record = {
                    coreTranscript: JSON.stringify(data)
                }
                await RoomQueries.updateByBot(record, botId);
                const getStringTranscript = await RoomQueries.getRoomTranscript(botId);
                if (getStringTranscript.length > 0 && getStringTranscript[0]?.transcript) {
                    const record = getStringTranscript[0].transcript.replace(/<\/?p>/g, '');
                    const formattedRecord = record.replace(/\[([^\]]+)\]:/g, '<p><br></p><p><strong>[$1]:</strong>');
                    await RoomQueries.updateByBot({ transcript: formattedRecord }, botId);
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
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("An error occurred while downloading core transcript", error)
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getBase = async (botId) => {
    let fileName = `${botId}.mp4`;
    const filePath = path.join(videoDirectory, fileName)
    try {
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath);
            // console.log("fileData", fileData);
            const base64Data = fileData.toString('base64');
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    base64: base64Data,
                    botId: botId
                }
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log('An error occurred while converting file to base64:', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.mdToPdf = async (userId, botId) => {
    try {
        let fileName = `${botId}.docx`;
        let isTranscript;
        const result = await RoomQueries.getDoneTranscript(userId, botId);
        //add the response we are generating your transcript please wait
        if (result.length > 0 && result) {
            let record;
            await makeDirectory(pdfDirectory)
            const filePath = path.join(pdfDirectory, fileName);
            if (result[0]?.isEnhanced == 1 && result[0]?.interviewId != null && result[0]?.enhancedTranscript != null) {
                record = result[0]?.enhancedTranscript
            } else {
                record = result[0]?.transcript
                isTranscript = true
            }
            const fileExsist = await ChatGptServices.findFile(filePath);
            if (false) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.FILE.FILE_CREATED,
                        fileName: fileName,
                        botId: botId
                    }
                };
            } else {
                return await ChatGptServices.triggerFile(filePath, record, fileName, botId, "", isTranscript);
            }
        } else if (result.length > 0 && result[0]?.isEnhanced == '0') {
            return {
                message: Strings.ROOM.TRANSCRIPT_IN_PROGRESS,
                statusCode: 200,
                obj: {}
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
        console.log('An error occurred while converting mardown format to pdf:', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

async function createPdf(filePath, answer) {
    return new Promise((resolve, reject) => {
        markdownpdf().from.string(answer).to(filePath, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

ChatGptServices.createDocx = async (filePath, answer, isTranscript) => {
    try {
        const testFormatStarting = /((<br>\s*<strong>\s*){7}<p>\s*<br>\s*<\/p>\s*<p>\s*<strong>)/gi;
        const testFormatEnding = /(<\/strong>\s*){3,}/gi;
        const oldFormatStartingChecker = testFormatStarting.test(answer);
        const oldFormatEndingChecker = testFormatEnding.test(answer);

        if (oldFormatStartingChecker) {
            answer = answer.replace(testFormatStarting, '<br/><br/><strong>')
            if (oldFormatEndingChecker) {
                answer = answer.replace(testFormatEnding, '<\/strong>')
            }
        }

        if (isTranscript) {
            const removeStrong = /<p><br><\/p><p>/g;
            answer = answer.replace(removeStrong, '<br/><br/>');
        }
        // Function to parse HTML content and convert to docx elements
        const parseHtmlToDocx = (htmlContent) => {
            const paragraphs = [];
            paragraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
            // Split content by <br/><br/> to create separate paragraphs
            const sections = htmlContent.split('<br/><br/>');
            sections.forEach(section => {
                if (section.trim()) {
                    const textRuns = [];
                    // Split by <strong> tags to handle bold text
                    const parts = section.split(/(<strong>.*?<\/strong>)/g);
                    parts.forEach(part => {
                        if (part.trim()) {
                            if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
                                // Extract bold text
                                const boldText = part.replace(/<\/?strong>/g, '');
                                textRuns.push(new TextRun({
                                    text: boldText,
                                    size: 24,
                                    bold: true
                                }));
                            } else {
                                // Regular text, remove any remaining <br/> tags
                                const cleanText = part.replace(/<br\/>/g, '\n');
                                if (cleanText.trim()) {
                                    textRuns.push(new TextRun({
                                        text: cleanText,
                                        size: 24
                                    }));
                                }
                            }
                        }
                    });

                    // Create paragraph with the text runs
                    if (textRuns.length > 0) {
                        paragraphs.push(new Paragraph({
                            children: textRuns,
                            spacing: {
                                after: 200 // Add some spacing after each paragraph
                            }
                        }));
                    }
                }
            });

            return paragraphs;
        };
        // Parse the HTML content


        // console.log("answer 2", answer.substring(0, 500));


        const parsedParagraphs = parseHtmlToDocx(answer);
        const doc = new Document({ sections: [{ children: parsedParagraphs }] });
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {}
        }
    } catch (error) {
        console.log("Error in create Docx", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.createDocxRev = async (filePath, answer) => {
    try {
        const r1 = /<p><br><\/p><p><br><\/p><p><strong>/g
        const r2 = /\|\s*(\d{2}:\d{2}:\d{2})<\/p><p>/g
        const r3 = /<\/p><p><br><\/p><p><strong>/g
        if (r1.test(answer) && r2.test(answer) && r3.test(answer)) {
            answer = answer
                .replace(r1, '<br><br><strong>')
                .replace(r2, '| $1<br>')
                .replace(r3, '<br><br><strong>')
        }
        const segments = answer.split('<br><br>').filter(segment => segment.trim());
        const paragraphs = segments.map(segment => {
            const [header, ...textLines] = segment.split('<br>');
            const speakerMatch = header.match(/<strong>(.*?)<\/strong>\s*\|\s*(\d{2}:\d{2}:\d{2})/);
            const text = textLines.join(' ');
            if (speakerMatch) {
                const speaker = speakerMatch[1];
                const time = speakerMatch[2];
                return [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${speaker} | ${time}`, bold: true, size: 24 }),
                        ],
                        spacing: {
                            before: 240, // 12pt spacing before (240 twips)
                            after: 240, // 12pt spacing after (240 twips)
                        },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: text,
                                size: 24, // 12pt font (24 half-points)
                            }),
                        ],
                    }),
                ];
            } else {
                return new Paragraph({
                    children: [
                        new TextRun({
                            text: text,
                            size: 24, // 12pt font (24 half-points)
                        }),
                    ],
                });
            }
        }).flat();
        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: paragraphs,
                },
            ],
        });
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);
        const stats = fs.statSync(filePath);
        console.log(`File size: ${stats.size} bytes`);
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {},
        };
    } catch (error) {
        console.log("Error in create Docx rev", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.findFile = async (path) => {
    try {
        await fsPromise.stat(path);
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        } else {
            console.error('Error accessing file:', err);
            throw err;
        }
    }
}

ChatGptServices.triggerFile = async (path, text, fileName, botId, rev, isTranscript) => {
    try {
        if (rev === true) {
            await ChatGptServices.createDocxRev(path, text);
        } else {
            await ChatGptServices.createDocx(path, text, isTranscript);
        }
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                message: Strings.FILE.FILE_CREATED,
                fileName: fileName,
                botId: botId
            }
        };
    } catch (error) {
        console.error('An error occurred while creating pdf file', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deleteFileFromOpenAI = async (userId) => {
    // await AssistantFilesQueries.changeStatus(userId);
    const record = await AssistantFilesQueries.findFile(userId);
    for (let index = 0; index < record.length; index++) {
        const element = record[index];
        const result = await deletFileOpenAI(element.fileId)
        if (result.deleted) {
            const obj = {
                status: 0,
                updatedAt: currentDate
            }
            await AssistantFilesQueries.updateStatus(obj, element.fileId, userId);
        } else {
            const obj = {
                status: 2,
                updatedAt: currentDate
            }
            await AssistantFilesQueries.updateStatus(obj, element.fileId, userId);
        }
        Logger.data.OpenAI({ requestPayload: element.fileId, response: result, userId: userId }, "Delete-File-From-OpenAI");
    }
}

ChatGptServices.getAllResponsesDoc = async (userId) => {
    try {
        const result = await AssistantThreadsQueries.getAllThreadResponsesDoc(userId)
        if (result.length > 0) {
            const data = await Promise.all(result.map(async (element) => {
                const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId);
                if (element.kolabryaAssistant == 0 || element.kolabryaAssistant == 3) {
                    element.visuals = true
                }
                if (element.kolabryaAssistant == 22) {
                    element.answer = element.answer.replace(/\\\"/g, '"');
                    element.answer = element.answer.replace(/\n/g, '');
                }
                const { caseId, id, kolabryaAssistant, ...rest } = element;
                return {
                    ...rest
                };
            }));
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
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.error('Error while getting all responses of document assistant', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.encryptThread = async () => {
    try {
        const result = await AssistantThreadsQueries.getAll();
        console.log(result);
        result.forEach(async row => {
            console.log(row.id);
            const encryptedData = {
                question: (row.question),
                answer: (row.answer)
            };
            console.log(encryptedData);
            await AssistantThreadsQueries.updateThread(encryptedData, row.id);
        });

        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                message: Strings.ASSISTANT.ASSISTANT_THREADS_ENCRYPTION,
            }
        };
    } catch (error) {
        console.error('An error occurred while encrypting data', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deleteFileOpenAI = async (userId) => {
    try {
        const allFile = await getAllFileOpenAI();
        if (allFile.data.length > 0) {
            const fileCounts = allFile.data.length;
            const deletionStatus = [];
            for (let index = 0; index < allFile.data.length; index++) {
                const element = allFile.data[index];
                console.log("Getting File Ids from openAI", element.id);
                const result = await deletFileOpenAI(element.id)
                if (result.deleted) {
                    deletionStatus.push({ id: element.id, status: 'deleted' });
                    const obj = {
                        status: 0
                    }
                    await AssistantFilesQueries.deleteFile(obj, element.id);
                } else {
                    deletionStatus.push({ id: element.id, status: 'not deleted' });
                    const obj = {
                        status: 2
                    }
                    await AssistantFilesQueries.deleteFile(obj, element.id);
                }
                Logger.data.OpenAI({ requestPayload: element.id, response: result, userId: userId }, "Delete-File-From-OpenAI-And-Database");
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    // message: Strings.RECORD_DELETED_SUCCESS,
                    fileCounts: fileCounts,
                    deletionStatus: deletionStatus
                }
            };
        } else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            };
        }
    } catch (error) {
        console.error('An error occurred while deleting file in openAI and db', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deleteVectorOpenAI = async (userId) => {
    try {
        let deletionStatus = [];
        let vectorCounts = 0;
        let deletedVectors = 0;
        let hasMoreRecords = true;
        let afterId = null; // Track pagination using "after"

        // Function to retry deletion if it fails
        const deleteVectorWithRetry = async (vectorId, retries = 3, delay = 2000) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const result = await deletVectorOpenAI(vectorId); // Ensure function name is correct
                    return result; // Success, return response
                } catch (error) {
                    console.error(`Attempt ${i + 1} failed for ${vectorId}:`, error.message);
                    if (i < retries - 1) {
                        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1))); // Wait before retrying
                    } else {
                        throw error; // Throw after last attempt fails
                    }
                }
            }
        };

        // Function to delete vectors in parallel batches
        const deleteBatch = async (batch) => {
            return Promise.all(batch.map(async (element) => {
                try {
                    if (element.status === 'expired') return null; // Skip expired

                    const result = await deleteVectorWithRetry(element.id);
                    if (result.deleted) deletedVectors++;

                    console.log("count", deletedVectors);

                    deletionStatus.push({ id: element.id, status: result.deleted ? 'deleted' : 'not deleted' });

                    Logger.data.OpenAI({ id: element.id, status: result.deleted ? 'deleted' : 'not deleted' }, "Delete-Vector-From-OpenAI");

                    return { id: element.id, status: result.deleted ? 'deleted' : 'not deleted' };
                } catch (error) {
                    console.error(`Failed to delete vector ${element.id}:`, error.message);
                    deletionStatus.push({ id: element.id, status: 'failed' });
                    return { id: element.id, status: 'failed' };
                }
            }));
        };

        const BATCH_SIZE = 20; // Adjust based on OpenAI rate limits

        // Function to fetch data with retries
        const fetchVectorsWithRetry = async (afterId, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const allFile = await getAllVectorOpenAI(afterId);

                    if (allFile.error) {
                        console.error(`Attempt ${i + 1} failed:`, allFile.error.message);
                        throw new Error(allFile.error.message);
                    }

                    return allFile;
                } catch (error) {
                    if (i < retries - 1) {
                        console.warn(`Retrying fetch (Attempt ${i + 2}) after 50 seconds...`);
                        await new Promise((resolve) => setTimeout(resolve, 50000)); // Wait 50 seconds before retrying
                    } else {
                        throw new Error("Max retries reached. OpenAI API is failing.");
                    }
                }
            }
        };

        while (hasMoreRecords) {
            const allFile = await fetchVectorsWithRetry(afterId);

            if (!allFile || !allFile.data.length) {
                hasMoreRecords = false;
                break;
            }

            vectorCounts += allFile.data.length;

            for (let i = 0; i < allFile.data.length; i += BATCH_SIZE) {
                const batch = allFile.data.slice(i, i + BATCH_SIZE);
                const results = await deleteBatch(batch); // Filter expired before processing
                deletionStatus.push(...results);

                await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay between batches
            }

            afterId = allFile.last_id; // Update pagination cursor
        }

        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                vectorCounts: vectorCounts,
                deletedVectors: deletedVectors,
                deletionStatus: deletionStatus
            }
        };
    } catch (error) {
        console.error('An error occurred while deleting files in OpenAI and DB', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

ChatGptServices.makeVectorStore = async (fileIds, caseId, userId, createdByUserId) => {
    try {
        const generatedUuid = uuidv4(); //vector store name
        const record = await makeVector(generatedUuid);
        Logger.data.OpenAI({ response: record, userId: userId, methodName: "makeVectorStore" }, "Create-Vector-Open-AI");
        if (record.id && record.id != '') {
            console.log("*****************************************************************");
            console.log("creating new vector store  =>", record.id);
            console.log("*****************************************************************");
            const list = await ChatGptServices.addFileIdsToVectorStore(record?.id, fileIds, userId)
            Logger.data.OpenAI({ requestData: record, requestfilds: fileIds, response: list, userId: userId, methodName: "makeVectorStore" }, "Adding-FileId-To-Vector-Store");
            if (list.statusCode == '200') {
                const obj = {
                    featureType: 1,
                    userId: userId,
                    createdByUserId: createdByUserId,
                    vectorId: record.id,
                    fileIds: JSON.stringify(fileIds),
                    fileCounts: fileIds.length,
                    status: false, //status of vector store status: 'in_progress',
                    jsonResponse: JSON.stringify(list.obj)
                }
                const result = await VectorStoreManagerQueries.add(obj);
                if (result) {
                    await CaseFilesQueries.updateVectorId({ vectorId: result.id }, caseId, userId)
                    return {
                        statusCode: 200,
                        message: Strings.SUCCESS,
                        obj: obj
                    }
                }
            }
            else {
                slack.webhook(JSON.stringify({ action: "Error-While-Inserting-Data-In-DB-OR-OpenAI/Vecore-Store", response: list, userId: userId }));
                Logger.data.OpenAI({ response: list, userId: userId, methodName: "makeVectorStore" }, "Error-While-Inserting-Data-In-DB-OR-OpenAI/Vecore-Store");
                console.log("error while inserting data in db or openAI/vecore store", list);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
                console.log("fileIds", fileIds);
                console.log("userId", userId);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: list
                }
            }
        } else {
            Logger.data.OpenAI({ response: record, userId: userId, methodName: "create-Vector" }, "Create-Vector-Error-Open-AI");
            return {
                statusCode: 400,
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                obj: record
            }
        }
    } catch (error) {
        console.error('An error occurred while Create Or Find Vector', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.makeVectorStoreExternalDoc = async (fileIds, batchId, userId) => {
    try {
        const generatedUuid = uuidv4(); //vector store name
        const record = await makeVector(generatedUuid+"_external_doc");
        Logger.data.OpenAI({ response: record, userId: userId, methodName: "makeVectorStoreExternalDoc" }, "Create-Vector-Open-AI-External-Doc");
        if (record.id && record.id != '') {
            console.log("*****************************************************************");
            console.log("creating new vector store external doc =>", record.id);
            console.log("*****************************************************************");
            const list = await ChatGptServices.addFileIdsToVectorStore(record?.id, fileIds, userId)
            Logger.data.OpenAI({ requestData: record, requestfilds: fileIds, response: list, userId: userId, methodName: "makeVectorStoreExternalDoc" }, "Adding-FileId-To-Vector-Store-External-Doc");
            if (list.statusCode == '200') {
                const obj = {
                    featureType: 1,
                    userId: userId,
                    vectorId: record.id,
                    fileIds: JSON.stringify(fileIds),
                    fileCounts: fileIds.length,
                    status: false, //status of vector store status: 'in_progress',
                    jsonResponse: JSON.stringify(list.obj)
                }
                const result = await VectorStoreManagerQueries.addExternalDoc(obj);
                if (result) {
                    await AssistantFilesQueries.updateVectorId({ vectorId: result.id }, batchId, userId)
                    return {
                        statusCode: 200,
                        message: Strings.SUCCESS,
                        obj: obj
                    }
                }
            }
            else {
                slack.webhook(JSON.stringify({ action: "Error-While-Inserting-Data-In-DB-OR-OpenAI/Vecore-Store-External-Doc", response: list, userId: userId }));
                Logger.data.OpenAI({ response: list, userId: userId, methodName: "makeVectorStore" }, "Error-While-Inserting-Data-In-DB-OR-OpenAI/Vecore-Store-External-Doc");
                console.log("error while inserting data in db or openAI/vecore store external doc", list);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
                console.log("fileIds", fileIds);
                console.log("userId", userId);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: list
                }
            }
        } else {
            Logger.data.OpenAI({ response: record, userId: userId, methodName: "create-Vector" }, "Create-Vector-Error-Open-AI-External-Doc");
            return {
                statusCode: 400,
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                obj: record
            }
        }
    } catch (error) {
        console.error('An error occurred while Create Or Find Vector External Doc', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.createOrFindThread = async (assistantType, userId) => {
    try {
        const findThreadId = await AssistantThreadsQueries.getThreadId(assistantType, userId);
        const data = findThreadId[0]?.threadId;
        if (data != '' && data) {
            if (data && data != '') {
                console.log("**********************************************************");
                console.log("using thread_id from db =>", data);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "getThreadIdDB" }, "Get-ThreadId-DB-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: data
                    }
                }
            } else {
                Logger.data.OpenAI({ response: data, userId: userId, methodName: "getThreadIdDB" }, "Get-ThreadId-DB-Open-AI-Error");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: data
                }
            }
        } else {
            // we have to check in db is thread is avaible for use by specific user from db 
            //if not we will create thread else use the thread id from db
            // reason: using old thread id, so we can resolve the error of in-memory
            // create the thread only.
            const threads = await makeThreads()
            if (threads.id && threads.id != '') {
                console.log("**********************************************************");
                console.log("creating new thread_id  =>", threads.id);
                console.log("**********************************************************");
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreads" }, "Create-Thread-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: threads.id
                    }
                }
            } else {
                Logger.data.OpenAI({ response: threads, userId: userId, methodName: "makeThreads" }, "Create-Thread-Error-Open-AI");
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: threads.error
                }
            }
        }
    } catch (error) {
        console.error('An error occurred while Create Or Find Thread', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deleteFileIdsFromVectorStore = async (vectorId, fileIds, userId) => {
    try {
        //here we have to check the status of file is added to vector store like in_progress or done etc
        const data = await deleteFileFromVector(vectorId, fileIds);
        if (data.id && data.id != '') {
            console.log("****************************************************************");
            console.log("Deleting File's from vector store =>", data.id);
            console.log("****************************************************************");
            Logger.data.OpenAI({ request: { vectorId, fileIds }, response: data, userId: userId, methodName: "deleteFileIdsFromVectorStore" }, "Delete-Files-In-OpenAI-Vector");
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: data
            }
        } else {
            Logger.data.OpenAI({ request: { vectorId, fileIds }, response: data.error, userId: userId, methodName: "deleteFileIdsFromVectorStore" }, "Error-Delete-Files-In-OpenAI-Vector");
            return {
                statusCode: 400,
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                obj: data.error
            }
        }
    } catch (error) {
        console.error('An error occurred while delete FileIds From Vector Store', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.addFileIdsToVectorStore = async (vectorId, fileIds, userId) => {
    try {
        const record = await addFileIdToVector(vectorId, fileIds);
        if (record.id && record.id != '') {
            console.log("************************************************************************************");
            console.log("Adding the File's in batch of vector store  =>", record.id);
            console.log("************************************************************************************");
            Logger.data.OpenAI({ response: record, userId: userId, methodName: "addFileIdToVector" }, "Insert-Files-In-OpenAI-Vector");
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: record
            }
        } else {
            Logger.data.OpenAI({ response: record, userId: userId, methodName: "addFileIdToVector" }, "Error-Insert-Files-In-OpenAI-Vector");
            return {
                statusCode: 400,
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                obj: record
            }
        }
    } catch (error) {
        console.error('An error occurred while add FileIds To Vector Store', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.addFilesInVectorStore = async (fileIds, id, vectorId, currentFileIds, currentFileCounts, caseId, userId) => {
    try {
        console.log("*****************************************************************************");
        console.log("updating/adding file's in vector store =>", vectorId);
        console.log("*****************************************************************************");
        const list = await ChatGptServices.addFileIdsToVectorStore(vectorId, fileIds, userId)
        Logger.data.OpenAI({ vectorId: vectorId, requestFileIds: fileIds, response: list, userId: userId, methodName: "makeVectorStore" }, "Adding-FileId-To-Vector-Store");
        if (list.statusCode == '200') {
            const parsedCurrentFileIds = Array.isArray(currentFileIds) ? currentFileIds : JSON.parse(currentFileIds);
            const obj = {
                featureType: 1,
                userId: userId,
                fileIds: JSON.stringify([...fileIds, ...parsedCurrentFileIds]),
                fileCounts: fileIds.length + currentFileCounts,
                status: false, //status of vector store status: 'in_progress',
                jsonResponse: JSON.stringify(list.obj),
                createdAt: currentDate
            }
            const result = await VectorStoreManagerQueries.updateOnEdit(obj, id);
            if (result) {
                const file = {
                    vectorId: id,
                    isFileUpdated: false
                }
                await CaseFilesQueries.updateVectorId(file, caseId, userId)
                await CaseIntelligentMapQueries.updateCaseById({ isIntelligentMap: null }, caseId)
                await require('./caseIntelligentMap.services').findRecord();
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: obj
                }
            }
        }
        else {
            slack.webhook(JSON.stringify({ action: "Error-While-Inserting-Data-In-DB-OR-OpenAI/Vecore-Store", response: list, userId: userId }));
            Logger.data.OpenAI({ response: list, userId: userId, methodName: "makeVectorStore" }, "Error-While-Inserting-Data-In-DB-OR-OpenAI/Vecore-Store");
            console.log("error while inserting data in db or openAI/vecore store", list);
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
            console.log("fileIds", fileIds);
            console.log("userId", userId);
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
            return {
                statusCode: 400,
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                obj: list
            }
        }
    } catch (error) {
        console.error('Error while add Files In Vector Store', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deleteFilesInVectorStore = async (fileIds, id, vectorId, currentFileIds, currentFileCounts, caseId, userId) => {
    try {
        console.log("**********************************************************************");
        console.log("Delete file's from vector store =>", vectorId);
        console.log("**********************************************************************");
        for (const element of fileIds) {
            const list = await ChatGptServices.deleteFileIdsFromVectorStore(vectorId, element, userId)
            Logger.data.OpenAI({ vectorId: vectorId, requestFileIds: element, response: list, userId: userId, methodName: "deleteFileIdsFromVectorStore" }, "Delete-Files-From-Vector-Store");
            if (list.statusCode == '200') {
                const a = JSON.parse(currentFileIds); // Convert JSON string to array
                const b = fileIds; // Assuming this is already an array
                const bSet = new Set(b);
                const filteredA = a.filter(fileId => !bSet.has(fileId));
                const obj = {
                    fileIds: JSON.stringify(filteredA),
                    fileCounts: currentFileCounts - fileIds.length,
                    jsonResponse: JSON.stringify(list.obj),
                    updatedAt: currentDate
                }
                const result = await VectorStoreManagerQueries.updateOnEdit(obj, id);
                if (result) {
                    for (const element of fileIds) {
                        //isActivate false at doc assistant table
                        await CaseFilesQueries.updateFileOnDelete({ isFileDeleted: 0 }, element, caseId, userId)
                        await CaseIntelligentMapQueries.updateCaseById({ isIntelligentMap: null }, caseId)
                        await require('./caseIntelligentMap.services').findRecord();
                    }
                }
            }
            else {
                slack.webhook(JSON.stringify({ action: "Error-While-Delete-File-From-Vector-Store", response: list, userId: userId }));
                Logger.data.OpenAI({ response: list, userId: userId, methodName: "deleteFilesInVectorStoreError" }, "Error-While-Delete-File-From-Vector-Store");
                console.log("error while delete file from vector store", list);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
                console.log("fileIds", fileIds);
                console.log("userId", userId);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!");
                for (const element of fileIds) {
                    const record = await VectorStoreManagerQueries.getDeletedFilesForVectorStore(element, caseId, userId)
                    if (record) {
                        const entry = await ChatGptServices.deleteFileIdsFromVectorStore(record.vectorId, element, record.userId)
                        Logger.data.OpenAI({ vectorId: record.vectorId, requestFileIds: element, response: entry, userId: userId, methodName: "deleteFileIdsFromOtherVectorStore" }, "Delete-Files-From-Other-Vector-Store");
                        if (entry.statusCode == '200') {
                            const a = JSON.parse(record.fileIds);
                            const b = fileIds;
                            const bSet = new Set(b);
                            const filteredA = a.filter(fileId => !bSet.has(fileId));
                            const obj = {
                                fileIds: JSON.stringify(filteredA),
                                fileCounts: a.length - [element].length,
                                jsonResponse: JSON.stringify(entry.obj),
                                updatedAt: currentDate
                            }
                            await VectorStoreManagerQueries.updateOnDelete(obj, record.id);
                            //isActivate false at doc assistant table
                            const update = await CaseFilesQueries.updateFileOnDelete({ isFileDeleted: 0 }, element, caseId, userId)
                            if (update) {
                                await CaseIntelligentMapQueries.updateCaseById({ isIntelligentMap: null }, caseId)
                                slack.webhook(JSON.stringify({ action: `File ${element} found in vector store ${record.vectorId}. Successfully deleted`, response: entry, userId: userId, caseId: caseId, vectorId: record.id }));
                                await require('./caseIntelligentMap.services').findRecord();
                            }
                            return {
                                statusCode: 200,
                                message: Strings.SUCCESS,
                                obj: obj
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('An error occurred while delete Files In Vector Store', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.fetchRecords = async () => {
    try {
        const data = await AssistantThreadsQueries.getAllRecords();
        return {
            statusCode: 200,
            message: Strings.SUCCESS,
            obj: data
        }
    } catch (error) {
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.improvePrompt = async (query, userId) => {
    try {
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        payload.messages[0].content = query;
        const getPayload = payload?.messages[0];
        let assistantType = 5;
        let assistantId = kolabryaAssistant;
        const getThreadId = await ChatGptServices.createOrFindThread(assistantType, userId)
        if (getThreadId.statusCode == '200') {
            // add message to thread.
            const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
            Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Improved-Prompt-Open-AI");
            if (addMessage.id) {
                // run the thread.
                const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: userId, methodName: "runThreads" }, "Run-Thread-Improved-Prompt-Open-AI");
                Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "threadStep" }, "Thread-Step-Improved-Prompt-Open-AI");
                //Assistant Types
                //5 = Improved Prompt Assistant
                console.log("threadStep", threadStep.status);
                if (threadStep.id) {
                    const data = {
                        assistantId: threadStep.assistant_id,
                        threadId: threadStep.thread_id,
                        runId: threadStep.id,
                        status: 0,
                        botId: 'fb9c9ffb-d208-47e3-8115-df4de55cb54c',
                        question: query,
                        userQuery: null,
                        userId: userId,
                        kolabryaAssistant: assistantType
                    }
                    const getId = await AssistantThreadsQueries.createThread(data);
                    if (getId) {
                        return {
                            message: Strings.ASSISTANT.ASSISTANT_IMPROVED_PROMPT_SUCCESS,
                            statusCode: 200,
                            obj: data
                        }
                    }
                } else {
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
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: getThreadId.obj
            }
        }
    } catch (error) {
        console.log("Error in making threads for improved prompt", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getImprovedPrompt = async (threadId, userId) => {
    let obj = {};
    let data = {};
    try {
        if (threadId) {
            const result = await AssistantThreadsQueries.getThreadIdForImprovedPrompt(threadId, userId)
            if (result.length > 0) {
                const validateStatus = await validateThreadStatus(threadId, result[0].runId);
                // console.log("Validate-Status-Kolabrya Assistant", validateStatus.status);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Retrive-Run-Improved-Prompt")
                data = {
                    jsonResponse: JSON.stringify(validateStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, result[0].runId);
                if (!validateStatus.error) {
                    const getCompleteStatus = validateStatus.status == 'completed';
                    const getInProgressStatus = validateStatus.status == 'in_progress';
                    const getFailedStatus = validateStatus.status == 'failed';
                    const getExpiredStatus = validateStatus.status == 'expired';
                    const getQueuedStatus = validateStatus.status == 'queued';

                    console.log("");
                    console.log("===== Improved Prompt Assistant =====");
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
                            answer: JSON.stringify(getanswer?.data[0]?.content[0]?.text?.value || {}),
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: result[0].runId }, "Thread-Status-Complete-Improved-Prompt-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return await getImprovedPromptData(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Failed-Improved-Prompt-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Improved-Prompt-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        console.log("validate run failed case improved prompt assistant", validateStatus);
                        console.log("check status", validateStatus.status);
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getExpiredStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Expired-Improved-Prompt-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Improved-Prompt-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else {
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                } else {
                    console.log("validate run error improved prompt assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
                        answer: null,
                        jsonResponse: JSON.stringify(validateStatus?.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: obj
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
        console.log("Error in improved prompt assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

ChatGptServices.addFeedback = async (like, feedBack, runId, userId) => {
    try {
        const obj = {
            like: like,
            feedBack: feedBack,
        }
        const filteredObj = Object.fromEntries(
            Object.entries(obj).filter(([key, value]) => value)
        );
        const keys = Object.keys(filteredObj);
        const length = keys.length;
        if (length >= 1 && length <= 3) {
            const result = await AssistantThreadsQueries.feedBack(filteredObj, runId, userId)
            if (result[0] == '1') {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS
                    }
                };
            } else {
                return {
                    message: Strings.ERROR.RECORD_UPDATE_ERROR,
                    statusCode: 400,
                    obj: {
                        data: result
                    }
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
        console.log("error in add the feedback in threads", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getCaseFile = async (data, userId) => {
    try {
        const findData = JSON.parse(data)
        const caseId = findData.caseUuid;
        const getFileName = findData.caseDetails.map(element => element.fileName);
        const getContent = await ChatGptServices.readMulipleFiles(caseId, getFileName, true);
        if (getContent.statusCode == '200') {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: getContent.obj.data
                }
            }
        } else {
            return getContent;
        }
    } catch (error) {
        console.log("error in case analysis", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getSampleFile = async (data, userId) => {
    try {
        const findData = JSON.parse(data)
        const sampleId = findData.sampleUuid;
        const getFileName = findData.sampleDetails.map(element => element.fileName);
        const getContent = await ChatGptServices.readMulipleFiles(sampleId, getFileName, false);
        if (getContent.statusCode == '200') {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: getContent.obj.data
                }
            }
        } else {
            return getContent;
        }

    } catch (error) {
        console.log("error in reading sample file", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.readMulipleFiles = async (caseId, fileNames, validate) => {
    try {
        let directoryPath;

        if (!validate) {
            directoryPath = path.join(readSampleFile, caseId);
        }
        else {
            directoryPath = path.join(readCaseFile, caseId);
        }

        const filePaths = fileNames.map(fileName => path.join(directoryPath, fileName));
        const fileBuffers = await Promise.all(filePaths.map(async (filePath, index) => {
            const content = await fsPromise.readFile(filePath);
            return {
                originalname: fileNames[index],
                buffer: content,
                filetype: mime.lookup(filePath),
                filepath: filePath
            };
        }));
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                data: fileBuffers
            }
        }
    } catch (error) {
        console.log("error in reading muliple files", error);
        return {
            // message: Strings.ERROR.SOME_THING_WENT_WRONG,
            message: Strings.ERROR.ERROR_LOGOUT,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.removeAnnotation = async (data) => {
    //[+1 source]
    const regexPattern = /【.*?】/g;
    return data.replace(regexPattern, '');
}

ChatGptServices.removeN = async (data) => {
    const removeN = /\\n/g
    const removeDoubleN = /\n\n/g
    return data.replace(removeN, '\n').replace(removeDoubleN, '\n\n');
}

ChatGptServices.removeDoubleSlashN = async (data) => {
    const removeN = /\\n\\n/g
    return data.replace(removeN, '\n\n')
}

ChatGptServices.removeDoubleSingleSlashN = async (data) => {
    const removeN = /\n\n\*\*/g;
    const filterData = data.replace(removeN, '\n\n**');
    return filterData;
}

ChatGptServices.removeTripleHashes = async (data) => {
    const removeN = /^###\s*/gm;
    const filterData = data.replace(removeN, '');
    return filterData;
}

ChatGptServices.removeDoubleSingleSlashNAnalysisCite = async (data) => {
    const removeN = /\n\n\*\*/g;
    const addSpaceAfterDash = /\n\n-/g;
    const addSpaceAfterDoubleNewline = /\n\n/g;
    const addSpacesAroundDash = /\n-/g;
    const filterData = data.replace(removeN, '\n \n**').replace(addSpaceAfterDash, '\n\n -').replace(addSpaceAfterDoubleNewline, ' \n\n ').replace(addSpacesAroundDash, ' \n - ');
    return filterData;
}

ChatGptServices.addSpaceBetweenSlashN = async (data) => {
    const addSpaceBetweenNDecimal = /\n\n(\d)/g;
    const removeDotAndAddSpace = /\n(\d+)\./g;
    const addSpaceBetweenOnlyN = /\n/g;
    const handleSpecialPattern = /\n\s*\n\s*-/g
    const filterData = data.replace(addSpaceBetweenNDecimal, '\n$1').replace(removeDotAndAddSpace, '\n$1').replace(addSpaceBetweenOnlyN, '\n ').replace(handleSpecialPattern, '\n -');
    return filterData;
}

ChatGptServices.responseCleaning = async (data, regexName) => {
    let removeAnnotation;
    if (typeof (data) == 'string') {
        removeAnnotation = await ChatGptServices.removeAnnotation(data)
        if (regexName == 'removeDoubleSlashN') {
            return await ChatGptServices.removeDoubleSlashN(removeAnnotation)
        } else {
            return await ChatGptServices.removeN(removeAnnotation)
        }
    } else {
        removeAnnotation = await ChatGptServices.removeAnnotation(JSON.stringify(getResponse))
        if (regexName == 'removeDoubleSlashN') {
            return await ChatGptServices.removeDoubleSlashN(removeAnnotation)
        } else {
            return await ChatGptServices.removeN(removeAnnotation)
        }
    }
}

ChatGptServices.responseCleaningForAnalysisCite = async (data, regexName) => {
    let removeAnnotation;
    if (typeof (data) == 'string') {
        removeAnnotation = await ChatGptServices.removeAnnotation(data)
        if (regexName == 'removeDoubleSingleSlashN') {
            return await ChatGptServices.removeDoubleSingleSlashNAnalysisCite(removeAnnotation)
        } else {
            return removeAnnotation;
        }
    } else {
        removeAnnotation = await ChatGptServices.removeAnnotation(JSON.stringify(getResponse))
        if (regexName == 'removeDoubleSingleSlashN') {
            return await ChatGptServices.removeDoubleSingleSlashNAnalysisCite(removeAnnotation)
        } else {
            return removeAnnotation;
        }
    }
}

ChatGptServices.responseCleaningForAnalysis = async (data, regexName) => {
    let removeAnnotation;
    if (typeof (data) == 'string') {
        removeAnnotation = await ChatGptServices.removeAnnotation(data)
        if (regexName == 'removeDoubleSingleSlashN') {
            return await ChatGptServices.removeDoubleSingleSlashN(removeAnnotation)
        }
        else if (regexName == 'removeTripleHashes') {
            return await ChatGptServices.removeTripleHashes(removeAnnotation)
        }
        else {
            return removeAnnotation;
        }
    } else {
        removeAnnotation = await ChatGptServices.removeAnnotation(JSON.stringify(getResponse))
        if (regexName == 'removeDoubleSingleSlashN') {
            return await ChatGptServices.removeDoubleSingleSlashN(removeAnnotation)
        }
        else if (regexName == 'removeTripleHashes') {
            return await ChatGptServices.removeTripleHashes(removeAnnotation)
        }
        else {
            return removeAnnotation;
        }
    }
}

ChatGptServices.responseCleaningForCaidi = async (data, regexName) => {
    if (regexName == 'addSpaceBetweenN') {
        return await ChatGptServices.addSpaceBetweenSlashN(data)
    } else {
        return data;
    }
}

ChatGptServices.runChatGPT = async (query, userQuery, botId, transcriptAttachments, documentAssistant, validator, getCase, caseData, sampleData, reWriteReport, empLawAnalysisAssist, getResponseDetails, caseAudio, visuals, textHighLighter, text, isGroup, groupId, selectedPrompt, userId) => {
    try {
        let contentType, combinedData, transcriptAttachment, findId = null;
        if (getCase == 'true' && caseData != '') {
            const getCaseUuid = JSON.parse(caseData)
            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
            //For case anaysis with document assistant
            const getFileData = await ChatGptServices.getCaseFile(caseData, userId);
            if (getFileData.statusCode == '200') {
                combinedData = [...getFileData.obj.data];
                if (sampleData) {
                    const getSampleData = await ChatGptServices.getSampleFile(sampleData, userId);
                    if (getSampleData.statusCode == '200') {
                        combinedData = [...combinedData, ...getSampleData.obj.data];
                    } else {
                        return getSampleData;
                    }
                }
            } else {
                return getFileData;
            }
            let prompt = '';
            const data = await UserQueries.getPromptByType(24)
            if (data.length > 0) {
                prompt = data[0].prompt
            }
            query = query + prompt
            transcriptAttachment = combinedData
            contentType = 0;
            documentAssistant = '3';
            return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
        }
        else if (getCase == 'false' && caseData != '') {
            const getCaseUuid = JSON.parse(caseData)
            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
            //For case anaysis with report assistant
            const getFileData = await ChatGptServices.getCaseFile(caseData, userId);
            if (getFileData.statusCode == '200') {
                combinedData = [...getFileData.obj.data];
                if (sampleData) {
                    const getSampleData = await ChatGptServices.getSampleFile(sampleData, userId);
                    if (getSampleData.statusCode == '200') {
                        combinedData = [...combinedData, ...getSampleData.obj.data];
                    } else {
                        return getSampleData;
                    }
                }
            } else {
                return getFileData;
            }
            transcriptAttachment = combinedData
            contentType = 0;
            documentAssistant = '4';
            return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
        }
        else if (reWriteReport == 'true' && caseData != '') {
            const getCaseUuid = JSON.parse(caseData)
            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
            //For case anaysis with report assistant
            const getFileData = await ChatGptServices.getCaseFile(caseData, userId);
            if (getFileData.statusCode == '200') {
                combinedData = [...getFileData.obj.data];
                if (sampleData) {
                    const getSampleData = await ChatGptServices.getSampleFile(sampleData, userId);
                    if (getSampleData.statusCode == '200') {
                        combinedData = [...combinedData, ...getSampleData.obj.data];
                    } else {
                        return getSampleData;
                    }
                }
            } else {
                return getFileData;
            }
            transcriptAttachment = combinedData
            contentType = 0;
            documentAssistant = '6';
            return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
        }
        else if (reWriteReport == 'false' && transcriptAttachments.length > 0) {
            transcriptAttachment = transcriptAttachments
            contentType = 0;
            documentAssistant = '8';
            return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, selectedPrompt);
        }
        else if (empLawAnalysisAssist == 'true' && caseData != '') {
            const getCaseUuid = JSON.parse(caseData)
            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
            const getFileData = await ChatGptServices.getCaseFile(caseData, userId);
            if (getFileData.statusCode == '200') {
                combinedData = [...getFileData.obj.data];
                if (sampleData) {
                    const getSampleData = await ChatGptServices.getSampleFile(sampleData, userId);
                    if (getSampleData.statusCode == '200') {
                        combinedData = [...combinedData, ...getSampleData.obj.data];
                    } else {
                        return getSampleData;
                    }
                }
            } else {
                return getFileData;
            }
            transcriptAttachment = combinedData
            contentType = 0;
            documentAssistant = '9';
            return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
        }
        else if (empLawAnalysisAssist == 'false' && transcriptAttachments.length > 0) {
            transcriptAttachment = transcriptAttachments
            contentType = 0;
            documentAssistant = '10';
            return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, selectedPrompt);
        }
        else if (textHighLighter == 'true' && transcriptAttachments.length > 0) {
            //For text highlighter external attachment
            const getOpenAIPrompt = await UserQueries.getPromptByType(20);
            const fetchPrompt = await UserQueries.getPromptByType(21);
            if (getOpenAIPrompt.length > 0 && fetchPrompt.length > 0) {
                const fetchOpenAIPrompt = JSON.parse(getOpenAIPrompt[0].prompt);
                query = fetchOpenAIPrompt[0] + "'" + text + "'" + fetchOpenAIPrompt[1] + query //be prompt
                userQuery = JSON.parse(fetchPrompt[0].prompt)[1] //fe prompt from prompts table
                transcriptAttachment = transcriptAttachments
                botId = 'fb9c9ffb-d208-47e3-8115-df4de55cb54c'
                contentType = 0;
                documentAssistant = '25';
                return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, selectedPrompt);
            }
            else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else if (textHighLighter == 'true' && caseData != '') {
            //For case visulizer case file's
            const getCaseUuid = JSON.parse(caseData)
            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
            const getOpenAIPrompt = await UserQueries.getPromptByType(20);
            const fetchPrompt = await UserQueries.getPromptByType(21);
            const getFileData = await ChatGptServices.getCaseFile(caseData, userId);
            if (getFileData.statusCode == '200') {
                combinedData = [...getFileData.obj.data];
                if (sampleData) {
                    const getSampleData = await ChatGptServices.getSampleFile(sampleData, userId);
                    if (getSampleData.statusCode == '200') {
                        combinedData = [...combinedData, ...getSampleData.obj.data];
                    } else {
                        return getSampleData;
                    }
                }
            } else {
                return getFileData;
            }

            if (getOpenAIPrompt.length > 0 && fetchPrompt.length > 0) {
                const fetchOpenAIPrompt = JSON.parse(getOpenAIPrompt[0].prompt);
                query = fetchOpenAIPrompt[0] + "'" + text + "'" + fetchOpenAIPrompt[1] + query + fetchOpenAIPrompt[2] //be prompt
                userQuery = JSON.parse(fetchPrompt[0].prompt)[1] //fe prompt from prompts table
                transcriptAttachment = combinedData
                botId = 'fb9c9ffb-d208-47e3-8115-df4de55cb54c'
                contentType = 0;
                documentAssistant = '25';
                return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, selectedPrompt);
            }
            else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else if (visuals == 'true' && transcriptAttachments.length > 0) {
            //For case visulizer external attachment
            const getOpenAIPrompt = await UserQueries.getPromptByType(19);
            const getUserPrompt = await UserQueries.getPromptByType(18);
            const fetchOpenAIPrompt = JSON.parse(getOpenAIPrompt[0].prompt)[userQuery]
            const fetchUserPrompt = JSON.parse(getUserPrompt[0].prompt)[userQuery]
            if (getOpenAIPrompt.length > 0 && getUserPrompt.length > 0 && userQuery) {
                if (text == 'true') {
                    //handling when the user is using below text field
                    query = query
                    userQuery = userQuery
                } else {
                    //handling when the user is using radio buttons
                    query = query + ' ' + fetchOpenAIPrompt //be prompt
                    userQuery = fetchUserPrompt.key //fe prompt
                }
                transcriptAttachment = transcriptAttachments
                botId = null
                contentType = 0;
                documentAssistant = '23';
                return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
            }
            else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else if (visuals == 'true' && caseData != '') {
            //For case visulizer case file's
            const getCaseUuid = JSON.parse(caseData)
            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
            const getOpenAIPrompt = await UserQueries.getPromptByType(19);
            const getUserPrompt = await UserQueries.getPromptByType(18);
            const fetchOpenAIPrompt = JSON.parse(getOpenAIPrompt[0].prompt)[userQuery]
            const fetchUserPrompt = JSON.parse(getUserPrompt[0].prompt)[userQuery]
            const getFileData = await ChatGptServices.getCaseFile(caseData, userId);
            if (getFileData.statusCode == '200') {
                combinedData = [...getFileData.obj.data];
                if (sampleData) {
                    const getSampleData = await ChatGptServices.getSampleFile(sampleData, userId);
                    if (getSampleData.statusCode == '200') {
                        combinedData = [...combinedData, ...getSampleData.obj.data];
                    } else {
                        return getSampleData;
                    }
                }
            } else {
                return getFileData;
            }

            if (getOpenAIPrompt.length > 0 && getUserPrompt.length > 0 && userQuery) {
                let answers;
                const caseAnswers = await ChatGptServices.addAccordianCaseAnswers(findId, userId)
                if (caseAnswers.obj.length > 0) {
                    answers = caseAnswers.obj.join(', ');
                }
                if (text == 'true') {
                    //handling when the user is using below text field
                    query = query + ' ' + answers
                    userQuery = userQuery
                } else {
                    //handling when the user is using radio buttons
                    query = query + ' ' + answers + ' ' + fetchOpenAIPrompt //be prompt
                    userQuery = fetchUserPrompt.key //fe prompt
                }
                transcriptAttachment = combinedData
                botId = null
                contentType = 0;
                documentAssistant = '23';
                return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
            }
            else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else if (getResponseDetails == 'true' && caseData != '') {
            const getCaseUuid = JSON.parse(caseData);
            const getResponseUuid = getCaseUuid.caseDetails
            const allResponses = await ChatGptServices.getCaseResponse(getResponseUuid, userId)
            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
            //Chat-GPT-4 Case Analysis For OpenAI Response's
            const caseResponses = await CaseResponsesQueries.findCasesByIdOnly(findId, userId);
            if (caseResponses.length > 0 && allResponses.length > 0) {
                const formattedResponse = allResponses.map(response => response).join('\n\n');
                combinedData = await ChatGptServices.transcriptPayload(getCaseUuid.caseUuid, formattedResponse)
                if (sampleData) {
                    const getSampleData = await ChatGptServices.getSampleFile(sampleData, userId);
                    if (getSampleData.statusCode == '200') {
                        combinedData = [...combinedData, ...getSampleData.obj.data];
                    } else {
                        return getSampleData;
                    }
                }
                transcriptAttachment = combinedData
                contentType = 0;
                documentAssistant = '4';
                return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else if (caseAudio == 'true' && caseData != '') {
            const getCaseUuid = JSON.parse(caseData);
            const getAudioUuid = getCaseUuid.caseAud
            const allResponses = await ChatGptServices.getCaseAudio(getAudioUuid, userId)
            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
            //Chat-GPT-4 Case Analysis For Case Audio File's
            if (getCaseId.length > 0 && allResponses.length > 0) {
                const formattedResponse = allResponses.map(response => response).join('\n\n');
                combinedData = await ChatGptServices.transcriptPayload(getCaseUuid.caseUuid, formattedResponse)
                if (sampleData) {
                    const getSampleData = await ChatGptServices.getSampleFile(sampleData, userId);
                    if (getSampleData.statusCode == '200') {
                        combinedData = [...combinedData, ...getSampleData.obj.data];
                    } else {
                        return getSampleData;
                    }
                }
                transcriptAttachment = combinedData
                contentType = 0;
                documentAssistant = '3';
                return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachment, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else {
            if (validator) {
                if (transcriptAttachments.length > 0) {
                    let prompt = '';
                    const data = await UserQueries.getPromptByType(24)
                    if (data.length > 0) {
                        prompt = data[0].prompt
                    }
                    query = query + prompt
                    //For documnet, report assistant
                    contentType = 0;
                    return await ChatGptServices.startThread(botId, userId, contentType, transcriptAttachments, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
                } else {
                    //For kolabrya
                    const get_Transcript = await ChatGptServices.roomTranscript(botId);
                    const getPayload = await ChatGptServices.transcriptPayload(botId, get_Transcript.obj);
                    contentType = 1;
                    return await ChatGptServices.startThread(botId, userId, contentType, getPayload, documentAssistant, query, userQuery, findId, isGroup, groupId, selectedPrompt);
                }
            }
            else {
                return {
                    message: Strings.SUCCESS_CODE_MESSAGE,
                    statusCode: 400,
                    obj: {
                        message: Strings.UNVALID_STATUS
                    }
                }
            }
        }
    } catch (error) {
        console.log("Error in Running Chat GPT", error);
        return {
            message: Strings.ERROR.REFRESH_ON_ERROR,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getCaseResponse = async (data, userId) => {
    try {
        const responses = []
        for (let index = 0; index < data.length; index++) {
            const element = data[index];
            const result = await CaseResponsesQueries.findResponseByUuid(element.caseResponseUuid, userId)
            responses.push(result[0].caseResponse ? result[0].caseResponse : '')
        }
        return responses;
    } catch (error) {
        console.log("Error in combine Response for openAI", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getCaseAudio = async (data, userId) => {
    try {
        const responses = []
        for (let index = 0; index < data.length; index++) {
            const element = data[index];
            const result = await CaseFilesQueries.findSpeechByUuid(element.fileUuid, userId)
            responses.push(result[0].transcript ? result[0].transcript : '')
        }
        return responses;
    } catch (error) {
        console.log("Error in combine speech's/transcript for openAI", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getData = async (data, userId) => {
    try {
        if (data.email) {
            const findUserId = await UserQueries.getUserByEmail(data.email)
            if (findUserId.length > 0) {
                const result = await AssistantThreadsQueries.getUserRecordyId(findUserId[0].userId);
                if (result.length > 0) {
                    return {
                        statusCode: 200,
                        message: Strings.SUCCESS,
                        obj: result
                    }
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            } else {
                //no user found with this email
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else if (data.userId) {
            const result = await AssistantThreadsQueries.getUserRecordyId(data.userId);
            if (result.length > 0) {
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: result
                }

            } else {
                //no user found with this userId
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else {
            return {
                message: Strings.SUCCESS_CODE_MESSAGE,
                statusCode: 400,
                obj: {
                    message: Strings.UNVALID_STATUS
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

ChatGptServices.getAllReWriteReportsResponses = async (threadId, userId) => {
    let obj = {};
    let data = {};
    try {
        if (threadId) {
            const result = await AssistantThreadsQueries.getRunIdByThreadIdReWriteReport(threadId, userId)
            if (result.length > 0) {
                const validateStatus = await validateThreadStatus(threadId, result[0].runId);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Retrive-Run")
                data = {
                    jsonResponse: JSON.stringify(validateStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, result[0].runId);

                if (!validateStatus.error) {
                    const getCompleteStatus = validateStatus.status == 'completed';
                    const getInProgressStatus = validateStatus.status == 'in_progress';
                    const getFailedStatus = validateStatus.status == 'failed';
                    const getExpiredStatus = validateStatus.status == 'expired';
                    const getQueuedStatus = validateStatus.status == 'queued';

                    console.log("");
                    console.log("===== Re Write Report Assistant =====");
                    console.log("getCompleteStatus             *", getCompleteStatus);
                    console.log("getInProgressStatus          **", getInProgressStatus);
                    console.log("getFailedStatus             ***", getFailedStatus);
                    console.log("getExpiredStatus           ****", getExpiredStatus);
                    console.log("getQueuedStatus           *****", getQueuedStatus);
                    console.log("");

                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            answer: JSON.stringify(getResponse ? await ChatGptServices.removeAnnotation(getResponse) : {}),
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: result[0].runId }, "Thread-Status-Complete-Re-Write-Report-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return await getBulkDataReWriteReport(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Failed-Re-Write-Report-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Re-Write-Report-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        console.log("validate run failed case report assistant", validateStatus);
                        console.log("check status", validateStatus.status);
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getExpiredStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Expired-Re-Write-Report-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Re-Write-Report-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else {
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }

                } else {
                    console.log("validate run error report assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
                        answer: null,
                        jsonResponse: JSON.stringify(validateStatus?.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: obj
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
        console.log("Error in re write report assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

async function getBulkDataReWriteReport(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getQNAReWriteReport(result[0].botId, userId)
        const getAllData = await Promise.all(data.map(async (element) => {
            const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
            const { caseId, ...rest } = element;
            return {
                ...rest,
                caseDetails: getCaseDetails
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
}


async function getBulkDataResearch(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getQNAReWriteResearch(result[0].botId, userId)
        const getAllData = await Promise.all(data.map(async (element) => {
            const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
            const { caseId, ...rest } = element;
            return {
                ...rest,
                caseDetails: getCaseDetails
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
}

async function getBulkDataEmpLaw(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getQNAEmpLaw(result[0].botId, userId)
        const getAllData = await Promise.all(data.map(async (element) => {
            const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
            const { caseId, ...rest } = element;
            return {
                ...rest,
                caseDetails: getCaseDetails
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
}

ChatGptServices.getReWriteReportsResponses = async (botId, userId) => {
    try {
        if (botId) {
            const result = await AssistantThreadsQueries.getAllReWriteReports(botId, userId)
            const data = await Promise.all(result.map(async (element) => {
                const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
                const { caseId, ...rest } = element;
                return {
                    ...rest,
                    caseDetails: getCaseDetails
                };
            }));
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
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting data for re write report assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.researchBegin = async (query, userQuery, userId) => {
    try {
        if (query || userQuery) {
            const prompts = '{"messages": [{"role": "user"}]}';
            const payload = JSON.parse(prompts);
            payload.messages[0].content = query;
            const getPayload = payload?.messages[0];
            let assistantType = 7;
            let assistantId = reSearchAssistant;
            const getThreadId = await ChatGptServices.createOrFindThread(assistantType, userId)
            if (getThreadId.statusCode == '200') {
                // add message to thread.
                const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
                Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Research-Assistant-Open-AI");
                if (addMessage.id) {
                    // run the thread.
                    const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                    Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: userId, methodName: "runThreads" }, "Run-Thread-Research-Assistant-Open-AI");
                    Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "threadStep" }, "Thread-Step-Research-Assistant-Open-AI");
                    //Assistant Types
                    //7 = Research-Assistant
                    console.log("threadStep", threadStep.status);
                    if (threadStep.id) {
                        const data = {
                            assistantId: threadStep.assistant_id,
                            threadId: threadStep.thread_id,
                            runId: threadStep.id,
                            status: 0,
                            botId: 'fb9c9ffb-d208-47e3-8115-df4de55cb54c',
                            question: query,
                            userQuery: userQuery,
                            userId: userId,
                            kolabryaAssistant: assistantType
                        }
                        const getId = await AssistantThreadsQueries.createThread(data);
                        if (getId) {
                            return {
                                message: Strings.ASSISTANT.ASSISTANT_RESEARCH_SUCCESS,
                                statusCode: 200,
                                obj: data
                            }
                        }
                    } else {
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
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: getThreadId.obj
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
        console.log("Error in making threads for research assistant", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getAllResearchResponses = async (threadId, userId) => {
    let obj = {};
    let data = {};
    try {
        if (threadId) {
            const result = await AssistantThreadsQueries.getRunIdByThreadIdResearch(threadId, userId)
            if (result.length > 0) {
                const validateStatus = await validateThreadStatus(threadId, result[0].runId);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Retrive-Run")
                data = {
                    jsonResponse: JSON.stringify(validateStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, result[0].runId);

                if (!validateStatus.error) {
                    const getCompleteStatus = validateStatus.status == 'completed';
                    const getInProgressStatus = validateStatus.status == 'in_progress';
                    const getFailedStatus = validateStatus.status == 'failed';
                    const getExpiredStatus = validateStatus.status == 'expired';
                    const getQueuedStatus = validateStatus.status == 'queued';

                    console.log("");
                    console.log("===== Research Assistant =====");
                    console.log("getCompleteStatus      *", getCompleteStatus);
                    console.log("getInProgressStatus   **", getInProgressStatus);
                    console.log("getFailedStatus      ***", getFailedStatus);
                    console.log("getExpiredStatus    ****", getExpiredStatus);
                    console.log("getQueuedStatus    *****", getQueuedStatus);
                    console.log("");

                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            answer: JSON.stringify(getResponse ? await ChatGptServices.removeAnnotation(getResponse) : {}),
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: result[0].runId }, "Thread-Status-Complete-Research-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return await getBulkDataResearch(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Failed-Research-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Research-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        console.log("validate run failed case report assistant", validateStatus);
                        console.log("check status", validateStatus.status);
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getExpiredStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Expired-Research-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Research-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else {
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }

                } else {
                    console.log("validate run error research assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
                        answer: null,
                        jsonResponse: JSON.stringify(validateStatus?.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: obj
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
        console.log("Error in research assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

ChatGptServices.getResearchResponses = async (botId, userId) => {
    try {
        if (botId) {
            const result = await AssistantThreadsQueries.getAllResearches(botId, userId)
            const data = await Promise.all(result.map(async (element) => {
                const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
                const { caseId, ...rest } = element;
                return {
                    ...rest,
                    caseDetails: getCaseDetails
                };
            }));
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
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting data for research assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getAllPrompts = async (userId) => {
    try {
        const result = await AssistantThreadsQueries.getAllPrompts(userId)
        if (result.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting user's all prompt", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getAllEmpLawResponses = async (threadId, userId) => {
    let obj = {};
    let data = {};
    try {
        if (threadId) {
            const result = await AssistantThreadsQueries.getRunIdByThreadIdEmpLaw(threadId, userId)
            if (result.length > 0) {
                const validateStatus = await validateThreadStatus(threadId, result[0].runId);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Retrive-Run")
                data = {
                    jsonResponse: JSON.stringify(validateStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, result[0].runId);

                if (!validateStatus.error) {
                    const getCompleteStatus = validateStatus.status == 'completed';
                    const getInProgressStatus = validateStatus.status == 'in_progress';
                    const getFailedStatus = validateStatus.status == 'failed';
                    const getExpiredStatus = validateStatus.status == 'expired';
                    const getQueuedStatus = validateStatus.status == 'queued';

                    console.log("");
                    console.log("===== Employment Law Assistant =====");
                    console.log("getCompleteStatus            *", getCompleteStatus);
                    console.log("getInProgressStatus         **", getInProgressStatus);
                    console.log("getFailedStatus            ***", getFailedStatus);
                    console.log("getExpiredStatus          ****", getExpiredStatus);
                    console.log("getQueuedStatus          *****", getQueuedStatus);
                    console.log("");

                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            answer: JSON.stringify(getResponse ? await ChatGptServices.removeAnnotation(getResponse) : {}),
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: result[0].runId }, "Thread-Status-Complete-Research-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return await getBulkDataEmpLaw(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Failed-Research-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Research-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        console.log("validate run failed case report assistant", validateStatus);
                        console.log("check status", validateStatus.status);
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getExpiredStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Expired-Research-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Research-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else {
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }

                } else {
                    console.log("validate run error Employment assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
                        answer: null,
                        jsonResponse: JSON.stringify(validateStatus?.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: obj
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
        console.log("Error in research assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

ChatGptServices.getEmpLaw = async (botId, userId) => {
    try {
        if (botId) {
            const result = await AssistantThreadsQueries.getAllLaw(botId, userId)
            const data = await Promise.all(result.map(async (element) => {
                const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
                const { caseId, ...rest } = element;
                return {
                    ...rest,
                    caseDetails: getCaseDetails
                };
            }));
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
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting data for research assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getPrompts = async (userId) => {
    try {
        const result = await AssistantThreadsQueries.getUserAllPrompt(userId)
        if (result.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    all_prompts: result
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
        console.log("error while asking the agent", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getLastPrompts = async (userId) => {
    try {
        const result = await AssistantThreadsQueries.getUserLastPrompt(userId)
        if (result.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    last_prompt: result
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
        console.log("error while asking the agent", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getAllActivities = async (userId) => {
    try {
        const [latestPrompt, loginCount, currentScreen] = await Promise.all([
            AssistantThreadsQueries.getUserLastPrompt(userId),
            ActivityLogServices.getUserLoginCount(userId),
            ActivityLogServices.getUserScreen(userId)
        ]);
        let fileIds
        const results = await AssistantFilesQueries.findFileIdsById(latestPrompt[0].id, userId)
        fileIds = results.map(result => result.fileId);
        const combinedData = {
            "lastPrompt": latestPrompt[0]?.userQuery ? latestPrompt[0]?.userQuery : Strings.ROOM.EMPTY,
            "fileIds": fileIds.length > 0 ? fileIds : Strings.ROOM.EMPTY
            // "Latest Prompt": getCaseDetails[0]?.caseName ? getCaseDetails[0]?.caseName : Strings.ROOM.EMPTY,
            // "User Case Summary": getCaseDetails[0]?.summary ? getCaseDetails[0]?.summary : Strings.ROOM.EMPTY,
            // "User Login Count": loginCount.obj.login_count ? loginCount.obj.login_count : 0,
            // "User is currently at this page": currentScreen.obj.screen_name ? currentScreen.obj.screen_name : Strings.ROOM.EMPTY,
        }
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: combinedData
        };

    } catch (error) {
        console.log("error while comnining user activity", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.FindActivities = async (caseUuid, userId) => {
    try {
        const getCaseId = await CaseNamesQueries.getCasesId(caseUuid, userId)
        if (getCaseId.length > 0) {
            const [latestPrompt, loginCount, currentScreen] = await Promise.all([
                AssistantThreadsQueries.getUserLastPrompt(userId),
                ActivityLogServices.getUserLoginCount(userId),
                ActivityLogServices.getUserScreen(userId)
            ]);
            const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(getCaseId[0]?.id, userId);
            const combinedData = {
                "User Case Name": getCaseDetails[0]?.caseName ? getCaseDetails[0]?.caseName : Strings.ROOM.EMPTY,
                "User Case Summary": getCaseDetails[0]?.summary ? getCaseDetails[0]?.summary : Strings.ROOM.EMPTY,
                "The last prompt used by the user": latestPrompt[0]?.userQuery ? latestPrompt[0]?.userQuery : Strings.ROOM.EMPTY,
                "User Login Count": loginCount.obj.login_count ? loginCount.obj.login_count : 0,
                // "User is currently at this page": currentScreen.obj.screen_name ? currentScreen.obj.screen_name  : Strings.ROOM.EMPTY,
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: combinedData
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error while finding user activity", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.postKolabryAgent = async (kolabryAgent, query, userQuery, promptType, caidiAgent, state, caseData, userId) => {
    try {
        let assistantType, assistantId, findId, combinedData, allFileIds, getPayload, allActivity;
        let agentQuery, fileUpload = false, fileUploadKolabryAgent = false;
        const prompts = '{"messages": [{"role": "user"}]}';
        const payload = JSON.parse(prompts);
        if (kolabryAgent === true || kolabryAgent === false || caidiAgent === true) {
            if (kolabryAgent === true || kolabryAgent === false) {
                assistantType = 20;
                assistantId = kolabryAgentAssistant;
                const data = await UserQueries.getPromptByType(13)
                if (data.length > 0) {
                    const fetchPrompts = JSON.parse(data[0].prompt);
                    if (kolabryAgent === true && promptType === 0) {
                        //initailze from db //when the user first time click on K-A
                        agentQuery = fetchPrompts[0].prompt_0;
                    }
                    else if (kolabryAgent === true && promptType === 3) {
                        //Execute when submit button is clicked for analysis
                        allActivity = await ChatGptServices.getAllActivities(userId);
                        agentQuery = allActivity.obj.lastPrompt;
                        fileUploadKolabryAgent = true
                    }
                    else if (kolabryAgent === true) {
                        //when the user type any query in input field
                        // const result = query ? fetchPrompts[2].value + " " + query : ' ';
                        // agentQuery = fetchPrompts[2].key + " " + JSON.stringify(allActivity.obj) + result;
                        agentQuery = query;
                    }
                    else {
                        //when user click on two of any buttons in bottom of kolabraya agent
                        // agentQuery = fetchPrompts[2].key + " " + JSON.stringify(allActivity.obj) + " " + query + fetchPrompts[2].value + " " + fetchPrompts[promptType - 1].value
                        agentQuery = query + " " + fetchPrompts[promptType - 1].value
                    }
                }
                else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            }
            if (caidiAgent === true) {
                const data = await UserQueries.getPromptByType(14)
                if (data.length > 0) {
                    const fetchPrompts = JSON.parse(data[0].prompt);
                    assistantType = 21;
                    assistantId = kolabryCaidiAssistant;
                    if (state === false) {
                        agentQuery = query + fetchPrompts[0]['prompt_5']
                    } else {
                        const getState = 'prompt_' + state;
                        const findPrompt = fetchPrompts[0][getState];
                        if (state == '0') {
                            const findActiveChatCaidi = await AssistantThreadsQueries.findActiveChatCaidi(userId)
                            if (findActiveChatCaidi > 0) {
                                agentQuery = findPrompt
                            } else {
                                agentQuery = fetchPrompts[0]['prompt_4']
                            }
                        } else if (state == '1' && (caseData !== undefined && caseData !== '')) {
                            const getCaseUuid = JSON.parse(caseData)
                            const getCaseId = await CaseNamesQueries.getCasesIdForGroup(getCaseUuid.caseUuid)
                            findId = getCaseId.length > 0 ? getCaseId[0].id : null;
                            //For Caidi when using case file's
                            const getFileData = await ChatGptServices.getCaseFile(caseData, userId);
                            if (getFileData.statusCode == '200') {
                                combinedData = [...getFileData.obj.data];
                            } else {
                                return getFileData;
                            }
                            contentType = 0;
                            const validateFile = await ChatGptServices.caidiFileUpload(null, userId, contentType, combinedData);
                            if (validateFile.obj.fileId.length > 0) {
                                fileUpload = true;
                                allFileIds = validateFile.obj.fileId;
                                agentQuery = query
                            } else {
                                return validateFile
                            }
                        } else if (state == '2') {
                            agentQuery = findPrompt
                        } else if (state == '3') {
                            agentQuery = findPrompt
                        } else if (state == '4') { //if Kolabrya External Doc Analysis re-tries fails
                            agentQuery = fetchPrompts[0]['prompt_6']
                        } else if (state == '5') { //if user has not attached a file in a caidi
                            agentQuery = fetchPrompts[0]['prompt_7']
                        }
                        else if (state == '6') {
                            agentQuery = fetchPrompts[0]['prompt_8']
                        }
                        else if (state == '7') {
                            agentQuery = fetchPrompts[0]['prompt_9']
                        }
                        else if (state == '8') {
                            agentQuery = fetchPrompts[0]['prompt_10']
                        }
                        else if (state == '9') {
                            agentQuery = fetchPrompts[0]['prompt_11']
                        }
                        else {
                            return {
                                message: Strings.UNVALID_STATUS,
                                statusCode: 400,
                                obj: {}
                            }
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
            }
            if (fileUpload == true) {
                payload.messages[0].content = agentQuery;
                getPayload = payload?.messages[0];
                const attachments = allFileIds.flatMap(fileId => ([
                    {
                        file_id: fileId,
                        tools: [{ type: "file_search" }]
                    }
                ]));
                payload.messages[0].attachments = attachments;
            }
            else if (fileUploadKolabryAgent == true) {
                payload.messages[0].content = [
                    {
                        "type": "text",
                        "text": agentQuery
                    }
                ];
                getPayload = payload?.messages[0];
                const attachments = allActivity.obj.fileIds.flatMap(fileId => ([
                    {
                        file_id: fileId,
                        tools: [{ type: "file_search" }]
                    }
                ]));
                payload.messages[0].attachments = attachments;
            }
            else {
                payload.messages[0].content = agentQuery;
                getPayload = payload?.messages[0];
            }
            console.log("==========Query And User Activity==========");
            console.log(agentQuery);
            console.log("==========Query And User Activity==========");
            const getThreadId = await ChatGptServices.createOrFindThread(assistantType, userId)
            if (getThreadId.statusCode == '200') {
                // add message to thread.
                const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
                Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Kolabrya-Agent-Assistant-Open-AI");
                if (addMessage.id) {
                    // run the thread.
                    const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                    Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: userId, methodName: "runThreads" }, "Run-Thread-Kolabrya-Agent-Assistant-Open-AI");
                    Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "threadStep" }, "Thread-Step-Kolabrya-Agent-Assistant-Open-AI");
                    //Assistant Types
                    //20 = Kolabrya-Agent
                    //21 = Caidi-Agent
                    console.log("threadStep", threadStep.status);
                    if (threadStep.id) {
                        const data = {
                            assistantId: threadStep.assistant_id,
                            threadId: threadStep.thread_id,
                            caseId: findId,
                            runId: threadStep.id,
                            status: 0,
                            question: agentQuery,
                            userQuery: userQuery,
                            userId: userId,
                            kolabryaAssistant: assistantType
                        }
                        const getId = await AssistantThreadsQueries.createThread(data);
                        if (combinedData && combinedData.length > 0) {
                            combinedData.forEach(async (file, index) => {
                                const fileText = file.buffer.toString('utf-8')
                                const filename = file.originalname;
                                const currentFileMD5 = await ChatGptServices.computeMD5(fileText);
                                const fileData = {
                                    userId: userId,
                                    threadId: getId[0],
                                    botId: null,
                                    fileId: allFileIds[index],
                                    fileHash: currentFileMD5,
                                    fileName: filename,
                                    status: 1,
                                    contentType: contentType
                                }
                                await AssistantFilesQueries.createFile(fileData);
                            });
                        }
                        if (getId) {
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.ASSISTANT.ASSISTANT_KOLABRYA_AGENT_SUCCESS,
                                    requestUuid: getId[1]
                                }
                            }
                        }
                    } else {
                        return {
                            message: Strings.ERROR.ERROR_LOGOUT,
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
                    return {
                        message: Strings.ERROR.ERROR_LOGOUT,
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
                return {
                    message: Strings.ERROR.ERROR_LOGOUT,
                    statusCode: 400,
                    obj: getThreadId.obj
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
        console.log("Error in kolabrya agent asking", error);
        return {
            message: Strings.ERROR.ERROR_LOGOUT,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getAllAgentResponses = async (requestUuid, userId) => {
    let obj = {};
    let data = {};
    try {
        const result = await AssistantThreadsQueries.getRunIdByThreadIdAgent(requestUuid, userId)
        if (result.length > 0) {
            const threadId = result[0].threadId
            const runId = result[0].runId
            const validateStatus = await validateThreadStatus(threadId, runId);
            Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Retrive-Run")
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
                console.log("===== Kolabrya Agent Assistant =====");
                console.log("getCompleteStatus            *", getCompleteStatus);
                console.log("getInProgressStatus         **", getInProgressStatus);
                console.log("getFailedStatus            ***", getFailedStatus);
                console.log("getExpiredStatus          ****", getExpiredStatus);
                console.log("getQueuedStatus          *****", getQueuedStatus);
                console.log("");

                if (getCompleteStatus) {
                    const getanswer = await getAssistantResponse(threadId);
                    const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                    const record = await ChatGptServices.responseCleaning(getResponse);
                    obj = {
                        message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                        status: 1,
                        messageId: getanswer?.data[0]?.id,
                        answer: record ? record : {},
                        updatedAt: currentDate
                    }
                    Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Research-Assistant-Open-AI")
                    await AssistantThreadsQueries.updateThreadById(obj, runId);
                    return await getBulkDataAgent(threadId, userId)
                }
                else if (getInProgressStatus || getQueuedStatus) {
                    obj = {
                        status: 0,
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, runId);
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                            status: 0
                        }
                    }
                }
                else if (getFailedStatus) {
                    Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Thread-Status-Failed-Kolabrya-Agent-Assistant-Open-AI")
                    slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Agent-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, userId: userId }));
                    console.log("validate run failed case report assistant", validateStatus);
                    console.log("check status", validateStatus.status);
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
                    Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Thread-Status-Expired-Kolabrya-Agent-Assistant-Open-AI")
                    slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Agent-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, userId: userId }));
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
                console.log("validate run error Kolabrya Agent assistant", validateStatus?.error);
                obj = {
                    status: 2,
                    retry: true,
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

        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in threads of agent assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}

async function getBulkDataAgent(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getQNAReWriteAgent(userId)
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
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

async function validateJson(input, threadId, runId, userId) {
    if (typeof (input) === 'string') {
        try {
            const parsed = JSON.parse(input);
            if (typeof (parsed) === 'object' && parsed !== null) {
                Logger.data.OpenAI({ request: input, typeofinput: typeof (input), threadId: threadId, runId: runId, userId: userId }, "validateJson for right JSON")
                console.log("*************** Correct JSON ********************");
                console.log("TEXT:", input);
                console.log("TYPE OF TEXT:", typeof (input));
                console.log("*************** Correct JSON ********************");
                return true;
            }
        } catch (error) {
            Logger.data.OpenAI({ request: input, "error": error.message, typeofinput: typeof (input), threadId: threadId, runId: runId, userId: userId }, "validateJson for wrong JSON")
            console.log("*************** Wrong JSON ********************");
            console.log("TEXT:", input);
            console.log("TYPE OF TEXT:", typeof (input));
            console.log("*************** Wrong JSON ********************");
            console.log("Input is not valid JSON, returning the original input.", error);
            return false;
        }
    }
    return false;
}

async function getBulkDataCaidi(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.getCaidiData(userId)
        if (data.length > 0) {
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const entries = JSON.parse(element.answer)
                const record = await ChatGptServices.responseCleaningForCaidi(entries?.Message, 'addSpaceBetweenN');
                element.message = entries?.Message ? record : '';
                element.prompt = entries?.Prompt ? entries?.Prompt : '';
                element.query = entries?.Query ? entries?.Query : '';
                element.scheme = entries?.CaidiScheme ? entries?.CaidiScheme : '';
                element.answer = '';
            }
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
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

ChatGptServices.getCaidiResponses = async (userId) => {
    try {
        if (userId) {
            const result = await AssistantThreadsQueries.getCaidiData(userId)
            if (result.length > 0) {
                for (let index = 0; index < result.length; index++) {
                    const element = result[index];
                    const entries = JSON.parse(element.answer)
                    const record = await ChatGptServices.responseCleaningForCaidi(entries?.Message, 'addSpaceBetweenN');
                    element.message = entries?.Message ? record : '';
                    element.prompt = entries?.Prompt ? entries?.Prompt : '';
                    element.query = entries?.Query ? entries?.Query : '';
                    element.scheme = entries?.CaidiScheme ? entries?.CaidiScheme : '';
                    element.answer = '';
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: result
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
    } catch (error) {
        console.log("error in getting data for kolabrya caidi assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.checkParsing = async (data) => {
    try {
        JSON.parse(data)
        return true;
    } catch (error) {
        return false
    }
}

ChatGptServices.getAgentResponses = async (userId) => {
    try {
        if (userId) {
            const result = await AssistantThreadsQueries.getAllAgent(userId)
            if (result.length > 0) {
                for (let index = 0; index < result.length; index++) {
                    const element = result[index];
                    const record = await ChatGptServices.checkParsing(element.answer)
                    if (record == true) {
                        element.agentResponse = true;
                    } else {
                        element.agentResponse = false;
                    }
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: result
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
    } catch (error) {
        console.log("error in getting data for kolabrya agent assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deleteAgentData = async () => {
    try {
        const data = await AssistantThreadsQueries.getAgentAllThread();
        if (data.length > 0) {
            const fileCounts = data.length;
            const deletionStatus = [];
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                console.log("=========================================================================");
                console.log("Getting Kolabrya and Caidi Agent Threads to Delete:", element.threadId);
                console.log("=========================================================================");
                const obj = {
                    status: 3
                }
                const result = await AssistantThreadsQueries.deleteAgentThread(obj, element.threadId)
                if (result[0] == '1') {
                    deletionStatus.push({ threadId: element.threadId, status: 'deleted' });

                } else {
                    deletionStatus.push({ threadId: element.threadId, status: 'not deleted', message: result });
                }
                Logger.data.OpenAI({ requestPayload: element.threadId, response: result }, "Delete-Agent-Threads-Database");
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    recordCounts: fileCounts,
                    deletionStatus: deletionStatus
                }
            };
        } else {
            console.log("************************************************************************");
            console.log("No Record Found For Deleting Active Threads for Kolabrya and Caidi Agent");
            console.log("************************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            };
        }
    } catch (error) {
        console.error('An error occurred while deleting agent threads', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getAllGuideResponses = async (threadId, userId) => {
    let obj = {};
    let data = {};
    try {
        if (threadId) {
            const result = await AssistantThreadsQueries.getRunIdByThreadIdCaidi(threadId, userId)
            if (result.length > 0) {
                const validateStatus = await validateThreadStatus(threadId, result[0].runId);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Retrive-Run")
                data = {
                    jsonResponse: JSON.stringify(validateStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, result[0].runId);
                if (!validateStatus.error) {
                    const getCompleteStatus = validateStatus.status == 'completed';
                    const getInProgressStatus = validateStatus.status == 'in_progress';
                    const getFailedStatus = validateStatus.status == 'failed';
                    const getExpiredStatus = validateStatus.status == 'expired';
                    const getQueuedStatus = validateStatus.status == 'queued';
                    console.log("");
                    console.log("===== Kolabrya Caidi Assistant =====");
                    console.log("getCompleteStatus            *", getCompleteStatus);
                    console.log("getInProgressStatus         **", getInProgressStatus);
                    console.log("getFailedStatus            ***", getFailedStatus);
                    console.log("getExpiredStatus          ****", getExpiredStatus);
                    console.log("getQueuedStatus          *****", getQueuedStatus);
                    console.log("");
                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        const checkJson = await validateJson(getResponse, threadId, result[0].runId, userId)
                        if (checkJson == true) {
                            obj = {
                                message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                                status: 1,
                                messageId: getanswer?.data[0]?.id,
                                answer: getResponse ? await ChatGptServices.removeAnnotation(getResponse) : {},
                                // answer: JSON.stringify(getResponse ? await ChatGptServices.removeAnnotation(getResponse) : {}),
                                updatedAt: currentDate
                            }
                            Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: result[0].runId }, "Thread-Status-Complete-Caidi-Assistant-Open-AI")
                            await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                            return await getBulkDataCaidi(threadId, userId)
                        } else {
                            slack.webhook(JSON.stringify({ action: "Getting Wrong JSON for Caidi", response: getResponse, typeofinput: typeof (getResponse), threadId: threadId, runId: result[0].runId, userId: userId }));
                            console.log("Getting wrong JSON from openAI", validateStatus);
                            obj = {
                                retry: true,
                                status: 2,
                                answer: null,
                                jsonResponse: getResponse + ' ' + "Failed to parse",
                                updatedAt: currentDate
                            }
                            await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                            return {
                                message: Strings.ERROR.ERROR_RE_TRY,
                                statusCode: 400,
                                obj: obj
                            }
                        }
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Failed-Kolabrya-Agent-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Agent-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        console.log("validate run failed case report assistant", validateStatus);
                        console.log("check status", validateStatus.status);
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getExpiredStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Expired-Caidi-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Caidi-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else {
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                } else {
                    console.log("validate run error Kolabrya Caidi assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
                        answer: null,
                        jsonResponse: JSON.stringify(validateStatus?.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: obj
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
        console.log("Error in threads of caidi assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
                // retry: true
            }
        }
    }
}


ChatGptServices.deleteCaidiThreads = async (userId) => {
    try {
        const obj = {
            status: 3,
            updatedAt: currentDate
        }
        const result = await AssistantThreadsQueries.deleteCaidiAgentThread(obj, userId)
        if (result[0] > 0) {
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
        console.log("error in clearing thread for caidi agent", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.caidiFileUpload = async (botId, userId, contentType, content) => {
    content.forEach(file => {
        file.originalname = Encryptions.encryptFileName(file.originalname);
    })
    const getFileId = await ChatGptServices.getContent(botId, userId, contentType, content);
    let checkFile;
    if (getFileId.obj.length > 0) {
        console.log("");
        console.log("==================");
        console.log("File Already Found");
        console.log("==================");
        console.log("");
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                fileId: getFileId.obj
            }
        };
    }
    else {
        console.log("");
        console.log("========");
        console.log("New File");
        console.log("========");
        console.log("");
        const allFileIds = await summaryUpload(content);
        if (allFileIds.some(file => file.error)) {
            const errorMessage = allFileIds.find(file => file.error).error;
            return {
                message: Strings.ASSISTANT.ASSISTANT_FILE_UPLOAD_ERROR,
                statusCode: 400,
                obj: {
                    message: errorMessage.message,
                    type: errorMessage.type,
                    param: errorMessage.param,
                    code: errorMessage.code,
                }
            };
        }
        else {
            const fileIds = allFileIds.map(file => file.id);
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    fileId: fileIds
                }
            };
        }
    }
}

ChatGptServices.addAccordianCaseAnswers = async (caseId, userId) => {
    try {
        const record = []
        const prompt = await UserQueries.getPromptByType(29);
        const payload = JSON.parse(prompt[0].prompt);
        for (const element of payload) {
            const getAnswer = await CaseDashboardQueries.findCaseAnswers(element.id, caseId, userId)
            if (getAnswer != null) {
                const list = element.title + ": " + getAnswer.response
                record.push(list);
            }
        }
        if (record.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: record
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in add Accordian Case Answers at case visualizer:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

ChatGptServices.generateVisual = async (requestUuid, visuals, userId) => {
    try {
        if (requestUuid != '' && visuals == true) {
            const record = await AssistantThreadsQueries.validateRecord(requestUuid, userId);
            const prompt = await UserQueries.getPromptByType(17);
            if (record.length > 0 && prompt.length > 0) {
                const fetchPrompts = prompt[0].prompt;
                const query = fetchPrompts + " " + record[0].answer
                const assistantId = kolabryaVisuals;
                const assistantType = 22;
                const prompts = '{"messages": [{"role": "user"}]}';
                const payload = JSON.parse(prompts);
                payload.messages[0].content = query;
                const getPayload = payload?.messages[0];
                const getThreadId = await ChatGptServices.createOrFindThread(assistantType, userId)
                if (getThreadId.statusCode == '200') {
                    // add message to thread.
                    const addMessage = await makeMessage(getPayload, getThreadId?.obj?.threadId)
                    Logger.data.OpenAI({ request: getPayload, response: addMessage, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "makeMessage" }, "Add-Message-To-Thread-Open-AI-Visual");
                    if (addMessage.id) {
                        // run the thread.
                        const threadStep = await runThreads(getThreadId?.obj?.threadId, assistantId);
                        Logger.data.OpenAI({ threadId: getThreadId?.obj?.threadId, assistantId: assistantId, response: addMessage, userId: userId, methodName: "runThreads" }, "Run-Thread-Open-AI-Visual");
                        Logger.data.OpenAI({ response: threadStep, threadId: getThreadId?.obj?.threadId, userId: userId, methodName: "threadStep" }, "Thread-Step-Open-AI-Visual");
                        //Assistant Types
                        //22 = Generate Visual's assistant with analysis only for text content no files
                        console.log("");
                        console.log("=================");
                        console.log("threadStep", threadStep.status);
                        console.log("=================");
                        console.log("");
                        if (threadStep.id) {
                            const fetchPrompt = await UserQueries.getPromptByType(21);
                            const data = {
                                assistantId: threadStep.assistant_id,
                                threadId: threadStep.thread_id,
                                runId: threadStep.id,
                                botId: 'fb9c9ffb-d208-47e3-8115-df4de55cb54c',
                                status: 0,
                                question: query,
                                userQuery: JSON.parse(fetchPrompt[0].prompt)[0],
                                userId: userId,
                                kolabryaAssistant: assistantType
                            }
                            const getId = await AssistantThreadsQueries.createThreadForVisuals(data);
                            if (getId) {
                                return {
                                    message: Strings.SUCCESS,
                                    statusCode: 200,
                                    obj: {
                                        message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                        requestUuid: getId[1]
                                    }
                                }
                            }
                        } else {
                            return {
                                message: Strings.ERROR.ERROR_WAIT,
                                statusCode: 400,
                                obj: {
                                    message: threadStep?.error?.message,
                                    type: threadStep?.error?.type,
                                    param: threadStep?.error?.param,
                                    code: threadStep?.error?.code,
                                }
                            }
                        }
                    } else {
                        return {
                            message: Strings.ERROR.ERROR_WAIT,
                            statusCode: 400,
                            obj: {
                                message: addMessage?.error?.message,
                                type: addMessage?.error?.type,
                                param: addMessage?.error?.param,
                                code: addMessage?.error?.code,
                            }
                        }
                    }
                } else {
                    return {
                        message: Strings.ERROR.ERROR_WAIT,
                        statusCode: 400,
                        obj: {
                            ...getThreadId.obj,
                        }
                    }
                }

                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: query
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
        console.log("Error in making threads for analysis visuals:", error.message);
        return {
            message: Strings.ERROR.ERROR_WAIT,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

ChatGptServices.getVisuals = async (threadId, userId) => {
    let obj = {};
    let data = {};
    try {
        if (threadId) {
            const result = await AssistantThreadsQueries.getVisualsThreadId(threadId, userId)
            if (result.length > 0) {
                const validateStatus = await validateThreadStatus(threadId, result[0].runId);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Retrive-Run-Get-Visuals-ThreadId")
                data = {
                    jsonResponse: JSON.stringify(validateStatus)
                }
                await AssistantThreadsQueries.updateThreadById(data, result[0].runId);

                if (!validateStatus.error) {
                    const getCompleteStatus = validateStatus.status == 'completed';
                    const getInProgressStatus = validateStatus.status == 'in_progress';
                    const getFailedStatus = validateStatus.status == 'failed';
                    const getExpiredStatus = validateStatus.status == 'expired';
                    const getQueuedStatus = validateStatus.status == 'queued';

                    console.log("");
                    console.log("===== Kolabrya Visual Assistant =====");
                    console.log("getCompleteStatus            *", getCompleteStatus);
                    console.log("getInProgressStatus         **", getInProgressStatus);
                    console.log("getFailedStatus            ***", getFailedStatus);
                    console.log("getExpiredStatus          ****", getExpiredStatus);
                    console.log("getQueuedStatus          *****", getQueuedStatus);
                    console.log("");

                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        const record = await ChatGptServices.responseCleaning(getResponse);
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            answer: record ? record : {},
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: result[0].runId, type: typeof (getResponse) }, "Thread-Status-Complete-Visuals-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return await getBulkDataVisuals(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Failed-Kolabrya-Agent-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Visuals-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        console.log("validate run failed case report assistant", validateStatus);
                        console.log("check status", validateStatus.status);
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else if (getExpiredStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }, "Thread-Status-Expired-Kolabrya-Agent-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Visuals-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: result[0].runId, userId: userId }));
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }
                    else {
                        obj = {
                            retry: true,
                            status: 2,
                            answer: null,
                            jsonResponse: JSON.stringify(validateStatus),
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                        return {
                            message: Strings.ERROR.ERROR_RE_TRY,
                            statusCode: 400,
                            obj: obj
                        }
                    }

                } else {
                    console.log("validate run error Kolabrya Visuals assistant", validateStatus);
                    obj = {
                        status: 2,
                        retry: true,
                        answer: null,
                        jsonResponse: JSON.stringify(validateStatus?.error),
                        updatedAt: currentDate
                    }
                    await AssistantThreadsQueries.updateThreadById(obj, result[0].runId);
                    return {
                        message: Strings.ERROR.ERROR_RE_TRY,
                        statusCode: 400,
                        obj: obj
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
        console.log("Error in threads of Visuals assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

async function getBulkDataVisuals(threadId, userId) {
    const result = await AssistantThreadsQueries.getUpdatedThreadById(threadId, userId)
    if (result.length > 0) {
        const data = await AssistantThreadsQueries.fetchVisuals(userId)
        if (data.length > 0) {
            return await ChatGptServices.makeCaseDetails(data, userId, true)
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

ChatGptServices.makeCaseDetails = async (record, userId, addRegex) => {
    try {
        const getAllData = await Promise.all(record.map(async (element) => {
            if (addRegex == true) {
                const regex = /<table\b[^>]*>/i;
                const result = regex.test(element.answer);
                result == true ? element.visuals = false : element.visuals = true
            }
            const getCaseDetails = await CaseNamesQueries.findCasesByIdOnly(element.caseId, userId);
            const { caseId, ...rest } = element;
            return {
                ...rest,
                caseDetails: getCaseDetails
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
        console.log("error in make case details function", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.fetchVisuals = async (userId) => {
    try {
        if (userId) {
            const result = await AssistantThreadsQueries.fetchVisuals(userId)
            if (result.length > 0) {
                return await ChatGptServices.makeCaseDetails(result, userId, true)
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
        console.log("error in getting data for kolabrya agent assistant", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getPendingData = async () => {
    try {
        const data = await VectorStoreManagerQueries.getPendingData()
        if (data.length > 0) {
            const list = []
            console.log("**************************************************");
            console.log("Job Started For Case File's To Create Vector Store");
            console.log("**************************************************");
            for (const element of data) {
                const getFileId = await CaseFilesQueries.getFilesForVectorStore(element.caseId, element.userId)
                const formattedFileIds = getFileId.map(file => file.openAIFileId);
                const record = await ChatGptServices.makeVectorStore(formattedFileIds, element.caseId, element.userId, element.createdByUserId);
                list.push(record);
            }
            Logger.data.OpenAI({ response: list, methodName: "getPendingData" }, "OpenAI-File-Batching-Service");
            console.log("****************************************************");
            console.log("Job Completed For Case File's To Create Vector Store");
            console.log("****************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: data
            }
        } else {
            console.log("******************************************************");
            console.log("No Record Found For Case File's To Create Vector Store");
            console.log("******************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in create vector", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.getPendingDataForExternalDoc = async () => {
    try {
        const data = await VectorStoreManagerQueries.getPendingDataForExternalDoc()
        if (data.length > 0) {
            const list = []
            console.log("**********************************************************");
            console.log("Job Started For External Document's To Create Vector Store");
            console.log("**********************************************************");
            for (const element of data) {
                const getFileId = await AssistantFilesQueries.getFilesForVectorStore(element.batchId, element.userId)
                const formattedFileIds = getFileId.map(file => file.openAIFileId);
                const record = await ChatGptServices.makeVectorStoreExternalDoc(formattedFileIds, element.batchId, element.userId, element.createdByUserId);
                list.push(record);
            }
            Logger.data.OpenAI({ response: list, methodName: "getPendingDataForExternalDoc" }, "OpenAI-File-Batching-Service-External-Document");
            console.log("************************************************************");
            console.log("Job Completed For External Document's To Create Vector Store");
            console.log("************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: data
            }
        } else {
            console.log("**************************************************************");
            console.log("No Record Found For External Document's To Create Vector Store");
            console.log("**************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in create vector", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.retriveVectorStore = async () => {
    try {
        const data = await VectorStoreManagerQueries.checkVectorStoreStatus();
        if (data.length > 0) {
            console.log("********************************************");
            console.log("Job Started For Checking Vector Store Status");
            console.log("********************************************");
            const results = [];
            for (const element of data) {
                const record = await retriveVectorStore(element.vectorId)
                console.log("********************************");
                console.log("Vector Store Status =>", record.status);
                console.log("********************************");
                console.log("************************");
                console.log("Vector Store File Status");
                console.log("************************");
                if (record.status == 'completed' && record.file_counts.failed <= 0 && record.file_counts.cancelled <= 0) {
                    const obj = {
                        status: true,
                        jsonResponse: JSON.stringify(record)
                    }
                    await VectorStoreManagerQueries.updateVector(obj, element.vectorId);                    
                    const getDetailsForVectorStore = await VectorStoreManagerQueries.getVector(element.id, element.userId);
                    const caseId = getDetailsForVectorStore['vectorDetails.caseId']
                    if (caseId) {
                         const update = {
                            isProcessed: true
                        }
                        await CaseNamesQueries.updateCaseOnUpdateRecord(update, caseId, element.userId)
                    }
                    await require('./caseIntelligentMap.services').findRecord();
                }
                else if (record.file_counts.failed > 0 || record.file_counts.cancelled > 0) {
                    const obj = {
                        isActivated: false,
                        status: 2,
                        jsonResponse: JSON.stringify(record)
                    }
                    const getFileDetails = await getVectorStoreFileDetails(element.vectorId);
                    if (getFileDetails.data) {
                        for (const record of getFileDetails.data) {
                            if (record.status == 'failed' || record.status == 'cancelled') {
                                console.log("******************************");
                                console.log("Delete File from OpenAI and DB");
                                console.log("******************************");
                                const deleteFile = await deleteFileFromVector(element.vectorId, record.id);
                                console.log("deleteFile", deleteFile);
                                const obj = {
                                    status: 2,
                                    updatedAt: currentDate,
                                }
                                await CaseFilesQueries.deActivateFileOnError(obj, record.id, element.userId);
                                //isActivate false at doc assistant table add only here
                            }
                        }
                    }
                    await VectorStoreManagerQueries.updateVectorFailed(obj, element.vectorId);
                    const getDetailsForVectorStore = await VectorStoreManagerQueries.getVector(element.id, element.userId);
                    const caseId = getDetailsForVectorStore['vectorDetails.caseId']
                    const vectorId = getDetailsForVectorStore.id
                    if (caseId && vectorId) {
                        slack.webhook(JSON.stringify({ action: "Vector-Store-File-Count-Status", status: record.file_counts, coreFileDetails: getFileDetails, caseId: caseId, vectorId: vectorId, userId: element.userId }));
                        const disableChildVector = {
                            vectorId: null
                        }
                        await CaseFilesQueries.disableChildVector(disableChildVector, vectorId, caseId, element.userId)
                    }
                }
                else if (record.status == 'failed' || record.status == 'cancelled') {
                    const obj = {
                        isActivated: false,
                        status: 2,
                        jsonResponse: JSON.stringify(record)
                    }
                    await VectorStoreManagerQueries.updateVectorFailed(obj, element.vectorId);
                    const getDetailsForVectorStore = await VectorStoreManagerQueries.getVector(element.vectorId, element.userId);
                    const caseId = getDetailsForVectorStore['vectorDetails.caseId']
                    const vectorId = getDetailsForVectorStore.id
                    if (caseId && vectorId) {
                        slack.webhook(JSON.stringify({ action: "Vector-Store-Status-Failed/Cancelled", status: record.status, caseId: caseId, vectorId: vectorId, userId: element.userId }));
                        const disableChildVector = {
                            vectorId: null
                        }
                        CaseFilesQueries.disableChildVector(disableChildVector, vectorId, caseId, element.userId)
                    }
                }
                else {
                    if (record.status == 'in_progress') {
                        const getDetailsForVectorStore = await VectorStoreManagerQueries.checkVectorStoreTime(element.vectorId, element.userId);
                        if (getDetailsForVectorStore) {
                            const obj = {
                                isActivated: false,
                                status: 2,
                                jsonResponse: JSON.stringify(record)
                            }
                            await VectorStoreManagerQueries.updateVector(obj, element.vectorId);
                            const caseId = getDetailsForVectorStore['vectorDetails.caseId']
                            const vectorId = getDetailsForVectorStore.id
                            if (caseId && vectorId) {
                                slack.webhook(JSON.stringify({ action: `Recreating-Vector-Store-It-Was-Taking-More-Than ${vectorStoreTimer} Minute`, status: record.status, caseId: caseId, vectorId: vectorId, userId: element.userId }));
                                const disableChildVector = {
                                    vectorId: null
                                }
                                CaseFilesQueries.disableChildVector(disableChildVector, vectorId, caseId, element.userId)
                            }
                        }
                    }
                }
                results.push({ vectorId: element.vectorId, openAIResponse: record })
                Logger.data.OpenAI({ response: results, methodName: "retriveVectorStore" }, "Check-Vector-Store-Status-OpenAI");
            }
            console.log("**********************************************");
            console.log("Job Completed For Checking Vector Store Status");
            console.log("**********************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("************************************************");
            console.log("No Record Found For Checking Vector Store Stauts");
            console.log("************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while retrive Vector Store", error);
        //add slack notification    
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.retriveVectorStoreExternalDoc = async () => {
    try {
        const data = await VectorStoreManagerQueries.checkVectorStoreStatusExternalDoc();
        if (data.length > 0) {
            console.log("*********************************************************");
            console.log("Job Started For Checking Vector Store Status External Doc");
            console.log("*********************************************************");
            const results = [];
            for (const element of data) {
                const record = await retriveVectorStore(element.vectorId)
                console.log("********************************");
                console.log("Vector Store Status External Doc", record.status);
                console.log("********************************");
                console.log("*************************************");
                console.log("Vector Store File Status External Doc");
                console.log("*************************************");
                if (record.status == 'completed' && record.file_counts.failed <= 0 && record.file_counts.cancelled <= 0) {
                    const obj = {
                        status: true,
                        jsonResponse: JSON.stringify(record)
                    }
                    await VectorStoreManagerQueries.updateVectorExternalDoc(obj, element.vectorId);                    
                    // const getDetailsForVectorStore = await VectorStoreManagerQueries.getVectorExternalDoc(element.id, element.userId);
                    // const caseId = getDetailsForVectorStore['vectorDetails.caseId']
                    // if (caseId) {
                    //      const update = {
                    //         isProcessed: true
                    //     }
                    //     await CaseNamesQueries.updateCaseOnUpdateRecord(update, caseId, element.userId)
                    // }
                }
                else if (record.file_counts.failed > 0 || record.file_counts.cancelled > 0) {
                    const obj = {
                        isActivated: false,
                        status: 2,
                        jsonResponse: JSON.stringify(record)
                    }
                    const getFileDetails = await getVectorStoreFileDetails(element.vectorId);
                    if (getFileDetails.data) {
                        for (const record of getFileDetails.data) {
                            if (record.status == 'failed' || record.status == 'cancelled') {
                                console.log("******************************");
                                console.log("Delete File from OpenAI and DB");
                                console.log("******************************");
                                const deleteFile = await deleteFileFromVector(element.vectorId, record.id);
                                console.log("deleteFile", deleteFile);
                                const obj = {
                                    status: 2,
                                    updatedAt: currentDate,
                                }
                                await AssistantFilesQueries.deActivateFileOnError(obj, record.id, element.userId);
                            }
                        }
                    }
                    await VectorStoreManagerQueries.updateVectorFailedExternalDoc(obj, element.vectorId);
                    const getDetailsForVectorStore = await VectorStoreManagerQueries.getVectorExternalDoc(element.id, element.userId);
                    const caseId = getDetailsForVectorStore['externalVectorDetails.batchId']
                    const vectorId = getDetailsForVectorStore.id
                    if (caseId && vectorId) {
                        slack.webhook(JSON.stringify({ action: "Vector-Store-File-Count-Status", status: record.file_counts, coreFileDetails: getFileDetails, batchId: caseId, vectorId: vectorId, userId: element.userId }));
                        const disableChildVector = {
                            vectorId: null
                        }
                        await AssistantFilesQueries.disableChildVectorExternalDoc(disableChildVector, vectorId, caseId, element.userId)
                    }
                }
                else if (record.status == 'failed' || record.status == 'cancelled') {
                    const obj = {
                        isActivated: false,
                        status: 2,
                        jsonResponse: JSON.stringify(record)
                    }
                    await VectorStoreManagerQueries.updateVectorFailedExternalDoc(obj, element.vectorId);
                    const getDetailsForVectorStore = await VectorStoreManagerQueries.getVectorExternalDoc(element.id, element.userId);
                    const caseId = getDetailsForVectorStore['externalVectorDetails.batchId']
                    const vectorId = getDetailsForVectorStore.id
                    if (caseId && vectorId) {
                        slack.webhook(JSON.stringify({ action: "Vector-Store-Status-Failed/Cancelled-External-Doc", status: record.status, batchId: caseId, vectorId: vectorId, userId: element.userId }));
                        const disableChildVector = {
                            vectorId: null
                        }
                        await AssistantFilesQueries.disableChildVectorExternalDoc(disableChildVector, vectorId, caseId, element.userId)
                    }
                }
                else {
                    if (record.status == 'in_progress') {
                        const getDetailsForVectorStore = await VectorStoreManagerQueries.checkVectorStoreTimeExternalDoc(element.vectorId, element.userId);
                        if (getDetailsForVectorStore) {
                            const obj = {
                                isActivated: false,
                                status: 2,
                                jsonResponse: JSON.stringify(record)
                            }
                            await VectorStoreManagerQueries.updateVectorExternalDoc(obj, element.vectorId);
                            const caseId = getDetailsForVectorStore['externalVectorDetails.batchId']
                            const vectorId = getDetailsForVectorStore.id
                            if (caseId && vectorId) {
                                slack.webhook(JSON.stringify({ action: `External Doc Recreating-Vector-Store-It-Was-Taking-More-Than ${vectorStoreTimer} Minute`, status: record.status, batch: caseId, vectorId: vectorId, userId: element.userId }));
                                const disableChildVector = {
                                    vectorId: null
                                }
                                await AssistantFilesQueries.disableChildVectorExternalDoc(disableChildVector, vectorId, caseId, element.userId)
                            }
                        }
                    }
                }
                results.push({ vectorId: element.vectorId, openAIResponse: record })
                Logger.data.OpenAI({ response: results, methodName: "retriveVectorStoreExternalDoc" }, "Check-Vector-Store-Status-OpenAI-External-Doc");
            }
            console.log("***********************************************************");
            console.log("Job Completed For Checking Vector Store Status External Doc");
            console.log("***********************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("*************************************************************");
            console.log("No Record Found For Checking Vector Store Stauts External Doc");
            console.log("*************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while retrive Vector Store  External Doc", error);
        //add slack notification    
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.uploadFileCitationBulk = async () => {
    try {
        const all = await CaseNamesQueries.getCases();
        if (all.length > 0) {
            const list = [];
            for (const element of all) {
                const list = await CaseNamesQueries.getDataForCitation(element.id);
                if (list.length > 0) {
                    const transformedData = await ChatGptServices.transformPayload(list);
                    const fileDetailes = transformedData?.caseDetails
                    const record = await uploadCiteDocuments(transformedData);
                    console.log("******************* Request - 1 - Send-Cite-Documnets *******************");
                    console.log(JSON.stringify(record));
                    console.log("******************* Request - 1 - Send-Cite-Documnets *******************");
                    if (record.statusCode == '200' && record.obj.status == true) {
                        Logger.data.Citation({ request: transformedData, response: record }, "Send-Cite-Document-Success")
                        if (fileDetailes.length > 0) {
                            for (const element of fileDetailes) {
                                const obj = {
                                    isCitation: false, //pending Files
                                }
                                await CaseFilesQueries.updateFileForCite(obj, element.fileUuid)
                            }
                        }
                        list.push(record)
                    } else {
                        if (fileDetailes.length > 0) {
                            for (const element of fileDetailes) {
                                const obj = {
                                    isCitation: 2, //failed due to python down
                                }
                                await CaseFilesQueries.updateFileForCite(obj, element.fileUuid)
                            }
                        }
                        Logger.data.Citation({ request: transformedData, response: record }, "Send-Cite-Document-Failed")
                        slack.webhook(JSON.stringify({ action: "Error-While-Sending-Cite-Document", request: transformedData, response: record }));
                        list.push(record)
                    }
                }
            }
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
    } catch (error) {
        console.log("Error in sending Cite Documnets Bulk", error);
        return {
            message: Strings.ERROR.ERROR_WAIT,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

ChatGptServices.updateVectorStore = async () => {
    try {
        const data = await VectorStoreManagerQueries.getPendingDataOnCaseUpdate()
        if (data.length > 0) {
            const list = []
            console.log("**************************************************");
            console.log("Job Started For Case File's To Update Vector Store");
            console.log("**************************************************");
            for (const element of data) {
                const getFileId = await CaseFilesQueries.getFilesForVectorStore(element.caseId, element.userId)
                const formattedFileIds = getFileId.map(file => file.openAIFileId);

                let getVectorId
                if (element.groupId == null) {
                    getVectorId = await VectorStoreManagerQueries.getVectorDetails(element.caseId, element.userId)
                } else {
                    console.log("Get Vector Id On Update from a group");
                    getVectorId = await VectorStoreManagerQueries.getVectorDetailsForGroup(element.caseId, element.userId)
                }

                console.log("Vector Id On Update ", getVectorId);
                if (getVectorId?.vectorId) {
                    const vectorId = getVectorId.vectorId
                    const id = getVectorId.id
                    const currentFileIds = getVectorId.fileIds
                    const currentFileCounts = getVectorId.fileCounts
                    const record = await ChatGptServices.addFilesInVectorStore(formattedFileIds, id, vectorId, currentFileIds, currentFileCounts, element.caseId, element.userId);
                    list.push(record);
                }
            }
            Logger.data.OpenAI({ response: list, methodName: "updateVectorStore" }, "OpenAI-File-Update-Batching-Service");
            console.log("****************************************************");
            console.log("Job Completed For Case File's To Update Vector Store");
            console.log("****************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: data
            }
        } else {
            console.log("******************************************************");
            console.log("No Record Found For Case File's To Update Vector Store");
            console.log("******************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in update Vector Store", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deleteFileFromVectorStore = async () => {
    try {
        const data = await VectorStoreManagerQueries.getDeletedRecordsOfVectorStore()
        if (data.length > 0) {
            const list = []
            console.log("**************************************************************");
            console.log("Job Started For Case File's To Delete File's From Vector Store");
            console.log("**************************************************************");
            for (const element of data) {
                const getFileId = await CaseFilesQueries.getFilesForDeleteVectorStore(element.caseId, element.userId)
                const formattedFileIds = getFileId.map(file => file.openAIFileId);
                let getVectorId
                if (element.groupId == null) {
                    console.log("Get Vector Id On Delete for user");
                    getVectorId = await VectorStoreManagerQueries.getVectorDetails(element.caseId, element.userId)
                } else {
                    console.log("Get Vector Id On Delete from a group");
                    getVectorId = await VectorStoreManagerQueries.getVectorDetailsForGroup(element.caseId)
                }
                console.log("Vector Id On Delete ", getVectorId);
                if (getVectorId?.vectorId) {
                    const vectorId = getVectorId.vectorId
                    const id = getVectorId.id
                    const currentFileIds = getVectorId.fileIds
                    const currentFileCounts = getVectorId.fileCounts
                    const record = await ChatGptServices.deleteFilesInVectorStore(formattedFileIds, id, vectorId, currentFileIds, currentFileCounts, element.caseId, element.userId);
                    list.push(record);
                }
            }
            Logger.data.OpenAI({ response: list, methodName: "deleteFileFromVectorStore" }, "OpenAI-File-Delete-From-Vector-Store");
            console.log("****************************************************************");
            console.log("Job Completed For Case File's To Delete File's From Vector Store");
            console.log("****************************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: data
            }
        } else {
            console.log("******************************************************************");
            console.log("No Record Found For Case File's To Delete File's From Vector Store");
            console.log("******************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in delete File From Vector Store", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ChatGptServices.deActivateOldRecords = async () => {
    try {
        const all = await AssistantThreadsQueries.findOldRecords();
        Logger.data.chatGPT({ recordCounts: all.length > 0 ? all.length : Strings.ROOM.EMPTY }, "Count-DeActivated-Old-Records")
        if (all.length > 0) {
            console.log("****************************************");
            console.log("Job Started To Deactivated Older Records");
            console.log("****************************************");
            const obj = {
                status: 3,
                updatedAt: currentDate
            }
            const record = await AssistantThreadsQueries.deActivateOldRecords(obj);
            Logger.data.chatGPT({ DeactivatedRecordsCount: record[0] }, "Successfully-DeActivated-Old-Records")
            console.log("**************************************");
            console.log("Job Ended To Deactivated Older Records");
            console.log("**************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            }
        } else {
            console.log("********************************************");
            console.log("No Record Found For Deactivated Older Records");
            console.log("********************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in deActivate Old Records", error);
        return {
            message: Strings.ERROR.ERROR_WAIT,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

ChatGptServices.getAllThreadAssResponsesIns = async (requestUuid, userId) => {
    let obj = {};
    let data = {};
    try {
        if (requestUuid) {
            const result = await AssistantThreadsQueries.getRunIdByThreadIdAssIns(requestUuid, userId)
            if (result.length > 0) {
                const threadId = result[0].threadId;
                const runId = result[0].runId;
                const validateStatus = await validateThreadStatus(threadId, runId);
                Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Retrive-Run-ThreadIdAssIns")
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
                    console.log("===== Kolabrya Insurance Assistant =====");
                    console.log("getCompleteStatus                *", getCompleteStatus);
                    console.log("getInProgressStatus             **", getInProgressStatus);
                    console.log("getFailedStatus                ***", getFailedStatus);
                    console.log("getExpiredStatus              ****", getExpiredStatus);
                    console.log("getQueuedStatus              *****", getQueuedStatus);
                    console.log("");

                    if (getCompleteStatus) {
                        const getanswer = await getAssistantResponse(threadId);
                        const getResponse = getanswer?.data[0]?.content[0]?.text?.value;
                        const record = await ChatGptServices.responseCleaningForAnalysis(getResponse, 'removeDoubleSingleSlashN');
                        obj = {
                            message: Strings.ASSISTANT.ASSISTANT_SUCCESS_RESPONSE,
                            status: 1,
                            messageId: getanswer?.data[0]?.id,
                            answer: record ? record : {},
                            updatedAt: currentDate
                        }
                        Logger.data.OpenAI({ response: getanswer, threadId: threadId, runId: runId }, "Thread-Status-Complete-Kolabrya-Ins-Assistant-Open-AI")
                        await AssistantThreadsQueries.updateThreadById(obj, runId);
                        return await getBulkDataIns(threadId, userId)
                    }
                    else if (getInProgressStatus || getQueuedStatus) {
                        obj = {
                            status: 0,
                            updatedAt: currentDate
                        }
                        await AssistantThreadsQueries.updateThreadById(obj, runId);
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                                status: 0
                            }
                        }
                    }
                    else if (getFailedStatus) {
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Thread-Status-Failed-Kolabrya-Ins-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Failed-Kolabrya-Ins-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, userId: userId }));
                        console.log("validate run failed case kolabrya ins assistant", validateStatus);
                        console.log("check status", validateStatus.status);
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
                        Logger.data.OpenAI({ response: validateStatus, threadId: threadId, runId: runId, userId: userId }, "Thread-Status-Expired-Kolabrya-Ins-Assistant-Open-AI")
                        slack.webhook(JSON.stringify({ action: "Thread-Status-Expired-Kolabrya-Ins-Assistant-Open-AI", response: validateStatus, threadId: threadId, runId: runId, userId: userId }));
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
                    console.log("validate run error kolabrya ins assistant", validateStatus?.error);
                    obj = {
                        status: 2,
                        retry: true,
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
        console.log("Error in kolabrya ins assistant", error);
        return {
            message: Strings.ERROR.ERROR_RE_TRY,
            statusCode: 400,
            obj: {
                error: error.message,
            }
        }
    }
}

module.exports = ChatGptServices;