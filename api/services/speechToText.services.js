const SpeechToText = {};
const { Strings, Logger } = require('../../utils')
const { slack } = require('../../utils/Webhook');
const {
    convertAudioToText
} = require('../../api/external/ChatGPT')
const { v4: uuidv4 } = require('uuid');
const {
    triggerFile
} = require('./chatGpt.services');
const {
    writeMultipleFile
} = require('./writeReport.services');
const {
    SpeechToTextQueries
} = require('../queries');
const { makeDirectory } = require('../../utils/fs.utility');
const writeFile = process.env.REV_FILE_PATH;
const revGlobalPath = process.env.REV_DIRECTORY_PATH;
const urlBe = process.env.URL_BACKEND;
const { submitFileRev, getSubmittedFileRev, fetchTranscriptRev } = require('../external/ChatGPT')
const moment = require('moment');
const path = require('path');

SpeechToText.convertVoice = async (attachment, analysis, userId) => {
    try {
        if (attachment && analysis) {
            // console.log("attachment", attachment);
            const data = await convertAudioToText(attachment)
            // console.log("data[0]?.text", data[0]?.text);
            if (data[0]?.text) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        text: data[0]?.text
                    }
                }
            } else {
                return {
                    message: Strings.SUCCESS_CODE_MESSAGE,
                    statusCode: 400,
                    obj: data[0].error
                }
            }
        } else {
            return {
                message: Strings.SUCCESS_CODE_MESSAGE,
                statusCode: 400,
                obj: {
                    message: Strings.UNVALID_STATUS
                }
            }
        }
    } catch (error) {
        console.log("error in converting speech to text", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.uploadFile = async (attachment, transcriptName, userId) => {
    try {
        if (attachment.length > 0 && transcriptName) {
            const entries = [];
            const generatedUuid = uuidv4();
            const path = writeFile + `${generatedUuid}`
            await makeDirectory(path)
            const makeFile = await writeMultipleFile(attachment, path)
            if (makeFile.every(file => file.statusCode != '200')) {
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        error: makeFile.obj
                    }
                };
            }
            for (const file of makeFile) {
                const record = {
                    transcriptName: transcriptName,
                    fileName: file.obj.fileName,
                    filePath: file.obj.filePath,
                    requestUuid: generatedUuid,
                    userId: userId
                }
                const list = await SpeechToTextQueries.createFile(record)
                if (list) {
                    entries.push(list.id)
                } else {
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            list
                        }
                    };
                }
            }
            if (entries.length === attachment.length) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                        requestUuid: generatedUuid
                    }
                };
            } else {
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
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
        console.log("Error in upload File:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.sendFile = async () => {
    try {
        const data = await SpeechToTextQueries.getPendingData();
        if (data.length > 0) {
            console.log("****************************************");
            console.log("Job Started For Pending Files For Rev AI");
            console.log("****************************************");
            const url = urlBe.replace(/\/api\/?$/, "")
            const directory = url + revGlobalPath
            for (const element of data) {
                const completePath = directory + '/' + element.requestUuid + '/' + element.fileName
                // console.log("url", completePath);
                const list = {
                    source_config: {
                        url: completePath
                    },
                    metadata: 'submitted from kolabrya',
                    language: 'en'
                }
                const record = await submitFileRev(list)
                // console.log("record", record);
                Logger.data.RevAI({ request: list, response: record, requestUuid: element.requestUuid, userId: element.userId, methodName: "sendFile" }, "Submit-A-File-For-Transcription-RevAI");
                if (record.id && record.status === 'in_progress') {
                    const obj = {
                        transcriptId: record.id,
                        status: 0,
                        isSent: 1,
                        jsonResponse: JSON.stringify(record)
                    }
                    await SpeechToTextQueries.update(obj, element.requestUuid, element.userId);
                } else {
                    slack.webhook(JSON.stringify({ action: "Failed To Upload File On Rev AI", request: list, response: record, requestUuid: element.requestUuid, userId: element.userId }));
                    const obj = {
                        transcriptId: record.id,
                        status: 2,
                        isSent: 1,
                        jsonResponse: JSON.stringify(record)
                    }
                    await SpeechToTextQueries.update(obj, element.requestUuid, element.userId);
                }
            }
            console.log("**************************************");
            console.log("Job Ended For Pending Files For Rev AI");
            console.log("**************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            }
        } else {
            console.log("********************************************");
            console.log("No Record Found For Pending Files For Rev AI");
            console.log("********************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in upload File:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.getFile = async () => {
    try {
        const data = await SpeechToTextQueries.getPendingUploadedFiles();
        if (data.length > 0) {
            console.log("*****************************************");
            console.log("Job Started For Uploaded Files For Rev AI");
            console.log("*****************************************");
            for (const element of data) {               
                const record = await getSubmittedFileRev(element.transcriptId)
                // console.log("record 1", record);
                Logger.data.RevAI({ request: element.transcriptId, response: record, requestUuid: element.requestUuid, userId: element.userId, methodName: "getFile" }, "Get-Submitted-File-For-Transcription-RevAI");
                if (record.id && record.status === 'transcribed') {
                    const obj = {
                        status: 0,
                        fileStatus: 1,
                        jsonResponse: JSON.stringify(record)
                    }
                    await SpeechToTextQueries.update(obj, element.requestUuid, element.userId);
                } 
                else if (record.id && record.status === 'in_progress') {
                    const obj = {
                        status: 0,
                        fileStatus: 1,
                        jsonResponse: JSON.stringify(record)
                    }
                    // await SpeechToTextQueries.update(obj, element.requestUuid, element.userId);
                }
                else {
                    slack.webhook(JSON.stringify({ action: "Failed To Proccess File On Rev AI", request: element.transcriptId, response: record, requestUuid: element.requestUuid, userId: element.userId }));
                    const obj = {
                        status: 2,
                        fileStatus: 2,
                        jsonResponse: JSON.stringify(record)
                    }
                    await SpeechToTextQueries.update(obj, element.requestUuid, element.userId);
                }
            }
            console.log("***************************************");
            console.log("Job Ended For Uploaded Files For Rev AI");
            console.log("***************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            }
        } else {
            console.log("*********************************************");
            console.log("No Record Found For Uploaded Files For Rev AI");
            console.log("*********************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get File:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.getTranscript = async () => {
    try {
        const data = await SpeechToTextQueries.getTranscript();
        if (data.length > 0) {
            console.log("*****************************************");
            console.log("Job Started To Get Transcript Form Rev AI");
            console.log("*****************************************");
            for (const element of data) {               
                const record = await fetchTranscriptRev(element.transcriptId)
                Logger.data.RevAI({ request: element.transcriptId, response: record, requestUuid: element.requestUuid, userId: element.userId, methodName: "getTranscript" }, "Get-Transcript-RevAI");                
                if (record) {
                    const formattedText = record.replace(/(Speaker\s\d+)\s+([\d:]+)\s+/g, '<br><br><strong>$1</strong> | $2<br> ');
                    const obj = {
                        status: 1,
                        transcriptStatus: 1,
                        transcript: formattedText,
                        // jsonResponse: JSON.stringify(record)
                    }
                    await SpeechToTextQueries.update(obj, element.requestUuid, element.userId);
                }
                else {
                    slack.webhook(JSON.stringify({ action: "Failed To Get Transcript from Rev AI", request: element.transcriptId, response: record, requestUuid: element.requestUuid, userId: element.userId }));
                    const obj = {
                        status: 2,
                        transcriptStatus: 2,
                        jsonResponse: JSON.stringify(record)
                    }
                    await SpeechToTextQueries.update(obj, element.requestUuid, element.userId);
                }
            }
            console.log("***************************************");
            console.log("Job Ended To Get Transcript Form Rev AI");
            console.log("***************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            }
        } else {
            console.log("******************************************");
            console.log("No Record Found For Transcript From Rev AI");
            console.log("******************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get Transcript:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.getAll = async (userId) => {
    try {
        const data = await SpeechToTextQueries.getAll(userId);
        if (data.length > 0) {
            const processedResults = data.map(item => {
                item.createdAt = moment(item.createdAt).format('MM/DD/YYYY')
                return {
                    ...item,
                };
            });
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: processedResults
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get all transcript:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.getAllByRequestUuid = async (requestUuid, userId) => {
    try {
        if (requestUuid && userId) {
            const data = await SpeechToTextQueries.getAllByrequestUuid(requestUuid, userId);
            if (data.length > 0) {
                const url = urlBe.replace(/\/api\/?$/, "")
                const directory = url + revGlobalPath
                const completePath = directory + '/' + requestUuid + '/' + data[0].fileName
                const processedResults = data.map(item => {
                    item.createdAt = moment(item.createdAt).format('MM/DD/YYYY')
                    item.url = completePath
                    return {
                        ...item,
                    };
                });
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: processedResults
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
            };
        }
    } catch (error) {
        console.log("Error in get transcript by request UUid:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.deleteByRequestUuid = async (requestUuid, userId) => {
    try {
        if (requestUuid && userId) {
            const data = await SpeechToTextQueries.getAllByrequestUuid(requestUuid, userId);
            if (data.length > 0) {
                const obj = {
                    isActivated: false
                }
                const record = await SpeechToTextQueries.update(obj, requestUuid, userId);
                if (record[0] == '1') {
                    return {
                        message: Strings.RECORD_DELETED_SUCCESS,
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in delete By RequestUuid", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.editByRequestUuid = async (transcript, requestUuid, userId) => {
    try {
        if (transcript && requestUuid && userId) {
            const data = await SpeechToTextQueries.getAllByrequestUuid(requestUuid, userId);
            if (data.length > 0) {
                const obj = {
                    transcript: transcript
                }
                const record = await SpeechToTextQueries.update(obj, requestUuid, userId);
                if (record[0] == '1') {
                    return {
                        message: Strings.RECORD_UPDATE_SUCCESS,
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in delete By RequestUuid", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SpeechToText.downloadTranscript = async (requestUuid, userId) => {
    try {
        if (requestUuid && userId) {
            const data = await SpeechToTextQueries.getAllByrequestUuid(requestUuid, userId);
            if (data.length > 0) {
                let fileName = `${data[0].transcriptName}.docx`;
                const filePath = path.join(writeFile + requestUuid, fileName);
                return await triggerFile(filePath, data[0].transcript, fileName, requestUuid, true)
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
            };
        }
    } catch (error) {
        console.log("Error in download transcript by request UUid:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = SpeechToText