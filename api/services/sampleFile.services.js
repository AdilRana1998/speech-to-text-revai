const SampleFileServices = {};
const {
    SamplePromptsQueries,
    SampleAttachmentsQueries
} = require('../queries');
const { Strings } = require('../../utils')
const { makeDirectory } = require('../../utils/fs.utility');
const {
    writeMultipleFile
} = require('./caseFile.services');
const fs = require('fs');
const fsPromise = require('fs').promises;
const path = require('path');
const currentDate = new Date();
const { v4: uuidv4 } = require('uuid');
const writeFile = process.env.SAMPLE_READ_WRITE;
let allowedFile = process.env.CASE_FILE_LIMIT;
const backUp = process.env.SAMPLE_BACK_UP

SampleFileServices.addSample = async (prompt, sampleAttachments, promptUuid, userId) => {
    try {
        const generatedUuid = uuidv4();
        const SampleUpdatePromises = [];

        // add the check of if user has already added the prompt or 1 file now user can only delete file and new file 
        // user can have only file and one prompt not more than one
        if (writeFile) {
            if (promptUuid != null) {
                if (promptUuid != null && sampleAttachments.length > 0) {
                    const data = await SamplePromptsQueries.getActivePromptId(promptUuid, userId)
                    if (data.length > 0) {
                        const path = writeFile + `${promptUuid}`;
                        const backupDir = path + backUp;
                        //also update the file table file path
                        // await SampleFileServices.moveFiles(backupDir, path)
                        const obj = { 
                            status: 0,
                            updatedAt: currentDate
                        }
                        await SampleAttachmentsQueries.deActivateFileById(obj, data[0].id, userId);                
                        const makeFile = await writeMultipleFile(sampleAttachments, path)
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
                                sampleId: data[0].id,
                                userId: userId,
                                fileName: file.obj.fileName,
                                filePath: file.obj.filePath
                            }
                            //ask yashar that 2 cases have same files or not if yes apply duplication check
                            SampleUpdatePromises.push(SampleAttachmentsQueries.createFile(fileData));

                        });
                    } else {
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                }
                if (promptUuid != null && prompt != null) {
                    const data = await SamplePromptsQueries.getActivePromptId(promptUuid, userId)
                    if (data.length > 0) {
                        const obj = {
                            samplePrompt: prompt
                        }
                        SampleUpdatePromises.push(SamplePromptsQueries.updatePrompt(obj, promptUuid, userId));
                    } else {
                        return {
                            message: Strings.ROOM.EMPTY,
                            statusCode: 200,
                            obj: {}
                        }
                    }
                }
                await Promise.all(SampleUpdatePromises);
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.RECORD_UPDATE_SUCCESS,
                        promptUuid: promptUuid,
                    }
                };
            }
            else {
                const data = {
                    promptUuid: generatedUuid,
                    samplePrompt: prompt,
                    userId: userId
                }
                const result = await SamplePromptsQueries.addSample(data);
                const path = writeFile + `${generatedUuid}`
                await makeDirectory(path)
                const makeFile = await writeMultipleFile(sampleAttachments, path)
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
                        sampleId: result.dataValues.id,
                        userId: userId,
                        fileName: file.obj.fileName,
                        filePath: file.obj.filePath
                    }
                    //ask yashar that 2 cases have same files or not if yes apply duplication check
                    SampleAttachmentsQueries.createFile(fileData);
                });
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                        promptUuid: generatedUuid,
                    }
                };
            }
        }
    } catch (error) {
        console.log("Error in creating a sample file and prompt:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SampleFileServices.writeMultipleFile = async (sampleAttachments, path) => {
    try {
        const writePromises = sampleAttachments.map(async (file) => {
            const fileNameAndPath = path + "/" + file.originalname;
            const fileName = file.originalname;
            const fileContent = file.buffer.toString('utf-8');
            return await SampleFileServices.writeContent(fileNameAndPath, fileContent, fileName)
        });
        return await Promise.all(writePromises);
    } catch (error) {
        console.log("Error in writing multiple file", error.message);
        return {
            error: error.message
        }
    }
}

SampleFileServices.writeContent = async (fileNameAndPath, fileContent, fileName) => {
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
    } catch (err) {
        return {
            error: err
        }
    }
}

