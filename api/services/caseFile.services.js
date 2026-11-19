const CaseServices = {};
const {
    CaseIntelligentMapQueries,
    CaseNamesQueries,
    CaseFilesQueries,
    CaseResponsesQueries,
    CaseTypesQueries,
    UserQueries,
    CaseDocAssistantQueries,
    CaseReportGeneratorQueries
} = require('../queries');
const { Strings, Logger } = require('../../utils')
const { parseIfJson } = require('../../utils/file.helpers');
const { makeDirectory } = require('../../utils/fs.utility');
const {
    convertAudioToTextDeepGram,
    summaryUpload
} = require('../../api/external/ChatGPT')
const fsPromise = require('fs').promises;
const currentDate = new Date();
const moment = require('moment');
const fsnew = require('fs');
const mime = require('mime-types');
const { slack } = require('./../../utils/Webhook');
const Encryptions = require('../../utils/Encryptions');
const writeFile = process.env.CASE_READ_WRITE;
let allowedFile = process.env.CASE_FILE_LIMIT;
let allowedAudFile = process.env.CASE_AUD_FILE_LIMIT;
const disable = false;
const { simpleParser } = require("mailparser");

CaseServices.addCase = async (caseName, caseAttachments, summary, caseAudio, caseQueries, casefilesData, assignees, userType, firmId, isFirm, userId) => {
    try {
        const find = await CaseServices.checkDuplicate(caseName, userId)
        let caseQueriesValidation = false;
        if (find) {
            if (caseQueries) {
                const caseQueriesData = JSON.parse(caseQueries)
                if (caseQueriesData.length > 0) {
                    for (const element of caseQueriesData) {
                        const getIntakeQueriesId = await CaseNamesQueries.getCaseQueriesByuuid(element.requestUuid)
                        if (getIntakeQueriesId.length > 0) {
                            caseQueriesValidation = true;
                        } else {
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: Strings.ROOM.EMPTY + " for " + element.requestUuid
                                }
                            }
                        }
                    }
                }
            }

            if (caseAttachments?.length > 0 && writeFile && caseName != '') {
                const validJson = await parseIfJson(casefilesData)
                if (validJson) {
                    const casefilesCategory = JSON.parse(casefilesData);
                    const checker = await CaseServices.validateFileCategory(casefilesCategory, caseAttachments.length);
                    if (checker) {
                        const data = {
                            caseName: caseName,
                            summary: summary,
                            userId: userId
                        }
                        if (isFirm === true && userType == 'assistant') {
                            data.createdByUserId = userId
                        }
                        const result = await CaseNamesQueries.addCase(data);
                        const caseUuid = result.dataValues.caseUuid;
                        const caseId = result.dataValues.id
                        const path = writeFile + `${caseUuid}`
                        await makeDirectory(path)
                        const makeFile = await CaseServices.writeMultipleFileWithEmlCheck(caseAttachments, path)
                        if (makeFile.length > 0 && makeFile[0].statusCode == '200') {
                            makeFile.forEach(async (file, index) => {
                                const getCategoryId = await CaseServices.getFileCategory(casefilesCategory, index);
                                const fileData = {
                                    caseId: caseId,
                                    userId: userId,
                                    fileName: file.obj.fileName,
                                    filePath: file.obj.filePath,
                                    fileTypeId: getCategoryId.obj[0]
                                }
                                if (isFirm === true && userType == 'assistant') {
                                    fileData.createdByUserId = userId
                                }
                                await CaseFilesQueries.createFile(fileData);
                            });
                            if (caseAudio?.length > 0) {
                                const makeAudio = await CaseServices.writeMultipleFile(caseAudio, path)
                                if (makeAudio.length > 0 && makeAudio[0].statusCode == '200') {
                                    makeAudio.forEach(async (file, index) => {
                                        const fileData = {
                                            caseId: result.dataValues.id,
                                            userId: userId,
                                            fileName: file.obj.fileName,
                                            filePath: file.obj.filePath,
                                            fileType: true
                                        }
                                        await CaseFilesQueries.createFile(fileData);
                                    });
                                } else {
                                    return {
                                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                        statusCode: 400,
                                        obj: {
                                            error: makeAudio
                                        }
                                    }
                                }
                            }
                            if (caseQueriesValidation === true) {
                                const caseQueriesData = JSON.parse(caseQueries)
                                for (const element of caseQueriesData) {
                                    const getIntakeQueriesId = await CaseNamesQueries.getCaseQueriesByuuid(element.requestUuid)
                                    if (getIntakeQueriesId.length > 0) {
                                        const record = {
                                            caseId: result.dataValues.id,
                                            queryId: getIntakeQueriesId[0].id,
                                            userId: userId,
                                            response: element.request
                                        }
                                        await CaseNamesQueries.createCaseAnswersByUuid(record);
                                    }
                                }
                            }
                            if (isFirm === true && assignees?.length > 0 && userType == 'assistant' ) {
                                console.log("assigness while case create", caseUuid, assignees, firmId, isFirm, userId);
                                const { assign } = require('../services/caseAssignees.services');
                                return await assign(caseUuid, JSON.parse(assignees), firmId, isFirm, userId);
                            }
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                                }
                            };
                        } else {
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: makeFile
                                }
                            }
                        }
                    } else {
                        return {
                            message: Strings.UNVALID_STATUS,
                            statusCode: 400,
                            obj: {
                                message: Strings.FILE.CASE_ATTACHMENT_MISMATCH
                            }
                        };
                    }
                } else {
                    return {
                        message: Strings.UNVALID_STATUS,
                        statusCode: 400,
                        obj: {
                            message: Strings.JSON_UNVALIDATION
                        }
                    };
                }
            }
            else if (writeFile && caseName != '') {
                const data = {
                    caseName: caseName,
                    summary: summary,
                    userId: userId
                }
                const result = await CaseNamesQueries.addCase(data);
                const caseUuid = result.dataValues.caseUuid;
                if (caseQueriesValidation === true) {
                    const caseQueriesData = JSON.parse(caseQueries)
                    for (const element of caseQueriesData) {
                        const getIntakeQueriesId = await CaseNamesQueries.getCaseQueriesByuuid(element.requestUuid)
                        if (getIntakeQueriesId.length > 0) {
                            const record = {
                                caseId: result.dataValues.id,
                                queryId: getIntakeQueriesId[0].id,
                                userId: userId,
                                response: element.request
                            }
                            await CaseNamesQueries.createCaseAnswersByUuid(record);
                        }
                    }
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                    }
                };
            }
            else if (caseAudio?.length > 0 && writeFile && caseName != '') {
                const data = {
                    caseName: caseName,
                    summary: summary,
                    userId: userId
                }
                const result = await CaseNamesQueries.addCase(data);
                const caseUuid = result.dataValues.caseUuid;
                const path = writeFile + `${caseUuid}`
                await makeDirectory(path)
                const makeAudio = await CaseServices.writeMultipleFile(caseAudio, path)
                if (makeAudio.length > 0 && makeAudio[0].statusCode == '200') {
                    makeAudio.forEach(async (file, index) => {
                        const fileData = {
                            caseId: result.dataValues.id,
                            userId: userId,
                            fileName: file.obj.fileName,
                            filePath: file.obj.filePath,
                            fileType: true
                        }
                        await CaseFilesQueries.createFile(fileData);
                    });
                } else {
                    return {
                        message: Strings.ERROR.SOME_THING_WENT_WRONG,
                        statusCode: 400,
                        obj: {
                            error: makeAudio
                        }
                    }
                }
                if (caseQueriesValidation === true) {
                    const caseQueriesData = JSON.parse(caseQueries)
                    for (const element of caseQueriesData) {
                        const getIntakeQueriesId = await CaseNamesQueries.getCaseQueriesByuuid(element.requestUuid)
                        if (getIntakeQueriesId.length > 0) {
                            const record = {
                                caseId: result.dataValues.id,
                                queryId: getIntakeQueriesId[0].id,
                                userId: userId,
                                response: element.request
                            }
                            await CaseNamesQueries.createCaseAnswersByUuid(record);
                        }
                    }
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                    }
                };

            }
            else {
                return {
                    message: Strings.UNVALID_STATUS,
                    statusCode: 400,
                    obj: {}
                }
            }
        } else {
            return {
                message: Strings.ERROR.RECORD_ALREADY_EXSIST,
                statusCode: 400,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in creating a  case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.getFileCategory = async (casefilesCategory, index) => {
    try {
        const categoryArray = [];
        for (let list = 0; list < casefilesCategory.length; list++) {
            const element = casefilesCategory[list];
            const allIndex = element.fileIndexes;
            for (let allList = 0; allList < allIndex.length; allList++) {
                const elementIndex = allIndex[allList];
                if (elementIndex == index) {
                    const getFileId = await CaseNamesQueries.getCaseFileTypesByuuid(element.requestUuid)
                    categoryArray.push(getFileId[0].id)
                }
            }
        }
        if (categoryArray.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: categoryArray
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }

    } catch (error) {
        console.log("Error in writing multiple file 2", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.validateFileCategory = async (casefilesCategory, number) => {
    try {
        const totalFileIndexes = casefilesCategory.reduce((sum, category) => {
            return sum + category.fileIndexes.length;
        }, 0);
        if (totalFileIndexes != number) {
            return false;
        } else {
            return true
        }
    } catch (error) {
        console.log("Error in validate File Category", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.writeMultipleFileWithEmlCheck = async (caseAttachments, path) => {
    try {
        const writePromises = caseAttachments.map(async (file) => {
            const ext = file.originalname.endsWith(".eml");
            if (ext) {
                const parsed = await simpleParser(file.buffer);
                const txtContent = [
                parsed.subject ? `Subject: ${parsed.subject}` : "",
                parsed.from?.text ? `From: ${parsed.from.text}` : "",
                parsed.to?.text ? `To: ${parsed.to.text}` : "",
                parsed.date ? `Date: ${parsed.date}` : "",
                "",
                parsed.text ? parsed.text.trim() : ""
                ]
                .filter(line => line.trim() !== "") // remove empty lines
                .join("\n");
                // console.log("email content", txtContent);
                const txtFileName = file.originalname.replace(/\.eml$/i, ".txt");
                const fileNameAndPath = path + "/" + txtFileName;
                const fileName = txtFileName;
                const fileContent = txtContent;
                return await CaseServices.writeContent(fileNameAndPath, fileContent, fileName)
            } else {
                const fileNameAndPath = path + "/" + file.originalname;
                const fileName = file.originalname;
                const fileContent = file.buffer;
                return await CaseServices.writeContent(fileNameAndPath, fileContent, fileName)
            }
        });
        return await Promise.all(writePromises);
    } catch (error) {
        console.log("Error in writing write Multiple File With Eml Check file", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.writeMultipleFile = async (caseAttachments, path) => {
    try {
        const writePromises = caseAttachments.map(async (file) => {
            const fileNameAndPath = path + "/" + file.originalname;
            const fileName = file.originalname;
            const fileContent = file.buffer;
            return await CaseServices.writeContent(fileNameAndPath, fileContent, fileName)
        });
        return await Promise.all(writePromises);
    } catch (error) {
        console.log("Error in writing multiple file 1", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.writeContent = async (fileNameAndPath, fileContent, fileName) => {
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

CaseServices.showQueries = async (caseId, userId) => {
    const outputArray = [];
    const record = await CaseServices.getCaseQueries()
    const allQueries = record.obj
    for (let index = 0; index < allQueries.length; index++) {
        const element = allQueries[index].questions;
        const processedQuestions = [];
        for (let index = 0; index < element.length; index++) {
            const questionElement = element[index];
            const response = {}
            const findQueryIdbyUuid = await CaseNamesQueries.getCaseQueriesByuuid(questionElement.requestUuid)
            const getIntakeAnswers = await CaseNamesQueries.findIntakeAnswers(caseId, findQueryIdbyUuid[0].id, userId)
            if (getIntakeAnswers.length > 0) {
                const formPattern = /(Allegation \d+:|Incident\/issue \d+:|Complainant\(s\):|Respondent\(s\):|Witness\(es\):)/;
                response.requestUuid = getIntakeAnswers[0].requestUuid ? getIntakeAnswers[0].requestUuid : ""
                response.answer = getIntakeAnswers[0].response ? getIntakeAnswers[0].response : ""
                if (findQueryIdbyUuid[0].id == '4') {
                    response.form = formPattern.test(response.answer)
                }
                questionElement.response = response
            }
            else {
                questionElement.response = response
            }
            processedQuestions.push(questionElement);
        }
        outputArray.push({
            ...allQueries[index],
            questions: processedQuestions,
        });
        Logger.data.OpenAI({ outputArray: outputArray, userId: userId }, "Get-Case-Files");
    }
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: outputArray
    };

}

CaseServices.fetchCase = async (isGroup, groupUsers, groupName, isCompany, companyUsers, userId) => {
    try {
        if (isGroup === true && groupUsers.length > 0 && disable == false) {
            const allData = [];
            const data = await CaseNamesQueries.getFileStatus(groupUsers);
            if (data.length > 0) {
                const getUserDetails = await UserQueries.getUser(groupUsers);
                const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                    const caseStatus = await getFormatedCaseTypes(id);
                    return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                }));
                const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                const transformedData = data.reduce((acc, current) => {
                    const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                    const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                    const fileDetail = {
                        fileUuid: current["caseDetails.fileUuid"],
                        fileName: current["caseDetails.fileName"],
                    };
                    const fileGroup = {
                        title: current["caseDetails.filesTypeInfo.title"],
                        requestUuid: current["caseDetails.filesTypeInfo.requestUuid"],
                        caseFile: [fileDetail],
                    };
                    if (caseIndex === -1) {
                        acc.push({
                            caseUuid: current.caseUuid,
                            id: current.id,
                            caseName: current.caseName,
                            caseStatus: caseStatusLookup[current.caseTypeId],
                            caseSummary: current.summary,
                            caseQuery: [], // Bulk queries will be added later
                            createdBy: getUserDetails.email,
                            createdAt: formattedCreatedAt,
                            isDashboard: current["caseDetails.vectorInfo.status"] === 1 && current.isProcessed === 1 ? true : false,
                            caseDoc: current["caseDetails.fileType"] === 0 ? [fileGroup] : [],
                            caseFiles: current["caseDetails.fileType"] === 0 ? [fileDetail] : [],
                            caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : [],
                        });
                    } else {
                        const existingCase = acc[caseIndex];
                        if (current["caseDetails.fileType"] === 0) {
                            existingCase.caseFiles.push(fileDetail);
                            const docGroupIndex = existingCase.caseDoc.findIndex(
                                doc => doc.requestUuid === fileGroup.requestUuid
                            );
                            if (docGroupIndex === -1) {
                                existingCase.caseDoc.push(fileGroup);
                            } else {
                                existingCase.caseDoc[docGroupIndex].caseFile.push(fileDetail);
                            }
                        } else if (current["caseDetails.fileType"] === 1) {
                            fileDetail.processed = current["caseDetails.isProcessed"] === 1 ? true : false;
                            existingCase.caseAud.push(fileDetail);
                        }
                    }
                    return acc;
                }, []);
                for (const item of transformedData) {
                    const bulkQueries = await CaseServices.showQueries(item.id, groupUsers);
                    item.caseQuery = bulkQueries.obj;
                    delete item.id;
                }
                allData.push(...transformedData);
            }
            if (allData.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allData
                };
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                };
            }
        }
        else if (isCompany === true && companyUsers.length > 0 && disable == false) {
            const allData = [];
            console.log('companyUsers', companyUsers);
            for (const element of companyUsers) {
                const data = await CaseNamesQueries.getFileStatus(element);
                if (data.length > 0) {
                    const getUserDetails = await UserQueries.getUser(element);
                    const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                    const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                        const caseStatus = await getFormatedCaseTypes(id);
                        return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                    }));
                    const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    const transformedData = data.reduce((acc, current) => {
                        const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                        const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                        const fileDetail = {
                            fileUuid: current["caseDetails.fileUuid"],
                            fileName: current["caseDetails.fileName"],
                        };
                        const fileGroup = {
                            title: current["caseDetails.filesTypeInfo.title"],
                            requestUuid: current["caseDetails.filesTypeInfo.requestUuid"],
                            caseFile: [fileDetail],
                        };
                        if (caseIndex === -1) {
                            acc.push({
                                caseUuid: current.caseUuid,
                                id: current.id,
                                caseName: current.caseName,
                                caseStatus: caseStatusLookup[current.caseTypeId],
                                caseSummary: current.summary,
                                caseQuery: [], // Bulk queries will be added later
                                createdBy: getUserDetails.email,
                                createdAt: formattedCreatedAt,
                                //isDashboard: current.isProcessed === 1 ? true : false,
                                isDashboard: current["caseDetails.vectorInfo.status"] === 1 && current.isProcessed === 1 ? true : false,
                                caseDoc: current["caseDetails.fileType"] === 0 ? [fileGroup] : [],
                                caseFiles: current["caseDetails.fileType"] === 0 ? [fileDetail] : [],
                                caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : [],
                            });
                        } else {
                            const existingCase = acc[caseIndex];
                            if (current["caseDetails.fileType"] === 0) {
                                existingCase.caseFiles.push(fileDetail);
                                const docGroupIndex = existingCase.caseDoc.findIndex(
                                    doc => doc.requestUuid === fileGroup.requestUuid
                                );
                                if (docGroupIndex === -1) {
                                    existingCase.caseDoc.push(fileGroup);
                                } else {
                                    existingCase.caseDoc[docGroupIndex].caseFile.push(fileDetail);
                                }
                            } else if (current["caseDetails.fileType"] === 1) {
                                fileDetail.processed = current["caseDetails.isProcessed"] === 1 ? true : false;
                                existingCase.caseAud.push(fileDetail);
                            }
                        }
                        return acc;
                    }, []);

                    for (const item of transformedData) {
                        const bulkQueries = await CaseServices.showQueries(item.id, element);
                        item.caseQuery = bulkQueries.obj;
                        delete item.id;
                    }
                    allData.push(...transformedData);
                }
            }
            if (allData.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allData
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
            const data = await CaseNamesQueries.getFileStatus(userId);
            if (data.length > 0) {
                const getUserDetails = await UserQueries.getUser(userId);
                const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                    const caseStatus = await getFormatedCaseTypes(id);
                    return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                }));
                const transformedData = await data.reduce(async (accPromise, current) => {
                    const acc = await accPromise; // Await the accumulator for async reduce

                    const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                    const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                    const fileDetail = {
                        fileUuid: current["caseDetails.fileUuid"],
                        fileName: current["caseDetails.fileName"],
                    };
                    const fileGroup = {
                        title: current["caseDetails.filesTypeInfo.title"],
                        requestUuid: current["caseDetails.filesTypeInfo.requestUuid"],
                        caseFile: [fileDetail],
                    };
                    const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    const bulkQueries = await CaseServices.showQueries(current.id, userId);
                    const dataObject = {
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        caseStatus: caseStatusLookup[current.caseTypeId],
                        caseSummary: current.summary,
                        caseQuery: bulkQueries.obj, // Include the result from bulkQueries
                        createdBy: getUserDetails.email,
                        createdAt: formattedCreatedAt,
                        //isDashboard: current.isProcessed === 1 ? true : false,
                        isDashboard: current["caseDetails.vectorInfo.status"] === 1 && current.isProcessed === 1 ? true : false,
                        caseDoc: current["caseDetails.fileType"] === 0 ? [] : [],
                        caseFiles: current["caseDetails.fileType"] === 0 ? [] : [],
                        caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : [],
                    };
                    if (caseIndex === -1) {
                        dataObject.caseFiles.push(fileDetail);
                        dataObject.caseDoc.push(fileGroup);
                        acc.push(dataObject);
                    } else {
                        if (current["caseDetails.fileType"] === 0) {
                            acc[caseIndex].caseFiles.push(fileDetail);
                            const docGroupIndex = acc[caseIndex].caseDoc.findIndex(
                                doc => doc.requestUuid === fileGroup.requestUuid
                            );
                            if (docGroupIndex === -1) {
                                acc[caseIndex].caseDoc.push(fileGroup);
                            } else {
                                acc[caseIndex].caseDoc[docGroupIndex].caseFile.push(fileDetail);
                            }
                        } else if (current["caseDetails.fileType"] === 1) {
                            fileDetail.processed = current["caseDetails.isProcessed"] === 1 ? true : false;
                            acc[caseIndex].caseAud.push(fileDetail);
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
        }
    } catch (error) {
        console.log("Error in fetching a case:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseServices.fetchOnlyCase = async (groupUsers, caseUuid, userId) => {
    try {
        if (groupUsers?.length > 0) {
            const allData = [];
                const data = await CaseNamesQueries.getFileOnlyStatus(caseUuid, groupUsers);
                if (data.length > 0) {
                    const getUserDetails = await UserQueries.getUser(groupUsers);
                    const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                    const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                        const caseStatus = await getFormatedCaseTypes(id);
                        return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                    }));

                    const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    const transformedData = data.reduce((acc, current) => {
                        const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                        const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                        const fileDetail = {
                            fileUuid: current["caseDetails.fileUuid"],
                            fileName: current["caseDetails.fileName"],
                        };
                        const fileGroup = {
                            title: current["caseDetails.filesTypeInfo.title"],
                            requestUuid: current["caseDetails.filesTypeInfo.requestUuid"],
                            caseFile: [fileDetail],
                        };

                        if (caseIndex === -1) {
                            acc.push({
                                caseUuid: current.caseUuid,
                                caseName: current.caseName,
                                caseStatus: caseStatusLookup[current.caseTypeId],
                                caseSummary: current.summary,
                                caseQuery: [], // Bulk queries will be added later
                                createdBy: getUserDetails.email,
                                createdAt: formattedCreatedAt,
					            isDashboard: current["caseDetails.vectorInfo.status"] === 1 && current.isProcessed === 1 ? true : false,
                                caseDoc: current["caseDetails.fileType"] === 0 ? [fileGroup] : [],
                                caseFiles: current["caseDetails.fileType"] === 0 ? [fileDetail] : [],
                                caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : [],
                            });
                        } else {
                            const existingCase = acc[caseIndex];
                            if (current["caseDetails.fileType"] === 0) {
                                existingCase.caseFiles.push(fileDetail);
                                const docGroupIndex = existingCase.caseDoc.findIndex(
                                    doc => doc.requestUuid === fileGroup.requestUuid
                                );
                                if (docGroupIndex === -1) {
                                    existingCase.caseDoc.push(fileGroup);
                                } else {
                                    existingCase.caseDoc[docGroupIndex].caseFile.push(fileDetail);
                                }
                            } else if (current["caseDetails.fileType"] === 1) {
                                fileDetail.processed = current["caseDetails.isProcessed"] === 1 ? true : false;
                                existingCase.caseAud.push(fileDetail);
                            }
                        }
                        return acc;
                    }, []);

                    for (const item of transformedData) {
                        const bulkQueries = await CaseServices.showQueries(data[0].id, groupUsers);
                        item.caseQuery = bulkQueries.obj;
                    }
                    allData.push(...transformedData);
                }
            if (allData.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allData
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
            const data = await CaseNamesQueries.getFileOnlyStatus(caseUuid, userId);
            if (data.length > 0) {
                const getUserDetails = await UserQueries.getUser(userId);
                const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                    const caseStatus = await getFormatedCaseTypes(id);
                    return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                }));
                const transformedData = await data.reduce(async (accPromise, current) => {
                    const acc = await accPromise; // Await the accumulator for async reduce

                    const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                    const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                    const fileDetail = {
                        fileUuid: current["caseDetails.fileUuid"],
                        fileName: current["caseDetails.fileName"],
                    };
                    const fileGroup = {
                        title: current["caseDetails.filesTypeInfo.title"],
                        requestUuid: current["caseDetails.filesTypeInfo.requestUuid"],
                        caseFile: [fileDetail],
                    };

                    const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    const bulkQueries = await CaseServices.showQueries(current.id, userId);
                    const dataObject = {
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        caseStatus: caseStatusLookup[current.caseTypeId],
                        caseSummary: current.summary,
                        caseQuery: bulkQueries.obj, // Include the result from bulkQueries
                        createdBy: getUserDetails.email,
                        createdAt: formattedCreatedAt,
                        //isDashboard: current.isProcessed === 1 ? true : false,
					    isDashboard: current["caseDetails.vectorInfo.status"] === 1 && current.isProcessed === 1 ? true : false,
                        caseDoc: current["caseDetails.fileType"] === 0 ? [] : [],
                        caseFiles: current["caseDetails.fileType"] === 0 ? [] : [],
                        caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : [],
                    };
                    if (caseIndex === -1) {
                        dataObject.caseFiles.push(fileDetail);
                        dataObject.caseDoc.push(fileGroup);
                        acc.push(dataObject);
                    } else {
                        if (current["caseDetails.fileType"] === 0) {
                            acc[caseIndex].caseFiles.push(fileDetail);
                            const docGroupIndex = acc[caseIndex].caseDoc.findIndex(
                                doc => doc.requestUuid === fileGroup.requestUuid
                            );
                            if (docGroupIndex === -1) {
                                acc[caseIndex].caseDoc.push(fileGroup);
                            } else {
                                acc[caseIndex].caseDoc[docGroupIndex].caseFile.push(fileDetail);
                            }
                        } else if (current["caseDetails.fileType"] === 1) {
                            fileDetail.processed = current["caseDetails.isProcessed"] === 1 ? true : false;
                            acc[caseIndex].caseAud.push(fileDetail);
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
        }
    } catch (error) {
        console.log("Error in fetching a only one case details bu caseUuid:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseServices.fetchOnlyCaseForAssistant = async (isGroup, groupUsers, groupName, caseUuid, userId) => {
    try {
        if (isGroup === true && groupUsers?.length > 0 && disable == false) {
            const allData = [];
            for (const element of groupUsers) {
                const data = await CaseNamesQueries.getFileOnlyStatus(caseUuid, element);
                if (data.length > 0) {
                    const getUserDetails = await UserQueries.getUser(element);
                    const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                    const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                        const caseStatus = await getFormatedCaseTypes(id);
                        return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                    }));

                    const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    const transformedData = data.reduce((acc, current) => {
                        const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                        const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                        const fileDetail = {
                            fileUuid: current["caseDetails.fileUuid"],
                            fileName: current["caseDetails.fileName"],
                        };
                        const fileGroup = {
                            title: current["caseDetails.filesTypeInfo.title"],
                            requestUuid: current["caseDetails.filesTypeInfo.requestUuid"],
                            caseFile: [fileDetail],
                        };

                        if (caseIndex === -1) {
                            acc.push({
                                caseUuid: current.caseUuid,
                                caseName: current.caseName,
                                caseStatus: caseStatusLookup[current.caseTypeId],
                                caseSummary: current.summary,
                                caseQuery: [], // Bulk queries will be added later
                                createdBy: getUserDetails.email,
                                createdAt: formattedCreatedAt,
                                //isDashboard: current.isProcessed === 1 ? true : false,
					            isDashboard: current["caseDetails.vectorInfo.status"] === 1 && current.isProcessed === 1 ? true : false,
                                caseDoc: current["caseDetails.fileType"] === 0 ? [fileGroup] : [],
                                caseFiles: current["caseDetails.fileType"] === 0 ? [fileDetail] : [],
                                caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : [],
                            });
                        } else {
                            const existingCase = acc[caseIndex];
                            if (current["caseDetails.fileType"] === 0) {
                                existingCase.caseFiles.push(fileDetail);
                                const docGroupIndex = existingCase.caseDoc.findIndex(
                                    doc => doc.requestUuid === fileGroup.requestUuid
                                );
                                if (docGroupIndex === -1) {
                                    existingCase.caseDoc.push(fileGroup);
                                } else {
                                    existingCase.caseDoc[docGroupIndex].caseFile.push(fileDetail);
                                }
                            } else if (current["caseDetails.fileType"] === 1) {
                                fileDetail.processed = current["caseDetails.isProcessed"] === 1 ? true : false;
                                existingCase.caseAud.push(fileDetail);
                            }
                        }
                        return acc;
                    }, []);

                    for (const item of transformedData) {
                        const bulkQueries = await CaseServices.showQueries(data[0]?.id, userId);
                        item.caseQuery = bulkQueries.obj;
                    }
                    allData.push(...transformedData);
                }
            }

            if (allData.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allData
                };
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: []
                };
            }
        }
        else {
            const data = await CaseNamesQueries.getFileOnlyStatus(caseUuid, userId);
            if (data.length > 0) {
                const getUserDetails = await UserQueries.getUser(userId);
                const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                    const caseStatus = await getFormatedCaseTypes(id);
                    return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                }));
                const transformedData = await data.reduce(async (accPromise, current) => {
                    const acc = await accPromise; // Await the accumulator for async reduce

                    const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                    const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                    const fileDetail = {
                        fileUuid: current["caseDetails.fileUuid"],
                        fileName: current["caseDetails.fileName"],
                    };
                    const fileGroup = {
                        title: current["caseDetails.filesTypeInfo.title"],
                        requestUuid: current["caseDetails.filesTypeInfo.requestUuid"],
                        caseFile: [fileDetail],
                    };

                    const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    const bulkQueries = await CaseServices.showQueries(current.id, userId);
                    const dataObject = {
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        caseStatus: caseStatusLookup[current.caseTypeId],
                        caseSummary: current.summary,
                        caseQuery: bulkQueries.obj, // Include the result from bulkQueries
                        createdBy: getUserDetails.email,
                        createdAt: formattedCreatedAt,
                        //isDashboard: current.isProcessed === 1 ? true : false,
					    isDashboard: current["caseDetails.vectorInfo.status"] === 1 && current.isProcessed === 1 ? true : false,
                        caseDoc: current["caseDetails.fileType"] === 0 ? [] : [],
                        caseFiles: current["caseDetails.fileType"] === 0 ? [] : [],
                        caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : [],
                    };
                    if (caseIndex === -1) {
                        dataObject.caseFiles.push(fileDetail);
                        dataObject.caseDoc.push(fileGroup);
                        acc.push(dataObject);
                    } else {
                        if (current["caseDetails.fileType"] === 0) {
                            acc[caseIndex].caseFiles.push(fileDetail);
                            const docGroupIndex = acc[caseIndex].caseDoc.findIndex(
                                doc => doc.requestUuid === fileGroup.requestUuid
                            );
                            if (docGroupIndex === -1) {
                                acc[caseIndex].caseDoc.push(fileGroup);
                            } else {
                                acc[caseIndex].caseDoc[docGroupIndex].caseFile.push(fileDetail);
                            }
                        } else if (current["caseDetails.fileType"] === 1) {
                            fileDetail.processed = current["caseDetails.isProcessed"] === 1 ? true : false;
                            acc[caseIndex].caseAud.push(fileDetail);
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
                    obj: []
                };
            }
        }
    } catch (error) {
        console.log("Error in fetching a only one case details bu caseUuid fetch Only Case For Assistant :", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseServices.fetchCaseAssigness = async (caseId, userId) => {
    try {
        const data = await CaseNamesQueries.getFileStatusAssigness(caseId, userId);
        if (data.length > 0) {
            const getUserDetails = await UserQueries.getUserTypes(userId);
            const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
            const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                const caseStatus = await getFormatedCaseTypes(id);
                return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
            }));
            const transformedData = await data.reduce(async (accPromise, current) => {
                const acc = await accPromise; // Await the accumulator for async reduce
                const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                const fileDetail = {
                    fileUuid: current["caseDetails.fileUuid"],
                    fileName: current["caseDetails.fileName"],
                };
                const fileGroup = {
                    title: current["caseDetails.filesTypeInfo.title"],
                    requestUuid: current["caseDetails.filesTypeInfo.requestUuid"],
                    caseFile: [fileDetail],
                };
                const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                const bulkQueries = await CaseServices.showQueries(current.id, userId);
                const userDetail = getUserDetails.find(u => u.userId === current["caseDetails.userId"]);
                const dataObject = {
                    caseUuid: current.caseUuid,
                    caseName: current.caseName,
                    caseStatus: caseStatusLookup[current.caseTypeId],
                    caseSummary: current.summary,
                    caseQuery: bulkQueries.obj, // Include the result from bulkQueries
                    userType: userDetail?.usertypeTitle || null,
                    createdBy: userDetail.email || null,
                    createdAt: formattedCreatedAt,
                    //isDashboard: current.isProcessed === 1 ? true : false,
					isDashboard: current["caseDetails.vectorInfo.status"] === 1 && current.isProcessed === 1 ? true : false,
                    caseDoc: current["caseDetails.fileType"] === 0 ? [] : [],
                    caseFiles: current["caseDetails.fileType"] === 0 ? [] : [],
                    caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : [],
                };
                if (caseIndex === -1) {
                    dataObject.caseFiles.push(fileDetail);
                    dataObject.caseDoc.push(fileGroup);
                    acc.push(dataObject);
                } else {
                    if (current["caseDetails.fileType"] === 0) {
                        acc[caseIndex].caseFiles.push(fileDetail);
                        const docGroupIndex = acc[caseIndex].caseDoc.findIndex(
                            doc => doc.requestUuid === fileGroup.requestUuid
                        );
                        if (docGroupIndex === -1) {
                            acc[caseIndex].caseDoc.push(fileGroup);
                        } else {
                            acc[caseIndex].caseDoc[docGroupIndex].caseFile.push(fileDetail);
                        }
                    } else if (current["caseDetails.fileType"] === 1) {
                        fileDetail.processed = current["caseDetails.isProcessed"] === 1 ? true : false;
                        acc[caseIndex].caseAud.push(fileDetail);
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
        console.log("Error in fetching a case assignees:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

async function getFormatedCaseTypes(id) {
    const data = await CaseTypesQueries.getAllTypesById(id);
    const [validData, unValidData] = data;
    const formattedData = [
        ...validData.map(item => ({ ...item, status: true })),
        ...unValidData.map(item => ({ ...item, status: false }))
    ];
    return formattedData.sort((a, b) => {
        return a.id - b.id;
    });
}

CaseServices.getCase = async (caseName, userId) => {
    try {
        const data = await CaseNamesQueries.findCases(caseName, userId)
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
        console.log("Error in finding a case by id:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.getCaseById = async (caseUuid, userId) => {
    try {
        const data = await CaseNamesQueries.findCasesByUuid(caseUuid, userId)
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
        console.log("Error in finding a case by id:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.getAllFile = async (caseId, userId) => {
    try {
        const data = await CaseNamesQueries.getCasesId(caseId, userId)
        if (data.length > 0 && data[0].id) {
            const result = await CaseFilesQueries.getFiles(data[0].id, userId)
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
    } catch (error) {
        console.log("Error in getting a file:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.removeCase = async (caseId, userId) => {
    try {
        const obj = {
            status: 0,
            updatedAt: currentDate
        }
        //add the group logic here
        const getCasesId = await CaseNamesQueries.getCasesId(caseId, userId)
        if (getCasesId.length > 0) {
            const deleteCase = await CaseNamesQueries.deActivateCase(obj, caseId, userId);
            const deleteFile = await CaseFilesQueries.deActivateFileByCaseId(obj, getCasesId[0].id, userId);
            const deleteResponses = await CaseResponsesQueries.deActivateResponsesByCaseId(obj, getCasesId[0].id, userId);
            if (deleteCase[0] == 1 && deleteFile && deleteResponses) {
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

CaseServices.removeFile = async (caseUuid, fileUuid, groupUsers, userId) => {
    try {
        const obj = {
            status: 0,
            updatedAt: currentDate,
            isFileDeleted: 1,
            isReport: false
        }
        let record
        if (groupUsers?.length > 0) {
            record = await CaseNamesQueries.getCaseIdForDelete(caseUuid, fileUuid, groupUsers)   
        } else {
            record = await CaseNamesQueries.getCaseIdForDelete(caseUuid, fileUuid, userId)
        }
        if (record.length > 0) {
            const caseId = record[0].id
            if (record.length > 0) {
                const checkProgress = await CaseReportGeneratorQueries.findProgressForDelete(caseId);
                if (checkProgress.length <= 0) {
                    const data = await CaseFilesQueries.deActivateFile(obj, fileUuid);
                    if (data[0] == 1) {
                        await CaseDocAssistantQueries.updateFileById({isActivated: false}, record[0]['caseDetails.id']);
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
                        message: Strings.FILE.CANNOT_DELETE_FILES,
                        statusCode: 400,
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

CaseServices.checkDuplicate = async (caseName, userId) => {
    try {
        const data = Encryptions.encryptSensitiveData(caseName);
        const existingCase = await CaseNamesQueries.findCaseByUserIdAndName(data, userId);
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

CaseServices.alterCase = async (caseName, caseSummary, caseDoc, caseAudio, caseQueries, casefilesData, caseId, userId, assignees, firmId, isFirm) => {
    try {
        const caseUpdatePromises = [];
        let caseQueriesValidation = false;
        if (caseName || caseSummary || caseAudio?.length > 0 || caseQueries || caseDoc?.length > 0 || assignees) {
            if (caseQueries) {
                const caseQueriesData = JSON.parse(caseQueries)
                if (caseQueriesData.length > 0) {
                    for (const element of caseQueriesData) {
                        const getIntakeQueriesId = await CaseNamesQueries.getCaseQueriesByuuid(element.requestUuid)
                        if (getIntakeQueriesId.length > 0) {
                            caseQueriesValidation = true;
                        } else {
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: Strings.ROOM.EMPTY + " for " + element.requestUuid
                                }
                            }
                        }
                    }
                }
            }

            if (isFirm === true && firmId && assignees?.length > 0) {
                console.log("assigness while edit case create", caseId, assignees, firmId, isFirm, userId);
                const { assign } = require('../services/caseAssignees.services');
                // caseUpdatePromises.push(assign(caseId, JSON.parse(assignees), firmId, isFirm, userId));
                const assignRes = await assign(caseId, JSON.parse(assignees), firmId, isFirm, userId)
                if (assignRes?.statusCode === 400) {
                    return assignRes
                }
            }

            if (caseName) {
                const obj = {
                    caseName: caseName
                }
                caseUpdatePromises.push(CaseNamesQueries.updateCase(obj, caseId, userId));
            }
            if (caseSummary) {
                const obj = {
                    summary: caseSummary
                }
                caseUpdatePromises.push(CaseNamesQueries.updateCase(obj, caseId, userId));
            }
            if (caseDoc?.length > 0 && writeFile) {
                const validJson = await parseIfJson(casefilesData)
                if (validJson) {
                    const casefilesCategory = JSON.parse(casefilesData);
                    const checker = await CaseServices.validateFileCategory(casefilesCategory, caseDoc.length);
                    if (checker) {
                        const data = await CaseNamesQueries.getCasesId(caseId, userId)
                        if (data?.length > 0 && data[0].id) {
                            const result = await CaseFilesQueries.countFiles(data[0].id, userId);
                            let fileCount = allowedFile - result;
                            if (result < allowedFile) {
                                if (caseDoc?.length <= fileCount) {
                                    const checkProgress = await CaseReportGeneratorQueries.findProgress(data[0].id, userId);
                                    if (checkProgress.length <= 0) {
                                        const path = writeFile + `${caseId}`
                                        const makeFile = await CaseServices.writeMultipleFileWithEmlCheck(caseDoc, path)
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
                                            const getCategoryId = await CaseServices.getFileCategory(casefilesCategory, index);
                                            const fileData = {
                                                caseId: data[0].id,
                                                userId: userId,
                                                fileName: file.obj.fileName,
                                                filePath: file.obj.filePath,
                                                fileTypeId: getCategoryId.obj[0],
                                                isFileUpdated: true,
                                                isReport: result > 0 ? false : null
                                            }
                                            if (isFirm === true) {
                                                fileData.createdByUserId = userId
                                            }
                                            const vectorId = await CaseFilesQueries.getVectorId(data[0].id, userId)
                                            if (vectorId.length > 0) {
                                                const update = {
                                                    isProcessed: false
                                                }
                                                caseUpdatePromises.push(CaseNamesQueries.updateCaseOnUpdateRecord(update, data[0].id, userId))
                                            }
                                            caseUpdatePromises.push(CaseFilesQueries.createFile(fileData));
                                        });
                                    }
                                    else {
                                        return {
                                            message: Strings.FILE.CANNOT_UPDATE_FILES,
                                            statusCode: 400,
                                            obj: {}
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
                            }
                        }
                    } else {
                        return {
                            message: Strings.UNVALID_STATUS,
                            statusCode: 400,
                            obj: {
                                message: Strings.FILE.CASE_ATTACHMENT_MISMATCH
                            }
                        };
                    }
                } else {
                    return {
                        message: Strings.UNVALID_STATUS,
                        statusCode: 400,
                        obj: {
                            message: Strings.JSON_UNVALIDATION
                        }
                    };
                }
            }

            if (caseAudio?.length > 0 && writeFile) {
                const data = await CaseNamesQueries.getCasesId(caseId, userId)
                if (data?.length > 0 && data[0].id) {
                    const result = await CaseFilesQueries.countAudFiles(data[0].id, userId);
                    let fileCount = allowedAudFile - result;
                    if (result < allowedAudFile) {
                        if (caseAudio?.length <= fileCount) {
                            const path = writeFile + `${caseId}`
                            const makeFile = await CaseServices.writeMultipleFile(caseAudio, path)
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
                                    caseId: data[0].id,
                                    userId: userId,
                                    fileName: file.obj.fileName,
                                    filePath: file.obj.filePath,
                                    fileType: true
                                }
                                caseUpdatePromises.push(CaseFilesQueries.createFile(fileData));
                            });
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
                    }
                }
            }

            if (caseQueries && caseQueriesValidation === true) {
                const caseQueriesData = JSON.parse(caseQueries)
                const list = await CaseNamesQueries.getCasesId(caseId)
                for (const element of caseQueriesData) {
                    const getIntakeQueriesId = await CaseNamesQueries.getCaseQueriesByuuid(element.requestUuid)
                    if (getIntakeQueriesId.length > 0) {
                        const data = await CaseNamesQueries.validateCaseIntakeAnswers(list[0].id, getIntakeQueriesId[0].id, userId)
                        if (data.length > 0) {
                            console.log("Data already Found Updating in exisiting rows");
                            const record = {
                                isUpdated: true,
                                isUsedByToc: false,
                                response: element.request,
                                status: true
                            }
                            const update = {
                                isProcessed: null
                            }
                            const updateIntelligentMap = {
                                isIntelligentMap: null
                            }
                            caseUpdatePromises.push(CaseIntelligentMapQueries.updateCaseById(updateIntelligentMap, list[0].id))
                            caseUpdatePromises.push(CaseNamesQueries.updateCaseIntakeAnswers(record, list[0].id, getIntakeQueriesId[0].id, userId));
                            caseUpdatePromises.push(CaseNamesQueries.updateCaseOnUpdateRecord(update, list[0].id, userId));
                            caseUpdatePromises.push(require('./caseIntelligentMap.services').findRecord());
                        } else {
                            console.log("Data not Found adding new row");
                            const record = {
                                caseId: list[0].id,
                                queryId: getIntakeQueriesId[0].id,
                                userId: userId,
                                response: element.request,
                                status: true,
                                isUpdated: true,
                                isUsedByToc: false
                            }
                            const update = {
                                isProcessed: null
                            }
                            const updateIntelligentMap = {
                                isIntelligentMap: null
                            }
                            caseUpdatePromises.push(CaseIntelligentMapQueries.updateCaseById(updateIntelligentMap, list[0].id))
                            caseUpdatePromises.push(CaseNamesQueries.updateCaseOnUpdateRecord(update, list[0].id, userId));
                            caseUpdatePromises.push(CaseNamesQueries.createCaseAnswersByUuid(record));
                            caseUpdatePromises.push(require('./caseIntelligentMap.services').findRecord());
                        }
                    }
                }
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in editing a  case:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.addResponse = async (caseUuid, caseResponse, caseResponseTitle, isGroup, groupUsers, userId) => {
    try {
        if (caseUuid && caseResponse && caseResponseTitle) {
            if (isGroup === true && groupUsers.length > 0 && disable == false) {
                const findUserInGroup = groupUsers.find(data => data === userId);
                if (findUserInGroup) {
                    const data = await CaseNamesQueries.getCasesIdForGroup(caseUuid)
                    if (data.length > 0) {
                        const caseId = data[0].id;
                        const obj = {
                            caseId: caseId,
                            caseResponse: caseResponse,
                            caseResponseTitle: caseResponseTitle,
                            userId: userId
                        }
                        const result = await CaseResponsesQueries.addResponse(obj);
                        if (result) {
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                                }
                            };
                        } else {
                            return {
                                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                statusCode: 400,
                                obj: {
                                    error: result
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
                } else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            } else {
                const data = await CaseNamesQueries.getCasesId(caseUuid, userId)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const obj = {
                        caseId: caseId,
                        caseResponse: caseResponse,
                        caseResponseTitle: caseResponseTitle,
                        userId: userId
                    }
                    const result = await CaseResponsesQueries.addResponse(obj);
                    if (result) {
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                            }
                        };
                    } else {
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: {
                                error: result
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in adding a case response:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.viewResponse = async (caseUuid, isGroup, groupUsers, assignees, firmId, isFirm, userId) => {
    try {
        if (caseUuid) {
            if (((isGroup === true && groupUsers.length > 0 && disable == false) || (isFirm && firmId)) && userId) {
                const data = await CaseNamesQueries.getCasesIdForGroup(caseUuid)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const getResponse = await CaseNamesQueries.getCaseResponsesForGroup(caseId)
                    if (getResponse.length > 0) {
                        const transformedData = await getResponse.reduce(async (accPromise, current) => {
                            const acc = await accPromise;
                            const getUserDetails = await UserQueries.getUser(current["caseResponses.userId"]);
                            const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                            const fileDetail = {
                                caseResponseUuid: current["caseResponses.caseResponseUuid"],
                                caseResponseTitle: current["caseResponses.caseResponseTitle"],
                                caseResponse: current["caseResponses.caseResponse"],
                                createdBy: getUserDetails.email,
                            };
                            const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                            if (caseIndex === -1) {
                                acc.push({
                                    caseUuid: current.caseUuid,
                                    caseName: current.caseName,
                                    caseSummary: current.summary,
                                    createdAt: formattedCreatedAt,
                                    caseDetails: [fileDetail],
                                });
                            } else {
                                acc[caseIndex].caseDetails.push(fileDetail);
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
                const data = await CaseNamesQueries.getCasesId(caseUuid, userId)
                if (data.length > 0) {
                    const caseId = data[0].id;
                    const getResponse = await CaseNamesQueries.getCaseResponses(caseId, userId)
                    const getUserDetails = await UserQueries.getUser(userId);
                    if (getResponse.length > 0) {
                        const transformedData = getResponse.reduce((acc, current) => {
                            const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                            const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                            const fileDetail = {
                                caseResponseUuid: current["caseResponses.caseResponseUuid"],
                                caseResponseTitle: current["caseResponses.caseResponseTitle"],
                                caseResponse: current["caseResponses.caseResponse"]
                            };
                            if (caseIndex === -1) {
                                acc.push({
                                    caseUuid: current.caseUuid,
                                    caseName: current.caseName,
                                    caseSummary: current.summary,
                                    createdBy: getUserDetails.email,
                                    createdAt: formattedCreatedAt,
                                    caseDetails: [fileDetail]
                                });
                            } else {
                                acc[caseIndex].caseDetails.push(fileDetail);
                            }
                            return acc;
                        }, []);
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
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in view a case response:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.addCaseType = async (caseTypes, userId) => {
    try {
        if (caseTypes) {
            for (let index = 0; index < caseTypes.length; index++) {
                const element = caseTypes[index];
                const obj = {
                    caseType: element
                }
                await CaseTypesQueries.addType(obj)
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            };
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while bulk insert of case types:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.alterCaseType = async (caseUuid, caseTypeUuid, userId) => {
    try {
        if (caseTypeUuid && caseUuid) {
            const getId = await CaseTypesQueries.findIdFromUuid(caseTypeUuid)
            if (getId.length > 0) {
                const findCurrentState = await CaseTypesQueries.findCurrentStatus(caseUuid, getId[0].id)
                if (findCurrentState.length > 0) {
                    return {
                        message: Strings.ERROR.RECORD_ALREADY_EXSIST,
                        statusCode: 400,
                        obj: {}
                    }
                } else {
                    const obj = {
                        caseTypeId: getId[0].id
                    }
                    const updateType = await CaseTypesQueries.updateCaseTypeById(obj, caseUuid, userId)
                    if (updateType[0] == 1) {
                        return {
                            message: Strings.RECORD_UPDATE_SUCCESS,
                            statusCode: 200,
                            obj: {}
                        }
                    } else {
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 400,
                            obj: {
                                message: Strings.ERROR.RECORD_UPDATE_ERROR,
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in updating case type", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.combineCaseResponse = async (userId) => {
    try {
        const getResponse = await CaseNamesQueries.getAllCaseResponses(userId)
        if (getResponse.length > 0) {
            const transformedData = getResponse.reduce((acc, current) => {
                const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                const fileDetail = {
                    caseResponseUuid: current["caseResponses.caseResponseUuid"],
                    caseResponseTitle: current["caseResponses.caseResponseTitle"],
                };
                if (caseIndex === -1) {
                    acc.push({
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        caseSummary: current.summary,
                        createdAt: formattedCreatedAt,
                        caseDetails: [fileDetail]
                    });
                } else {
                    acc[caseIndex].caseDetails.push(fileDetail);
                }
                return acc;
            }, []);
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
            }
        }
    } catch (error) {
        console.log("Error in view a case response:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.audioToSpeech = async () => {
    try {
        const data = await CaseFilesQueries.getPendingAudioFiles()
        let result = [];
        if (data.length > 0) {
            console.log("*************************************************");
            console.log("Job Started For Converting Audio File's to Speech");
            console.log("*************************************************");
            for (const element of data) {
                const buffer = fsnew.readFileSync(element.filePath);
                const mimeType = mime.lookup(element.filePath);
                const transcript = await convertAudioToTextDeepGram([{ buffer: buffer, mimetype: mimeType, originalname: element.fileName }]);
                const getSpeech = transcript[0]?.results?.channels[0]?.alternatives[0]?.transcript
                Logger.data.OpenAI({ filePath: element.filePath, userId: element.userId, response: getSpeech }, "Converting-Audio-Files-To-Speech-Deepgram");
                if (getSpeech) {
                    const obj = {
                        transcript: getSpeech,
                        isProcessed: true,
                        updatedAt: currentDate
                    }
                    const recordUpdate = await CaseFilesQueries.updatePendingAudioFiles(obj, element.fileUuid);
                    result.push({ fileUuid: element.fileUuid, filePath: element.filePath, status: recordUpdate[0] == 1 ? 'Updated' : Strings.ROOM.EMPTY, transcript: getSpeech });
                } else {
                    result.push({ fileUuid: element.fileUuid, filePath: element.filePath, status: 'Failed', error: transcript });
                    slack.webhook(JSON.stringify({ action: "Error in converting audio file's to speech", response: result }));
                }
            }
            console.log("Details", result);
            console.log("***************************************************");
            console.log("Job Completed For Converting Audio File's to Speech");
            console.log("***************************************************");
            Logger.data.OpenAI({ response: result }, "Converting-Audio-Files-To-Speech");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result
            }

        } else {
            console.log("*****************************************************");
            console.log("No Record Found For Converting Audio File's to Speech");
            console.log("*****************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in converting case audio file to speech", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CaseServices.fetchCaseAudio = async (userId) => {
    try {
        const data = await CaseNamesQueries.getAllAudioFiles(userId);
        if (data.length > 0) {
            const transformedData = data.reduce((acc, current) => {
                const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                const fileDetail = {
                    fileUuid: current["caseDetails.fileUuid"],
                    fileName: current["caseDetails.fileName"],
                    processed: current["caseDetails.isProcessed"] == 1 ? true : false
                };

                if (caseIndex === -1) {
                    acc.push({
                        caseUuid: current.caseUuid,
                        caseName: current.caseName,
                        caseDetails: [fileDetail]
                    });
                } else {
                    acc[caseIndex].caseDetails.push(fileDetail);
                }

                return acc;
            }, []);

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
        console.log("Error in fetching a case:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseServices.getGroupData = async (isGroup, groupUsers, userId) => {
    try {
        if (isGroup === true && groupUsers.length > 0) {
            const allData = []
            console.log('groupUsers', groupUsers);
            for (const element of groupUsers) {
                const data = await CaseNamesQueries.getFileStatus(element);
                if (data.length > 0) {
                    const getUserDetails = await UserQueries.getUser(element);
                    const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                    const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                        const caseStatus = await getFormatedCaseTypes(id);
                        return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                    }));
                    const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    const transformedData = data.reduce((acc, current) => {
                        const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                        const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                        const fileDetail = {
                            fileUuid: current["caseDetails.fileUuid"],
                            fileName: current["caseDetails.fileName"],
                        };
                        if (caseIndex === -1) {
                            acc.push({
                                caseUuid: current.caseUuid,
                                caseName: current.caseName,
                                // caseStatus: caseStatusLookup[current.caseTypeId],
                                // caseSummary: current.summary,
                                createdBy: getUserDetails.email,
                                createdAt: formattedCreatedAt,
                                caseDoc: current["caseDetails.fileType"] === 0 ? [fileDetail] : [],
                                caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : []
                            });
                        } else {
                            if (current["caseDetails.fileType"] === 0) {
                                acc[caseIndex].caseDoc.push(fileDetail);
                            } else if (current["caseDetails.fileType"] === 1) {
                                fileDetail.processed = current["caseDetails.isProcessed"] == 1 ? true : false
                                acc[caseIndex].caseAud.push(fileDetail);
                            }
                        }
                        return acc;
                    }, []);
                    allData.push(transformedData)
                }
            }
            if (allData.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allData
                };
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                };
            }
        } else {
            const data = await CaseNamesQueries.getFileStatus(userId);
            if (data.length > 0) {
                const getUserDetails = await UserQueries.getUser(userId);
                const caseTypeIds = [...new Set(data.map(d => d.caseTypeId))];
                const caseStatusMap = await Promise.all(caseTypeIds.map(async (id) => {
                    const caseStatus = await getFormatedCaseTypes(id);
                    return { [id]: caseStatus.map(({ id, ...rest }) => rest) };
                }));
                const caseStatusLookup = caseStatusMap.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                const transformedData = data.reduce((acc, current) => {
                    const caseIndex = acc.findIndex(c => c.caseUuid === current.caseUuid);
                    const formattedCreatedAt = moment(current.createdAt).format('MM/DD/YYYY');
                    const fileDetail = {
                        fileUuid: current["caseDetails.fileUuid"],
                        fileName: current["caseDetails.fileName"],
                    };
                    if (caseIndex === -1) {
                        acc.push({
                            caseUuid: current.caseUuid,
                            caseName: current.caseName,
                            caseStatus: caseStatusLookup[current.caseTypeId],
                            caseSummary: current.summary,
                            createdBy: getUserDetails.email,
                            createdAt: formattedCreatedAt,
                            caseDoc: current["caseDetails.fileType"] === 0 ? [fileDetail] : [],
                            caseAud: current["caseDetails.fileType"] === 1 ? [fileDetail] : []
                        });
                    } else {
                        if (current["caseDetails.fileType"] === 0) {
                            acc[caseIndex].caseDoc.push(fileDetail);
                        } else if (current["caseDetails.fileType"] === 1) {
                            fileDetail.processed = current["caseDetails.isProcessed"] == 1 ? true : false
                            acc[caseIndex].caseAud.push(fileDetail);
                        }
                    }
                    return acc;
                }, []);

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
        }
    } catch (error) {
        console.log("Error in fetching a case:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

CaseServices.addCaseQueries = async (record) => {
    try {
        for (let index = 0; index < record.length; index++) {
            const element = record[index];
            const obj = {
                titleId: element[0],
                queryName: element[1]
            }
            await CaseNamesQueries.addIntakeQueries(obj);
        }
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {}
        };
    } catch (error) {
        console.log("Error in adding Case Queries:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseServices.getCaseQueries = async () => {
    try {
        const data = await CaseNamesQueries.getIntakeQueries();
        const groupedData = data.reduce((acc, item) => {
            const titleKey = item['caseIntakeQueriesTitles.title'];
            const titleUuid = item['caseIntakeQueriesTitles.requestUuid'];
            const required = item['caseIntakeQueriesTitles.required'];
            if (!acc[titleKey]) {
                acc[titleKey] = {
                    title: titleKey,
                    required: required === 1 ? true : false,
                    requestUuid: titleUuid,
                    questions: [],
                };
            }
            acc[titleKey].questions.push({
                queryName: item.id + "." + item.queryName,
                requestUuid: item.requestUuid,
                textArea: item.textArea === 1 ? true : false,
            });

            return acc;
        }, {});
        const formattedResponse = Object.values(groupedData);
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: formattedResponse
        };
    } catch (error) {
        console.log("Error in get Case Queries:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseServices.updateCaseQueries = async (requestUuid, queryName) => {
    try {
        const obj = {
            queryName: queryName
        }
        const data = await CaseNamesQueries.updateCaseQueriesByUuid(obj, requestUuid);
        if (data[0] == '1') {
            return {
                message: Strings.RECORD_UPDATE_SUCCESS,
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

    } catch (error) {
        console.log("Error in updating Case Queries:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseServices.addCaseQueriesTitles = async (record) => {
    try {
        for (let index = 0; index < record.length; index++) {
            const element = record[index];
            const obj = {
                title: element
            }
            await CaseNamesQueries.addIntakeQueriesTitle(obj);
        }
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {}
        };
    } catch (error) {
        console.log("Error in adding Case Queries tile's:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseServices.updateCaseTitles = async (requestUuid, title) => {
    try {
        const obj = {
            title: title
        }
        const data = await CaseNamesQueries.updateCaseTitlesByUuid(obj, requestUuid);
        if (data[0] == '1') {
            return {
                message: Strings.RECORD_UPDATE_SUCCESS,
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
    } catch (error) {
        console.log("Error in updating Case Titles:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseServices.getCaseQueriesTitle = async () => {
    try {
        const data = await CaseNamesQueries.getCaseQueriesTitle();
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: data
        };
    } catch (error) {
        console.log("Error in get Case Queries title:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseServices.addCaseFileType = async (record) => {
    try {
        for (let index = 0; index < record.length; index++) {
            const element = record[index];
            const obj = {
                title: element,
            }
            await CaseNamesQueries.addCaseFileTitle(obj);
        }
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {}
        };
    } catch (error) {
        console.log("Error in adding Case File Type:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseServices.getCaseFileType = async () => {
    try {
        const data = await CaseNamesQueries.getCaseFileTitle();
        if (data.length > 0) {
            const record = []
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                record.push(
                    {
                        title: element.id + "." + element.title,
                        requestUuid: element.requestUuid
                    }
                )
            }
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
            };
        }
    } catch (error) {
        console.log("Error in Getting Case File Type:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

CaseServices.uploadFileToOpenAI = async () => {
    try {
        const data = await CaseFilesQueries.getPendingTextFiles()
        let result = [];
        if (data.length > 0) {
            console.log("***********************************************");
            console.log("Job Started For Uploading Case File's To OpenAI");
            console.log("***********************************************");
            for (const element of data) {
                const buffer = fsnew.readFileSync(element.filePath);
                const mimeType = mime.lookup(element.filePath);
                const fileNameDecryption = Encryptions.decryptSensitiveData(element.fileName)
                const lastDotIndex = fileNameDecryption.lastIndexOf('.');
                // Extract file name and extension
                let name = fileNameDecryption;
                let extension = '';
                if (lastDotIndex !== -1) {
                    name = fileNameDecryption.substring(0, lastDotIndex);
                    extension = fileNameDecryption.substring(lastDotIndex + 1);
                }

                // Encrypt the file name without the extension
                const fileEncryption = Encryptions.encryptSensitiveData(name);
                const completeFileName = extension
                    ? `${fileEncryption}.${extension}`
                    : fileEncryption; // Handle cases with no extension    
                const allFileIds = await summaryUpload([{ buffer: buffer, mimetype: mimeType, originalname: fileNameDecryption }]);
                Logger.data.OpenAI({ filePath: element.filePath, userId: element.userId, response: allFileIds }, "Upload-Files-To-OenAI");
                const getFileId = allFileIds[0]?.id;
                if (getFileId) {
                    const obj = {
                        isOpenAIProcessed: true,
                        openAIFileId: getFileId,
                        updatedAt: currentDate
                    }
                    const recordUpdate = await CaseFilesQueries.updatePendingTextFiles(obj, element.fileUuid);
                    result.push({ fileUuid: element.fileUuid, filePath: element.filePath, status: recordUpdate[0] == 1 ? 'Updated' : Strings.ROOM.EMPTY, response: allFileIds });
                } else {
                    const obj = {
                        status: 2
                    }
                    await CaseFilesQueries.updateFileOnError(obj, element.fileUuid);
                    result.push({ fileUuid: element.fileUuid, filePath: element.filePath, status: 'Failed', error: allFileIds });
                    slack.webhook(JSON.stringify({ action: "Error in uploading text file's to openAI for Report Generation", response: allFileIds, requesUuid:element.fileUuid }));
                }
            }
            console.log("Details", result);
            console.log("************************************************");
            console.log("Job Completed For Uploading Text Files To OpenAI");
            console.log("************************************************");
            Logger.data.OpenAI({ response: result }, "Upload-Text-Files-To-OpenAI");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result
            }

        } else {
            console.log("**************************************************");
            console.log("No Record Found For Uploading Text Files To OpenAI");
            console.log("**************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in uploading case text file to openAI", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = CaseServices;