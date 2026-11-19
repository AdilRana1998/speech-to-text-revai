const EnhanceDocumentServices = {};
const {
    DocumentEnhanceQueries,
} = require('../queries');
const { Strings, Logger } = require('../../utils')
const { makeDirectory } = require('../../utils/fs.utility');
const fsPromise = require('fs').promises;
const fs = require('fs');
const currentDate = new Date();
const moment = require('moment');
const { slack } = require('../../utils/Webhook');
const {
    sendDocumentEnhance
} = require('../external/ChatGPT')
const writeFile = process.env.DOCUMENT_ENHANCE_READ_WRITE;
const allowedFile = process.env.DOCUMENT_ENHANCE_FILE_LIMIT;
const { v4: uuidv4 } = require('uuid');

EnhanceDocumentServices.addCase = async (prompt, caseFiles, userId) => {
    try {
        if (prompt && (caseFiles?.length > 0 && caseFiles?.length == allowedFile)) {
            const files = []
            const generatedUuid = uuidv4();
            const path = writeFile + `${generatedUuid}`
            await makeDirectory(path)
            const makeFile = await EnhanceDocumentServices.writeMultipleFile(caseFiles, path)
            if (makeFile.every(file => file.statusCode != '200')) {
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        error: makeFile.obj
                    }
                };
            }
            makeFile.forEach(async (file, index) => {
                const fileData = {
                    requestUuid: generatedUuid,
                    fileName: file.obj.fileName,
                    filePath: file.obj.filePath,
                    prompt: prompt,
                    userId: userId
                }
                files.push(fileData)
            });

            if (files.length > 0) {
                const result = await DocumentEnhanceQueries.addCase(files[0]);
                if (result) {
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
                        obj: {
                            error: result
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
        else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in creating a enhance document:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

EnhanceDocumentServices.writeMultipleFile = async (caseAttachments, path) => {
    try {
        const writePromises = caseAttachments.map(async (file) => {
            const fileNameAndPath = path + "/" + file.originalname;
            const fileName = file.originalname;
            const fileContent = file.buffer;
            return await EnhanceDocumentServices.writeContent(fileNameAndPath, fileContent, fileName)
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

EnhanceDocumentServices.writeContent = async (fileNameAndPath, fileContent, fileName) => {
    try {
        await fsPromise.writeFile(fileNameAndPath, fileContent);
        return {
            message: Strings.FILE.FILE_WRITTEN_SUCCESS,
            statusCode: 200,
            obj: {
                fileName: fileName,
                filePath: fileNameAndPath
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

EnhanceDocumentServices.fetchCase = async (userId) => {
    try {
        const data = await DocumentEnhanceQueries.getFileStatus(userId);
        if (data.length > 0) {
            for (const element of data) {
                if (element.isProcessed == null || element.isProcessed == 0) {
                    element.isProcessed = 0
                }
                else if (element.isProcessed == 1) {
                    element.isProcessed = 1
                    const dirPath = `${writeFile}${element.requestUuid}/`;
                    const allFiles = fs.readdirSync(dirPath);
                    const filesForJob = allFiles
                        .filter(file =>
                            file.includes(element.jobUuid) && file.endsWith('.docx')
                        )
                        .map(file => {
                            const filePath = `${dirPath}${file}`;
                            const stats = fs.statSync(filePath);
                            return {
                                jobUuid: element.jobUuid,
                                filename: file,
                                createdAt: moment(stats.birthtime).format('DD-MM-YYYY HH:mm')
                            };
                        });
                    if (filesForJob.length > 0) {
                        element.downloadFile = filesForJob[0].filename
                    }
                }
                else {
                    element.isProcessed = 2
                }
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
            };
        }
    } catch (error) {
        console.log("Error in fetching a inc case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

EnhanceDocumentServices.fetchOnlyCase = async (requestUuid, userId) => {
    try {
        const data = await DocumentEnhanceQueries.getFileStatusByCaseUuid(requestUuid, userId);
        if (data.length > 0) {
            for (const element of data) {
                if (element.isProcessed == null || element.isProcessed == 0) {
                    element.isProcessed = 0
                }
                else if (element.isProcessed == 1) {
                    element.isProcessed = 1
                }
                else {
                    element.isProcessed = 2
                }
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
            };
        }
    } catch (error) {
        console.log("Error in fetching a only one enhance doc by requestUuid:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};


EnhanceDocumentServices.startDocEnhancement = async () => {
    try {
        const data = await DocumentEnhanceQueries.getPendingData();
        if (data.length > 0) {
            console.log("************************************");
            console.log("Job Started For Document Enhancement");
            console.log("************************************");
            const results = [];
            for (const element of data) {
                if (await DocumentEnhanceQueries.getPendingReportsByUserId(element.userId, element.requestUuid)) {
                    const tuple = { "UserId": element.userId, "requestUuid": element.requestUuid, "jobStatus": "Queue Details For Document Enhancement" }
                    console.log("Queue Details For Document Enhancement", tuple);
                    results.push(tuple)
                } else {
                    const result = await EnhanceDocumentServices.sendReport(element)
                    results.push(result);
                }
            }
            console.log("**********************************************");
            console.log("Job Completed For Pending Document Enhancement");
            console.log("**********************************************");
            Logger.data.DocEnhance({ request: results, methodName: "documentEnhance" }, "Sending-Document-Enhance-Data-To-Python");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    data: results,
                }
            };
        } else {
            console.log("************************************************");
            console.log("No Record Found For Pending Document Enhancement");
            console.log("************************************************");
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

EnhanceDocumentServices.sendReport = async (record) => {
    try {
        if (record) {
            const dataObject = {
                caseUuid: record.requestUuid,
                caseName: record.prompt.substring(0, 10),
                userPrompt: record.prompt,
                caseDetails: [
                    {
                        fileUuid: record.requestUuid,
                        fileName: record.fileName,
                        status: true
                    }
                ]
            }
            console.log("dataObject", dataObject);
            const postData = await sendDocumentEnhance(dataObject)
            Logger.data.DocEnhance({ request: dataObject, response: postData, requestUuid: record.requestUuid, userId: record.userId }, "Request-Response-Doc-Enhance");
            console.log("******************* Request - 1 - Send Data For Doc Enhance *******************");
            console.log(postData)
            console.log("******************* Request - 1 - Send Data For Doc Enhance *******************");
            if (postData.statusCode == '200' && postData.obj.status == true && postData.obj.caseUuid && postData.obj.jobUuid) {
                const list = {
                    isProcessed: 0,
                    jobUuid: postData.obj.jobUuid,
                    jsonResponse: JSON.stringify(postData)
                }
                await DocumentEnhanceQueries.updateCase(list, record.requestUuid, record.userId);
                console.log("**********************************************");
                console.log("Request Successfully Completed For Doc Enhance");
                console.log("**********************************************");
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: postData.obj
                };
            } else {
                const list = {
                    isProcessed: 2,
                    jsonResponse: JSON.stringify(postData)
                }
                await DocumentEnhanceQueries.updateCase(list, record.requestUuid, record.userId)
                Logger.data.DocEnhance({ request: dataObject, response: postData, requestUuid: record.requestUuid, userId: record.userId }, "Error-In-Sending-Request-Response-Doc-Enhance");
                slack.webhook(JSON.stringify({ action: "Error In Sending Request Response Doc Enhance", request: dataObject, response: postData, requestUuid: record.requestUuid, userId: record.userId }));
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        error: postData
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
    catch (error) {
        console.log("Error in sending data to python for documnet enhance:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

EnhanceDocumentServices.updateReport = async (requestUuid, jobUuid, status, caseDetails, allData) => {
    try {
        Logger.data.DocEnhance({ response: allData }, "Response-Webhook-Doc-Enhance");
        const data = await DocumentEnhanceQueries.getCaseDetails(requestUuid, jobUuid)
        if (data.length > 0 && Object?.keys(caseDetails)?.length > 0) {
            console.log("****************************************");
            console.log("Got the hit for updating doc enhancement");
            console.log("****************************************");
            if (status === true && requestUuid && jobUuid && caseDetails[0]?.status === true) {
                await DocumentEnhanceQueries.updateCaseByJobUuid({ isProcessed: 1 }, requestUuid, jobUuid);
                console.log("****************************************");
                console.log("Updated Successfully For Doc Enhancement");
                console.log("****************************************");
            } else {
                console.log("*************************");
                console.log("Error For Doc Enhancement");
                console.log("*************************");               
                await DocumentEnhanceQueries.updateCaseByJobUuid({ isProcessed: 2 }, requestUuid, jobUuid);
                slack.webhook(JSON.stringify({ action: "Error For Doc Enhancement", requestUuid: requestUuid, jobUuid: jobUuid }));
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: data
            };
        }
        else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in updating doc enhance", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

EnhanceDocumentServices.removeCase = async (requestUuid, userId) => {
    try {
        const obj = {
            status: false,
            isActivated: false,
            updatedAt: currentDate
        }
        const getCasesId = await DocumentEnhanceQueries.getFileStatusByCaseUuid(requestUuid, userId)
        if (getCasesId?.length > 0 && (getCasesId[0]?.isProcessed == 1 || getCasesId[0]?.isProcessed == 2)) {
            const deleteCase = await DocumentEnhanceQueries.deActivateCase(obj, requestUuid, userId);
            if (deleteCase[0] == 1) {
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
        }
        else if (getCasesId?.length > 0 && (getCasesId[0]?.isProcessed == 0 || getCasesId[0]?.isProcessed == null)) {
            return {
                message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                statusCode: 400,
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
        console.log("Error in deleting a enhance doc:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = EnhanceDocumentServices;