SampleFileServices.fetchCase = async (userId) => {
    try {
        const data = await SamplePromptsQueries.getSampleFileStatus(userId)
        if (data.length > 0) {
            // Changing the response structure accorting to fron end requirment
            const transformedData = data.reduce((acc, current) => {
                const caseIndex = acc.findIndex(c => c.promptUuid === current.promptUuid);
                const fileDetail = {
                    fileUuid: current["promptDetails.attachmentUuid"],
                    fileName: current["promptDetails.fileName"]
                };

                if (caseIndex === -1) {
                    acc.push({
                        id: current.id,
                        sampleUuid: current.promptUuid,
                        prompt: current.samplePrompt,
                        createdAt: current.createdAt,
                        sampleDetails: [fileDetail]
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
        console.log("Error in fetching a sample prompts:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SampleFileServices.getSample = async (prompt, userId) => {
    try {
        const data = await SamplePromptsQueries.findSample(prompt, userId)
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


SampleFileServices.getAllFile = async (promptId, userId) => {
    try {
        const data = await SamplePromptsQueries.getPromptId(promptId, userId)
        if (data.length > 0 && data[0].id) {
            const result = await SampleAttachmentsQueries.getFiles(data[0].id, userId)
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

SampleFileServices.removePrompt = async (promptId, userId) => {
    try {
        const obj = {
            status: 0,
            updatedAt: currentDate
        }
        const data = await SamplePromptsQueries.deActivatePrompt(obj, promptId, userId);
        if (data[0] == 1) {
            const obj = {
                status: 0,
                updatedAt: currentDate
            }
            await SampleAttachmentsQueries.deActivateFileById(obj, data[1].id, userId);
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

SampleFileServices.removeFile = async (fileId, userId) => {
    try {
        const obj = {
            status: 0,
            updatedAt: currentDate
        }
        const data = await SampleAttachmentsQueries.deActivateFile(obj, fileId, userId);
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

SampleFileServices.checkDuplicate = async (userId, prompt) => {
    try {
        // Check if the case already exists for the user
        const existingCase = await SamplePromptsQueries.findCaseByUserIdAndName(userId, prompt);
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

SampleFileServices.alterCase = async (sampleAttachments, caseId, userId) => {
    try {
        const validator = sampleAttachments != '' && caseId != '';
        if (validator && writeFile) {
            const data = await SamplePromptsQueries.getCasesId(caseId, userId)
            if (data.length > 0 && data[0].id) {
                //find count of file in this case
                const result = await SampleAttachmentsQueries.countFiles(data[0].id, userId);
                let fileCount = allowedFile - result;
                // check remaing count of file per case
                if (result < allowedFile) {
                    console.log("attachmnet lenght", sampleAttachments.length);
                    console.log("allowed files to upload", fileCount);
                    if (sampleAttachments.length <= result) {
                        const path = writeFile + `${caseId}`
                        const makeFile = await SampleFileServices.writeMultipleFile(sampleAttachments, path)
                        if (makeFile.length > 0 && makeFile[0].statusCode == '200') {
                            makeFile.forEach(async (file, index) => {
                                const fileData = {
                                    caseId: data[0].id,
                                    userId: userId,
                                    fileName: file.obj.fileName,
                                    filePath: file.obj.filePath
                                }
                                //ask yashar that 2 cases have same files or not if yes apply duplication check
                                await SampleAttachmentsQueries.createFile(fileData);
                            });
                            return {
                                message: Strings.SUCCESS,
                                statusCode: 200,
                                obj: {
                                    message: Strings.RECORD_UPDATE_SUCCESS,
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
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in creating a sample file:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}


SampleFileServices.getSampleById = async (promptUuid, userId) => {
    try {
        const data = await SamplePromptsQueries.findSampleByUuid(promptUuid, userId)
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
        console.log("Error in finding a sample by id:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

SampleFileServices.moveFiles = async (backupDir, sourceDir) => {
    try {
        // Read all files in the source directory
        // fs.readdir(sourceDir, (err, files) => {
        //     if (err) {
        //         console.error(`Error reading the source directory: ${err}`);
        //         return;
        //     }
        //     // Move each file to the backup directory
        //     files.forEach(file => {
        //         const sourceFilePath = path.join(sourceDir, file);
        //         const backupFilePath = path.join(backupDir, file);
        //         // Rename (move) the file
        //         fs.rename(sourceFilePath, backupFilePath, err => {
        //             if (err) {
        //                 console.log("$$$$$");
        //                 console.log("Error");
        //                 console.error(`Error moving file ${file}: ${err}`);
        //             } else {
        //                 console.log("****");
        //                 console.log("SUccess");
        //                 console.log(`Moved file ${file} to backup directory`);
        //             }
        //         });
        //     });
        // });

        // Read all files in the source directory

        // console.log("sourceDir", sourceDir);

        const files = await fsPromise.readdir(sourceDir);

        // console.log("files", files);

        // Move each file to the backup directory, excluding the backupDir itself
        await Promise.all(files.map(async (file) => {
            const sourceFilePath = path.join(sourceDir, file);
            const backupFilePath = path.join(backupDir, file);

            // console.log("sourceFilePath", sourceFilePath);
            // console.log("******************************");
            // console.log("backupFilePath", backupFilePath);

            // Ensure we don't try to move the backup directory into itself
            if (sourceFilePath !== backupDir) {
                try {
                    await fsPromise.rename(sourceFilePath, backupFilePath);
                    // console.log("****");
                    // console.log("Success");
                    // console.log(`Moved file ${file} to backup directory`);
                } catch (err) {
                    // console.log("$$$$$");
                    // console.log("Error");
                    // console.error(`Error moving file ${file}: ${err}`);
                }
            }
        }));

    } catch (error) {
        console.log("      ");
        console.log("Error in making backup directory:", error.message);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = SampleFileServices;
