const Queries = {};
const dbModel = require('../model');
const Op = dbModel.op;
const db = dbModel.caseFiles;
const dbCaseNames = dbModel.caseNames;
const dbExternalDocFiles = dbModel.externalDocFiles;
const attributes_1 = ['fileUuid', 'fileName', 'status']
const attributes_2 = ['fileName', 'filePath', 'fileUuid']
const attributes_3 = ['transcript']
const attributes_4 = ['openAIFileId']
const attributes_5 = ['vectorId']
const attributes_6 = ['caseId']
const attributes_7 = ['id', 'fileUuid', 'fileName', 'status']
const { Encryption } = require('../../utils')
const { Sequelize } = require("sequelize");

Queries.createFile = async (obj) => {
    return await db.create(obj);
}

Queries.getFiles = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            caseId: caseId,
            userId: userId,
            status: 1
        }
    });
} 

Queries.deActivateFile = async (obj, fileId) => {
    return  await db.update(obj, {
        where: {
            fileUuid: fileId,
            status: 1
        }
    });
}

Queries.deActivateFileOnError = async (obj, fileId, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            openAIFileId: fileId,
            status: 1
        }
    });
}
 
Queries.countFiles = async (caseId, userId) => {
    return await db.count({
        where: {
            caseId: caseId,
            userId: userId,
            fileType: false,
            status: 1,
        }
    });
}

Queries.countAudFiles = async (caseId, userId) => {
    return await db.count({
        where: {
            caseId: caseId,
            userId: userId,
            fileType: true,
            status: 1,
        }
    });
}

Queries.getAllData = async () => {
    return await db.findAll({
        raw: true,
        attributes: attributes_2,
    });
}

Queries.updateData = async (obj, fileUuid) => {
    return await db.update(obj, {
        where: {
            fileUuid: fileUuid
        }
    });
}

Queries.deActivateFileByCaseId = async (obj, caseId, userId) => {
    return  await db.update(obj, {
        where: {
            // userId: userId,
            caseId: caseId,
            status: 1
        }
    });
}

Queries.getPendingAudioFiles = async () => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_2,
        where: {
            status: true,
            fileType: true,
            isProcessed : false
        },
        order: [
            ['id', 'ASC'],
        ],
        limit: 10,
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingTextFiles = async () => { 
    let data = await db.findAll({
        raw: true,
        attributes: attributes_2,
        where: {
            status: true,
            isOpenAIProcessed : false 
        },
        limit: 20,
    });
    data = decryptionArray2(data);
    return data;
}

Queries.updatePendingAudioFiles = async (obj, fileUuid) => {
    return  await db.update(obj, {
        where: {
            fileUuid: fileUuid,
            status: true,
            fileType: true,
            isProcessed : false
        }
    });
}

Queries.updatePendingTextFiles = async (obj, fileUuid) => {
    return  await db.update(obj, {
        where: {
            fileUuid: fileUuid,
            status: true,
            fileType: false,
            isOpenAIProcessed : false,
            isProcessed : false
        }
    });
}

const decryptionObject = (obj) => {
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    if (obj.filePath) {
        obj.filePath = Encryption.decryptSensitiveData(obj.filePath)
    }
    if (obj.transcript) {
        obj.transcript = Encryption.decryptSensitiveData(obj.transcript)
    }
    return obj;
}

const decryptionArray = (array = []) => {
    const arr = [];
    array.forEach(resp => {
        resp = decryptionObject(resp);
        arr.push(resp);
    })
    return arr;
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
    return obj;
}

Queries.findSpeechByUuid = async (fileUuid, userId) => {
    let data = await db.findAll({
        attributes: attributes_3,
        where: {
            fileUuid: fileUuid,
            userId: userId,
            status: true,
            isProcessed: true,
            fileType: true
        },
        raw: true
    });        
    data = decryptionArray(data);
    return data;
} 


