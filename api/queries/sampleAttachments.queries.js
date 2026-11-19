const Queries = {};
const dbModel = require('../model');
const db = dbModel.sampleAttachments;
const attributes_1 = ['attachmentUuid', 'fileName', 'status']

Queries.createFile = async (obj) => {
    return await db.create(obj);
}

Queries.getFiles = async (sampleId, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            sampleId: sampleId,
            userId: userId,
            status: 1
        }
    });
} 

Queries.deActivateFile = async (obj, fileId, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            attachmentUuid: fileId,
            status: 1
        }
    });
}
 
Queries.countFiles = async (caseId, userId) => {
    return await db.count({
        where: {
            caseId: caseId,
            userId: userId,
            status: 1
        }
    });
}


Queries.deActivateFileById = async (obj, fileId, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            sampleId: fileId,
            status: 1
        }
    });
}

module.exports = Queries;