const Queries = {};
// const db = require('../model').assistant;
const dbModel = require('../model');
const { Sequelize } = require("sequelize");
const Op = dbModel.op;
const db = dbModel.assistantFiles;
const dbExternalDocFiles = dbModel.externalDocFiles;
const dbExternalDocVectorStoreManager = dbModel.externalDocVectorStoreManager;
const attributes_1 = ['fileId']
const attributes_2 = ['botId']
const attributes_3 = ['question', 'answer', 'status',  'threadId', 'createdAt']
const attributes_4 = ['fileName']
const attributes_5 = ['fileName', 'fileUuid', 'status', 'filePath']
const attributes_6 = ['vectorId']
const attributes_7 = ['openAIFileId']

const { Encryption } = require('../../utils')

Queries.countFiles = async (caseId, userId) => {
    return await dbExternalDocFiles.count({
        where: {
            batchId: caseId,
            userId: userId,
            status: true,
        }
    });
}

Queries.findDuplicateFile = async (fileName, caseId, userId) => {
    return await dbExternalDocFiles.findAll({
        attributes: attributes_5,
        where: {
            userId: userId,
            batchId: caseId,
            fileName: Encryption.encryptSensitiveData(fileName),
            status: true
        },
        raw: true
    });
}

Queries.deActivateFile = async (obj, fileUuid) => {
    return  await dbExternalDocFiles.update(obj, {
        where: {
            fileUuid: fileUuid,
            status: true
        }
    });
}

Queries.updatePendingTextFiles = async (obj, fileUuid) => {
    return  await dbExternalDocFiles.update(obj, {
        where: {
            fileUuid: fileUuid,
            status: true,
            isOpenAIProcessed : false,
            isProcessed : false
        }
    });
}

Queries.getPendingTextFiles = async () => { 
    let data = await dbExternalDocFiles.findAll({
        raw: true,
        attributes: attributes_5,
        where: {
            status: true,
            isOpenAIProcessed : false 
        },
        limit: 20,
    });
    data = decryptionArray2(data);
    return data;
}

Queries.getFilesForVectorStore = async (caseId, userId) => {
    return await dbExternalDocFiles.findAll({
        attributes: attributes_7,
        where: {
            batchId: caseId,
            userId: userId,
            status: true,
            isOpenAIProcessed: true,
            openAIFileId: {
                [Op.not]: null,
            },
            vectorId: {
                [Op.eq]: null,
            },
        },
        raw: true
    });
}

Queries.updateVectorId = async (obj, caseId, userId) => {
    return await dbExternalDocFiles.update(obj, {
        where: {
            batchId: caseId,
            userId: userId,
            status: true,
            isOpenAIProcessed: true,
            openAIFileId: {
                [Op.not]: null,
            },
            vectorId: {
                [Op.eq]: null,
            },
        }
    });
} 


Queries.deActivateFileOnError = async (obj, fileId, userId) => {
    return  await dbExternalDocFiles.update(obj, {
        where: {
            userId: userId,
            openAIFileId: fileId,
            status: true
        }
    });
}

Queries.disableChildVectorExternalDoc = async (obj, vectorId, caseId, userId) => {
    return await dbExternalDocFiles.update(obj, {
        where: {
            vectorId: vectorId,
            batchId: caseId,
            status: true,
            vectorId: {
                [Op.not]: null,
            },
        }
    });
} 

Queries.updateFileOnError = async (obj, fileUuid) => {
    return  await dbExternalDocFiles.update(obj, {
        where: {
            fileUuid: fileUuid,
            status: true
        }
    });
}

Queries.updateVectorIdExternalDoc = async (obj, batchId, userId) => {
    return await dbExternalDocFiles.update(obj, {
        where: {
            batchId: batchId,
            userId: userId,
            status: true,
            isOpenAIProcessed: true,
            openAIFileId: {
                [Op.not]: null,
            },
            vectorId: {
                [Op.eq]: null,
            },
        }
    });
} 


Queries.updateFileOnDelete = async (obj, openAIFileId, batchId, userId) => {
    return await dbExternalDocFiles.update(obj, {
        where: {
            batchId: batchId,
            openAIFileId: openAIFileId,
            userId: userId,
            status: false,
            isOpenAIProcessed: true,
            openAIFileId: {
                [Op.not]: null,
            },
            vectorId: {
                [Op.not]: null,
            },
        }
    });
} 

const decryptionArray2 = (array = []) => {
    const arr = [];
    array.forEach(resp => {
        resp = decryptionObject2(resp);
        arr.push(resp);
    })
    return arr;
}

const decryptionObject2 = (obj) => {
    if (obj.filePath) {
        obj.filePath = Encryption.decryptSensitiveData(obj.filePath)
    }
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    return obj;
}

Queries.createExternalDoc = async (obj) => {
    return await dbExternalDocFiles.create(obj);
}

Queries.getVectorId = async (caseId, userId) => {
    return await dbExternalDocVectorStoreManager.findAll({
        attributes: attributes_6,
        where: {
            caseId: caseId,
            userId: userId,
            status: true,
            vectorId: {
                [Op.not]: null,
            },
        },
        limit: 1,
        order: [['id', 'DESC']], 
        raw: true
    });
} 

Queries.createFile = async (obj) => {
    return await db.findOrCreate({
        where: {
            fileHash: obj.fileHash,
            threadId: obj.threadId
        },
        defaults: obj
    });
}

Queries.getFileStatus = async (botId, userId, contentType) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            botId: botId,
            userId: userId,
            contentType: contentType,
            status: 1
        },
        // logging: console.log
    });
} 

Queries.updateThreadById = async (obj, threadId) => {
    return await db.update(obj, {
        where: {
            threadId: threadId
        }
    });
}

Queries.getUpdatedThreadById = async (threadId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_2,
        where: {
            threadId: threadId,
            // status: 1
            answer: {
                [Op.not]: null,
            }
        },
        group: ['botId']
    });
} 


Queries.getQNA = async (botId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            // status: 1 
            answer: {
                [Op.not]: null,
            }
        }
    });
}


Queries.getAllThreadResponses = async (botId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            answer: {
                [Op.not]: null,
            }
        }
    });
}

Queries.validateContent = async (botId, userId, contentType, currentFile) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            botId: botId,
            userId: userId,
            contentType: contentType,
            fileHash: currentFile,
            status: 1
        },
        order: [['createdAt', 'DESC']], 
        limit: 1
        // logging: console.log
    });
} 

Queries.getFile = async (fileId, userId) => {
    return await db.findAll({
        where: {
            fileId: fileId,
            userId: userId,
            status: 1
        }
    });
}

Queries.changeStatus = async (userId) => {
    const obj = {
        status: 0
    }
    return  await db.update(obj, {
        where: {
            userId: userId,
        }
    });
}

Queries.findFile = async (userId) => {
    return await db.findAll({
        raw: true,
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('fileId')), 'fileId']],
        where: {
            userId: userId,
            status: 1
        }
    });
}

Queries.updateStatus = async (obj, fileId, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            fileId: fileId,
            // status: 1
        }
    });
}

Queries.deleteFile = async (obj, fileId) => {
    return  await db.update(obj, {
        where: {
            fileId: fileId,
        }
    });
}

Queries.findFileIdsById = async (threadId, userId) => {
    return await db.findAll({
        where: {
            threadId: threadId,
            userId: userId,
        },
        raw: true
    });
}


Queries.findFileNamesById = async (threadId, userId) => {
    return await db.findAll({
        attributes: attributes_4,
        where: {
            threadId: threadId,
            userId: userId,
        },
        raw: true
    });
}

module.exports = Queries;