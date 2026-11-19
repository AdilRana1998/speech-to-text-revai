const IncCaseServices = {};
const {
    IncCaseNamesQueries,
    IncCaseFilesQueries,
    UserQueries
} = require('../queries');
const { Strings, Logger, Emails } = require('../../utils')
const currentDate = new Date();
const moment = require('moment');
const { slack } = require('../../utils/Webhook');
const {
    sendIncCaseReport,
    sendIncCaseReportCombine,
    getIncReportStatus,
    SendIncReportAfterEdit,
    IncReportDownload,
    GetIncReportFlatData
} = require('../../api/external/ChatGPT')
const {
    isValidJSON,
} = require('./rooms.services')
const {
    getIncSummaryStatus,
    createIncSummaryThread,
    addMessageMediationReport,
    generateSummaryReport,
    generateSummaryReportStatus,
    getIncSettlementStatus,
    createIncSettlementThread,
    addMessageMediationSettlement,
    getInjuryTrackingStatus,
    createInjuryTrackingJob,
    generateMedicalInjuryStatus,
    generateMedicalInjuryReport
} = require('../../api/external/ChatGPT')
const Encryptions = require('../../utils/Encryptions');
let allowedFile = process.env.INS_CASE_FILE_LIMIT;
const { blobServiceClient,
    containerClient,
    azureInsuranceHealth,
    generateBlobSASQueryParameters,
    CONTAINER_NAME,
    BlobSASPermissions,
    credentials
} = require("../../utils/InsuranceAzureBlob");

const AZURE_ENABLE = process.env.INSURANCE_AZURE_ENABLE;
const FILE_SIZE_LIMITS = {
    caseFiles: Number(process.env.INS_CASE_FILE_SIZE) * 1024 * 1024
};
const ALLOWED_FILE_TYPES = {
    caseFiles: [
        'application/pdf'
    ]
};
const CDN = process.env.AZURE_CDN_ENABLED

IncCaseServices.addCase = async (caseName, plaintiffFirstName, plaintiffLastName, plaintiffDOB, insuredDefendant, dateOfLoss, liabilityDispute, incomeLoss, housekeepingRequired, futureCareNeeded, outOfPocketExpenses, previousAccident, previousAccidentDate, subsequentAccident, subsequentAccidentDate, applicantiffFirstName, applicantiffLastName, applicantiffDOB, insuredDefendantAB, dateOfLossAB, applicantiffInMIG, disputingCAT, summaryOfOCF18, summaryOfOCF6, attendantCareDispute, specifiedBenefitsDispute, primaryAttorneyEmail, additionalEmails, caseType, caseTypeTitle, userId) => {
    try {
        const find = await IncCaseServices.checkDuplicate(caseName, caseType, userId)
        const findCaseType = await IncCaseNamesQueries.getIncCaseTypesByUuid(caseType)
        if (caseName && primaryAttorneyEmail && findCaseType.length > 0) {
            if (find) {
                const data = {
                    incCaseTypeId: findCaseType[0]?.id,
                    caseName: caseName,
                    caseTypeTitle: caseTypeTitle,
                    primaryAttorneyEmail: JSON.stringify(primaryAttorneyEmail),
                    additionalEmails: JSON.stringify(additionalEmails),
                    userId: userId
                };
                const result = await IncCaseNamesQueries.addCase(data);
                if (findCaseType[0]?.id == '1' && result) {
                    const tort = {
                        incCaseTypeId: findCaseType[0]?.id,
                        incCaseId: result[1],
                        userId: userId,
                        plaintiffFirstName: plaintiffFirstName,
                        plaintiffLastName: plaintiffLastName,
                        plaintiffDOB: plaintiffDOB,
                        insuredDefendant: insuredDefendant,
                        dateOfLoss: dateOfLoss,
                        liabilityDispute: liabilityDispute,
                        incomeLoss: incomeLoss,
                        housekeepingRequired: housekeepingRequired,
                        futureCareNeeded: futureCareNeeded,
                        outOfPocketExpenses: outOfPocketExpenses,
                        previousAccident: previousAccident,
                        previousAccidentDate: previousAccidentDate,
                        subsequentAccident: subsequentAccident,
                        subsequentAccidentDate: subsequentAccidentDate,
                    }
                    await IncCaseNamesQueries.addTort(tort);
                } else if (findCaseType[0]?.id == '2' && result) {
                    const addAbMatter = {
                        incCaseTypeId: findCaseType[0]?.id,
                        incCaseId: result[1],
                        userId: userId,
                        applicantiffFirstName: applicantiffFirstName,
                        applicantiffLastName: applicantiffLastName,
                        applicantiffDOB: applicantiffDOB,
                        insuredDefendantAB: insuredDefendantAB,
                        dateOfLossAB: dateOfLossAB,
                        applicantiffInMIG: applicantiffInMIG,
                        disputingCAT: disputingCAT,
                        summaryOfOCF18: summaryOfOCF18,
                        summaryOfOCF6: summaryOfOCF6,
                        attendantCareDispute: attendantCareDispute,
                        specifiedBenefitsDispute: specifiedBenefitsDispute,
                    }
                    await IncCaseNamesQueries.addAbMatter(addAbMatter);
                }
                else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    };
                }
                if (result.length > 0) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                            requestUuid: result[0]
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
                    message: Strings.ERROR.RECORD_ALREADY_EXSIST,
                    statusCode: 400,
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
        console.log("Error in creating a inc case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.addFile = async (caseFiles, requestUuid, reviewers, caseFileTypes, userId, isGroup, groupUsers) => {
    try {
        if ((caseFiles?.length > 0 && caseFiles?.length <= allowedFile) && caseFileTypes && requestUuid && userId) {
            let record;
            if (isGroup && groupUsers && groupUsers.length > 0) {
                record = await IncCaseNamesQueries.findCaseByUserId(requestUuid, groupUsers)
            }
            else {
                record = await IncCaseNamesQueries.findCaseByUserId(requestUuid, userId)
            }
            if (record.length > 0) {
                let result;
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    result = await IncCaseFilesQueries.countFiles(record[0].id, groupUsers);
                }
                else {
                    result = await IncCaseFilesQueries.countFiles(record[0].id, userId);
                }
                let fileCount = allowedFile - result;
                if (result < allowedFile) {
                    if (caseFiles?.length <= fileCount) {
                        caseFiles.forEach(async (file, index) => {
                            const fileData = {
                                pageCount: file?.pageCount || 0,
                                fileSize: file?.fileSize || 0,
                                incCaseId: record[0].id,
                                userId: userId,
                                fileName: file.fileName,
                                filePath: file.blobPath,
                                folderPath: file.folderPath,
                                status: true
                            }
                            if (reviewers) {
                                const reviewer = JSON.parse(reviewers)
                                fileData.reviewers = reviewer[index]
                                fileData.isCombined = true
                            } else {
                                // console.log("no reviewers");
                            }

                            if (caseFileTypes) {
                                // fileData.caseFileTypes = caseFileTypes[index]
                            } else {
                                // console.log("no case File Types");
                            }
                            await IncCaseFilesQueries.createFile(fileData)
                        });
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
        console.log("Error in adding file in inc case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.writeMultipleFile = async (caseAttachments, path) => {
    try {
        const writePromises = caseAttachments.map(async (file) => {
            const fileNameAndPath = path + "/" + file.originalname;
            const fileName = file.originalname;
            const fileContent = file.buffer;
            return await IncCaseServices.writeContent(fileNameAndPath, fileContent, fileName)
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

IncCaseServices.writeContent = async (fileNameAndPath, fileContent, fileName) => {
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

IncCaseServices.fetchCase = async (isGroup, groupUsers, userId) => {
    try {
        let data
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.getFileStatus(groupUsers);
        } else {
            data = await IncCaseNamesQueries.getFileStatus(userId);
        }
        if (data.length > 0) {
            let dataObject = {}
            const transformedData = await data.reduce(async (accPromise, current) => {
                const acc = await accPromise;
                const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                const fileDetail = {
                    fileUuid: current.fileUuid,
                    isProcessed: current.isProcessed,
                    fileName: current.fileName,
                    caseFileTypes: current.caseFileTypes
                };
                const combinedFileDetail = {
                    fileUuid: current.fileUuid,
                    isProcessed: current.isProcessed,
                    fileName: current.fileName,
                    reviewers: current.reviewers,
                    caseFileTypes: current.caseFileTypes
                };
                const count = await IncCaseNamesQueries.shareCaseCount(current.id, userId)                
                if (current.caseTypeId === 1) { //tort
                    dataObject = {
                        isShare: !current.sharedRequestUuid && current?.userId === userId,
                        isDelete: current?.userId === userId,
                        addFile: !current.sharedRequestUuid,
                        shareCount: count,
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        plaintiffFirstName: current.plaintiffFirstName,
                        plaintiffLastName: current.plaintiffLastName,
                        plaintiffDOB: current.plaintiffDOB != null ? moment(current.plaintiffDOB).format("MM/DD/YYYY") : null,
                        dateOfLoss: current.dateOfLossTort != null ? moment(current.dateOfLossTort).format("MM/DD/YYYY") : null,
                        insuredDefendant: current.insuredDefendant,
                        liabilityDispute: current.liabilityDispute,
                        incomeLoss: current.incomeLoss,
                        housekeepingRequired: current.housekeepingRequired,
                        futureCareNeeded: current.futureCareNeeded,
                        outOfPocketExpenses: current.outOfPocketExpenses,
                        previousAccident: current.previousAccident,
                        previousAccidentDate: current.previousAccidentDate != null ? moment(current.previousAccidentDate).format("MM/DD/YYYY") : null,
                        subsequentAccident: current.subsequentAccident,
                        subsequentAccidentDate: current.subsequentAccidentDate != null ? moment(current.subsequentAccidentDate).format("MM/DD/YYYY") : null,
                        caseType: current.caseTypeTitle == null ? current.caseType : current.caseTypeTitle,
                        caseKey: current.caseKey,
                        caseTypeUuid: current.caseTypeUuid,
                        primaryAttorneyEmail: current.primaryAttorneyEmail,
                        additionalEmails: current.additionalEmails,
                        caseFiles: [],
                        combineFiles: []
                    };
                }
                else if (current.caseTypeId === 2) { //ab matter
                    dataObject = {
                        isShare: !current.sharedRequestUuid && current?.userId === userId,
                        shareCount: count,
                        isDelete: current?.userId === userId,
                        addFile: !current.sharedRequestUuid,
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        applicantiffFirstName: current.applicantiffFirstName,
                        applicantiffFirstName: current.applicantiffFirstName,
                        applicantiffLastName: current.applicantiffLastName,
                        applicantiffDOB: current.applicantiffDOB != null ? moment(current.applicantiffDOB).format("MM/DD/YYYY") : null,
                        insuredDefendantAB: current.insuredDefendantAB,
                        dateOfLossAB: current.dateOfLossAB != null ? moment(current.dateOfLossAB).format("MM/DD/YYYY") : null,
                        applicantiffInMIG: current.applicantiffInMIG,
                        disputingCAT: current.disputingCAT,
                        summaryOfOCF18: current.summaryOfOCF18,
                        summaryOfOCF6: current.summaryOfOCF6,
                        attendantCareDispute: current.attendantCareDispute,
                        specifiedBenefitsDispute: current.specifiedBenefitsDispute,
                        caseType: current.caseTypeTitle == null ? current.caseType : current.caseTypeTitle,
                        caseKey: current.caseKey,
                        caseTypeUuid: current.caseTypeUuid,
                        primaryAttorneyEmail: current.primaryAttorneyEmail,
                        additionalEmails: current.additionalEmails,
                        caseFiles: [],
                        combineFiles: []
                    };
                }
                if (caseIndex === -1) {
                    if (current.fileUuid != null) {
                        if (current.isCombined == 1) {
                            dataObject.combineFiles.push(combinedFileDetail);
                        } else {
                            dataObject.caseFiles.push(fileDetail);
                        }
                    }
                    acc.push(dataObject);
                } else {
                    if (current.fileUuid != null) {
                        if (current.isCombined == 1) {
                            acc[caseIndex].combineFiles.push(combinedFileDetail);
                        } else {
                            acc[caseIndex].caseFiles.push(fileDetail);
                        }
                    }
                }
                return acc;
            }, Promise.resolve([]));
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: transformedData
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

IncCaseServices.fetchOnlyCase = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        let data;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.getFileStatusByCaseUuid(caseUuid, groupUsers);
        } else {
            data = await IncCaseNamesQueries.getFileStatusByCaseUuid(caseUuid, userId);
        }
        if (data.length > 0) {
            let dataObject = {}
            const transformedData = await data.reduce(async (accPromise, current) => {
                const acc = await accPromise;
                const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(current.filePath)
                const fileDetail = {
                    fileUrl: getFileUrl?.statusCode == '200' && getFileUrl?.obj?.videoUrl ? getFileUrl?.obj?.videoUrl : '',
                    fileUuid: current.fileUuid,
                    filePath: current.filePath,
                    folderPath: current.folderPath != null ? current.folderPath : current.filePath,
                    fileSize: current.fileSize,
                    pageCount: current.pageCount,
                    createdAt: current.createdAt != null ? moment(current.createdAt).format("MM/DD/YYYY") : null,
                    fileName: current.fileName,
                    isProcessed: current.fileIsProcessed,
                    caseFileTypes: current.caseFileTypes
                };
                const combinedFileDetail = {
                    folderPath: current.folderPath != null ? current.folderPath : current.filePath,
                    filePath: current.filePath,
                    fileSize: current.fileSize,
                    pageCount: current.pageCount,
                    createdAt: current.createdAt != null ? moment(current.createdAt).format("MM/DD/YYYY") : null,
                    fileUuid: current.fileUuid,
                    fileName: current.fileName,
                    isProcessed: current.fileIsProcessed,
                    reviewers: current.reviewers,
                    caseFileTypes: current.caseFileTypes
                };
                if (current.caseTypeId === 1) { //tort
                    dataObject = {
                        isShare: !current.groupId && !current.sharedRequestUuid,
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        plaintiffFirstName: current.plaintiffFirstName,
                        plaintiffLastName: current.plaintiffLastName,
                        plaintiffDOB: current.plaintiffDOB != null ? moment(current.plaintiffDOB).format("MM/DD/YYYY") : null,
                        dateOfLoss: current.dateOfLossTort != null ? moment(current.dateOfLossTort).format("MM/DD/YYYY") : null,
                        insuredDefendant: current.insuredDefendant,
                        liabilityDispute: current.liabilityDispute,
                        incomeLoss: current.incomeLoss,
                        housekeepingRequired: current.housekeepingRequired,
                        futureCareNeeded: current.futureCareNeeded,
                        outOfPocketExpenses: current.outOfPocketExpenses,
                        previousAccident: current.previousAccident,
                        previousAccidentDate: current.previousAccidentDate != null ? moment(current.previousAccidentDate).format("MM/DD/YYYY") : null,
                        subsequentAccident: current.subsequentAccident,
                        subsequentAccidentDate: current.subsequentAccidentDate != null ? moment(current.subsequentAccidentDate).format("MM/DD/YYYY") : null,
                        caseType: current.caseType,
                        caseKey: current.caseKey,
                        caseTypeUuid: current.caseTypeUuid,
                        primaryAttorneyEmail: current.primaryAttorneyEmail,
                        additionalEmails: current.additionalEmails,
                        reportStatus: current.isProcessed,//only freeze the tab if the reportStatus is 0 and keep hitting the api on every 15 second for rest render the componenet
                        caseFiles: [],
                        combineFiles: []
                    };
                }
                else if (current.caseTypeId === 2) { //ab matter
                    dataObject = {
                        isShare: !current.groupId && !current.sharedRequestUuid,
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        applicantiffFirstName: current.applicantiffFirstName,
                        applicantiffFirstName: current.applicantiffFirstName,
                        applicantiffLastName: current.applicantiffLastName,
                        applicantiffDOB: current.applicantiffDOB != null ? moment(current.applicantiffDOB).format("MM/DD/YYYY") : null,
                        insuredDefendantAB: current.insuredDefendantAB,
                        dateOfLossAB: current.dateOfLossAB != null ? moment(current.dateOfLossAB).format("MM/DD/YYYY") : null,
                        applicantiffInMIG: current.applicantiffInMIG,
                        disputingCAT: current.disputingCAT,
                        summaryOfOCF18: current.summaryOfOCF18,
                        summaryOfOCF6: current.summaryOfOCF6,
                        attendantCareDispute: current.attendantCareDispute,
                        specifiedBenefitsDispute: current.specifiedBenefitsDispute,
                        caseType: current.caseType,
                        caseKey: current.caseKey,
                        caseTypeUuid: current.caseTypeUuid,
                        primaryAttorneyEmail: current.primaryAttorneyEmail,
                        additionalEmails: current.additionalEmails,
                        reportStatus: current.isProcessed,//only freeze the tab if the reportStatus is 0 and keep hitting the api on every 15 second for rest render the componenet
                        caseFiles: [],
                        combineFiles: []
                    };
                }
                if (caseIndex === -1) {
                    if (current.fileUuid != null) {
                        if (current.isCombined == 1) {
                            dataObject.combineFiles.push(combinedFileDetail);
                        } else {
                            dataObject.caseFiles.push(fileDetail);
                        }
                    }
                    acc.push(dataObject);
                } else {
                    if (current.fileUuid != null) {
                        if (current.isCombined == 1) {
                            acc[caseIndex].combineFiles.push(combinedFileDetail);
                        } else {
                            acc[caseIndex].caseFiles.push(fileDetail);
                        }
                    }
                }
                return acc;
            }, Promise.resolve([]));
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: transformedData
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in fetching a only one inc case details by caseUuid:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

IncCaseServices.getOnlyCaseFileAnalysis = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        let data
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.getFileStatusByCaseUuidReport(caseUuid, groupUsers);
        } else {
            data = await IncCaseNamesQueries.getFileStatusByCaseUuidReport(caseUuid, userId);
        }
        if (data.length > 0) {
            const hasReportStatusOne = data.some(item => item.reportStatus === 1);
            if (data[0].isProcessed == 0 && hasReportStatusOne) {
                let fileFinder
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    fileFinder = await IncCaseServices.fileFinderAnalysis(caseUuid, data, userId);
                } else {
                    fileFinder = await IncCaseServices.fileFinderAnalysis(caseUuid, data, userId);
                }
                if (fileFinder.obj.length > 0) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                            status: 0,
                            filename: fileFinder.obj
                        }
                    }
                } else {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                            status: 0
                        }
                    }
                }
            }
            else if (data[0].isProcessed == 0 && data[0].reportStatus == 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                        status: 0
                    }
                }
            } else if (data[0].isProcessed == 1 && data[0].reportStatus == 1) {
                let fileFinder
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    fileFinder = await IncCaseServices.fileFinderAnalysis(caseUuid, data, userId);
                } else {
                    fileFinder = await IncCaseServices.fileFinderAnalysis(caseUuid, data, userId);
                } if (fileFinder.obj.length > 0) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            status: 1,
                            filename: fileFinder.obj
                        }
                    };
                }
                else {
                    return fileFinder
                }
            }
            else if (data[0].isProcessed == 2 || data[0].reportStatus == 2) {
                let fileFinder
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    fileFinder = await IncCaseServices.fileFinderAnalysis(caseUuid, data, userId);
                } else {
                    fileFinder = await IncCaseServices.fileFinderAnalysis(caseUuid, data, userId);
                }
                if (fileFinder.obj.length > 0) {
                    return {
                        message: Strings.INSURANCE_CASE.REPORT_FAILED,
                        statusCode: 200,
                        obj: {
                            status: 2,
                            filename: fileFinder.obj
                        }
                    };
                } else {
                    return {
                        message: Strings.INSURANCE_CASE.REPORT_FAILED,
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
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in fetching files to downlaod:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

IncCaseServices.fetchOnlyCaseFile = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        let data
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.getFileStatusByCaseUuidReport(caseUuid, groupUsers);
        }
        else {
            data = await IncCaseNamesQueries.getFileStatusByCaseUuidReport(caseUuid, userId);
        }
        if (data.length > 0) {
            const hasReportStatusOne = data.some(item => item.reportStatus === 1);
            if (data[0].isProcessed == 0 && hasReportStatusOne) {

            let fileFinder
            if (isGroup && groupUsers && groupUsers.length > 0) {
                fileFinder = await IncCaseServices.fileFinder(caseUuid, data, groupUsers);
            }
            else {
                fileFinder = await IncCaseServices.fileFinder(caseUuid, data, userId);
            }
                if (fileFinder.obj.length > 0) {
                    const fileFinderLatestFilter = await IncCaseServices.fileFinderLatestFilter(fileFinder.obj);
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                            status: 0,
                            filename: [fileFinderLatestFilter]
                        }
                    }
                } else {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                            status: 0
                        }
                    }
                }
            }
            else if (data[0].isProcessed == 0 && data[0].reportStatus == 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                        status: 0
                    }
                }
            } else if (data[0].isProcessed == 1 && data[0].reportStatus == 1) {
                let fileFinder
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    fileFinder = await IncCaseServices.fileFinder(caseUuid, data, groupUsers);
                }
                else {
                    fileFinder = await IncCaseServices.fileFinder(caseUuid, data, userId);
                }
                if (fileFinder.obj.length > 0) {
                    const fileFinderLatestFilter = await IncCaseServices.fileFinderLatestFilter(fileFinder.obj);
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            status: 1,
                            filename: [fileFinderLatestFilter]
                        }
                    };
                }
                else {
                    return fileFinder
                }
            }
            else if (data[0].isProcessed == 2 || data[0].reportStatus == 2) {
                let fileFinder
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    fileFinder = await IncCaseServices.fileFinder(caseUuid, data, groupUsers);
                }
                else {
                    fileFinder = await IncCaseServices.fileFinder(caseUuid, data, userId);
                }
                if (fileFinder.obj.length > 0) {
                    const fileFinderLatestFilter = await IncCaseServices.fileFinderLatestFilter(fileFinder.obj);
                    return {
                        message: Strings.INSURANCE_CASE.REPORT_FAILED,
                        statusCode: 200,
                        obj: {
                            status: 2,
                            filename: [fileFinderLatestFilter]
                        }
                    };
                } else {
                    return {
                        message: Strings.INSURANCE_CASE.REPORT_FAILED,
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
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in fetching files to downlaod:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

IncCaseServices.fileFinderLatestFilter = async (data) => {
    return data
        // 1. filename should not be empty
        .filter(item => item.filename && item.filename.trim() !== '')
        // 2. sort by createdAt DESC
        .sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        })[0]; // 3. take only one
}