Queries.getFilesForVectorStore = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_4,
        where: {
            caseId: caseId,
            userId: userId,
            status: true,
            fileType: false,
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

Queries.getFilesForDeleteVectorStore = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_4,
        where: {
            caseId: caseId,
            userId: userId,
            status: false,
            isFileDeleted: true,
            fileType: false,
            isOpenAIProcessed: true,
            openAIFileId: {
                [Op.not]: null,
            },
            vectorId: {
                [Op.not]: null,
            },
        },
        raw: true
    });
} 

Queries.getFilesForDeleteVectorStoreExternalDoc = async (batchId, userId) => {
    return await dbExternalDocFiles.findAll({
        attributes: attributes_4,
        where: {
            batchId: batchId,
            userId: userId,
            status: false,
            isFileDeleted: true,
            isOpenAIProcessed: true,
            openAIFileId: {
                [Op.not]: null,
            },
            vectorId: {
                [Op.not]: null,
            },
        },
        raw: true
    });
} 

Queries.updateVectorId = async (obj, caseId, userId) => {
    return await db.update(obj, {
        where: {
            caseId: caseId,
            userId: userId,
            status: true,
            fileType: false,
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

Queries.updateFileOnDelete = async (obj, openAIFileId, caseId, userId) => {
    return await db.update(obj, {
        where: {
            caseId: caseId,
            openAIFileId: openAIFileId,
            userId: userId,
            status: false,
            fileType: false,
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

Queries.getVectorId = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_5,
        where: {
            caseId: caseId,
            userId: userId,
            status: true,
            vectorId: {
                [Op.not]: null,
            },
        },
        limit: 1,
        raw: true
    });
} 

Queries.disableChildVector = async (obj, vectorId, caseId, userId) => {
    return await db.update(obj, {
        where: {
            vectorId: vectorId,
            caseId: caseId,
            // userId: userId,
            status: true,
            vectorId: {
                [Op.not]: null,
            },
        }
    });
} 

Queries.updateFileOnError = async (obj, fileUuid) => {
    return  await db.update(obj, {
        where: {
            fileUuid: fileUuid,
            status: true
        }
    });
}

Queries.updateFileForCite = async (obj, fileUuid) => {
    return await db.update(obj, {
        where: {
            fileUuid: fileUuid,
            isCitation: {
                [Op.eq]: null,
            }
        }
    });
}

Queries.getEditFiles = async () => {
    return  await db.findAll({
        attributes: attributes_6,
        where: {
            isFileupdated: true,
            status: true,
            fileType: false,
            isCitation: {
                [Op.eq]: null
            },
        },
        limit: 1,
        raw: true
    });
}


Queries.updateCaseFileByCitation = async (obj, fileUuid, caseId, userId) => {
    return await db.update(obj, {
        where: {
            fileUuid: fileUuid,
            userId: userId,
            caseId: caseId,
            isCitation: false,
            status: true,
            fileType: false
        }
    });
}

Queries.countCitationFiles = async (caseId, userId) => {
    return await db.count({
        where: {
            caseId: caseId,
            userId: userId,
            status: true,
            fileType: false,
            isCitation: {
                [Op.ne]: 1
            }
        }
    });
}

Queries.getFileId = async (fileUuid, caseId, userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_7,
            [Sequelize.col('filesInfo.id'), 'caseId'],
            [Sequelize.col('filesInfo.caseUuid'), 'caseUuid'],
        ],
        include: [{
            model: dbCaseNames, 
            as: "filesInfo",
            where: {
                status: true,
                id: caseId,
                userId: userId
            },
            attributes: [],
        }],
        where: {
            fileUuid: fileUuid,
            caseId: caseId,
            userId: userId,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getFileIdGroup = async (fileUuid, caseId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_7,
            [Sequelize.col('filesInfo.id'), 'caseId'],
            [Sequelize.col('filesInfo.caseUuid'), 'caseUuid'],
        ],
        include: [{
            model: dbCaseNames, 
            as: "filesInfo",
            where: {
                status: true,
                id: caseId,
            },
            attributes: [],
        }],
        where: {
            fileUuid: fileUuid,
            caseId: caseId,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

module.exports = Queries;