IncCaseServices.fileFinder = async (caseUuid, data, userId) => {
    try {
        if (caseUuid && data.length > 0) {
            let matchedFiles = [];
            for (const record of data) {
                if (record?.reportStatus == 1) {
                    const fileDetails = await IncCaseNamesQueries.findFileRelatedToSummary(record.requestUuid, userId)
                    const filePrefix = `_${record.jobUuid}`;
                    const fileEndsWith = '.docx';
                    const getFileUrl = await IncCaseServices.generateAzureInsuranceDownloadSummaryUrl(caseUuid, filePrefix, fileEndsWith)
                    if (getFileUrl?.obj?.length > 0) {
                        for (const element of getFileUrl.obj) {
                            matchedFiles.push({
                                requestUuid: record.requestUuid,
                                jobUuid: record.jobUuid,
                                summaryName: record.summaryName,
                                filename: element.videoUrl,
                                createdAt: moment(element.createdOn).format('DD-MM-YYYY HH:mm'),
                                fileDetails: fileDetails
                            });
                        }
                    }
                }
            }
            if (matchedFiles.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: matchedFiles
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
        console.log("Error in file finder:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.fileFinderAnalysis = async (caseUuid, data, userId) => {
    try {
        if (caseUuid && data.length > 0) {
            let matchedFiles = [];
            for (const record of data) {
                if (record?.reportStatus == 1) {
                    const fileDetails = await IncCaseNamesQueries.findFileRelatedToSummary(record.requestUuid, userId)
                    const filePrefix = `_${record.jobUuid}`;
                    const fileEndsWith = '.docx';
                    const getFileUrl = await IncCaseServices.generateAzureInsuranceDownloadSummaryUrl(caseUuid, filePrefix, fileEndsWith)
                    if (getFileUrl?.obj?.length > 0) {
                        for (const element of getFileUrl.obj) {
                            matchedFiles.push({
                                requestUuid: record.requestUuid,
                                jobUuid: record.jobUuid,
                                summaryName: record.summaryName,
                                filename: element.videoUrl,
                                createdAt: moment(element.createdOn).format('DD-MM-YYYY HH:mm'),
                                fileDetails: fileDetails
                            });
                        }
                    }
                    else {
                        if (record?.requestUuid) {
                            matchedFiles.push({
                                requestUuid: record.requestUuid,
                                jobUuid: record.jobUuid,
                                summaryName: record.summaryName,
                                filename: "",
                                createdAt: moment(record.createdAt).format('DD-MM-YYYY HH:mm'),
                                fileDetails: fileDetails
                            });
                        }
                    }
                }
            }
            if (matchedFiles.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: matchedFiles
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
        console.log("Error in file finder analysis:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.alterCase = async (caseName, plaintiffFirstName, plaintiffLastName, plaintiffDOB, insuredDefendant, dateOfLoss, liabilityDispute, incomeLoss, housekeepingRequired, futureCareNeeded, outOfPocketExpenses, previousAccident, previousAccidentDate, subsequentAccident, subsequentAccidentDate, applicantiffFirstName, applicantiffLastName, applicantiffDOB, insuredDefendantAB, dateOfLossAB, applicantiffInMIG, disputingCAT, summaryOfOCF18, summaryOfOCF6, attendantCareDispute, specifiedBenefitsDispute, primaryAttorneyEmail, additionalEmails, caseType, caseUuid, userId) => {
    try {
        const caseUpdatePromises = [];
        if (caseName || plaintiffFirstName || plaintiffLastName || plaintiffDOB || dateOfLoss || insuredDefendant || liabilityDispute || incomeLoss || housekeepingRequired || futureCareNeeded || outOfPocketExpenses || previousAccident || previousAccidentDate || subsequentAccident || subsequentAccidentDate || applicantiffFirstName || applicantiffLastName || applicantiffDOB || insuredDefendantAB || dateOfLossAB || applicantiffInMIG || disputingCAT || summaryOfOCF18 || summaryOfOCF6 || attendantCareDispute || specifiedBenefitsDispute || primaryAttorneyEmail || additionalEmails || (caseUuid && caseType && userId)) {
            const record = await IncCaseNamesQueries.getCaseByUuid(caseType, caseUuid, userId)
            if (record?.length > 0 && record[0]?.caseTypeId === 1) { //tort
                if (caseName) {
                    const obj = {
                        caseName: caseName
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updateCase(obj, caseUuid, userId));
                }

                const tortUpdateFields = {
                    plaintiffFirstName,
                    plaintiffLastName,
                    plaintiffDOB,
                    dateOfLoss,
                    insuredDefendant,
                    liabilityDispute,
                    incomeLoss,
                    housekeepingRequired,
                    futureCareNeeded,
                    outOfPocketExpenses,
                    previousAccident,
                    previousAccidentDate,
                    subsequentAccident,
                    subsequentAccidentDate
                };

                for (const [key, value] of Object.entries(tortUpdateFields)) {
                    if (value !== undefined && value !== '') {
                        const obj = { [key]: value };
                        caseUpdatePromises.push(
                            IncCaseNamesQueries.updateTortCase(obj, record[0]?.caseTypeId, record[0]?.id, userId)
                        );
                    }
                }

                if (primaryAttorneyEmail) {
                    const obj = {
                        primaryAttorneyEmail: JSON.stringify(primaryAttorneyEmail)
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updateCase(obj, caseUuid, userId));
                }

                if (additionalEmails) {
                    const obj = {
                        additionalEmails: JSON.stringify(additionalEmails)
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updateCase(obj, caseUuid, userId));
                }
                await Promise.all(caseUpdatePromises);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
                };
            }
            else if (record?.length > 0 && record[0]?.caseTypeId === 2) { //ABMatter
                if (caseName) {
                    const obj = {
                        caseName: caseName
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updateCase(obj, caseUuid, userId));
                }

                const updateFields = {
                    applicantiffFirstName,
                    applicantiffLastName,
                    applicantiffDOB,
                    insuredDefendantAB,
                    dateOfLossAB,
                    applicantiffInMIG,
                    disputingCAT,
                    summaryOfOCF18,
                    summaryOfOCF6,
                    attendantCareDispute,
                    specifiedBenefitsDispute
                };

                for (const [key, value] of Object.entries(updateFields)) {
                    if (value !== undefined && value !== '') {
                        const obj = { [key]: value };
                        caseUpdatePromises.push(
                            IncCaseNamesQueries.updateABMatterCase(obj, record[0]?.caseTypeId, record[0]?.id, userId)
                        );
                    }
                }

                if (primaryAttorneyEmail) {
                    const obj = {
                        primaryAttorneyEmail: JSON.stringify(primaryAttorneyEmail)
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updateCase(obj, caseUuid, userId));
                }

                if (additionalEmails) {
                    const obj = {
                        additionalEmails: JSON.stringify(additionalEmails)
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updateCase(obj, caseUuid, userId));
                }

                await Promise.all(caseUpdatePromises);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
                };

            }
            else {
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
        console.log("Error in editing a inc form fields for a case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.sendReport = async (caseUuid, summaryName, caseFiles, isCombine, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid && caseFiles?.length > 0) {
            let record
            if (isGroup && groupUsers && groupUsers.length > 0) {
                record = await IncCaseNamesQueries.getFileStatusSendReport(caseUuid, groupUsers);
            }
            else {
                record = await IncCaseNamesQueries.getFileStatusSendReport(caseUuid, userId)
            }
            if (record?.length > 0 && caseFiles?.length > 0 && record[0]?.isProcessed != 0) {
                console.log("***************************************************");
                console.log("Request Started For Sending Pending Ins Case Report");
                console.log("***************************************************");
                const list = await IncCaseServices.validateFileUUids(caseFiles, record);
                const questionnaire = [];
                if (list?.obj?.length > 0 && list.statusCode === 200) {
                    const dataObject = {
                        caseUuid: record[0]?.caseUuid,
                        caseType: record[0]?.caseKey,
                        caseInfoHeader: {
                            caseName: record[0]?.caseName,
                            claimNumber: '111',
                        },
                        caseDetails: list?.obj
                    };
                    if (record[0]?.caseTypeId === 1) { //tort
                        if (record[0]?.plaintiffFirstName != null || record[0]?.plaintiffLastName != null) {
                            dataObject.caseInfoHeader.plaintiff = `${record[0]?.plaintiffFirstName} ${record[0]?.plaintiffLastName}`.trim();
                        }
                        if (record[0]?.plaintiffDOB != null) {
                            dataObject.caseInfoHeader.plaintiffDob = moment(record[0].plaintiffDOB).format("YYYY-MM-DD");
                        }
                        if (record[0]?.dateOfLossTort != null) {
                            dataObject.caseInfoHeader.DateofLoss = moment(record[0].dateOfLossTort).format("YYYY-MM-DD");
                        }
                        if (record[0]?.insuredDefendant != null) {
                            dataObject.caseInfoHeader.defendant = record[0].insuredDefendant;
                        }
                        const prompt = await UserQueries.getPromptByType(44);
                        if (prompt.length > 0) {
                            const types = JSON.parse(prompt[0].prompt);
                            if (record[0]?.liabilityDispute != null) {
                                questionnaire.push({
                                    "question": types[6]?.label,
                                    "answer": record[0]?.liabilityDispute == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[6]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.incomeLoss != null) {
                                questionnaire.push({
                                    "question": types[7]?.label,
                                    "answer": record[0]?.incomeLoss == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[7]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.housekeepingRequired != null) {
                                questionnaire.push({
                                    "question": types[8]?.label,
                                    "answer": record[0]?.housekeepingRequired == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[8]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.futureCareNeeded != null) {
                                questionnaire.push({
                                    "question": types[9]?.label,
                                    "answer": record[0]?.futureCareNeeded == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[9]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.outOfPocketExpenses != null) {
                                questionnaire.push({
                                    "question": types[10]?.label,
                                    "answer": record[0]?.outOfPocketExpenses == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[10]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.previousAccident != null) {
                                questionnaire.push({
                                    "question": types[11]?.label,
                                    "answer": record[0]?.previousAccident == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[11]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.previousAccidentDate != null) {
                                questionnaire.push({

                                    "question": types[11].conditional.fields[0].label,
                                    "answer": record[0]?.previousAccidentDate
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[11].conditional.fields[0].label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.subsequentAccident != null) {
                                questionnaire.push({
                                    "question": types[12]?.label,
                                    "answer": record[0]?.subsequentAccident == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[12]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.subsequentAccidentDate != null) {
                                questionnaire.push({
                                    "question": types[12].conditional.fields[0].label,
                                    "answer": record[0]?.subsequentAccidentDate
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[12].conditional.fields[0].label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                        }
                    }
                    else if (record[0]?.caseTypeId === 2) { //ab matter
                        if (record[0]?.applicantiffFirstName != null || record[0]?.applicantiffLastName != null) {
                            dataObject.caseInfoHeader.applicant = `${record[0]?.applicantiffFirstName} ${record[0]?.applicantiffLastName}`.trim();
                        }
                        if (record[0]?.applicantiffDOB != null) {
                            dataObject.caseInfoHeader.applicantDob = moment(record[0].applicantiffDOB).format("YYYY-MM-DD");
                        }
                        if (record[0]?.insuredDefendantAB != null) {
                            dataObject.caseInfoHeader.defendant = record[0].insuredDefendantAB;
                        }
                        if (record[0]?.dateOfLossAB != null) {
                            dataObject.caseInfoHeader.DateofLoss = moment(record[0].dateOfLossAB).format("YYYY-MM-DD");
                        }

                        const prompt = await UserQueries.getPromptByType(50);
                        if (prompt.length > 0) {
                            const types = JSON.parse(prompt[0].prompt);
                            if (record[0]?.applicantiffInMIG != null) {
                                questionnaire.push({
                                    "question": types[6]?.label,
                                    "answer": record[0]?.applicantiffInMIG == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[6]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.disputingCAT != null) {
                                questionnaire.push({
                                    "question": types[6].conditional.fields[0].label,
                                    "answer": record[0]?.disputingCAT == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[6].conditional.fields[0].label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.summaryOfOCF18 != null) {
                                questionnaire.push({
                                    "question": types[7]?.label,
                                    "answer": record[0]?.summaryOfOCF18 == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[7]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.summaryOfOCF6 != null) {
                                questionnaire.push({
                                    "question": types[8]?.label,
                                    "answer": record[0]?.summaryOfOCF6 == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[8]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.attendantCareDispute != null) {
                                questionnaire.push({
                                    "question": types[9]?.label,
                                    "answer": record[0]?.attendantCareDispute == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[9]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.specifiedBenefitsDispute != null) {
                                questionnaire.push({
                                    "question": types[10]?.label,
                                    "answer": record[0]?.specifiedBenefitsDispute == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[10]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                        }
                    }
                    console.log("dataObject 2 =>", JSON.stringify(dataObject));
                    if (dataObject) {
                        if (isCombine) {
                            postData = await sendIncCaseReportCombine(dataObject)
                        } else {
                            postData = await sendIncCaseReport(dataObject)
                        }
                        Logger.data.IncCase({ request: dataObject, response: postData, incCaseId: caseUuid, userId: userId }, "Request-Response-Inc-Case-Report");
                        console.log("******************* Request - 1 - Send Data For Inc Case *******************");
                        console.log(postData)
                        console.log("******************* Request - 1 - Send Data For Inc Case *******************");
                        if (postData.statusCode == '200' && postData.obj.status == true && postData.obj.caseUuid && postData.obj.jobUuid) {
                            const list = {
                                userId: userId,
                                summaryName: summaryName,
                                incCaseId: record[0].id,
                                jobUuid: postData.obj.jobUuid,
                                jsonResponse: JSON.stringify(postData)
                            }
                            if (isCombine) {
                                list.isCombined = true
                            }
                            const reportId = await IncCaseFilesQueries.createReport(list)
                            if (isGroup && groupUsers && groupUsers.length > 0) {
                                await IncCaseNamesQueries.updateCase({ isProcessed: 0 }, caseUuid, groupUsers);
                            }
                            else {
                                await IncCaseNamesQueries.updateCase({ isProcessed: 0 }, caseUuid, userId);
                            }
                            for (const requestFile of caseFiles) {
                                let findFileId;
                                if (isGroup && groupUsers && groupUsers.length > 0) {
                                    findFileId = await IncCaseFilesQueries.findByFileUuid(requestFile?.fileUuid, groupUsers)
                                }
                                else {
                                    findFileId = await IncCaseFilesQueries.findByFileUuid(requestFile?.fileUuid, userId)
                                }
                                if (findFileId.length > 0) {
                                    const maapingObj = {
                                        fileId: findFileId[0].id,
                                        incCaseId: record[0].id,
                                        reportId: reportId[0],
                                        userId: userId
                                    }
                                    await IncCaseFilesQueries.createReportMapping(maapingObj)
                                }
                            }
                            console.log("******************************************************************");
                            console.log("Request Successfully Completed For Sending Pending Ins Case Report");
                            console.log("******************************************************************");
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: postData.obj
                            };
                        } else {
                            if (isGroup && groupUsers && groupUsers.length > 0) {
                                await IncCaseNamesQueries.updateCase({ isProcessed: 2 }, caseUuid, groupUsers)
                            }
                            else {
                                await IncCaseNamesQueries.updateCase({ isProcessed: 2 }, caseUuid, userId)
                            }
                            Logger.data.IncCase({ request: dataObject, response: postData, incCaseId: caseUuid, userId: userId }, "Error in Sending Data For Inc Case");
                            slack.webhook(JSON.stringify({ action: "Error in Sending Data For Inc Case ", request: dataObject, response: postData, incCaseId: caseUuid, userId: userId }));
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: postData
                                }
                            }
                        }
                    } else {
                        console.log("No transformedData found", dataObject);
                        Logger.data.IncCase({ request: dataObject, incCaseId: caseUuid, userId: userId }, "No-Transformed-Data-Found");
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                } else {
                    return list
                }
            }
            else if (record?.length > 0 && caseFiles?.length > 0 && record[0]?.isProcessed === 0) {
                return {
                    message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                    statusCode: 400,
                    obj: {}
                }
            }
            else {
                console.log("***************************************************");
                console.log("No record found For Sending Pending Ins Case Report");
                console.log("***************************************************");
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
    }
    catch (error) {
        console.log("Error in sending data report to python:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.validateFileUUids = async (requestData, validationData) => {
    try {
        if (requestData?.length > 0 && validationData?.length > 0) {
            const list = []
            for (const requestFile of requestData) {
                const matched = validationData.find(recordFile => recordFile.fileUuid === requestFile.fileUuid);
                if (matched) {
                    const obj = {
                        fileUuid: requestFile.fileUuid,
                        fileName: requestFile.fileName,
                        pageCount: requestFile.pageCount,
                        status: false
                    }
                    list.push(obj)
                    // if (requestFile?.caseFileTypes && requestFile?.caseFileTypes != null) {
                    //     obj.fileType = requestFile?.caseFileTypes
                    // }
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
                    obj: []
                }
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: []
            }
        }
    }
    catch (error) {
        console.log("error while validate FileUUids", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.updateReport = async (caseUuid, jobUuid, caseInfoHeader, status, successDetails, failedFiles, allData) => {
    try {
        Logger.data.IncCase({ response: allData }, "Response-Webhook-Ins-Case");
        const data = await IncCaseNamesQueries.getCaseDetails(caseUuid, jobUuid)
        if (data.length > 0 && (successDetails?.length > 0 || failedFiles?.length > 0) && status === true) {
            console.log("***************************************");
            console.log("Got the hit For Sending Ins Case Report");
            console.log("***************************************");
            const groupedRecords = {};
            for (const rec of successDetails) {
                if (!groupedRecords[rec.file_uuid]) {
                    groupedRecords[rec.file_uuid] = {
                        fileUuid: rec.file_uuid,
                        fileType: rec.record_type, //file_type -> record_type
                        status: true,
                        fileSummary: []
                    };
                }
                const summaryObject = {
                    date: rec.date,
                    summary: rec.summary,
                    reference: rec.reference,
                    section: rec.section,
                    pages: rec.pages,
                    record_uuid: rec.record_uuid,
                    fileType: rec.record_type,
                    duplicate_flag: rec.duplicate_flag,
                    duplicate_info: rec.duplicate_info,
                    incCaseId: data[0].id,
                    reportId: data[0].reportId,
                    userId: data[0].userId
                }
                if (rec.insurer_decision) {
                    summaryObject.insurer_decision = rec.insurer_decision;
                }
                // if (rec.record_type === 10 && rec.total_cost) {
                //     summaryObject.total_cost = rec.total_cost;
                // }

                // if (rec.record_type === 8 && rec.expense_amount) {
                //     summaryObject.expense_amount = rec.expense_amount;
                // }
                groupedRecords[rec.file_uuid].fileSummary.push(summaryObject);
            }
            const caseDetails = [
                ...Object.values(groupedRecords),
            ];
            if (failedFiles.length > 0) {
                const mappedFailedFiles = failedFiles.map(f => ({
                    fileUuid: f.file_uuid,
                    fileName: f.file_name,
                    status: false
                }));

                caseDetails.push(...mappedFailedFiles);

            }
            const incomingFileUuids = caseDetails.map(file => file.fileUuid);
            const dbFileUuids = data.map(item => item.fileUuid);
            const dbEmails = Array.from(
                new Set(
                    data.flatMap(item => {
                        let primaryEmails = [];
                        let additionalEmails = [];
                        primaryEmails = JSON.parse(item.primaryAttorneyEmail || '[]');
                        additionalEmails = JSON.parse(item.additionalEmails || '[]');
                        return [...primaryEmails, ...additionalEmails]
                    })
                )
            );
            const filterEmails = [...new Set(dbEmails)];
            const Tuple = await IncCaseServices.validateFileUUids(caseDetails, data); //have to check with adding failed fails uuids
            if (Tuple?.obj?.length > 0 && Tuple.statusCode === 200) {
                for (const element of caseDetails) {
                    const list = {
                        status: element.status,
                    }
                    if (element.status === true) {
                        list.isProcessed = true

                        if (element.fileSummary.length > 0) {
                            await IncCaseNamesQueries.addReportsSummary(element.fileSummary)
                        }
                        await IncCaseFilesQueries.updateByFileUuid(list, element.fileUuid)
                    } else {
                        list.isProcessed = 2
                        list.isActivated = false //*now failed files will not show on UI
                        // list.status = true  *now failed files will not show on UI
                        await IncCaseFilesQueries.updateByFileUuid(list, element.fileUuid)
                        const findFileId = await IncCaseFilesQueries.findByFileUuidForError(element.fileUuid, data[0]?.userId)
                        if (findFileId.length > 0) {
                            const record = {
                                status: 2,
                                isActivated: false
                            }
                            await IncCaseFilesQueries.updateByReportMappingByFileId(record, findFileId[0].id, data[0]?.reportId)
                        }
                        slack.webhook(JSON.stringify({ action: "Error in File Uploading Insurance Cases", response: element, caseUuid: caseUuid, jobUuid: jobUuid, userId: data[0]?.userId }));
                    }
                }
                if (status === true && caseUuid) {
                    if (filterEmails.length > 0) {
                        //have to notify user that report success make a email templete for the success job
                        for (const element of filterEmails) {
                            // const emailStatus = await Emails.sendAttachment(element, caseInfoHeader?.caseName, attachments);
                            const fileSuccessText = "Your file's has been successfully processed"
                            const emailStatus = await Emails.insReportSuccess(element, caseInfoHeader?.caseName, fileSuccessText);
                            // console.log("emailStatus", emailStatus);
                            Logger.data.IncCase({ request: element, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report");
                        }
                        await IncCaseFilesQueries.updateByReportByJobUuid({ isProcessed: true }, jobUuid);
                        await IncCaseNamesQueries.updateCase({ isProcessed: 1 }, caseUuid, data[0].userId);
                    }
                    console.log("********************************************");
                    console.log("Report Send Successfully For Ins Case Report");
                    console.log("********************************************");
                } else {
                    // if (filterEmails.length > 0) {
                    //     for (let index = 0; index < filterEmails.length; index++) {
                    //         const element = filterEmails[index];
                    //         const emailErrorText = ''
                    //         const emailStatus = await Emails.insReportError(element, caseInfoHeader?.caseName);
                    //         Logger.data.IncCase({ request: element, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report-Error");
                    //     }
                    // }

                    const errorText = []
                    for (const element of caseDetails) {
                        if (element.status === false) {
                            errorText.push(`<br>${element.fileName}`);
                        }
                    }
                    if (errorText.length > 0 && filterEmails.length > 0) {
                        const formattedErrorText = errorText.join('');
                        // for (const email of filterEmails) {
                        //     const emailStatus = await Emails.insReportErrorWithFileName(email, formattedErrorText);
                        //     Logger.data.IncCase({ request: email, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report-Error-File-Email");
                        // }
                    }

                    await IncCaseNamesQueries.updateCase({ isProcessed: 2 }, caseUuid, data[0].userId);
                    await IncCaseFilesQueries.updateByReportByJobUuid({ isProcessed: 2, jsonResponse: JSON.stringify(allData) }, jobUuid);
                    slack.webhook(JSON.stringify({ action: "Error in sending Insurance Cases Report", caseUuid: caseUuid, jobUuid: jobUuid }));
                }
                // incase when the report is successfully processed. if one of the file fails like 1 oot of 3 so send the email to that user
                if (status === true && caseUuid) {
                    const errorText = []
                    for (const element of caseDetails) {
                        if (element.status === false) {
                            errorText.push(`<br>${element.fileName}`);
                        }
                    }
                    if (errorText.length > 0 && filterEmails.length > 0) {
                        const formattedErrorText = errorText.join('');
                        // for (const email of filterEmails) {
                        //     const emailStatus = await Emails.insReportErrorWithFileName(email, formattedErrorText);
                        //     Logger.data.IncCase({ request: email, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report-Error-File-Email");
                        // }
                    }
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: data
                };
            } else {
                console.log("Error in matching received file length");
                slack.webhook(JSON.stringify({ action: "Error in matching received file length for Insurance Cases", caseUuid: caseUuid, jobUuid: jobUuid }));
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        message: Strings.GROK.FILE_UUID_NOT_MATCHING,
                    }
                }
            }
        }
        else if (data.length > 0 && status === false) {
            const dbEmails = Array.from(
                new Set(
                    data.flatMap(item => {
                        let primaryEmails = [];
                        let additionalEmails = [];
                        primaryEmails = JSON.parse(item.primaryAttorneyEmail || '[]');
                        additionalEmails = JSON.parse(item.additionalEmails || '[]');
                        return [...primaryEmails, ...additionalEmails]
                    })
                )
            );
            const filterEmails = [...new Set(dbEmails)];
            if (filterEmails.length > 0) {
                for (let index = 0; index < filterEmails.length; index++) {
                    const element = filterEmails[index];
                    const emailStatus = await Emails.insReportError(element);
                    Logger.data.IncCase({ request: element, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report-Error");
                }
            }
            console.log("**************************************");
            console.log("Got the hit For Failed Ins Case Report");
            console.log("**************************************");
            await IncCaseNamesQueries.updateCase({ isProcessed: 2 }, caseUuid, data[0].userId);
            await IncCaseFilesQueries.updateByReportByJobUuid({ isProcessed: 2, jsonResponse: JSON.stringify(allData) }, jobUuid);
            return {
                message: Strings.INSURANCE_CASE.REPORT_FAILED,
                statusCode: 400,
                obj: {}
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
        console.log("Error in updating report data and sending it to users:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error
            }
        }
    }
}

IncCaseServices.removeCase = async (caseId, userId) => {
    try {
        const obj = {
            status: false,
            isActivated: false,
            updatedAt: currentDate
        }
        const getCasesId = await IncCaseNamesQueries.getCasesId(caseId, userId)
        if (getCasesId?.length > 0 && getCasesId[0]?.isProcessed != 0) {
            const deleteCase = await IncCaseNamesQueries.deActivateCase(obj, caseId, userId);
            const deleteFile = await IncCaseFilesQueries.deActivateFileByCaseId(obj, getCasesId[0].id, userId);
            if (deleteCase[0] == 1 || deleteFile?.length > 0) {
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
        else if (getCasesId?.length > 0 && getCasesId[0]?.isProcessed == 0) {
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
        console.log("Error in deleting a case:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.removeFile = async (caseUuid, fileUuid, userId) => {
    try {
        const obj = {
            status: false,
            isActivated: false,
            updatedAt: currentDate
        }
        const record = await IncCaseNamesQueries.getCaseId(caseUuid, fileUuid, userId)
        if (record?.length > 0 && (record[0]?.isProcessed === null || record[0]?.isProcessed === 1)) {
            const caseId = record[0].id
            const list = await IncCaseFilesQueries.deActivateFile(obj, caseId, fileUuid, userId)
            if (list[0] == 1) {
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
        else if (record?.length > 0 && record[0]?.isProcessed === 0) {
            return {
                message: Strings.FILE.CANNOT_DELETE_FILES,
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
IncCaseServices.deleteFolderFiles = async (caseUuid, fileUuid, userId) => {
    try {
        const obj = {
            status: false,
            isActivated: false,
            updatedAt: currentDate
        }

        return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_DELETED_SUCCESS
                    }
                }


        for (const file of fileUuid) { 

            console.log("file", file);
            
        return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_DELETED_SUCCESS
                    }
                }
        
        }


        const record = await IncCaseNamesQueries.findFileRelatedToCaseForDelete(caseUuid, fileUuid, userId)
        

        
        if (record?.length > 0 && (record[0]?.isProcessed === null || record[0]?.isProcessed === 1)) {
            const caseId = record[0].id
            const list = await IncCaseFilesQueries.deActivateFile(obj, caseId, fileUuid, userId)
            if (list[0] == 1) {
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
        else if (record?.length > 0 && record[0]?.isProcessed === 0) {
            return {
                message: Strings.FILE.CANNOT_DELETE_FILES,
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

IncCaseServices.renameFolder = async (caseUuid, renameFolder, userId) => {
    try {
        const record = await IncCaseNamesQueries.findFileRelatedToCase(caseUuid, userId)
        if (record?.length > 0) {
            const dbFileUuids = record.map(f => f.fileUuid);
            const requestFileUuids = renameFolder.map(f => f.fileUuid);
            const sortedDb = dbFileUuids.slice().sort();
            const sortedRequest = requestFileUuids.slice().sort();
            const isMatch = sortedDb.length === sortedRequest.length &&
                sortedDb.every((uuid, index) => uuid === sortedRequest[index]);
            if (isMatch) {
                for (const file of renameFolder) {
                    if (file?.fileUuid && file?.folderPath) {
                        const result = await IncCaseNamesQueries.renameFolderByFileUuid({ folderPath: file.folderPath }, file.fileUuid, userId);
                        if (result[0] == 1) {
                            return {
                                message: Strings.RECORD_UPDATE_SUCCESS,
                                statusCode: 200,
                                obj: {}
                            }
                        }
                        else {
                            return {
                                message: Strings.ERROR.RECORD_UPDATE_ERROR,
                                statusCode: 400,
                                obj: {
                                    fileUuid: file.fileUuid
                                }
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
                }
            }
            else {
                return {
                    message: Strings.GROK.FILE_UUID_NOT_MATCHING,
                    statusCode: 400,
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
        console.log("Error in renaming folder:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.updateReviewer = async (reviewers, caseUuid, fileUuid, userId) => {
    try {
        if (reviewers && caseUuid && fileUuid && userId) {
            const record = await IncCaseNamesQueries.getCaseIdForReviewer(caseUuid, fileUuid, userId)
            if (record?.length > 0) {
                const obj = {
                    reviewers: reviewers
                }
                const list = await IncCaseFilesQueries.updateByFileUuid(obj, fileUuid)
                if (list[0] == 1) {
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
            }
            else {
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
        console.log("Error in update Reviewer:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.updateCaseFileType = async (caseFileTypes, caseUuid, fileUuid, userId) => {
    try {
        if (caseFileTypes && caseUuid && fileUuid && userId) {
            const record = await IncCaseNamesQueries.getCaseIdForReviewer(caseUuid, fileUuid, userId)
            if (record?.length > 0 && (record[0]?.fileIsProcessed === 0 || record[0]?.fileIsProcessed === 2) && record[0]?.isProcessed != 0) {
                const obj = {
                    caseFileTypes: caseFileTypes
                }
                const list = await IncCaseFilesQueries.updateByFileUuid(obj, fileUuid)
                if (list[0] == 1) {
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
            }//if file is already processed then cannot update the file type
            else if (record?.length > 0 && record[0]?.fileIsProcessed === 1) {
                return {
                    message: Strings.FILE.CANNOT_UPDATE_PROCESSED_FILES,
                    statusCode: 400,
                    obj: {}
                }
            }
            else if (record?.length > 0 && record[0]?.fileIsProcessed === 0 && record[0]?.isProcessed === 0) {
                return {
                    message: Strings.FILE.CANNOT_UPDATE_FILES,
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in update Reviewer:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.checkDuplicate = async (caseName, caseType, userId) => {
    try {
        const data = Encryptions.encryptSensitiveData(caseName);
        const existingCase = await IncCaseNamesQueries.findCaseByUserIdAndName(data, caseType, userId);
        if (existingCase) {
            return false;
        }
        else {
            return true;
        }
    } catch (error) {
        console.log("Error in while checking duplication", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.fetchCaseTypes = async (userId) => {
    try {
        const data = await IncCaseNamesQueries.getIncCaseTypes();
        if (data.length > 0) {
            let requestUuidForAB
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                if (index == 1) {
                    requestUuidForAB = element.requestuuid
                }
                if (index == 2 && requestUuidForAB) {
                    element.requestuuid = requestUuidForAB
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
        console.log("Error in fetching a inc case types:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

IncCaseServices.deleteReport = async (requestUuid, userId) => {
    try {
        const obj = {
            status: false,
            isActivated: false,
            updatedAt: currentDate
        }
        const getCasesId = await IncCaseNamesQueries.getReportByRequestUuid(requestUuid, userId)
        if (getCasesId?.length > 0 && getCasesId[0]?.isProcessed != 0) {
            const deleteCase = await IncCaseNamesQueries.deActivateReport(obj, requestUuid, userId);
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
        else if (getCasesId?.length > 0 && getCasesId[0]?.isProcessed == 0) {
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
        console.log("Error in deleting a report:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getSummaryAll = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        let data;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.getReportByUserId(caseUuid, groupUsers);
        }
        else {
            data = await IncCaseNamesQueries.getReportByUserId(caseUuid, userId);
        }
        if (data.length > 0) {
            for (const element of data) {
                element.createdAt = moment(element.createdAt).format("MM/DD/YYYY")
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
        console.log("Error in get summary:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getSummaryNew = async (requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    try {
        const offset = (page - 1) * limit;
        let data
        const _data = [1, 2, 3, 4, 5, 6, 7, 8, 14, 43]
        const parsedFileType = fileType ? JSON?.parse(fileType) : null;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.findReportSummary(requestUuid, groupUsers, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, parsedFileType, duplicate, insurerDecision);
        }
        else {
            data = await IncCaseNamesQueries.findReportSummary(requestUuid, userId, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, parsedFileType, duplicate, insurerDecision);
        }
        if (data[0]?.length > 0) {
            const allData = await IncCaseServices.dataFormatter(data[0], duplicate)
            if (allData[0]?.length > 0) {
                const finalOutput = await IncCaseServices.dataFilterAccordingToGroupIdAndFileType(allData[0], _data);                
                const postData = await getIncReportStatus(data[0][0]?.caseUuid)
                const editStatus = postData.statusCode == '200' && postData.obj.status == true ? true : false 
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        caseData: allData[1],
                        summaryData: finalOutput,
                        editStatus: editStatus,
                        pagination: {
                            totalRecords: data[1],
                            totalPages: Math.ceil(data[1] / limit),
                            currentPage: page,
                            limit
                        }
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
        console.log("Error in get summary new:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.dataFormatter = async (data) => {
    const summaryData = []
    const caseData = {}
    for (const element of data) {
        if (element.caseTypeId === 1) { //tort
            caseData.caseName = element.caseName
            caseData.defendant = element.insuredDefendant
            caseData.plaintiffFirstName = element.plaintiffFirstName
            caseData.plaintiffLastName = element.plaintiffLastName
            caseData.plaintiffDOB = element.plaintiffDOB != null ? moment(element.plaintiffDOB).format("MM/DD/YYYY") : null,
            caseData.dateOfLoss = element.dateOfLoss != null ? moment(element.dateOfLoss).format("MM/DD/YYYY") : null
        }
        if (element.caseTypeId === 2) { //AB
            caseData.caseName = element.caseName
            caseData.defendant = element.insuredDefendantAB
            caseData.applicantiffFirstName = element.applicantiffFirstName
            caseData.applicantiffLastName = element.applicantiffLastName
            caseData.applicantiffDOB = element.applicantiffDOB != null ? moment(element.applicantiffDOB).format("MM/DD/YYYY") : null,
            caseData.dateOfLossAB = element.dateOfLossAB != null ? moment(element.dateOfLossAB).format("MM/DD/YYYY") : null
        }
        const reference = element?.reference;
        const fileName = reference.substring(0, reference.lastIndexOf(',')).trim();
        const makefilePath = element?.caseUuid +'/' +fileName
        const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(makefilePath, "", CDN);
           const filter = {
                record_uuid: element.record_uuid,
                date: element.date,
                summary: element.summary,
                reference: element.reference,
                section: element.section,
                fileType: element.fileType,
                pages: element.pages,
                duplicate_flag: element.duplicate_flag,
                duplicate_info: element.duplicate_info,
                fileUrl: getFileUrl?.statusCode == '200' && getFileUrl?.obj?.videoUrl ? getFileUrl?.obj?.videoUrl : '',
                fileName: fileName
            }

            if (element.insurer_decision != null) {
                filter.insurer_decision = element.insurer_decision
            }

            if (element.reference) {
                const match = element.reference.match(/Page(?:s)?\s+([\d,\s-]+)/i);
                if (match && match[1]) {
                    const pages = [];
                    match[1].split(',').forEach(part => {
                        part = part.trim();
                        // Handle range: 2-4
                        if (part.includes('-')) {
                            const [start, end] = part.split('-').map(Number);
                            if (!isNaN(start) && !isNaN(end)) {
                                for (let i = start; i <= end; i++) {
                                    pages.push(i);
                                }
                            }
                        }
                        // Handle single page: 3
                        else {
                            const page = parseInt(part, 10);
                            if (!isNaN(page)) {
                                pages.push(page);
                            }
                        }
                    });
                    filter.pages = pages;
                }
            }
            summaryData.push(filter);
    }
    summaryData.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
    });
    return [summaryData, caseData]
}

IncCaseServices.dataFilterAccordingToGroupIdAndFileType = async (summaryData, data = []) => {

    const knownDateGroups = {};
    const unknownDateBucket = [];
    const finalOutput = [];

    const isValidDate = (d) => {
        if (!d || d === "Unknown") return false;
        const date = new Date(d);
        return !isNaN(date.getTime());
    };

    // STEP 1 — FILTER by fileType ONLY
    for (const item of summaryData) {
        const ft = item.fileType || 0;
        if (!data.includes(Number(ft))) continue;

        if (!isValidDate(item?.date)) {
            // Unknown dates → UNIQUE → deferred
            unknownDateBucket.push(item);
            continue;
        }

        const dateKey = new Date(item.date).toISOString().split("T")[0];
        if (!knownDateGroups[dateKey]) knownDateGroups[dateKey] = [];
        knownDateGroups[dateKey].push(item);
    }

    // STEP 2 — SORT dates globally
    const sortedDates = Object.keys(knownDateGroups).sort(
        (a, b) => new Date(a) - new Date(b)
    );

    // STEP 3 — PROCESS each date
    for (const dateKey of sortedDates) {

        const records = knownDateGroups[dateKey];
        const duplicateGroups = {};
        const uniques = [];

        for (const record of records) {
            const gid = record?.duplicate_info?.group_id;

            if (gid) {
                if (!duplicateGroups[gid]) duplicateGroups[gid] = [];
                duplicateGroups[gid].push(record);
            } else {
                uniques.push(record);
            }
        }

        // Primary first inside duplicates
        for (const gid in duplicateGroups) {
            duplicateGroups[gid].sort((a, b) =>
                (b?.duplicate_info?.is_primary === true) -
                (a?.duplicate_info?.is_primary === true)
            );
        }

        // Push duplicates first for this date
        for (const gid in duplicateGroups) {
            finalOutput.push(...duplicateGroups[gid]);
        }

        // Then uniques for this date
        finalOutput.push(...uniques);
    }

    // STEP 4 — UNKNOWN DATES ALWAYS LAST
    finalOutput.push(...unknownDateBucket);

    return finalOutput;
};

IncCaseServices.getOcfSummary = async (requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    try {
        const offset = (page - 1) * limit;
        const _data = [15, 16, 18]
        let data
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.findReportSummaryOCF(requestUuid, groupUsers, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
        }
        else {
            data = await IncCaseNamesQueries.findReportSummaryOCF(requestUuid, userId, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
        }
        if (data[0]?.length > 0) {
            const allData = await IncCaseServices.dataFormatter(data[0])
            if (allData[0]?.length > 0) {
                const finalOutput = await IncCaseServices.dataFilterAccordingToGroupIdAndFileType(allData[0], _data);
                const postData = await getIncReportStatus(data[0][0]?.caseUuid)
                const editStatus = postData.statusCode == '200' && postData.obj.status == true ? true : false 
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        caseData: allData[1],
                        summaryData: finalOutput,
                        editStatus: editStatus,
                        pagination: {
                            totalRecords: data[1],
                            totalPages: Math.ceil(data[1] / limit),
                            currentPage: page,
                            limit
                        }
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
        console.log("Error in get ocf summary:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getOcfSixSummary = async (requestUuid, userId) => {
    try {
        const data = await IncCaseNamesQueries.findReportSummaryOCFSix(requestUuid, userId);
        if (data.length > 0) {
            const summaryData = []
            const caseData = {}
            for (const element of data) {
                if (element.caseTypeId === 1) { //tort
                    caseData.caseName = element.caseName
                    caseData.defendant = element.insuredDefendant
                    caseData.plaintiffFirstName = element.plaintiffFirstName
                    caseData.plaintiffLastName = element.plaintiffLastName
                    caseData.plaintiffDOB = element.plaintiffDOB != null ? moment(element.plaintiffDOB).format("MM/DD/YYYY") : null,
                        caseData.dateOfLoss = element.dateOfLoss != null ? moment(element.dateOfLoss).format("MM/DD/YYYY") : null
                }

                if (element.caseTypeId === 2) { //AB
                    caseData.caseName = element.caseName
                    caseData.defendant = element.insuredDefendantAB
                    caseData.applicantiffFirstName = element.applicantiffFirstName
                    caseData.applicantiffLastName = element.applicantiffLastName
                    caseData.applicantiffDOB = element.applicantiffDOB != null ? moment(element.applicantiffDOB).format("MM/DD/YYYY") : null,
                        caseData.dateOfLossAB = element.dateOfLossAB != null ? moment(element.dateOfLossAB).format("MM/DD/YYYY") : null
                }

                const checkJson = await isValidJSON(element.fileSummary)
                if (checkJson == true) {
                    const parsed = JSON?.parse(element.fileSummary);
                    const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(element.filePath)
                    if (Array.isArray(parsed)) {
                        // console.log("1");
                        parsed.forEach(item => {
                            const filter = {
                                ...item,
                                fileUrl: getFileUrl?.statusCode == '200' && getFileUrl?.obj?.videoUrl ? getFileUrl?.obj?.videoUrl : '',
                                fileName: element.fileName
                            }
                            if (item.reference) {
                                const match = item.reference.match(/Page(?:s)?\s+([\d,\s]+)/i);
                                if (match && match[1]) {
                                    filter.pages = match[1]
                                        .split(",")
                                        .map(p => parseInt(p.trim(), 10))
                                        .filter(n => !isNaN(n));
                                }
                            }
                            summaryData.push(filter);
                        });
                    } else {
                        const filter = {
                            ...parsed,
                            fileUrl: getFileUrl?.statusCode == '200' && getFileUrl?.obj?.videoUrl ? getFileUrl?.obj?.videoUrl : '',
                            fileName: element.fileName
                        };
                        if (parsed?.reference) {
                            const match = parsed.reference.match(/Page(?:s)?\s+([\d,\s]+)/i);
                            if (match && match[1]) {
                                filter.pages = match[1]
                                    .split(",")
                                    .map(p => parseInt(p.trim(), 10))
                                    .filter(n => !isNaN(n));
                            }
                        }
                        summaryData.push(filter);
                    }
                }
                else {
                    slack.webhook(JSON.stringify({ action: "JSON is not valid from python solution for the feature summary viewer ocf", fileUuid: element.fileUuid }));
                }
            }
            summaryData.sort((a, b) => {
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(a.date) - new Date(b.date);
            });
            if (summaryData.length > 0) {
                const finalOutput = await IncCaseServices.dataFilterAccordingToGroupIdAndFileType(summaryData);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        caseData,
                        summaryData: finalOutput
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
        console.log("Error in get ocf six summary:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getIncomeSummary = async (requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    try {
        const offset = (page - 1) * limit;
        let data;
        const _data = [21, 22, 23, 24, 25, 26]
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.findReportSummaryIncome(requestUuid, groupUsers, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
        } else {
            data = await IncCaseNamesQueries.findReportSummaryIncome(requestUuid, userId, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
        }
        if (data[0]?.length > 0) {
            const allData = await IncCaseServices.dataFormatter(data[0])
            if (allData[0]?.length > 0) {
                const finalOutput = await IncCaseServices.dataFilterAccordingToGroupIdAndFileType(allData[0], _data);
                const postData = await getIncReportStatus(data[0][0]?.caseUuid)
                const editStatus = postData.statusCode == '200' && postData.obj.status == true ? true : false 
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        caseData: allData[1],
                        summaryData: finalOutput,
                        editStatus: editStatus,
                        pagination: {
                            totalRecords: data[1],
                            totalPages: Math.ceil(data[1] / limit),
                            currentPage: page,
                            limit
                        }
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
        console.log("Error in get income summary:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getABSummary = async (requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    try {
        const offset = (page - 1) * limit;
        let data;
        const _data = [9, 10, 11, 12, 13, 41, 32, 27, 28, 37, 40, 20]
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.findReportSummaryAB(requestUuid, groupUsers, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
        } else {
            data = await IncCaseNamesQueries.findReportSummaryAB(requestUuid, userId, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
        }
        if (data[0]?.length > 0) {
            const allData = await IncCaseServices.dataFormatter(data[0])
            if (allData[0]?.length > 0) {
                const finalOutput = await IncCaseServices.dataFilterAccordingToGroupIdAndFileType(allData[0], _data);
                const postData = await getIncReportStatus(data[0][0]?.caseUuid)
                const editStatus = postData.statusCode == '200' && postData.obj.status == true ? true : false 
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        caseData: allData[1],
                        summaryData: finalOutput,
                        editStatus: editStatus,
                        pagination: {
                            totalRecords: data[1],
                            totalPages: Math.ceil(data[1] / limit),
                            currentPage: page,
                            limit
                        }
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
        console.log("Error in get ab summary:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getIMESummary = async (requestUuid, userId, isGroup, groupUsers, page, limit, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    try {
        const offset = (page - 1) * limit;
        let data
        const _data = [33, 34, 35, 17];
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.findReportSummaryIME(requestUuid, groupUsers, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
        }
        else {
            data = await IncCaseNamesQueries.findReportSummaryIME(requestUuid, userId, _data, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
        }
        if (data[0]?.length > 0) {
            const allData = await IncCaseServices.dataFormatter(data[0])
            if (allData[0]?.length > 0) {
                const finalOutput = await IncCaseServices.dataFilterAccordingToGroupIdAndFileType(allData[0], _data);
                const postData = await getIncReportStatus(data[0][0]?.caseUuid)
                const editStatus = postData.statusCode == '200' && postData.obj.status == true ? true : false 
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        caseData: allData[1],
                        summaryData: finalOutput,
                        editStatus: editStatus,
                        pagination: {
                            totalRecords: data[1],
                            totalPages: Math.ceil(data[1] / limit),
                            currentPage: page,
                            limit
                        }
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
        console.log("Error in get ime summary:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getLTDSummary = async (requestUuid, userId) => {
    try {
        const data = await IncCaseNamesQueries.findReportSummaryLTD(requestUuid, userId);
        if (data.length > 0) {
            const summaryData = []
            const caseData = {}
            for (const element of data) {
                if (element.caseTypeId === 1) { //tort
                    caseData.caseName = element.caseName
                    caseData.defendant = element.insuredDefendant
                    caseData.plaintiffFirstName = element.plaintiffFirstName
                    caseData.plaintiffLastName = element.plaintiffLastName
                    caseData.plaintiffDOB = element.plaintiffDOB != null ? moment(element.plaintiffDOB).format("MM/DD/YYYY") : null,
                        caseData.dateOfLoss = element.dateOfLoss != null ? moment(element.dateOfLoss).format("MM/DD/YYYY") : null
                }

                if (element.caseTypeId === 2) { //AB
                    caseData.caseName = element.caseName
                    caseData.defendant = element.insuredDefendantAB
                    caseData.applicantiffFirstName = element.applicantiffFirstName
                    caseData.applicantiffLastName = element.applicantiffLastName
                    caseData.applicantiffDOB = element.applicantiffDOB != null ? moment(element.applicantiffDOB).format("MM/DD/YYYY") : null,
                        caseData.dateOfLossAB = element.dateOfLossAB != null ? moment(element.dateOfLossAB).format("MM/DD/YYYY") : null
                }
                const checkJson = await isValidJSON(element.fileSummary)
                if (checkJson == true) {
                    const parsed = JSON?.parse(element.fileSummary);
                    const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(element.filePath)
                    if (Array.isArray(parsed)) {
                        // console.log("1");
                        parsed.forEach(item => {
                            const filter = {
                                ...item,
                                fileUrl: getFileUrl?.statusCode == '200' && getFileUrl?.obj?.videoUrl ? getFileUrl?.obj?.videoUrl : '',
                                fileName: element.fileName,
                            }
                            if (item.reference) {
                                const match = item.reference.match(/Page(?:s)?\s+([\d,\s]+)/i);
                                if (match && match[1]) {
                                    filter.pages = match[1]
                                        .split(",")
                                        .map(p => parseInt(p.trim(), 10))
                                        .filter(n => !isNaN(n));
                                }
                            }
                            summaryData.push(filter);
                        });
                    } else {
                        const filter = {
                            ...parsed,
                            fileUrl: getFileUrl?.statusCode == '200' && getFileUrl?.obj?.videoUrl ? getFileUrl?.obj?.videoUrl : '',
                            fileName: element.fileName
                        };
                        if (parsed?.reference) {
                            const match = parsed.reference.match(/Page(?:s)?\s+([\d,\s]+)/i);
                            if (match && match[1]) {
                                filter.pages = match[1]
                                    .split(",")
                                    .map(p => parseInt(p.trim(), 10))
                                    .filter(n => !isNaN(n));
                            }
                        }
                        summaryData.push(filter);
                    }
                }
                else {
                    slack.webhook(JSON.stringify({ action: "JSON is not valid from python solution for the feature summary viewer ocf", fileUuid: element.fileUuid }));
                }
            }
            summaryData.sort((a, b) => {
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(a.date) - new Date(b.date);
            });
            if (summaryData.length > 0) {
                const data = []
                const finalOutput = await IncCaseServices.dataFilterAccordingToGroupIdAndFileType(summaryData);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        caseData,
                        summaryData: finalOutput
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
        console.log("Error in get ltd summary:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.generateAzureInsuranceFileUrl = async (fileName, timer = false, cdn = false) => {
    try {
        const startsOn = new Date();
        let expiresOn;
        if (timer === true) {
            // 4 weeks expiry
            const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;
            expiresOn = new Date(startsOn.getTime() + FOUR_WEEKS_MS);
        } else {
            // Default 1 hour expiry
            const ONE_HOUR_MS = 60 * 60 * 1000;
            expiresOn = new Date(startsOn.getTime() + ONE_HOUR_MS);
        }

        const blobClient = containerClient.getBlobClient(fileName);
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

            const encodedPath = fileName
            .split('/')
            .map(encodeURIComponent)
            .join('/');

            let videoUrl;
            if (CDN === 'true') {
               const baseUrl = CDN
            ? process.env.AZURE_CDN_BASE_URL 
            : process.env.AZURE_BLOB_BASE_URL;
                videoUrl = `${baseUrl}/${CONTAINER_NAME}/${encodedPath}?${sasToken}`;
            }
            else {
                videoUrl = `${blobClient.url}?${sasToken}`
            }
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
        console.log('An error occurred while generate Azure Insurance file Url:', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.generateAzureInsuranceDownloadSummaryUrl = async (caseUuid, filePrefix, fileEndsWith) => {
    try {
        const summaryUrl = []
        const startsOn = new Date(); // current time
        const startTime = new Date();
        const endTime = new Date();
        const durationMs = endTime - startTime;
        const totalDurationWithBuffer = durationMs + (60 * 60 * 1000);
        const expiresOn = new Date(startsOn.getTime() + totalDurationWithBuffer);
        const prefix = `${caseUuid}/`;
        const blobs = [];
        const iter = containerClient.listBlobsFlat({ prefix });

        let blobItem = await iter.next();
        while (!blobItem.done) {
            blobs.push(blobItem.value);
            blobItem = await iter.next();
        }
        const matchedBlobs = blobs.filter(
            blob => blob.name.includes(filePrefix) && blob.name.endsWith(fileEndsWith)
        );
        if (matchedBlobs.length > 0) {
            for (const matchedBlob of matchedBlobs) {
                const blobClient = containerClient.getBlobClient(matchedBlob.name);
                const sasToken = generateBlobSASQueryParameters(
                    {
                        containerName: CONTAINER_NAME,
                        blobName: matchedBlob.name,
                        permissions: BlobSASPermissions.parse("r"), // read-only
                        startsOn,
                        expiresOn,
                    },
                    blobServiceClient.credential
                ).toString();
                const videoUrl = `${blobClient.url}?${sasToken}`;
                const properties = await blobClient.getProperties();
                const createdOn = properties.createdOn || properties.lastModified;
                summaryUrl.push({
                    videoUrl: videoUrl,
                    createdOn: createdOn ? createdOn.toISOString() : null,
                });
            }
        }
        if (summaryUrl.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: summaryUrl
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log('An error occurred while generate Azure Insurance file Url:', error);
        // throw error;
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.generateReport = async (promptType, userQuery, caseUuid, jobUuid, fileUuid, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid != undefined) {
            let findLatestReport
            if (isGroup && groupUsers && groupUsers.length > 0) {
                findLatestReport = await IncCaseNamesQueries.getReportLatestByCaseuuid(caseUuid, groupUsers);
            }
            else {     
                findLatestReport = await IncCaseNamesQueries.getReportLatestByCaseuuid(caseUuid, userId);
            }
            if (findLatestReport?.isProcessed == '1') {
                const checkStatus = await getIncSummaryStatus(caseUuid)
                Logger.data.IncCase({ caseUuid: caseUuid, response: checkStatus, userId: userId }, "Get-Inc-Summary-Status")
                console.log("******************* Request - 1 - Get Inc Summary Status *******************");
                console.log(checkStatus)
                console.log("******************* Request - 1 - Get Inc Summary Status *******************");
                if (checkStatus?.statusCode == '200' && checkStatus?.obj.status == 'completed') {                    
                    const getThreadId = await IncCaseServices.createOrFindThread(caseUuid, findLatestReport.incCaseId, findLatestReport.id, userId);                    
                    if (getThreadId.statusCode == '200' && getThreadId?.obj?.threadId) {
                        const messageData = {
                            threadId: getThreadId?.obj?.threadId,
                            role: "user",
                            fileUuids: Array.isArray(fileUuid) ? fileUuid.map(item => item.fileUuid).filter(Boolean) : []
                        }

                        let data
                        if (userQuery && promptType == undefined) {
                            messageData.content = userQuery
                            data = {
                                userQuery: userQuery,
                                request: userQuery,
                                threadId: getThreadId.obj.threadId,
                                incCaseId: findLatestReport.incCaseId,
                                reportId: findLatestReport.id,
                                userId: userId
                            }
                        }
                        else if (promptType && userQuery) {
                            const promptOne = await UserQueries.getPromptByType(52);
                            const promptTwo = await UserQueries.getPromptByType(51);
                            if (promptOne.length > 0 && promptTwo.length > 0) {
                                const typeOne = JSON.parse(promptOne[0].prompt);
                                const typeTwo = JSON.parse(promptTwo[0].prompt);
                                messageData.content = typeOne[promptType]
                                data = {
                                    userQuery: typeTwo[promptType]?.key,
                                    request: typeOne[promptType],
                                    threadId: getThreadId.obj.threadId,
                                    incCaseId: findLatestReport.incCaseId,
                                    reportId: findLatestReport.id,
                                    userId: userId
                                }
                            } else {
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
                        const addMessage = await addMessageMediationReport(messageData)
                        Logger.data.IncCase({ request: messageData, response: addMessage }, "Add-Message-Inc-Case-Mediation-Report")
                        console.log("******************* Request - 3 - Mediation Report Add Message *******************");
                        console.log(JSON.stringify(addMessage))
                        console.log("******************* Request - 3 - Mediation Report Add Message *******************");
                        if (addMessage.statusCode == '200' && addMessage?.obj && addMessage?.obj?.messageId) {
                            data.messageId = addMessage.obj.messageId
                            const record = await IncCaseNamesQueries.createMediationReport(data)
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                    requestUuid: record[0]
                                }
                            };
                        }
                        else {
                            return addMessage
                        }
                    }
                    else {
                        return getThreadId
                    }
                }
                else if (checkStatus?.statusCode == '200' && checkStatus?.obj.status == 'pending') {
                    return {
                        message: Strings.INSURANCE_CASE.MEDIATION_REPORT_IN_PROGRESS,
                        statusCode: 400,
                        obj: {}
                    }
                }
                else if (checkStatus === null) {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    };
                }
                else {
                    slack.webhook(JSON.stringify({ action: "Get Inc Summary Status", response: checkStatus, caseUuid: caseUuid, userId: userId }));
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            error: checkStatus
                        }
                    }
                }
            }
            else if (findLatestReport?.isProcessed == '0') {
                return {
                    message: Strings.INSURANCE_CASE.SUMMARY_IN_PROGRESS,
                    statusCode: 400,
                    obj: {}
                };
            }
            else {
                return {
                    message: Strings.INSURANCE_CASE.MEDIATION_REPORT_NOT_FOUND,
                    statusCode: 400,
                    obj: {}
                };
            }
        }
        else if (jobUuid === undefined) {
            return {
                message: Strings.INSURANCE_CASE.INSURANCE_CASE_SUMMARY_NOT_FOUND,
                statusCode: 400,
                obj: {}
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
        console.log("Error while generate Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getReport = async (requestUuid, caseUuid, userId, isGroup, groupUsers) => {
    try {
        const data = await IncCaseNamesQueries.getData(requestUuid, userId);
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
                const all = []
                let list
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    list = await IncCaseNamesQueries.getDataOnCompleteForGroup(caseUuid, userId, groupUsers);
                }
                else {
                    list = await IncCaseNamesQueries.getDataOnComplete(caseUuid, userId);
                }
                if (list.length > 0) {
                    for (const element of list) {
                        const replaceCitations = await IncCaseServices.replaceCitations(element.response, element.citations, caseUuid);
                        all.push({
                            ...element,
                            response: replaceCitations
                        })
                    }
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: all
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
        console.log("Error While get all Report Mediation 15 second api", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getAllReport = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        const all = []
        let list
        if (isGroup && groupUsers && groupUsers.length > 0) {
            list = await IncCaseNamesQueries.getDataOnCompleteForGroup(caseUuid, userId, groupUsers);
        }
        else {
            list = await IncCaseNamesQueries.getDataOnComplete(caseUuid, userId);
        }
        if (list.length > 0) {
            for (const element of list) {
                const replaceCitations = await IncCaseServices.replaceCitations(element.response, element.citations, caseUuid);
                all.push({
                    ...element,
                    response: replaceCitations
                })
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: all
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get all Report ins:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.replaceCitations = async (response, citationMap, caseUuid) => {
    const citations = JSON.parse(citationMap);
    const matches = [...response.matchAll(/\[(\d+)\]/g)];
    const replacements = await Promise.all(
        matches.map(async ([match, citationKey]) => {
            const citation = citations[citationKey];
            if (!citation) {
                return match;
            }
            const { file_name, page_number } = citation;
            const path = `${caseUuid}/${file_name}`;
            const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(path, true);
            // console.log("getFileUrl", getFileUrl);
            Logger.data.IncCase({ request: path, response: getFileUrl, caseUuid: caseUuid, methodName: "generateAzureInsuranceFileUrl" }, "Get-File-Url");
            if (getFileUrl?.statusCode === 200 && getFileUrl?.obj?.videoUrl) {
                return `[[${citationKey}][Reference: ${file_name}, Pages ${page_number}]](${getFileUrl.obj.videoUrl}#page=${page_number})`;
            }
            return match;
        })
    );
    let index = 0;
    return response.replace(/\[(\d+)\]/g, () => replacements[index++]);
};

IncCaseServices.replaceCitationsOptimized = async (response, citationMap, caseUuid) => {
    if (!response || !citationMap) return response;

    const citations = JSON.parse(citationMap);
    const matches = [...response.matchAll(/\[(\d+)\]/g)];

    if (!matches.length) return response;

    const fileUrlCache = {}; // cache per file
    const replacements = [];

    for (const [match, citationKey] of matches) {

        const citation = citations[citationKey];
        if (!citation) {
            replacements.push(match);
            continue;
        }

        const { file_name, page_number } = citation;

        // generate URL only once per file
        if (!fileUrlCache[file_name]) {

            const path = `${caseUuid}/${file_name}`;

            const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(path, true);

            Logger.data.IncCase(
                { request: path, response: getFileUrl, caseUuid, methodName: "generateAzureInsuranceFileUrl" },
                "Get-File-Url"
            );

            fileUrlCache[file_name] = getFileUrl?.statusCode === 200
                ? getFileUrl?.obj?.videoUrl
                : null;
        }

        const url = fileUrlCache[file_name];

        if (url) {
            replacements.push(
                `[[${citationKey}][Reference: ${file_name}, Pages ${page_number}]](${url}#page=${page_number})`
            );
        } else {
            replacements.push(match);
        }
    }

    let index = 0;
    return response.replace(/\[(\d+)\]/g, () => replacements[index++]);
};

IncCaseServices.replaceCitationsOptimizedWithReference = async (response, citationMap, caseUuid) => {
    if (!response || !citationMap) return response;

    const citations = JSON.parse(citationMap);
    const matches = [...response.matchAll(/\[(\d+)\]/g)];

    if (!matches.length) return response;

    const fileUrlCache = {}; // cache per file
    const replacements = [];

    for (const [match, citationKey] of matches) {

        const citation = citations[citationKey];
        if (!citation) {
            replacements.push(match);
            continue;
        }

        const { file_name, page_number, reference, record_data } = citation;

        // generate URL only once per file
        if (!fileUrlCache[file_name]) {

            const path = `${caseUuid}/${file_name}`;

            const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(path, true);

            Logger.data.IncCase(
                { request: path, response: getFileUrl, caseUuid, methodName: "generateAzureInsuranceFileUrl" },
                "Get-File-Url"
            );

            fileUrlCache[file_name] = getFileUrl?.statusCode === 200
                ? getFileUrl?.obj?.videoUrl
                : null;
        }

        const url = fileUrlCache[file_name];
        if (url) {

            console.log("1", `${record_data ? `[citation: ${record_data}]` : ''}`);
            

            if (reference) {
                replacements.push(
                    `[[${citationKey}][Reference: ${reference}]](${url}#page=${page_number})`
                );
            }
            else {
                replacements.push(
                    `[[${citationKey}][Reference: ${file_name}, Pages ${page_number}]](${url}#page=${page_number})`                
                );
            }
        } else {
            replacements.push(match);
        }
    }

    let index = 0;
    return response.replace(/\[(\d+)\]/g, () => replacements[index++]);
};

IncCaseServices.createOrFindThread = async (requestUuid, caseId, reportId, userId) => {
    try {
        const findThreadId = await IncCaseNamesQueries.findThreadId(caseId, reportId, userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            console.log("***************************************************************");
            console.log("using thread_id from db =>", data);
            console.log("***************************************************************");
            Logger.data.IncCase({ request: userId, response: data, caseUuid: requestUuid, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Kolabrya-Inc-Case-Mediation-Report");
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: {
                    threadId: data
                }
            }
        } else {
            const getReportContext = await IncCaseServices.reportContext(caseId, userId)
            const pineconePayload = {
                caseUuid: requestUuid,
                caseContext: JSON.stringify(getReportContext.obj)
            }
            const createThread = await createIncSummaryThread(pineconePayload)
            Logger.data.IncCase({ request: pineconePayload, response: createThread, caseUuid: requestUuid, userId: userId }, "Create-Thread-Gemini")
            console.log("******************* Request - 2 - Inc Summary Create Thread *******************");
            console.log(createThread)
            console.log("******************* Request - 2 - Inc Summary Create Thread *******************");
            if (createThread?.statusCode == '200' && createThread?.obj.threadId) {
                console.log("************************************************************************************");
                console.log("Creating a New thread_id for Kolabrya Inc Summary =>", createThread.obj.threadId);
                console.log("************************************************************************************");
                Logger.data.IncCase({ request: pineconePayload, response: createThread, caseUuid: requestUuid, userId: userId, methodName: "createThreadIncSummary" }, "Create-Thread-For-Kolabrya-Inc-Case-Mediation-Report-Open-AI");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: createThread.obj.threadId
                    }
                }
            } else {
                Logger.data.IncCase({ request: pineconePayload, response: createThread, caseUuid: requestUuid, userId: userId, methodName: "createThreadIncSummary" }, "Create-Thread-For-Kolabrya-Inc-Case-Mediation-Report-Error-Open-AI");
                slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Inc Summary", response: createThread, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: createThread
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for Kolabrya Inc Summary.', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.createOrFindThreadSettlementt = async (requestUuid, caseId, reportId, userId) => {
    try {
        const findThreadId = await IncCaseNamesQueries.findThreadIdSettlement(caseId, reportId, userId);
        const data = findThreadId?.threadId;
        if (data != '' && data) {
            console.log("***************************************************************");
            console.log("using thread_id from db =>", data);
            console.log("***************************************************************");
            Logger.data.IncCase({ request: userId, response: data, jobUuid: requestUuid, userId: userId, methodName: "createOrFindThread" }, "Get-ThreadId-From-DB-For-Kolabrya-Inc-Case-Settlement");
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: {
                    threadId: data
                }
            }
        } else {
            const getReportContext = await IncCaseServices.reportContext(caseId, userId)
            const pineconePayload = {
                summaryUuid: requestUuid,
                caseContext: JSON.stringify(getReportContext.obj)
            }
            const createThread = await createIncSettlementThread(pineconePayload)
            Logger.data.IncCase({ request: pineconePayload, response: createThread, jobUuid: requestUuid, userId: userId }, "Create-Thread-Settlement")
            console.log("******************* Request - 2 - Inc Settlement Create Thread *******************");
            console.log(createThread)
            console.log("******************* Request - 2 - Inc Settlement Create Thread *******************");
            if (createThread?.statusCode == '200' && createThread?.obj.threadId) {
                console.log("************************************************************************************");
                console.log("Creating a New thread_id for Kolabrya Inc Settlement =>", createThread.obj.threadId);
                console.log("************************************************************************************");
                Logger.data.IncCase({ request: pineconePayload, response: createThread, jobUuid: requestUuid, userId: userId, methodName: "createThreadIncSettlement" }, "Create-Thread-For-Kolabrya-Inc-Case-Settlement");
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: {
                        threadId: createThread.obj.threadId
                    }
                }
            } else {
                Logger.data.IncCase({ request: pineconePayload, response: createThread, jobUuid: requestUuid, userId: userId, methodName: "createThreadIncSettlement" }, "Create-Thread-For-Kolabrya-Inc-Case-Settlement");
                slack.webhook(JSON.stringify({ action: "make Threads for Kolabrya Inc Settlement", response: createThread, userId: userId }));
                return {
                    statusCode: 400,
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    obj: createThread
                }
            }
        }
    } catch (error) {
        console.log('An error occurred while creating or finding a thread for making threads for Kolabrya Inc Settlement.', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.reportContext = async (caseId, userId) => {
    try {
        const record = await IncCaseNamesQueries.getFileStatusSendReportById(caseId, userId)
        if (record.length > 0) {
            const questionnaire = [];
            let dataObject = {
                caseInfoHeader: {}
            }
            if (record[0]?.caseTypeId === 1) { //tort
                if (record[0]?.plaintiffFirstName != null || record[0]?.plaintiffLastName != null) {
                    dataObject.caseInfoHeader.plaintiff = `${record[0]?.plaintiffFirstName} ${record[0]?.plaintiffLastName}`.trim();
                }
                if (record[0]?.plaintiffDOB != null) {
                    dataObject.caseInfoHeader.plaintiffDob = moment(record[0].plaintiffDOB).format("YYYY-MM-DD");
                }
                if (record[0]?.dateOfLossTort != null) {
                    dataObject.caseInfoHeader.DateofLoss = moment(record[0].dateOfLossTort).format("YYYY-MM-DD");
                }
                if (record[0]?.insuredDefendant != null) {
                    dataObject.caseInfoHeader.defendant = record[0].insuredDefendant;
                }
                const prompt = await UserQueries.getPromptByType(44);
                if (prompt.length > 0) {
                    const types = JSON.parse(prompt[0].prompt);
                    if (record[0]?.liabilityDispute != null) {
                        questionnaire.push({
                            "question": types[6]?.label,
                            "answer": record[0]?.liabilityDispute == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[6]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.incomeLoss != null) {
                        questionnaire.push({
                            "question": types[7]?.label,
                            "answer": record[0]?.incomeLoss == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[7]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.housekeepingRequired != null) {
                        questionnaire.push({
                            "question": types[8]?.label,
                            "answer": record[0]?.housekeepingRequired == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[8]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.futureCareNeeded != null) {
                        questionnaire.push({
                            "question": types[9]?.label,
                            "answer": record[0]?.futureCareNeeded == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[9]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.outOfPocketExpenses != null) {
                        questionnaire.push({
                            "question": types[10]?.label,
                            "answer": record[0]?.outOfPocketExpenses == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[10]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.previousAccident != null) {
                        questionnaire.push({
                            "question": types[11]?.label,
                            "answer": record[0]?.previousAccident == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[11]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.previousAccidentDate != null) {
                        questionnaire.push({

                            "question": types[11].conditional.fields[0].label,
                            "answer": record[0]?.previousAccidentDate
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[11].conditional.fields[0].label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.subsequentAccident != null) {
                        questionnaire.push({
                            "question": types[12]?.label,
                            "answer": record[0]?.subsequentAccident == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[12]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.subsequentAccidentDate != null) {
                        questionnaire.push({
                            "question": types[12].conditional.fields[0].label,
                            "answer": record[0]?.subsequentAccidentDate
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[12].conditional.fields[0].label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }
                }
            }
            else if (record[0]?.caseTypeId === 2) { //ab matter
                if (record[0]?.applicantiffFirstName != null || record[0]?.applicantiffLastName != null) {
                    dataObject.caseInfoHeader.applicant = `${record[0]?.applicantiffFirstName} ${record[0]?.applicantiffLastName}`.trim();
                }
                if (record[0]?.applicantiffDOB != null) {
                    dataObject.caseInfoHeader.applicantDob = moment(record[0].applicantiffDOB).format("YYYY-MM-DD");
                }
                if (record[0]?.insuredDefendantAB != null) {
                    dataObject.caseInfoHeader.defendant = record[0].insuredDefendantAB;
                }
                if (record[0]?.dateOfLossAB != null) {
                    dataObject.caseInfoHeader.DateofLoss = moment(record[0].dateOfLossAB).format("YYYY-MM-DD");
                }

                const prompt = await UserQueries.getPromptByType(50);
                if (prompt.length > 0) {
                    const types = JSON.parse(prompt[0].prompt);

                    if (record[0]?.applicantiffInMIG != null) {
                        questionnaire.push({
                            "question": types[6]?.label,
                            "answer": record[0]?.applicantiffInMIG == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[6]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.disputingCAT != null) {
                        questionnaire.push({
                            "question": types[6].conditional.fields[0].label,
                            "answer": record[0]?.disputingCAT == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[6].conditional.fields[0].label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.summaryOfOCF18 != null) {
                        questionnaire.push({
                            "question": types[7]?.label,
                            "answer": record[0]?.summaryOfOCF18 == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[7]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.summaryOfOCF6 != null) {
                        questionnaire.push({
                            "question": types[8]?.label,
                            "answer": record[0]?.summaryOfOCF6 == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[8]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.attendantCareDispute != null) {
                        questionnaire.push({
                            "question": types[9]?.label,
                            "answer": record[0]?.attendantCareDispute == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[9]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }

                    if (record[0]?.specifiedBenefitsDispute != null) {
                        questionnaire.push({
                            "question": types[10]?.label,
                            "answer": record[0]?.specifiedBenefitsDispute == 1 ? 'Yes' : 'No'
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    } else {
                        questionnaire.push({
                            "question": types[10]?.label,
                            "answer": ""
                        })
                        dataObject.caseInfoHeader.questionnaire = questionnaire
                    }
                }
            }
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: dataObject
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log('Error while fetching report Context', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.updateMediationReport = async (messageId, threadId, role, content, status, sourceChunks, citations, allData) => {
    try {
        Logger.data.IncCase({ response: allData }, "Response-Webhook-Ins-Case-Mediation-Report");
        const data = await IncCaseNamesQueries.findMediationReport(messageId, threadId)
        if (data?.length > 0 && messageId && threadId && role && content && status && sourceChunks) {
            console.log("*************************************************");
            console.log("Got the hit For Sending Ins Case Mediation Report");
            console.log("*************************************************");
            if (status) {
                const record = {
                    status: true,
                    response: content,
                    citations: JSON.stringify(citations),
                    jsonResponse: JSON.stringify(sourceChunks)
                }
                await IncCaseNamesQueries.updateByMessageId(record, messageId, threadId)
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
                };
            } else {
                slack.webhook(JSON.stringify({ action: "Mediation Report Failed", threadId: threadId, messageId: messageId }));
                await IncCaseNamesQueries.updateByMessageId({ isActivated: false, status: 2 }, messageId, threadId)
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: allData
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
        console.log("Error in update Mediation Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.deleteAllReport = async (userId) => {
    try {
        const obj = {
            isActivated: false
        }
        const find = await IncCaseNamesQueries.deleteMediationReport(obj, userId)
        if (find[0] > 0) {
            return {
                statusCode: 200,
                message: Strings.RECORD_DELETED_SUCCESS,
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
        console.log("Error in delete All Report Mideation:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.generateSummaryReport = async (reportType, caseUuid, clientSide, reportStructure, selectedSections, userId, isGroup, groupUsers) => {
    try {
        if (reportType && caseUuid != undefined) {
            let findLatestReport;
            if (isGroup && groupUsers && groupUsers.length > 0) {
                findLatestReport = await IncCaseNamesQueries.getReportLatestSummaryByCaseuuid(caseUuid, reportType, groupUsers)
            }
            else {
                findLatestReport = await IncCaseNamesQueries.getReportLatestSummaryByCaseuuid(caseUuid, reportType, userId)
            }
            if (findLatestReport?.isProcessed == '1') {
                const customSections = []
                const findStatus = await generateSummaryReportStatus(caseUuid, reportType)
                Logger.data.IncCase({ request: { caseUuid: caseUuid, reportType: reportType }, response: findStatus, userId: userId }, "Generate-Summary-Report-Status-Inc")
                console.log("******************* Request - 1 - Generate Inc Summary Report Status Inc *******************");
                console.log(findStatus)
                console.log("******************* Request - 1 - Generate Inc Summary Report Status Inc *******************");
                if (findStatus?.statusCode == '200' && findStatus?.obj.status == true) {
                    const additionalData = {}
                    const payload = {
                        caseUuid: caseUuid,
                        reportType: reportType,
                        additionalData: additionalData
                    }
                    const findSections = []
                    if (isGroup && groupUsers && groupUsers.length > 0 && selectedSections?.length > 0) {
                        const list = await IncCaseNamesQueries.getSection(caseUuid, selectedSections, reportType, groupUsers);
                        if (list?.length > 0) {
                            for (const element of list) {
                                findSections.push({ sectionTitle: element.title, sectionDetails: element.description })
                            }
                        }
                    }
                    else if (selectedSections?.length > 0) {
                        const list = await IncCaseNamesQueries.getSection(caseUuid, selectedSections, reportType, userId);
                        if (list?.length > 0) {
                            for (const element of list) {
                                findSections.push({ sectionTitle: element.title, sectionDetails: element.description })
                            }
                        }
                    }
                    additionalData.customSections = customSections
                    if (findSections?.length > 0) {
                       additionalData.customSections = findSections
                    }
                    if (reportType == '2') {
                        additionalData.isPlaintiff = false
                        additionalData.isDefendant = false   
                    }
                    additionalData.isCustom = false
                    if (reportStructure == '1' && findSections?.length > 0 && (clientSide == '0' || clientSide == '1')) {
                        additionalData.isCustom = true
                    }
                    else if (reportStructure == '0' && clientSide == '0') {
                        additionalData.isPlaintiff = true
                    }
                    else if (reportStructure == '0' && clientSide == '1') {
                        additionalData.isDefendant = true
                    }
                    else if (reportStructure == '1' && findSections?.length > 0 && reportType == '1') {
                        additionalData.isCustom = true
                    }
                    const checkStatus = await generateSummaryReport(payload)
                    Logger.data.IncCase({ request: payload, response: checkStatus, userId: userId }, "Generate-Summary-Report-Inc")
                    console.log("******************* Request - 2 - Generate Summary Report Inc *******************");
                    console.log(checkStatus)
                    console.log("******************* Request - 2 - Generate Summary Report Inc *******************");
                    if (checkStatus?.statusCode == '200' && checkStatus?.obj.status == true) {
                        const data = {
                            userId: userId,
                            incCaseId: findLatestReport?.incCaseId,
                            reportId: findLatestReport?.id,
                            reportType: reportType,
                            jobUuid: checkStatus?.obj.jobUuid
                        }
                        const record = await IncCaseNamesQueries.createSummaryReport(data)
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                requestUuid: record[0]
                            }
                        };
                    }
                    else {
                        slack.webhook(JSON.stringify({ action: "Post Inc Summary Report Status", caseUuid: caseUuid, response: checkStatus, userId: userId }));
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: {
                                error: checkStatus
                            }
                        }
                    }
                }
                else if (findStatus?.statusCode == '200' && findStatus?.obj.status == false) {
                    return {
                        message: Strings.INSURANCE_CASE.INSURANCE_CASE_REPORT_NOT_FOUND, //sharyar will share the updated user message
                        statusCode: 400,
                        obj: {}
                    }
                }
                else {
                    slack.webhook(JSON.stringify({ action: "Generate Inc Summary Report Status", caseUuid: caseUuid, response: findStatus, userId: userId }));
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            error: findStatus
                        }
                    }
                }
            }
            else if (findLatestReport?.isProcessed == '0') {
                return {
                    message: Strings.INSURANCE_CASE.SUMMARY_IN_PROGRESS,
                    statusCode: 400,
                    obj: {}
                };
            }
            else if (findLatestReport['incCaseSummaryDetails.requestUuid'] != null) {  //if the one report of one case is in progress do not start the other
                return {
                    message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                    statusCode: 400,
                    obj: {}
                };
            }
            else {
                return {
                    message: Strings.INSURANCE_CASE.MEDIATION_REPORT_NOT_FOUND,
                    statusCode: 400,
                    obj: {}
                };
            }
        }
        else if (caseUuid === undefined) {
            return {
                message: Strings.INSURANCE_CASE.INSURANCE_CASE_SUMMARY_NOT_FOUND,
                statusCode: 400,
                obj: {}
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
        console.log("Error in Generate Summary Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getSummaryReport = async (caseUuid, requestUuid, reportType, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid && requestUuid) {
            const data = await IncCaseNamesQueries.getSummaryReportData(requestUuid, userId);
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
                    let list
                    const all = []
                    if (isGroup && groupUsers && groupUsers.length > 0) {
                        list = await IncCaseNamesQueries.getSummaryDataOnComplete(caseUuid, reportType, groupUsers);
                    } else {
                        list = await IncCaseNamesQueries.getSummaryDataOnComplete(caseUuid, reportType, userId);
                    }                    
                    if (list.length > 0) {
                        for (const element of list) {
                            const replaceCitations = await IncCaseServices.replaceCitationsOptimized(element.response, element.citations, caseUuid);
                            all.push({
                                requestUuid: element.requestUuid,
                                status: element.status,
                                response: replaceCitations
                            })
                        }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: all
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error While get all Summary Report 15 second api", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getAllSummaryReport = async (caseUuid, reportType, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid) {
            let list
            if (isGroup && groupUsers && groupUsers.length > 0) {
                list = await IncCaseNamesQueries.getSummaryDataOnCompleteAndPendingForGroup(caseUuid, reportType, userId, groupUsers);
            } else { 
                list = await IncCaseNamesQueries.getSummaryDataOnCompleteAndPending(caseUuid, reportType, userId);
            }            
            if (list.length > 0 && list[0]?.status == 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        status: 0,
                        requestUuid: list[0]?.requestUuid,
                        caseUuid: caseUuid
                    }
                }
            }
            else if (list.length > 0 && list[0]?.status == 1) {
                const all = []
                let record
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    record = await IncCaseNamesQueries.getSummaryDataOnCompleteForGroup(caseUuid, reportType, userId, groupUsers);
                } else { 
                    record = await IncCaseNamesQueries.getSummaryDataOnComplete(caseUuid, reportType, userId);
                }        
                if (record.length > 0) {
                    for (const element of record) {
                        const replaceCitations = await IncCaseServices.replaceCitationsOptimized(element.response, element.citations, caseUuid);
                        all.push({
                            // ...element,
                            requestUuid: element.requestUuid,
                            status: element.status,
                            response: replaceCitations
                        })
                    }
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: all
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
        console.log("Error in get all Summary Report ins:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.deleteAllSummaryReport = async (caseUuid, reportType, userId, isGroup, groupUsers) => {
    try {
        const obj = {
            isActivated: false
        }
        let getData
        if (isGroup && groupUsers && groupUsers.length > 0) {
            getData = await IncCaseNamesQueries.getSummaryDataOnComplete(caseUuid, reportType, groupUsers)
        } else {
            getData = await IncCaseNamesQueries.getSummaryDataOnComplete(caseUuid, reportType, userId)
        }
        if (getData.length > 0) {
            for (const element of getData) {
                await IncCaseNamesQueries.deleteSummaryReport(obj, element.requestUuid, reportType, userId)
            }
            return {
                statusCode: 200,
                message: Strings.RECORD_DELETED_SUCCESS,
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
        console.log("Error in delete All Summary Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.reportSummary = async (jobUuid, status, reportData, citations, allData) => {
    try {
        Logger.data.IncCase({ response: allData }, "Response-Webhook-Ins-Case-Summary-Report");        
        const list = await IncCaseNamesQueries.findSummaryReport(jobUuid)
        if (list?.length > 0 && reportData != 'null' && jobUuid) {   
            console.log("***********************************************");
            console.log("Got the hit For Sending Ins Case Summary Report");
            console.log("***********************************************");
            if (status) {
                const record = {
                    status: true,
                    response: reportData,
                    citations: JSON.stringify(citations)
                }
                await IncCaseNamesQueries.updateByIdSummaryReport(record, list[0].id)
                const findUser = await UserQueries.getUser(list[0]?.userId)
                if (findUser?.email) {
                    const parentEmailStatus = await Emails.medicalDraftReport(findUser?.email);
                    Logger.data.IncCase({ request: findUser?.email, response: parentEmailStatus, jobUuid: jobUuid }, "Send-Case-Draft-Mediation-Medical-Report-Email-Inc");
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
                };
            } else {
                slack.webhook(JSON.stringify({ action: "Mediation/Medical Summary Report Failed", jobUuid: jobUuid, requestUuid: list[0].requestUuid }));
                await IncCaseNamesQueries.updateByIdSummaryReport({ isActivated: false, status: 2 }, list[0].id)
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: allData
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
        console.log("Error in update summary Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.presignedUrls = async (files, caseUuid, userId, isGroup, groupUsers) => {
    try {
        if ((files?.length > 0 && files?.length <= allowedFile) && AZURE_ENABLE === 'true' && azureInsuranceHealth === true && caseUuid && userId) {
            let record
            if (isGroup && groupUsers && groupUsers.length > 0) {
                record = await IncCaseNamesQueries.findCaseByUserId(caseUuid, groupUsers);
            }
            else {
                record = await IncCaseNamesQueries.findCaseByUserId(caseUuid, userId)
            }
            if (record.length > 0) {
                let result;
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    result = await IncCaseFilesQueries.countFiles(record[0].id, groupUsers);
                }
                else {
                    result = await IncCaseFilesQueries.countFiles(record[0].id, userId);
                }
                let fileCount = allowedFile - result;
                if (result < allowedFile) {
                    if (files?.length <= fileCount) {
                        const urls = [];
                        for (const file of files) {
                            const { fileName, mimeType, size, fieldName, pageCount, folderName } = file;

                            let findDuplicateFile;
                            if (isGroup && groupUsers && groupUsers.length > 0) {
                                findDuplicateFile = await IncCaseFilesQueries.findDuplicateFile(fileName, record[0].id, groupUsers);
                            }else {
                                findDuplicateFile = await IncCaseFilesQueries.findDuplicateFile(fileName, record[0].id, userId);
                            }

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
                                    message: Strings.FILE.ACCEPT_FILE_PDF,
                                    statusCode: 400,
                                    obj: {}
                                };
                            }
                            if (size > FILE_SIZE_LIMITS[fieldName]) {
                                return {
                                    message: Strings.INSURANCE_CASE.INSURANCE_CASE_DOC_SIZE_LIMIT,
                                    statusCode: 400,
                                    obj: {}
                                };
                            }
                            const blobName = `${caseUuid}/${fileName}`;
                             const safeFolderName = folderName ? folderName.trim() : null;
                            const folderPath = safeFolderName
                                ? `${caseUuid}/${safeFolderName}/${fileName}`
                                : `${caseUuid}/${fileName}`;

                            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                            const sasToken = generateBlobSASQueryParameters(
                                {
                                    containerName: process.env.INSURANCE_AZURE_CONTAINER,
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
                                folderPath: folderPath,
                                uploadUrl: `${blockBlobClient.url}?${sasToken}`,
                            });
                        }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: urls
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
            };
        }
    } catch (error) {
        console.log("Error in generate Presigned Urls:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};


IncCaseServices.generateSettlement = async (promptType, userQuery, caseUuid, caseType, jobUuid, userId) => {
    try {
        if (caseUuid != undefined && jobUuid != undefined) {
            const findLatestSettlement = await IncCaseNamesQueries.getReportLatestByCaseuuid(caseUuid, userId)
            // if (jobUuid != null && findLatestSettlement?.isProcessed == '1') {
            if (findLatestSettlement?.isProcessed == '1') {
                const checkStatus = await getIncSettlementStatus(jobUuid)// chnage API
                Logger.data.IncCase({ request: jobUuid, response: checkStatus, userId: userId }, "Get-Inc-Settlement-Status")
                console.log("******************* Request - 1 - Get Inc Settlement Status *******************");
                console.log(checkStatus)
                console.log("******************* Request - 1 - Get Inc Settlement Status *******************");
                if (checkStatus?.statusCode == '200' && checkStatus?.obj.status == 'completed') {
                    const getThreadId = await IncCaseServices.createOrFindThreadSettlementt(jobUuid, findLatestSettlement.incCaseId, findLatestSettlement.id, userId)
                    if (getThreadId.statusCode == '200' && getThreadId?.obj?.threadId) {
                        const messageData = {
                            threadId: getThreadId?.obj?.threadId,
                            role: "user"
                        }
                        let data
                        if (userQuery && promptType == undefined) {
                            messageData.content = userQuery
                            data = {
                                userQuery: userQuery,
                                request: userQuery,
                                threadId: getThreadId.obj.threadId,
                                incCaseId: findLatestSettlement.incCaseId,
                                reportId: findLatestSettlement.id,
                                userId: userId
                            }
                        }
                        else if (promptType && userQuery) {
                            const promptOne = await UserQueries.getPromptByType(57);
                            let promptTwo
                            if (caseType == 1) {
                                promptTwo = await UserQueries.getPromptByType(55);
                            } else {
                                promptTwo = await UserQueries.getPromptByType(56);
                            }

                            if (promptOne.length > 0 && promptTwo.length > 0) {
                                const typeOne = JSON.parse(promptOne[0].prompt);
                                const typeTwo = JSON.parse(promptTwo[0].prompt);
                                messageData.content = typeOne[promptType]
                                data = {
                                    userQuery: typeTwo[promptType]?.key,
                                    request: typeOne[promptType],
                                    threadId: getThreadId.obj.threadId,
                                    incCaseId: findLatestSettlement.incCaseId,
                                    reportId: findLatestSettlement.id,
                                    userId: userId
                                }
                            } else {
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
                        console.log("messageData", messageData);
                        const addMessage = await addMessageMediationSettlement(messageData)
                        Logger.data.IncCase({ request: messageData, response: addMessage }, "Add-Message-Inc-Case-Settlement")
                        console.log("******************* Request - 3 - Settlement Add Message *******************");
                        console.log(JSON.stringify(addMessage))
                        console.log("******************* Request - 3 - Settlement Add Message *******************");
                        if (addMessage.statusCode == '200' && addMessage?.obj && addMessage?.obj?.messageId) {
                            data.messageId = addMessage.obj.messageId
                            const record = await IncCaseNamesQueries.createMediationSettlement(data)
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                    requestUuid: record[0]
                                }
                            };
                        }
                        else {
                            return addMessage
                        }
                    }
                    else {
                        return getThreadId
                    }
                }
                else if (checkStatus?.statusCode == '200' && checkStatus?.obj.status == 'pending') {
                    return {
                        message: Strings.INSURANCE_CASE.MEDIATION_REPORT_IN_PROGRESS,
                        statusCode: 400,
                        obj: {}
                    }
                }
                else if (checkStatus === null) {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    };
                }
                else {
                    slack.webhook(JSON.stringify({ action: "Get Inc Settlement Status", response: checkStatus, jobUuid: findLatestSettlement.jobUuid, userId: userId }));
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            error: checkStatus
                        }
                    }
                }
            }
            else if (findLatestSettlement?.isProcessed == '0') {
                return {
                    message: Strings.INSURANCE_CASE.SUMMARY_IN_PROGRESS,
                    statusCode: 400,
                    obj: {}
                };
            }
            else {
                return {
                    message: Strings.INSURANCE_CASE.MEDIATION_REPORT_NOT_FOUND,
                    statusCode: 400,
                    obj: {}
                };
            }
        }
        else if (caseUuid === undefined || jobUuid === undefined) {
            return {
                message: Strings.INSURANCE_CASE.INSURANCE_CASE_SUMMARY_NOT_FOUND,
                statusCode: 400,
                obj: {}
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
        console.log("Error generate Settlement ins:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getInjuryTracking = async (requestUuid, caseUuid, userId, isGroup, groupUsers) => {
    try {
        const data = await IncCaseNamesQueries.getInjuryTracking(requestUuid, userId);
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
                let record
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    record = await IncCaseNamesQueries.getInjuryTrackingOnCompleteForGroup(caseUuid, userId, groupUsers);
                } else {
                    record = await IncCaseNamesQueries.getInjuryTrackingOnComplete(caseUuid, userId);
                }
                if (record.length > 0) {
                    const data = await IncCaseServices.injuryTrackerPageNUmberFormatter(record, caseUuid);
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
        console.log("Error While get all Settlement  15 second api", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.injuryTrackerPageNUmberFormatter = async (record, caseUuid) => {
    for (const element of record) {
        const parsedResponse = element.response;
        for (const item of parsedResponse) {
            if (item.reference) {
                const match = item.reference.match(/(.+?),\s*Pages?\s+([\d,\s-]+)/i);
                if (match && match[2]) {
                    const pagePart = match[2].trim();
                    let pages = [];
                    if (pagePart.includes('-')) {
                        // Handle range e.g. 2-4
                        const [start, end] = pagePart
                            .split('-')
                            .map(n => parseInt(n.trim(), 10));

                        if (!isNaN(start) && !isNaN(end)) {
                            for (let i = start; i <= end; i++) {
                                pages.push(i);
                            }
                        }
                    } else {
                        // Handle comma-separated e.g. 2,3,4
                        pages = pagePart
                            .split(',')
                            .map(p => parseInt(p.trim(), 10))
                            .filter(n => !isNaN(n));
                    }
                    item.pages = pages;
                }
                if (match && match[1]) {
                    const path = caseUuid + '/' + match[1].trim();
                    const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(path);
                    item.fileUrl =
                        getFileUrl?.statusCode == '200' && getFileUrl?.obj?.videoUrl
                            ? getFileUrl.obj.videoUrl
                            : '';
                }
            }
        }
        element.response = parsedResponse;
    }
    return record;
}

IncCaseServices.getAllInjuryTracking = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid) {
            let list
            if (isGroup && groupUsers && groupUsers.length > 0) {
                list = await IncCaseNamesQueries.getInjuryDataOnCompleteAndPendingForGroup(caseUuid, userId, groupUsers);
            } else {
                list = await IncCaseNamesQueries.getInjuryDataOnCompleteAndPending(caseUuid, userId);
            }
            if (list.length > 0 && list[0]?.status == 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        status: 0,
                        requestUuid: list[0]?.requestUuid,
                        caseUuid: caseUuid
                    }
                }
            }
            else if (list.length > 0 && list[0]?.status == 1) {
                let record
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    record = await IncCaseNamesQueries.getInjuryTrackingOnCompleteForGroup(caseUuid, userId, groupUsers);
                } else {
                    record = await IncCaseNamesQueries.getInjuryTrackingOnComplete(caseUuid, userId);
                }
                if (record.length > 0) {
                    const data = await IncCaseServices.injuryTrackerPageNUmberFormatter(record, caseUuid);
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
            }
            else {
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
        console.log("Error While get all injury tracking on page load", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getSettlement = async (requestUuid, caseUuid, userId) => {
    try {
        const data = await IncCaseNamesQueries.getSettlementData(requestUuid, userId);
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
                const list = await IncCaseNamesQueries.getSettlementDataOnComplete(caseUuid, userId);
                if (list.length > 0) {
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
        console.log("Error While get all Settlement  15 second api", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getAllSettlement = async (caseUuid, userId) => {
    try {
        const list = await IncCaseNamesQueries.getSettlementDataOnComplete(caseUuid, userId);
        if (list.length > 0) {
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
        console.log("Error in get all Settlement ins:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.deleteAllSettlement = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        const obj = {
            isActivated: false
        }
        let find;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            find = await IncCaseNamesQueries.getSettlementDataOnComplete(caseUuid, groupUsers);
        } else {
            find = await IncCaseNamesQueries.getSettlementDataOnComplete(caseUuid, userId);
        }
        if (find?.length > 0) {
            for (const element of find) {
                //add the logic here based on observation
                await IncCaseNamesQueries.deleteSettlemnetReport(obj, element.requestUuid, userId)
            }
            return {
                statusCode: 200,
                message: Strings.RECORD_DELETED_SUCCESS,
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
        console.log("Error in delete All Settlement:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.updateInjuryTracking = async (jobUuid, status, response, allData) => {
    try {
        Logger.data.IncCase({ response: allData }, "Response-Webhook-Injury-Tracking-Report-Report");
        const data = await IncCaseNamesQueries.findInjuryTrackingReport(jobUuid)
        if (data?.length > 0 && jobUuid) {
            console.log("*******************************************************");
            console.log("Got the hit For Sending Ins Case Injury Tracking Report");
            console.log("*******************************************************");
            if (status) {
                const record = {
                    status: true,
                    response: response,
                }
                await IncCaseNamesQueries.updateByJobIdInjuryTracking(record, jobUuid)
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
                };
            } else {
                slack.webhook(JSON.stringify({ action: "Injury Tracking Report Failed", jobUuid: jobUuid, userId: data[0].userId }));
                await IncCaseNamesQueries.updateByJobIdInjuryTracking({ isActivated: false, status: 2 }, jobUuid)
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: allData
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
        console.log("Error in update Injury Tracking Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.updateSettlementReport = async (messageId, threadId, role, content, status, sourceChunks, allData) => {
    try {
        Logger.data.IncCase({ response: allData }, "Response-Webhook-Ins-Case-Settlement-Report");
        const data = await IncCaseNamesQueries.findSettlementReport(messageId, threadId)
        if (data?.length > 0 && messageId && threadId && role && content && status && sourceChunks) {
            console.log("*************************************************");
            console.log("Got the hit For Sending Ins Case Settlement Report");
            console.log("*************************************************");
            if (status) {
                const record = {
                    status: true,
                    response: content,
                    jsonResponse: JSON.stringify(sourceChunks)
                }
                await IncCaseNamesQueries.updateByMessageIdSettlement(record, messageId, threadId)
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
                };
            } else {
                slack.webhook(JSON.stringify({ action: "Settlement Report Failed", threadId: threadId, messageId: messageId }));
                await IncCaseNamesQueries.updateByMessageIdSettlement({ isActivated: false, status: 2 }, messageId, threadId)
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: allData
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
        console.log("Error in update Settlement Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.emailReport = async () => {
    try {
        const data = await IncCaseNamesQueries.emailReport();
        if (data.length > 0) {
            const formattedData = await IncCaseServices.cleanMonthlyData(data)
            const htmlTable = IncCaseServices.generateEmailReportHTML(formattedData);
            const emails = process.env.BP_SEND_REPORT_DAILY_EMAILS.split(',');
            console.log(emails);
            emails.forEach(e => {
                Emails.ReportSummary(e, 'Insurance Daily Report', htmlTable);
            })
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    // htmlTable: htmlTable,
                    formattedData: formattedData
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
        console.log("Error in email insurance usage report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.cleanMonthlyData = async (rawData) => {
    const userMap = {};
    rawData.forEach(item => {
        const {
            userId,
            email,
            caseUuid,
            caseName,
            fileName,
            pageCount,
            isProcessed
        } = item;

        if (!userMap[userId]) {
            userMap[userId] = {
                userId,
                email,
                cases: {}
            };
        }

        const user = userMap[userId];
        if (!user.cases[caseUuid] && caseUuid != null) {
            user.cases[caseUuid] = {
                caseUuid,
                caseName,
                files: [],
                totalFiles: 0,
                processedFiles: 0,
                failedFiles: 0,
                totalPageCount: 0
            };
        }
        const caseItem = user.cases[caseUuid];
        if (fileName != null) {
            caseItem.files.push({
                fileName,
                pageCount: pageCount || 0,
                status: isProcessed === 1 ? 'Processed' : isProcessed === 0 ? 'Pending' : 'Failed'
            });

            caseItem.totalFiles += 1;
            caseItem.totalPageCount += pageCount || 0;

            if (isProcessed === 1) caseItem.processedFiles += 1;
            if (isProcessed === 2) caseItem.failedFiles += 1;
        }
    });

    return Object.values(userMap).map(user => {
        const casesArray = Object.values(user.cases);
        return {
            userId: user.userId,
            email: user.email,
            totalCases: casesArray.length,
            totalFiles: casesArray.reduce((a, c) => a + c.totalFiles, 0),
            successFiles: casesArray.reduce((a, c) => a + c.processedFiles, 0),
            failedFiles: casesArray.reduce((a, c) => a + c.failedFiles, 0),
            totalPageCount: casesArray.reduce((a, c) => a + c.totalPageCount, 0),
            cases: casesArray
        };
    });
};

IncCaseServices.generateEmailReportHTML = (usersData) => {
    let html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { border-bottom: 2px solid #ddd; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #f4f4f4; }
      </style>
    </head>
    <body>
    `;

    usersData.forEach(user => {
        html += `
        <h2>User: ${user.email}</h2>
        <table>
            <tr>
                <th>UserId</th>
                <th>Total Cases</th>
                <th>Total Files</th>
                <th>Processed</th>
                <th>Failed</th>
                <th>Total Pages</th>
            </tr>
            <tr>
                <td>${user.userId}</td>
                <td>${user.totalCases}</td>
                <td>${user.totalFiles}</td>
                <td>${user.successFiles}</td>
                <td>${user.failedFiles}</td>
                <td>${user.totalPageCount}</td>
            </tr>
        </table>

        <table>
            <tr>
                <th>Case Name</th>
                <th>File Name</th>
                <th>Page Count</th>
                <th>Status</th>
            </tr>
        `;
        if (!user.cases || user.cases.length === 0) {
            html += `
    <tr>
        <td colspan="4" style="text-align:center; font-style:italic;">
            No case found
        </td>
    </tr>
    `;
        } else {
            user.cases.forEach(c => {
                if (c.files && c.files.length > 0 && c.caseUuid != null) {
                    c.files.forEach((file, index) => {
                        html += `
                    <tr>
                        ${index === 0 ? `<td rowspan="${c.files.length}">${c.caseName}</td>` : ''}
                        <td>${file.fileName}</td>
                        <td>${file.pageCount}</td>
                        <td>${file.status}</td>
                    </tr>
                    `;
                    });
                }
                else {
                    html += `
                <tr>
                    <td>${c.caseName}</td>
                    <td colspan="3" style="text-align:center; font-style:italic;">
                        No files found
                    </td>
                </tr>
                `;
                }
            });

        }
        html += `</table>`;
    });

    html += `</body></html>`;
    return html;
};

IncCaseServices.getIncInvoice = async (startDate, endDate, userId, caseId) => {
    try {
        let dataToday = await IncCaseFilesQueries.getIncInvoiceToday(startDate, endDate, userId, caseId);
        const prompt = await UserQueries.getPromptByType(58);
        if (dataToday.length > 0 && prompt.length > 0) {
            const types = JSON.parse(prompt[0].prompt);
            const INC_INSURANCE_COST_PER_PAGE = parseFloat(types)
            const documentsProcessed = [];
            const billSummary = {}
            dataToday = Array.from(
                new Map([...dataToday].reverse().map(item => [item.fileUuid, item])).values()
            );
            for (const element of dataToday) {
                element.cost = Number(
                    (element.pageCount * INC_INSURANCE_COST_PER_PAGE).toFixed(2)
                );
                element.createdAt = moment(element.createdAt).format("YYYY-MM-DD");
                documentsProcessed.push(element)
            }
            const totalPages = dataToday.reduce((sum, item) => {
                return sum + (item.pageCount || 0);
            }, 0);
            const totalPagesCostToday = dataToday.reduce((sum, item) => {
                return sum + (item.pageCount || 0) * INC_INSURANCE_COST_PER_PAGE;
            }, 0);
            billSummary.totalPagesProcessed = totalPages;
            billSummary.ratePerPage = INC_INSURANCE_COST_PER_PAGE;
            billSummary.totalCostToDate = totalPagesCostToday;
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    documentsProcessed: documentsProcessed,
                    billSummary: billSummary
                }
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in get inc invoice:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.generateInjuryTracking = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid != '') {
            let findLatestSettlement
            if (isGroup && groupUsers && groupUsers.length > 0) {
                findLatestSettlement = await IncCaseNamesQueries.getFileStatusSendReport(caseUuid, groupUsers)
            }
            else {
                findLatestSettlement = await IncCaseNamesQueries.getFileStatusSendReport(caseUuid, userId)
            }

            if (findLatestSettlement.length > 0) {
                const checkStatus = await getInjuryTrackingStatus(caseUuid)// change API
                Logger.data.IncCase({ request: caseUuid, response: checkStatus, userId: userId }, "Get-Injury-Tracking-Status")
                console.log("******************* Request - 1 - Get Inc Injury Tracking Status *******************");
                console.log(checkStatus)
                console.log("******************* Request - 1 - Get Inc Injury Tracking Status *******************");
                if (checkStatus?.statusCode == '200' && checkStatus?.obj.status === true) {                    
                    let getThreadId
                    if (isGroup && groupUsers && groupUsers.length > 0) {
                        getThreadId = await IncCaseServices.createInjuryTrackingJob(findLatestSettlement, groupUsers)

                    } else {
                        getThreadId = await IncCaseServices.createInjuryTrackingJob(findLatestSettlement, userId)

                    }

                    if (getThreadId.statusCode == '200' && getThreadId?.obj?.jobUuid) {
                        const messageData = {
                            userId: userId,
                            incCaseId: findLatestSettlement[0].id,
                            jobUuid: getThreadId?.obj?.jobUuid
                        }
                        const record = await IncCaseNamesQueries.addInjury(messageData)
                        if (isGroup && groupUsers && groupUsers.length > 0) {
                            await IncCaseNamesQueries.updateInjuryTrackingByCaseId({ isActivated: false }, findLatestSettlement[0].id, groupUsers)
                        } else {
                            await IncCaseNamesQueries.updateInjuryTrackingByCaseId({ isActivated: false }, findLatestSettlement[0].id, userId)
                        }
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                requestUuid: record[0]
                            }
                        };
                    } else {
                        return getThreadId;
                    }
                }
                else if (checkStatus?.statusCode == '200' && checkStatus?.obj.status === false) {
                    return {
                        message: checkStatus.message,
                        statusCode: 400,
                        obj: {}
                    }
                }
                else {
                    slack.webhook(JSON.stringify({ action: "Get Inc Settlement Status", response: checkStatus, caseUuid: caseUuid, userId: userId }));
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            error: checkStatus
                        }
                    }
                }
            }
            else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 400,
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
        console.log("Error generate Injury Tracking:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.createInjuryTrackingJob = async (record, userId) => {
    try {
        const requestPayload = {
            caseUuid: record[0].caseUuid,

        }
        if (record[0]?.caseTypeId === 1) {
            if (record[0]?.dateOfLossTort != null) {
                requestPayload.dateOfLoss = moment(record[0].dateOfLossTort).format("YYYY-MM-DD");
            }
            else {
                requestPayload.dateOfLoss = 'Unknown'
            }
        }
        else if (record[0]?.caseTypeId === 2) {
            if (record[0]?.dateOfLossAB != null) {
                requestPayload.dateOfLoss = moment(record[0].dateOfLossAB).format("YYYY-MM-DD");
            }
            else {
                requestPayload.dateOfLoss = 'Unknown'
            }
        }
        else {
            requestPayload.dateOfLoss = 'Unknown'
        }
        const createThread = await createInjuryTrackingJob(requestPayload, userId)
        Logger.data.IncCase({ request: requestPayload, response: createThread, }, "Create-Injury-Tracking-Job");
        console.log("******************* Request - 2 - Inc Create Injury Tracking Job *******************");
        console.log(createThread)
        console.log("******************* Request - 2 - Inc Create Injury Tracking Job *******************");
        if (createThread?.statusCode == '200' && createThread?.obj.jobUuid) {
            console.log("************************************************************************************");
            console.log("Creating Injury Tracking Job Inc =>", createThread.obj.jobUuid);
            console.log("************************************************************************************");
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: {
                    jobUuid: createThread.obj.jobUuid
                }
            }
        } else {
            slack.webhook(JSON.stringify({ action: "Error While Creating Job For Injury Tracking", response: createThread, userId: userId }));
            return {
                statusCode: 400,
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                obj: createThread
            }
        }
    } catch (error) {
        console.log('An error occurred while create Injury Tracking Job', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}


IncCaseServices.dataRegenerator = async (record) => {
    try {
        if (record.userId && record.caseUuid.length > 0) {
            const allData = [];
            for (const element of record.caseUuid) {
                const getCase = await IncCaseServices.fetchOnlyCase(element, record.userId, "", "");
                if (getCase.statusCode == 200 && getCase?.obj[0]?.caseFiles?.length > 0) {
                    const result = await IncCaseServices.sendReportDataRegenerator(element, "", getCase?.obj[0]?.caseFiles, "", record.userId, "", "");
                    allData.push({ caseUuid: element, result: result });
                } else {
                    allData.push({ caseUuid: element, error: getCase });
                }
            }
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: allData
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 400,
                obj: {}
            };
        }
    } catch (error) {
        console.log('An error occurred while data Regenerator', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}


IncCaseServices.sendReportDataRegenerator = async (caseUuid, summaryName, caseFiles, isCombine, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid && caseFiles?.length > 0) {
            let record
            if (isGroup && groupUsers && groupUsers.length > 0) {
                record = await IncCaseNamesQueries.getFileStatusSendReport(caseUuid, groupUsers);
            }
            else {
                record = await IncCaseNamesQueries.getFileStatusSendReport(caseUuid, userId)
            }
            if (record?.length > 0 && caseFiles?.length > 0 && record[0]?.isProcessed != 0) {
                console.log("***************************************************");
                console.log("Request Started For Sending Pending Ins Case Report");
                console.log("***************************************************");
                const list = await IncCaseServices.validateFileUUids(caseFiles, record);
                const questionnaire = [];
                if (list?.obj?.length > 0 && list.statusCode === 200) {
                    const dataObject = {
                        caseUuid: record[0]?.caseUuid,
                        caseType: record[0]?.caseKey,
                        caseInfoHeader: {
                            caseName: record[0]?.caseName,
                            claimNumber: '111',
                        },
                        caseDetails: list?.obj
                    };
                    if (record[0]?.caseTypeId === 1) { //tort
                        if (record[0]?.plaintiffFirstName != null || record[0]?.plaintiffLastName != null) {
                            dataObject.caseInfoHeader.plaintiff = `${record[0]?.plaintiffFirstName} ${record[0]?.plaintiffLastName}`.trim();
                        }
                        if (record[0]?.plaintiffDOB != null) {
                            dataObject.caseInfoHeader.plaintiffDob = moment(record[0].plaintiffDOB).format("YYYY-MM-DD");
                        }
                        if (record[0]?.dateOfLossTort != null) {
                            dataObject.caseInfoHeader.DateofLoss = moment(record[0].dateOfLossTort).format("YYYY-MM-DD");
                        }
                        if (record[0]?.insuredDefendant != null) {
                            dataObject.caseInfoHeader.defendant = record[0].insuredDefendant;
                        }
                        const prompt = await UserQueries.getPromptByType(44);
                        if (prompt.length > 0) {
                            const types = JSON.parse(prompt[0].prompt);
                            if (record[0]?.liabilityDispute != null) {
                                questionnaire.push({
                                    "question": types[6]?.label,
                                    "answer": record[0]?.liabilityDispute == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[6]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.incomeLoss != null) {
                                questionnaire.push({
                                    "question": types[7]?.label,
                                    "answer": record[0]?.incomeLoss == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[7]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.housekeepingRequired != null) {
                                questionnaire.push({
                                    "question": types[8]?.label,
                                    "answer": record[0]?.housekeepingRequired == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[8]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.futureCareNeeded != null) {
                                questionnaire.push({
                                    "question": types[9]?.label,
                                    "answer": record[0]?.futureCareNeeded == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[9]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.outOfPocketExpenses != null) {
                                questionnaire.push({
                                    "question": types[10]?.label,
                                    "answer": record[0]?.outOfPocketExpenses == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[10]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.previousAccident != null) {
                                questionnaire.push({
                                    "question": types[11]?.label,
                                    "answer": record[0]?.previousAccident == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[11]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.previousAccidentDate != null) {
                                questionnaire.push({

                                    "question": types[11].conditional.fields[0].label,
                                    "answer": record[0]?.previousAccidentDate
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[11].conditional.fields[0].label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.subsequentAccident != null) {
                                questionnaire.push({
                                    "question": types[12]?.label,
                                    "answer": record[0]?.subsequentAccident == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[12]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }

                            if (record[0]?.subsequentAccidentDate != null) {
                                questionnaire.push({
                                    "question": types[12].conditional.fields[0].label,
                                    "answer": record[0]?.subsequentAccidentDate
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[12].conditional.fields[0].label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                        }
                    }
                    else if (record[0]?.caseTypeId === 2) { //ab matter
                        if (record[0]?.applicantiffFirstName != null || record[0]?.applicantiffLastName != null) {
                            dataObject.caseInfoHeader.applicant = `${record[0]?.applicantiffFirstName} ${record[0]?.applicantiffLastName}`.trim();
                        }
                        if (record[0]?.applicantiffDOB != null) {
                            dataObject.caseInfoHeader.applicantDob = moment(record[0].applicantiffDOB).format("YYYY-MM-DD");
                        }
                        if (record[0]?.insuredDefendantAB != null) {
                            dataObject.caseInfoHeader.defendant = record[0].insuredDefendantAB;
                        }
                        if (record[0]?.dateOfLossAB != null) {
                            dataObject.caseInfoHeader.DateofLoss = moment(record[0].dateOfLossAB).format("YYYY-MM-DD");
                        }

                        const prompt = await UserQueries.getPromptByType(50);
                        if (prompt.length > 0) {
                            const types = JSON.parse(prompt[0].prompt);
                            if (record[0]?.applicantiffInMIG != null) {
                                questionnaire.push({
                                    "question": types[6]?.label,
                                    "answer": record[0]?.applicantiffInMIG == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[6]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.disputingCAT != null) {
                                questionnaire.push({
                                    "question": types[6].conditional.fields[0].label,
                                    "answer": record[0]?.disputingCAT == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[6].conditional.fields[0].label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.summaryOfOCF18 != null) {
                                questionnaire.push({
                                    "question": types[7]?.label,
                                    "answer": record[0]?.summaryOfOCF18 == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[7]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.summaryOfOCF6 != null) {
                                questionnaire.push({
                                    "question": types[8]?.label,
                                    "answer": record[0]?.summaryOfOCF6 == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[8]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.attendantCareDispute != null) {
                                questionnaire.push({
                                    "question": types[9]?.label,
                                    "answer": record[0]?.attendantCareDispute == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[9]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                            if (record[0]?.specifiedBenefitsDispute != null) {
                                questionnaire.push({
                                    "question": types[10]?.label,
                                    "answer": record[0]?.specifiedBenefitsDispute == 1 ? 'Yes' : 'No'
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            } else {
                                questionnaire.push({
                                    "question": types[10]?.label,
                                    "answer": ""
                                })
                                dataObject.caseInfoHeader.questionnaire = questionnaire
                            }
                        }
                    }
                    console.log("dataObject 2 =>", JSON.stringify(dataObject));
                    if (dataObject) {
                        if (isCombine) {
                            postData = await sendIncCaseReportCombine(dataObject)
                        } else {
                            postData = await sendIncCaseReport(dataObject)
                        }
                        Logger.data.IncCase({ request: dataObject, response: postData, incCaseId: caseUuid, userId: userId }, "Request-Response-Inc-Case-Report");
                        console.log("******************* Request - 1 - Send Data For Inc Case *******************");
                        console.log(postData)
                        console.log("******************* Request - 1 - Send Data For Inc Case *******************");
                        if (postData.statusCode == '200' && postData.obj.status == true && postData.obj.caseUuid && postData.obj.jobUuid) {
                            const list = {
                                userId: userId,
                                summaryName: summaryName,
                                incCaseId: record[0].id,
                                jobUuid: postData.obj.jobUuid,
                                jsonResponse: JSON.stringify(postData)
                            }
                            if (isCombine) {
                                list.isCombined = true
                            }
                            const reportId = await IncCaseFilesQueries.createReport(list)
                            if (isGroup && groupUsers && groupUsers.length > 0) {
                                await IncCaseNamesQueries.updateCase({ isProcessed: 0 }, caseUuid, groupUsers);
                            }
                            else {
                                await IncCaseNamesQueries.updateCase({ isProcessed: 0 }, caseUuid, userId);                                
                            }
                            for (const requestFile of caseFiles) {
                                let findFileId;
                                if (isGroup && groupUsers && groupUsers.length > 0) {
                                    findFileId = await IncCaseFilesQueries.findByFileUuid(requestFile?.fileUuid, groupUsers)
                                }
                                else {
                                    findFileId = await IncCaseFilesQueries.findByFileUuid(requestFile?.fileUuid, userId)
                                }
                                if (findFileId.length > 0) {
                                    const maapingObj = {
                                        fileId: findFileId[0].id,
                                        incCaseId: record[0].id,
                                        reportId: reportId[0],
                                        userId: userId
                                    }
                                    await IncCaseFilesQueries.createReportMapping(maapingObj)
                                }
                            }
                            console.log("******************************************************************");
                            console.log("Request Successfully Completed For Sending Pending Ins Case Report");
                            console.log("******************************************************************");
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: postData.obj
                            };
                        } else {
                            if (isGroup && groupUsers && groupUsers.length > 0) {
                                await IncCaseNamesQueries.updateCase({ isProcessed: 2 }, caseUuid, groupUsers)
                            }
                            else {
                                await IncCaseNamesQueries.updateCase({ isProcessed: 2 }, caseUuid, userId)
                            }
                            Logger.data.IncCase({ request: dataObject, response: postData, incCaseId: caseUuid, userId: userId }, "Error in Sending Data For Inc Case");
                            slack.webhook(JSON.stringify({ action: "Error in Sending Data For Inc Case ", request: dataObject, response: postData, incCaseId: caseUuid, userId: userId }));
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: postData
                                }
                            }
                        }
                    } else {
                        console.log("No transformedData found", dataObject);
                        Logger.data.IncCase({ request: dataObject, incCaseId: caseUuid, userId: userId }, "No-Transformed-Data-Found");
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                } else {
                    return list
                }
            }
            else if (record?.length > 0 && caseFiles?.length > 0 && record[0]?.isProcessed === 0) {
                return {
                    message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                    statusCode: 400,
                    obj: {}
                }
            }
            else {
                console.log("***************************************************");
                console.log("No record found For Sending Pending Ins Case Report");
                console.log("***************************************************");
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
    }
    catch (error) {
        console.log("Error in sending data report to python:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.editReport = async (caseUuid, recordUuid, summary, date, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid && recordUuid) {
            const find = await IncCaseNamesQueries.findReportForEdit(recordUuid)
            if (find.length > 0) {
                const postData = await getIncReportStatus(caseUuid)
                Logger.data.IncCase({ request: caseUuid, response: postData, recordUuid: recordUuid, caseUuid: caseUuid, userId: userId }, "Request-Response-Inc-Case-Report-Edit-Status");
                console.log("******************* Request - 1 - Find Status For Inc Report Edit *******************");
                console.log(postData)
                console.log("******************* Request - 1 - Find Status For Inc Report Edit *******************");
                if (postData.statusCode == '200' && postData.obj.status == true) {
                    const list = {
                        record_uuid: recordUuid
                    }
                    if (summary) {
                        list.summary = summary
                    }
                    else {
                        list.summary = find[0].summary
                    }
                    if (date) {
                        list.date = date
                    }
                    else {
                        list.date = find[0].date
                    }
                    const updateEditData = await SendIncReportAfterEdit(list)
                    console.log("******************* Request - 2 - Inc Report Edit *******************");
                    console.log(updateEditData)
                    console.log("******************* Request - 2 - Inc Report Edit *******************");
                    Logger.data.IncCase({ request: list, response: updateEditData, recordUuid: recordUuid, caseUuid: caseUuid, userId: userId }, "Request-Response-Inc-Case-Report-Edit");
                    if (updateEditData.statusCode == '200' && updateEditData.obj == null) {
                        const caseUpdatePromises = [];
                        if (summary) {
                            const obj = {
                                summary: summary
                            };
                            caseUpdatePromises.push(IncCaseNamesQueries.updateReport(obj, recordUuid));
                        }
                        if (date) {
                            const obj = {
                                date: date
                            };
                            caseUpdatePromises.push(IncCaseNamesQueries.updateReport(obj, recordUuid));
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
                        return updateEditData
                    }
                }
                else if (postData.statusCode == '200' && postData.obj.status == false) {
                    return postData
                }
                else {
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
        else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while edit Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.generateFile = async (caseUuid, requestUuid, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision, tabDetails, userId, isGroup, groupUsers) => {
    try {
        let data;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.getCasesId(caseUuid, groupUsers);
        } else {
            data = await IncCaseNamesQueries.getCasesId(caseUuid, userId);
        }
        if (data.length > 0) {
            //find alread pending record here for the same case and userId
            let record
            if (isGroup && groupUsers && groupUsers.length > 0) {
                record = await IncCaseNamesQueries.getFileStatusSendReport(caseUuid, groupUsers);
            }
            else {
                record = await IncCaseNamesQueries.getFileStatusSendReport(caseUuid, userId)
            }
            if (record?.length > 0 && record[0]?.isProcessed != 0) {
                // userId = isGroup && groupUsers.length > 0 ? groupUsers : userId
                let getData
                fileType = typeof fileType == 'object' ? fileType : null
                if (tabDetails == 'medical') {
                    const _data = [1, 2, 3, 4, 5, 6, 7, 8, 14, 43]
                    if (groupUsers?.length > 0) {
                        getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, groupUsers, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                    } else {
                        getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, userId, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                    }
                }
                else if (tabDetails == 'ime') {
                    const _data = [33, 34, 35, 17];
                    getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, userId, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                }
                else if (tabDetails == 'ocf') {
                    const _data = [15, 16, 18]
                    if (groupUsers?.length > 0) {
                        getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, groupUsers, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                    } else {
                        getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, userId, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                    }                }
                else if (tabDetails == 'income') {
                    const _data = [21, 22, 23, 24, 25, 26]
                    if (groupUsers?.length > 0) {
                        getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, groupUsers, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                    } else {
                        getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, userId, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                    }
                }
                else if (tabDetails == 'ab') {
                    const _data = [9, 10, 11, 12, 13, 41, 32, 27, 28, 37, 40, 20]
                    if (groupUsers?.length > 0) {
                        getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, groupUsers, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                    } else {
                        getData = await IncCaseNamesQueries.findReportSummaryDownload(requestUuid, userId, _data, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision);
                    }
                }
                else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 400,
                        obj: {}
                    }
                }

                const dataObject = {
                    caseUuid: record[0]?.caseUuid,
                    caseType: record[0]?.caseKey,
                    caseInfoHeader: {
                        caseName: record[0]?.caseName,
                        claimNumber: '111',
                    }
                };

                console.log("record uuids length", getData.length);
                
                const recordUuids = []
                if (getData?.length > 0) {
                    for (const element of getData) {
                        recordUuids.push(element.record_uuid);
                    }
                    dataObject.recordUuids = recordUuids;
                }
                else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
                if (record[0]?.caseTypeId === 1) { //tort
                    if (record[0]?.plaintiffFirstName != null || record[0]?.plaintiffLastName != null) {
                        dataObject.caseInfoHeader.plaintiff = `${record[0]?.plaintiffFirstName} ${record[0]?.plaintiffLastName}`.trim();
                    }
                    if (record[0]?.plaintiffDOB != null) {
                        dataObject.caseInfoHeader.plaintiffDob = moment(record[0].plaintiffDOB).format("YYYY-MM-DD");
                    }
                    if (record[0]?.dateOfLossTort != null) {
                        dataObject.caseInfoHeader.DateofLoss = moment(record[0].dateOfLossTort).format("YYYY-MM-DD");
                    }
                    if (record[0]?.insuredDefendant != null) {
                        dataObject.caseInfoHeader.defendant = record[0].insuredDefendant;
                    }
                }
                else if (record[0]?.caseTypeId === 2) { //ab matter
                    if (record[0]?.applicantiffFirstName != null || record[0]?.applicantiffLastName != null) {
                        dataObject.caseInfoHeader.applicant = `${record[0]?.applicantiffFirstName} ${record[0]?.applicantiffLastName}`.trim();
                    }
                    if (record[0]?.applicantiffDOB != null) {
                        dataObject.caseInfoHeader.applicantDob = moment(record[0].applicantiffDOB).format("YYYY-MM-DD");
                    }
                    if (record[0]?.insuredDefendantAB != null) {
                        dataObject.caseInfoHeader.defendant = record[0].insuredDefendantAB;
                    }
                    if (record[0]?.dateOfLossAB != null) {
                        dataObject.caseInfoHeader.DateofLoss = moment(record[0].dateOfLossAB).format("YYYY-MM-DD");
                    }
                }
                console.log("dataObject for download report request =>", JSON.stringify(dataObject));
                if (dataObject) {
                    const postData = await IncReportDownload(dataObject)
                    Logger.data.IncCase({ request: dataObject, response: postData, caseUuid: caseUuid, userId: userId }, "Request-Response-Inc-Case-Download-Report");
                    console.log("******************* Request - 1 - Send Data For Inc Case Download Report *******************");
                    console.log(postData)
                    console.log("******************* Request - 1 - Send Data For Inc Case Download Report *******************");
                    if (postData.statusCode == '200' && postData.obj.jobUuid) {
                        console.log("******************************************************************");
                        console.log("Request Successfully Completed For Sending Pending Ins Case Report");
                        console.log("******************************************************************");
                        const insert = {
                            userId: userId,
                            jobUuid: postData.obj.jobUuid,
                            incCaseId: data[0].id
                        }
                        const list = await IncCaseNamesQueries.addCaseReportSummaryDownloadManager(insert)
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                requestUuid: list[0], // requestUuid fomr table
                                message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
                                status: 0,
                            }
                        }
                    } else {
                        slack.webhook(JSON.stringify({ action: "Error in Sending Data For Inc Case Report Download", request: dataObject, response: postData, caseUuid: caseUuid, userId: userId }));
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: {
                                error: postData
                            }
                        }
                    }
                } else {
                    console.log("No transformedData found", dataObject);
                    Logger.data.IncCase({ request: dataObject, caseUuid: caseUuid, userId: userId }, "No-Transformed-Data-Found-For-Download-Report");
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
        console.log("Error in generate File:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.downloadFile = async (requestUuid, caseUuid, userId, isGroup, groupUsers) => {
    try {
        let data;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.findDownloadManagerStatus(caseUuid, requestUuid, groupUsers);
        } else {
            data = await IncCaseNamesQueries.findDownloadManagerStatus(caseUuid, requestUuid, userId);
        }
        if (data.length > 0) {
            if (data[0].status == '0') {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        requestUuid: requestUuid,
                        message: Strings.INSURANCE_CASE.REPORT_IN_PROGRESS,
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
                const filePath = data[0]?.caseUuid+'/'+data[0]?.caseName+'_'+data[0]?.jobUuid+'.docx';
                const getFileUrl = await IncCaseServices.generateAzureInsuranceFileUrl(filePath, true);
                console.log("getFile", getFileUrl);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        status: 1,
                        fileUrl: getFileUrl?.statusCode === 200 && getFileUrl?.obj?.videoUrl ? getFileUrl?.obj?.videoUrl : ''
                    }
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
    } catch (error) {
        console.log("Error While download File", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.downloadReport = async (caseUuid, jobUuid, status, allData) => {
    try {
        Logger.data.IncCase({ response: allData }, "Response-Webhook-Ins-Case-For-Download-Report");
        const data = await IncCaseNamesQueries.getDownloadManagerStatus(caseUuid, jobUuid)
        if (data.length > 0 && status === true) {
            console.log("****************************************");
            console.log("Got the hit For Ins Case Report Download");
            console.log("****************************************");
            await IncCaseNamesQueries.updateDownloadManagerStatus({status: true}, jobUuid)
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: data
            };
        }
        else if (data.length > 0 && status === false) {
            await IncCaseNamesQueries.updateDownloadManagerStatus({status: 2}, jobUuid)
            slack.webhook(JSON.stringify({ action: "Error in Inc Report Creation", response: allData, caseUuid: caseUuid, jobUuid: jobUuid, userId: data[0]?.userId }));
            return {
                message: Strings.INSURANCE_CASE.REPORT_FAILED,
                statusCode: 400,
                obj: {}
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
        console.log("Error in updating report data and sending it to users:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error
            }
        }
    }
}

IncCaseServices.addResponse = async (title, description, caseUuid, userId, isGroup, groupUsers) => {
    try {
        if (title && description && caseUuid) {
            let data
            if (isGroup && groupUsers && groupUsers.length > 0) {
                data = await IncCaseNamesQueries.getCasesId(caseUuid, groupUsers)
            }
            else {
                data = await IncCaseNamesQueries.getCasesForShared(caseUuid, userId)
            }
            if (data.length > 0) {
                const record = {
                    userId: userId,
                    incCaseId: data[0].id,
                    title: title,
                    description: description
                }
                await IncCaseNamesQueries.addIncCaseResponse(record);
                return {
                    message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                    statusCode: 200,
                    obj: {}
                };
            }
            else {
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
        console.log("Error while adding ins add Response:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.viewResponse = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid) {
            let list
            if (isGroup && groupUsers && groupUsers.length > 0) {
                list = await IncCaseNamesQueries.getSaveResponses(caseUuid, groupUsers);
            } else {
                list = await IncCaseNamesQueries.getSaveResponses(caseUuid, userId);
            }
            if (list.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: list
                }
            }
            else {
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
        console.log("Error While get all injury tracking on page load", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.deleteResponse = async (caseUuid, requestUuid, userId, isGroup, groupUsers) => {
    try {
        const obj = {
            status: false
        }
        let find;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            find = await IncCaseNamesQueries.getSaveResponses(caseUuid, groupUsers);
        } else {
            find = await IncCaseNamesQueries.getSaveResponses(caseUuid, userId);
        }
        if (find?.length > 0) {
            await IncCaseNamesQueries.deleteSavedResponses(obj, requestUuid)
            return {
                statusCode: 200,
                message: Strings.RECORD_DELETED_SUCCESS,
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
        console.log("Error in delete saved response:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.flatDataRegenerator = async (record) => {
    try {
        if (record.caseUuid.length > 0) {
            const allData = [];
            for (const element of record.caseUuid) {
                console.log("element", element);
                const postData = await GetIncReportFlatData(element)
                Logger.data.IncCase({ request: element, response: postData, caseUuid: element }, "Request-Response-Inc-Case-Report-Flat-Data");
                console.log("******************* Request - 1 - Get Inc Report Flat Data *******************");
                console.log(postData)
                console.log("******************* Request - 1 - Get Inc Report Flat Data *******************");
                const getData = postData?.obj?.data
                if (getData?.jobUuid) {
                    allData.push(await IncCaseServices.dataFlatter(getData?.caseUuid, getData?.jobUuid, '', getData?.status, getData?.records, getData?.failedFiles, ''))
                } else {
                    allData.push(postData)
                }
            }
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: allData
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 400,
                obj: {}
            };
        }
    } catch (error) {
        console.log('An error occurred while data Regenerator', error);
        return {
            statusCode: 400,
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            obj: {
                error: error.message
            }
        }
    }
}


IncCaseServices.dataFlatter = async (caseUuid, jobUuid, caseInfoHeader, status, successDetails, failedFiles, allData) => {
    try {
        Logger.data.IncCase({ response: allData }, "Response-Webhook-Ins-Case-Data-Flatter");
        const data = await IncCaseNamesQueries.getCaseDetailsFlatter(caseUuid, jobUuid)
        if (data.length > 0 && (successDetails?.length > 0 || failedFiles?.length > 0) && status === true) {
            console.log("********************************************************");
            console.log("Got the hit For Sending Ins Case Report For Data Flatter");
            console.log("********************************************************");
            const groupedRecords = {};
            for (const rec of successDetails) {
                if (!groupedRecords[rec.file_uuid]) {
                    groupedRecords[rec.file_uuid] = {
                        fileUuid: rec.file_uuid,
                        fileType: rec.record_type, //file_type -> record_type
                        status: true,
                        fileSummary: []
                    };
                }
                const summaryObject = {
                    date: rec.date,
                    summary: rec.summary,
                    reference: rec.reference,
                    section: rec.section,
                    pages: rec.pages,
                    record_uuid: rec.record_uuid,
                    fileType: rec.record_type,
                    duplicate_flag: rec.duplicate_flag,
                    duplicate_info: rec.duplicate_info,
                    incCaseId: data[0].id,
                    reportId: data[0].reportId,
                    userId: data[0].userId
                }
                if (rec.insurer_decision) {
                    summaryObject.insurer_decision = rec.insurer_decision;
                }
                groupedRecords[rec.file_uuid].fileSummary.push(summaryObject);
            }
            const caseDetails = [
                ...Object.values(groupedRecords),
            ];
            if (failedFiles.length > 0) {
                const mappedFailedFiles = failedFiles.map(f => ({
                    fileUuid: f.file_uuid,
                    fileName: f.file_name,
                    status: false
                }));
                caseDetails.push(...mappedFailedFiles);
            }
            const incomingFileUuids = caseDetails.map(file => file.fileUuid);
            const dbFileUuids = data.map(item => item.fileUuid);
            const dbEmails = Array.from(
                new Set(
                    data.flatMap(item => {
                        let primaryEmails = [];
                        let additionalEmails = [];
                        primaryEmails = JSON.parse(item.primaryAttorneyEmail || '[]');
                        additionalEmails = JSON.parse(item.additionalEmails || '[]');
                        return [...primaryEmails, ...additionalEmails]
                    })
                )
            );
            const filterEmails = [...new Set(dbEmails)];
            const Tuple = await IncCaseServices.validateFileUUids(caseDetails, data); //have to check with adding failed fails uuids
            if (Tuple?.obj?.length > 0 && Tuple.statusCode === 200) {
                for (const element of caseDetails) {
                    const list = {
                        status: element.status,
                    }
                    if (element.status === true) {
                        list.isProcessed = true

                        if (element.fileSummary.length > 0) {
                            await IncCaseNamesQueries.addReportsSummary(element.fileSummary)
                        }
                        // await IncCaseFilesQueries.updateByFileUuid(list, element.fileUuid)
                    } else {
                        list.isProcessed = 2
                        list.isActivated = false //*now failed files will not show on UI
                    }
                }
                if (status === true && caseUuid) {
                    if (filterEmails.length > 0) {
                        //have to notify user that report success make a email templete for the success job
                        for (const element of filterEmails) {
                            // const emailStatus = await Emails.sendAttachment(element, caseInfoHeader?.caseName, attachments);
                            const fileSuccessText = "Your file's has been successfully processed"
                            // const emailStatus = await Emails.insReportSuccess(element, caseInfoHeader?.caseName, fileSuccessText);
                            // // console.log("emailStatus", emailStatus);
                            // Logger.data.IncCase({ request: element, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report");
                        }
                        // await IncCaseFilesQueries.updateByReportByJobUuid({ isProcessed: true }, jobUuid);
                        // await IncCaseNamesQueries.updateCase({ isProcessed: 1 }, caseUuid, data[0].userId);
                    }
                    console.log("*************************************************************");
                    console.log("Report Send Successfully For Ins Case Report For Data Flatter");
                    console.log("*************************************************************");
                } else {
                    // if (filterEmails.length > 0) {
                    //     for (let index = 0; index < filterEmails.length; index++) {
                    //         const element = filterEmails[index];
                    //         const emailErrorText = ''
                    //         const emailStatus = await Emails.insReportError(element, caseInfoHeader?.caseName);
                    //         Logger.data.IncCase({ request: element, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report-Error");
                    //     }
                    // }

                    const errorText = []
                    for (const element of caseDetails) {
                        if (element.status === false) {
                            errorText.push(`<br>${element.fileName}`);
                        }
                    }
                    if (errorText.length > 0 && filterEmails.length > 0) {
                        const formattedErrorText = errorText.join('');
                        // for (const email of filterEmails) {
                        //     const emailStatus = await Emails.insReportErrorWithFileName(email, formattedErrorText);
                        //     Logger.data.IncCase({ request: email, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report-Error-File-Email");
                        // }
                    }

                    // await IncCaseNamesQueries.updateCase({ isProcessed: 2 }, caseUuid, data[0].userId);
                    // await IncCaseFilesQueries.updateByReportByJobUuid({ isProcessed: 2, jsonResponse: JSON.stringify(allData) }, jobUuid);
                    // slack.webhook(JSON.stringify({ action: "Error in sending Insurance Cases Report", caseUuid: caseUuid, jobUuid: jobUuid }));
                }
                // incase when the report is successfully processed. if one of the file fails like 1 oot of 3 so send the email to that user
                if (status === true && caseUuid) {
                    const errorText = []
                    for (const element of caseDetails) {
                        if (element.status === false) {
                            errorText.push(`<br>${element.fileName}`);
                        }
                    }
                    if (errorText.length > 0 && filterEmails.length > 0) {
                        const formattedErrorText = errorText.join('');
             
                    }
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: data
                };
            } else {
                console.log("Error in matching received file length");
                slack.webhook(JSON.stringify({ action: "Error in matching received file length for Insurance Cases", caseUuid: caseUuid, jobUuid: jobUuid }));
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        message: Strings.GROK.FILE_UUID_NOT_MATCHING,
                    }
                }
            }
        }
        else if (data.length > 0 && status === false) {
            const dbEmails = Array.from(
                new Set(
                    data.flatMap(item => {
                        let primaryEmails = [];
                        let additionalEmails = [];
                        primaryEmails = JSON.parse(item.primaryAttorneyEmail || '[]');
                        additionalEmails = JSON.parse(item.additionalEmails || '[]');
                        return [...primaryEmails, ...additionalEmails]
                    })
                )
            );
            const filterEmails = [...new Set(dbEmails)];
            if (filterEmails.length > 0) {
                for (let index = 0; index < filterEmails.length; index++) {
                    const element = filterEmails[index];
                    // const emailStatus = await Emails.insReportError(element);
                    // Logger.data.IncCase({ request: element, response: emailStatus, caseUuid: caseUuid, jobUuid: jobUuid }, "Send-Ins-Case-Report-Error");
                }
            }
            console.log("*******************************************************");
            console.log("Got the hit For Failed Ins Case Report For Data Flatter");
            console.log("*******************************************************");
            // await IncCaseNamesQueries.updateCase({ isProcessed: 2 }, caseUuid, data[0].userId);
            // await IncCaseFilesQueries.updateByReportByJobUuid({ isProcessed: 2, jsonResponse: JSON.stringify(allData) }, jobUuid);
            return {
                message: Strings.INSURANCE_CASE.REPORT_FAILED,
                statusCode: 400,
                obj: {}
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
        console.log("Error in data flatter", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error
            }
        }
    }
}

IncCaseServices.addSection = async (reportType, caseUuid, title, description, userId, isGroup, groupUsers) => {
    try {
        if (reportType && caseUuid != undefined && title && description) {
            let data;
            if (isGroup && groupUsers && groupUsers.length > 0) {
                data = await IncCaseNamesQueries.getCasesId(caseUuid, groupUsers)
            }
            else {
                data = await IncCaseNamesQueries.getCasesId(caseUuid, userId)
            }
            if (data.length > 0) {
                const record = {
                    reportType: reportType,
                    userId: userId,
                    incCaseId: data[0].id,
                    title: title,
                    description: description
                }
                await IncCaseNamesQueries.addIncCaseReportSection(record);
                return {
                    message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                    statusCode: 200,
                    obj: {}
                };
            }
            else {
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
        console.log("Error in Generate Summary Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getSection = async (caseUuid, reportType, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid && reportType) {
            let record
            if (isGroup && groupUsers && groupUsers.length > 0) {
                record = await IncCaseNamesQueries.getReportSections(caseUuid, reportType, groupUsers);
            } else {
                record = await IncCaseNamesQueries.getReportSections(caseUuid, reportType, userId);
            }
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get all Summary Report ins:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.deleteSection = async (caseUuid, requestUuid, userId, isGroup, groupUsers) => {
    try {
        const obj = {
            isActivated: false
        }
        let find;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            find = await IncCaseNamesQueries.getIncSections(caseUuid, requestUuid, groupUsers);
        } else {
            find = await IncCaseNamesQueries.getIncSections(caseUuid, requestUuid, userId);
        }
        if (find?.length > 0) {
            await IncCaseNamesQueries.deleteSection(obj, requestUuid)
            return {
                statusCode: 200,
                message: Strings.RECORD_DELETED_SUCCESS,
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
        console.log("Error in delete section:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.alterSection = async (caseUuid, requestUuid, title, description, userId, isGroup, groupUsers) => {
    try {
        const caseUpdatePromises = [];
        if ((caseUuid && requestUuid) || title || description) {
            let find;
            if (isGroup && groupUsers && groupUsers.length > 0) {
            // if (false) {
                find = await IncCaseNamesQueries.getIncSections(caseUuid, requestUuid, groupUsers);
            } else {
                find = await IncCaseNamesQueries.getIncSections(caseUuid, requestUuid, userId);
            }
            
            if (find?.length > 0) {
                if (title) {
                    const obj = {
                        title: title
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updateSection(obj, requestUuid, userId));
                }

                if (description) {
                     const obj = {
                        description: description
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updateSection(obj, requestUuid, userId));
                }
                await Promise.all(caseUpdatePromises);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
                };

            }
            else {
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
        console.log("Error in editing a inc form fields for a case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.deleteSummary = async (caseUuid, recordUuid, userId, isGroup, groupUsers) => {
    try {
        const obj = {
            isActivated: false
        }
        let getData;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            getData = await IncCaseNamesQueries.findRecordForSummary(caseUuid, recordUuid, userId)
        } else {
            getData = await IncCaseNamesQueries.findRecordForSummary(caseUuid, recordUuid, userId)
        }

        if (getData.length > 0) {
            await IncCaseNamesQueries.deleteRecordSummaryReport(obj, recordUuid)
            return {
                statusCode: 200,
                message: Strings.RECORD_DELETED_SUCCESS,
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
        console.log("Error While delete Summary", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}


IncCaseServices.getSummaryFilter = async (requestUuid, userId, isGroup, groupUsers, type) => {
    try {
        if (requestUuid && type) {
            let data, _data = '';
            if (type == 'medical') {
                _data = [1, 2, 3, 4, 5, 6, 7, 8, 14, 43]
            } else if (type == 'ime') {
                _data = [33, 34, 35, 17];
            } else if (type == 'ocf') {
                _data = [15, 16, 18]
            } else if (type == 'income') {
                _data = [21, 22, 23, 24, 25, 26]
            } else if (type == 'ab') {
                _data = [9, 10, 11, 12, 13, 41, 32, 27, 28, 37, 40, 20]
            }
            const sections = [];
            const references = [];
            const allSections = [];
            const allReferences = [];
            const groupType = ['section', 'reference']

            for (const element of groupType) {
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    data = await IncCaseNamesQueries.findFilter(requestUuid, groupUsers, _data, element);
                }
                else {
                    data = await IncCaseNamesQueries.findFilter(requestUuid, userId, _data, element);
                }
                if (element == 'section' && data.length > 0) {
                    sections.push(data)
                } else if (element == 'reference' && data.length > 0) {
                    references.push(data)
                }
            }
            if (sections.length > 0) {
                for (const element of sections[0]) {
                    allSections.push(element.section)
                }
            }

            if (references.length > 0) {
                for (const element of references[0]) {
                    allReferences.push(element.reference.substring(0, element.reference.lastIndexOf(',')).trim())
                }
            }

            if (allSections.length > 0 || allReferences.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        allSections: allSections,
                        allReferences: [...new Set(allReferences)],
                        duplicate: [
                            {
                                key: "Duplicate",
                                value: "true"
                            },
                            {
                                key: "Unique",
                                value: "false"
                            }
                        ]
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get summaries filter :", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.sendCustomReport = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        let data;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            data = await IncCaseNamesQueries.getFileStatusByCaseUuid(caseUuid, groupUsers);
        } else {
            data = await IncCaseNamesQueries.getFileStatusByCaseUuid(caseUuid, userId);
        }
        if (data.length > 0) {
            let dataObject = {}
            const transformedData = await data.reduce(async (accPromise, current) => {
                const acc = await accPromise;
                const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                if (current.caseTypeId === 1) { //tort
                    dataObject = {
                        userId: userId,
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        plaintiffFirstName: current.plaintiffFirstName,
                        plaintiffLastName: current.plaintiffLastName,
                        plaintiffDOB: current.plaintiffDOB != null ? moment(current.plaintiffDOB).format("MM/DD/YYYY") : null,
                        dateOfLoss: current.dateOfLossTort != null ? moment(current.dateOfLossTort).format("MM/DD/YYYY") : null,
                        insuredDefendant: current.insuredDefendant,
                        liabilityDispute: current.liabilityDispute,
                        incomeLoss: current.incomeLoss,
                        housekeepingRequired: current.housekeepingRequired,
                        futureCareNeeded: current.futureCareNeeded,
                        outOfPocketExpenses: current.outOfPocketExpenses,
                        previousAccident: current.previousAccident,
                        previousAccidentDate: current.previousAccidentDate != null ? moment(current.previousAccidentDate).format("MM/DD/YYYY") : null,
                        subsequentAccident: current.subsequentAccident,
                        subsequentAccidentDate: current.subsequentAccidentDate != null ? moment(current.subsequentAccidentDate).format("MM/DD/YYYY") : null,
                        caseType: current.caseType,
                        caseKey: current.caseKey,
                        caseTypeUuid: current.caseTypeUuid,
                        primaryAttorneyEmail: current.primaryAttorneyEmail,
                        additionalEmails: current.additionalEmails,
                        reportStatus: current.isProcessed,//only freeze the tab if the reportStatus is 0 and keep hitting the api on every 15 second for rest render the componenet
                    };
                }
                else if (current.caseTypeId === 2) { //ab matter
                    dataObject = {
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        applicantiffFirstName: current.applicantiffFirstName,
                        applicantiffFirstName: current.applicantiffFirstName,
                        applicantiffLastName: current.applicantiffLastName,
                        applicantiffDOB: current.applicantiffDOB != null ? moment(current.applicantiffDOB).format("MM/DD/YYYY") : null,
                        insuredDefendantAB: current.insuredDefendantAB,
                        dateOfLossAB: current.dateOfLossAB != null ? moment(current.dateOfLossAB).format("MM/DD/YYYY") : null,
                        applicantiffInMIG: current.applicantiffInMIG,
                        disputingCAT: current.disputingCAT,
                        summaryOfOCF18: current.summaryOfOCF18,
                        summaryOfOCF6: current.summaryOfOCF6,
                        attendantCareDispute: current.attendantCareDispute,
                        specifiedBenefitsDispute: current.specifiedBenefitsDispute,
                        caseType: current.caseType,
                        caseKey: current.caseKey,
                        caseTypeUuid: current.caseTypeUuid,
                        primaryAttorneyEmail: current.primaryAttorneyEmail,
                        additionalEmails: current.additionalEmails,
                        reportStatus: current.isProcessed,//only freeze the tab if the reportStatus is 0 and keep hitting the api on every 15 second for rest render the componenet
                        caseFiles: [],
                        combineFiles: []
                    };
                }
                if (caseIndex === -1) {
                    if (current.fileUuid != null) {
                        if (current.isCombined == 1) {
                            // dataObject.combineFiles.push(combinedFileDetail);
                        } else {
                            // dataObject.caseFiles.push(fileDetail);
                        }
                    }
                    acc.push(dataObject);
                } else {
                    if (current.fileUuid != null) {
                        if (current.isCombined == 1) {
                            // acc[caseIndex].combineFiles.push(combinedFileDetail);
                        } else {
                            // acc[caseIndex].caseFiles.push(fileDetail);
                        }
                    }
                }
                return acc;
            }, Promise.resolve([]));

            const emails = process.env.BP_SEND_REPORT_DAILY_EMAILS.split(',');
            console.log(emails);
            emails.forEach(e => {
                Emails.sendCustomReport(e, 'Insurance Custom Report Request', JSON.stringify(transformedData));
            })
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.INSURANCE_CASE.INSURANCE_CASE_CUSTOM_REPORT,
                }
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in send Custom Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}


IncCaseServices.updatePrompt = async (caseUuid, requestUuid, title, description, userId) => {
    try {
        if (caseUuid != undefined && requestUuid && (title || description)) {
            const data = await IncCaseNamesQueries.findCase(caseUuid);
            if (data.length > 0) {
                const caseUpdatePromises = [];
                if (title) {
                    const obj = {
                        title: title
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updatePrompt(obj, requestUuid));
                }
                if (description) {
                     const obj = {
                        description: description
                    };
                    caseUpdatePromises.push(IncCaseNamesQueries.updatePrompt(obj, requestUuid));
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in Update Prompt", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

IncCaseServices.addPrompt = async (caseUuid, promptType, title, description, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid != undefined && title && description && promptType) {
            let data;
            if (isGroup && groupUsers && groupUsers.length > 0) {
                data = await IncCaseNamesQueries.getCasesId(caseUuid, groupUsers)
            }
            else {
                data = await IncCaseNamesQueries.getCasesId(caseUuid, userId)
            }

            const fintCategoryId = await IncCaseNamesQueries.getPromptType(promptType)

            if (data.length > 0 && fintCategoryId.length > 0) {
                const record = {
                    userId: userId,
                    incCaseId: data[0].id,
                    title: title,
                    description: description,
                    promptType: fintCategoryId[0].id
                }
                await IncCaseNamesQueries.addPrompt(record);
                return {
                    message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                    statusCode: 200,
                    obj: {}
                };
            }
            else {
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
        console.log("Error in Save Prompt", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getPrompt = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid) {
            let record
            if (isGroup && groupUsers && groupUsers.length > 0) {
                record = await IncCaseNamesQueries.getSavePromptForGroup(groupUsers);
            } else {
                record = await IncCaseNamesQueries.getSavePrompt(caseUuid, userId);
            }
            if (record.length > 0) {
                // const grouped = record.reduce((acc, item) => {
                //     const category = item.promptCategory;
                //     if (!acc[category]) {
                //         acc[category] = [];
                //     }
                //     acc[category].push(item);
                //     return acc;
                // }, {});

                const grouped = record.reduce((acc, item) => {
                    const category = item.promptCategory;
                    if (!acc[category]) {
                        acc[category] = [];
                    }
                    if (isGroup && groupUsers && groupUsers.length > 0) {
                        if (item.promptTypeId == 1 && item.userId !== userId) {
                            return acc; // skip
                        }
                        acc[category].push({
                            requestUuid: item.requestUuid,
                            title: item.title,
                            description: item.description,
                            promptCategory: item.promptCategory,
                        });

                    } else {
                        acc[category].push({
                            requestUuid: item.requestUuid,
                            title: item.title,
                            description: item.description,
                            promptCategory: item.promptCategory,
                        });
                    }

                    return acc;
                }, {});

                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: grouped
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get prompt:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getPromptTypes = async (isGroup) => {
    try {
        const record = await IncCaseNamesQueries.getPromptTypes(isGroup);
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
        console.log("Error in get prompt types:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.deletePrompt = async (caseUuid, requestUuid, userId, isGroup, groupUsers) => {
    try {
        const obj = {
            status: false
        }
        let find;
        if (isGroup && groupUsers && groupUsers.length > 0) {
            find = await IncCaseNamesQueries.findSavedPrompt(caseUuid, requestUuid, groupUsers);
        } else {
            find = await IncCaseNamesQueries.findSavedPrompt(caseUuid, requestUuid, userId);
        }
        if (find?.length > 0) {
            await IncCaseNamesQueries.deletePrompt(obj, requestUuid)
            return {
                statusCode: 200,
                message: Strings.RECORD_DELETED_SUCCESS,
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
        console.log("Error in delete section:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.shareCase = async (caseUuid, sharedWith, userId) => {
    try {
        if (caseUuid && sharedWith.length > 0) {
            const record = await IncCaseNamesQueries.findCaseByUserId(caseUuid, userId)
            if (record.length > 0) {
                for (const element of sharedWith) {
                    const findUserId = await UserQueries.getUserByEmailForCaseShare(element)
                    if (findUserId.length > 0) {
                        if (findUserId[0].userId != userId) {
                            const list = {
                                incCaseId: record[0].id,
                                sharedByUserId: userId,
                                sharedWithUserId: findUserId[0].userId
                            }
                            await IncCaseNamesQueries.addCaseShares(list)
                        } else {
                            return {
                                message: Strings.INSURANCE_CASE.INSURANCE_CASE_SHARE_SELF,
                                statusCode: 400,
                                obj: {}
                            }
                        }
                    }
                    else {
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 400,
                            obj: {}
                        }
                    }
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.INSURANCE_CASE.INSURANCE_CASE_SHARE_SUCCESS,
                    }
                };
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
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
        console.log("Error in share Case:", error);
         if (error?.parent?.code === 'ER_DUP_ENTRY') {
            return {
                message: Strings.INSURANCE_CASE.INSURANCE_CASE_ALREADY_SHARED,
                statusCode: 400,
                obj: {}
            }
        }
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getShareCase = async (caseUuid, userId) => {
    try {
        if (caseUuid) {
            const record = await IncCaseNamesQueries.getShare(caseUuid, userId)
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in get share Case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.revokeShareCase = async (caseUuid, requestUuid, userId) => {
    try {
        if (caseUuid && requestUuid) {
            const record = await IncCaseNamesQueries.getRevokeCase(caseUuid, requestUuid, userId)
            if (record.length > 0) {
                const list = {
                    isActivated: false
                }
                await IncCaseNamesQueries.updateShareCase(list, requestUuid)
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
        console.log("Error in revoke share Case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.generateMedicalInjuryReport = async (caseUuid, templateType, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid) {
            let findLatestReport;
            if (isGroup && groupUsers && groupUsers.length > 0) {
                findLatestReport = await IncCaseNamesQueries.getFileStatusByCaseUuid(caseUuid, groupUsers)
            }
            else {
                findLatestReport = await IncCaseNamesQueries.getFileStatusByCaseUuid(caseUuid, userId)
            }
            if (findLatestReport && findLatestReport.length > 0 && findLatestReport[0]?.isProcessed == '1') {
                const report = findLatestReport[0];
                const findStatus = await generateMedicalInjuryStatus(caseUuid)
                Logger.data.IncCase({ request: { caseUuid: caseUuid }, response: findStatus, userId: userId }, "Generate-Medical-Injury-Status-Inc")
                console.log("******************* Request - 1 - Generate Medical Injury Status Inc *******************");
                console.log(findStatus)
                console.log("******************* Request - 1 - Generate Medical Injury Status Inc *******************");
                if (findStatus?.statusCode == '200' && findStatus?.obj.status == true) {
                    let payload = {}
                    if (report.caseTypeId === 1) { //tort
                        payload = {
                            templateType: Number(templateType),
                            userId: userId,
                            caseUuid: caseUuid,
                            plaintiffName: report.plaintiffFirstName + " " + report.plaintiffLastName,
                            dateOfbirth: report.plaintiffDOB != null ? moment(report.plaintiffDOB).format("YYYY-MM-DD") : null,
                            dateOfLoss: report.dateOfLossTort != null ? moment(report.dateOfLossTort).format("YYYY-MM-DD") : null,
                        };

                    }
                    else if (report.caseTypeId === 2) { //ab matter
                        payload = {
                            templateType: Number(templateType),
                            userId: userId,
                            caseUuid: caseUuid,
                            plaintiffName: report.applicantiffFirstName + " " + report.applicantiffLastName,
                            dateOfbirth: report.applicantiffDOB != null ? moment(report.applicantiffDOB).format("YYYY-MM-DD") : null,
                            dateOfLoss: report.dateOfLossAB != null ? moment(report.dateOfLossAB).format("YYYY-MM-DD") : null,
                        };
                    }
                    else {
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                    
                    const checkStatus = await generateMedicalInjuryReport(payload)
                    Logger.data.IncCase({ request: payload, response: checkStatus, userId: userId }, "Generate-Medical-Injury-Inc")
                    console.log("******************* Request - 2 - Generate Medical Injury Inc *******************");
                    console.log("request", payload)
                    console.log("response", checkStatus)
                    console.log("******************* Request - 2 - Generate Medical Injury Inc *******************");
                    if (checkStatus?.statusCode == '200' && checkStatus?.obj.status == true) {
                        const list = {
                            userId: userId,
                            incCaseId: report.id,
                            jobUuid: checkStatus?.obj.jobUuid
                        }
                        const record = await IncCaseNamesQueries.addMedicalInjuryReport(list)
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.ASSISTANT.ASSISTANT_THREAD_SUCCESS,
                                requestUuid: record[0]
                            }
                        };
                    }
                    else {
                        slack.webhook(JSON.stringify({ action: "Post Medical Injury Report Inc", caseUuid: caseUuid, response: checkStatus, userId: userId }));
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: {
                                error: checkStatus
                            }
                        }
                    }

                }
                else if (findStatus?.statusCode == '200' && findStatus?.obj.status == false) {
                    return {
                        message: Strings.INSURANCE_CASE.INSURANCE_CASE_REPORT_NOT_FOUND, //sharyar will share the updated user message
                        statusCode: 400,
                        obj: {}
                    }
                }
                else {
                    slack.webhook(JSON.stringify({ action: "Generate Medical Injury Report Status Inc", caseUuid: caseUuid, response: findStatus, userId: userId }));
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            error: findStatus
                        }
                    }
                }
            }
            else if (findLatestReport[0]?.isProcessed == '0') {
                return {
                    message: Strings.INSURANCE_CASE.SUMMARY_IN_PROGRESS,
                    statusCode: 400,
                    obj: {}
                };
            }
            else {
                return {
                    message: Strings.INSURANCE_CASE.MEDIATION_REPORT_NOT_FOUND,
                    statusCode: 400,
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
    }
    catch (error) {
        console.log("Error in Generate Summary Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}


IncCaseServices.saveInjury = async (caseUuid, requestUuid, response, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid && requestUuid && response) {
            const record = {
                response: response,
            }
            const list = await IncCaseNamesQueries.saveInjury(record, requestUuid)
            if (list[0] == 1) {
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    }
    catch (error) {
        console.log("Error in save injury:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getMedicalInjuryReport = async (caseUuid, requestUuid, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid && requestUuid) {
            const data = await IncCaseNamesQueries.getMedicalInjuryReportData(requestUuid, userId);
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
                    let list
                    if (isGroup && groupUsers && groupUsers.length > 0) {
                        list = await IncCaseNamesQueries.getMedicalInjuryReportOnComplete(caseUuid, groupUsers);
                    } else {
                        list = await IncCaseNamesQueries.getMedicalInjuryReportOnComplete(caseUuid, userId);
                    }                    
                    if (list.length > 0) {
                        let reportUrl = null;
                        const filePrefix = `${list[0].jobUuid}`;
                        const fileEndsWith = '.docx';
                        const getFileUrl = await IncCaseServices.generateAzureInsuranceDownloadSummaryUrl(caseUuid, filePrefix, fileEndsWith)
                        if (getFileUrl && getFileUrl?.obj?.length > 0 && getFileUrl?.obj[0]?.videoUrl) {
                            reportUrl = getFileUrl.obj[0].videoUrl
                        }
                        const all = await Promise.all(
                            list.map(async (element) => {
                                const replaceCitations = await IncCaseServices.replaceCitationsOptimizedWithReference(
                                    element.response,
                                    element.citations,
                                    caseUuid
                                );
                                return {
                                    requestUuid: element.requestUuid,
                                    status: element.status,
                                    response: replaceCitations,
                                    reportUrl: reportUrl
                                };
                            })
                        );
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: all
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error While get all medical injury Report 15 second api", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.getAllMedicalInjuryReport = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        if (caseUuid) {
            let list
            if (isGroup && groupUsers && groupUsers.length > 0) {
                list = await IncCaseNamesQueries.getMedicalInjuryReportOnCompleteAndPending(caseUuid, groupUsers);
            } else { 
                list = await IncCaseNamesQueries.getMedicalInjuryReportOnCompleteAndPending(caseUuid, userId);
            }            
            if (list.length > 0 && list[0]?.status == 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ASSISTANT.ASSISTANT_PENDING_RESPONSE,
                        status: 0,
                        requestUuid: list[0]?.requestUuid,
                        caseUuid: caseUuid
                    }
                }
            }
            else if (list.length > 0 && list[0]?.status == 1) {
                let record
                if (isGroup && groupUsers && groupUsers.length > 0) {
                    record = await IncCaseNamesQueries.getMedicalInjuryReportOnComplete(caseUuid, groupUsers);
                } else { 
                    record = await IncCaseNamesQueries.getMedicalInjuryReportOnComplete(caseUuid, userId);
                }        
                if (record.length > 0) {
                    let reportUrl = null;
                    const filePrefix = `${record[0].jobUuid}`;
                    const fileEndsWith = '.docx';
                    const getFileUrl = await IncCaseServices.generateAzureInsuranceDownloadSummaryUrl(caseUuid, filePrefix, fileEndsWith)
                    if (getFileUrl && getFileUrl?.obj?.length > 0 && getFileUrl?.obj[0]?.videoUrl) {
                        reportUrl = getFileUrl.obj[0].videoUrl
                    }
                    const all = await Promise.all(
                        record.map(async (element) => {
                            const replaceCitations = await IncCaseServices.replaceCitationsOptimizedWithReference(
                                element.response,
                                element.citations,
                                caseUuid
                            );
                            return {
                                requestUuid: element.requestUuid,
                                status: element.status,
                                response: replaceCitations,
                                reportUrl: reportUrl
                            };
                        })
                    );
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: all
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
        console.log("Error in get all medical injury reports:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.deleteAllMedicalInjuryReport = async (caseUuid, userId, isGroup, groupUsers) => {
    try {
        const obj = {
            isActivated: false
        }
        let getData
        if (isGroup && groupUsers && groupUsers.length > 0) {
            getData = await IncCaseNamesQueries.getMedicalInjuryReportOnComplete(caseUuid, groupUsers)
        } else {
            getData = await IncCaseNamesQueries.getMedicalInjuryReportOnComplete(caseUuid, userId)
        }
        if (getData.length > 0) {
            for (const element of getData) {
                await IncCaseNamesQueries.deleteInjuryReport(obj, element.requestUuid, userId)
            }
            return {
                statusCode: 200,
                message: Strings.RECORD_DELETED_SUCCESS,
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
        console.log("Error in delete Medical Injury Reports", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

IncCaseServices.updateMedicalInjuryReport = async (jobUuid, status, response, citations, allData) => {
    try {
        Logger.data.IncCase({ response: allData }, "Response-Webhook-Medical-Injury-Inc");
        const data = await IncCaseNamesQueries.findInjuryReport(jobUuid)
        if (data?.length > 0 && jobUuid) {
            console.log("******************************************************");
            console.log("Got the hit For Sending Ins Case Medical Injury Report");
            console.log("******************************************************");
            if (status) {
                const list = await UserQueries.getUser(data[0].userId)
                if (false) {
                    const parentEmailStatus = await Emails.medicalInjuryReport(list?.email);
                    Logger.data.IncCase({ request: list?.email, response: parentEmailStatus, jobUuid: jobUuid }, "Send-Case-Injury-Report-Parent-Email-Inc");
                    const sharedChilds = await IncCaseNamesQueries.findSharedChilds(data[0].incCaseId, data[0].userId)
                    if (sharedChilds.length > 0) {
                        for (const element of sharedChilds) {
                            const child = await UserQueries.getUser(element.sharedWithUserId)
                            const childEmailStatus = await Emails.medicalInjuryReport(child?.email);
                            Logger.data.IncCase({ request: child?.email, response: childEmailStatus, jobUuid: jobUuid }, "Send-Case-Injury-Report-Child-Email-Inc");
                        }                        
                    }
                }
                const record = {
                    status: true,
                    response: response,
                    citations: JSON.stringify(citations)
                }
                await IncCaseNamesQueries.updateByJobIdMedicalInjuryReport(record, jobUuid)
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                    }
                };
            } else {
                slack.webhook(JSON.stringify({ action: "Medical Injury Report Failed", jobUuid: jobUuid, userId: data[0].userId }));
                await IncCaseNamesQueries.updateByJobIdMedicalInjuryReport({ isActivated: false, status: 2 }, jobUuid)
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: allData
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
        console.log("Error in update Medical Injury Report:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = IncCaseServices;