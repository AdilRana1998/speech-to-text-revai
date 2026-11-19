const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const db = dbModel.caseResponses;
const dbFiles = dbModel.caseFiles;
const attributes_1 = [ 'id', 'caseResponseUuid', 'userId', 'caseResponse', 'status', 'createdAt']
const attributes_2 = ['id']
const attributes_3 = [ 'caseResponseUuid', 'caseResponse']
const { Encryption } = require('../../utils')

Queries.addResponse = async (obj) => {
    return await db.create(obj)
};

Queries.findCaseByUserIdAndName = async (userId, caseName) => {
    return await db.findOne({
        where: {
            userId: userId,
            caseName: caseName,
            status: 1
        }
    });
};

Queries.getFileStatus = async (userId) => {
    return await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'summary',
            'caseUuid',
            'createdAt'
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            where: {
                userId: userId,
                status: 1
            },
            attributes: ['fileUuid', 'fileName']
        }],
        where: {
            userId: {
                [Sequelize.Op.eq]: userId
            },
            status: {
                [Sequelize.Op.eq]: 1
            }
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 10,
        // logging: console.log,
        raw: true
    });
} 

Queries.getAllCases = async (userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            userId: userId,
            status: 1
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 10
    });
} 

Queries.getCasesId = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseId,
            userId: userId,
            status: 1
        },
        raw: true
    });
} 

Queries.deActivateCase = async (obj, caseId, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            caseUuid: caseId,
            status: 1
        }
    });
}

Queries.findCases = async (caseName, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            caseName: {
                [Op.like]: `%${caseName}%`,
            },
            userId: userId,
            status: 1
        },
        order: [
            ['id', 'DESC'],
        ],
    });
} 

Queries.findCasesByUuid = async (caseUuid, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            caseUuid: caseUuid,
            userId: userId,
            status: 1
        }
    }); 
} 


Queries.updateCase = async (obj, caseId, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            caseUuid: caseId,
            status: 1
        }
    });
}

Queries.findCasesById = async (caseId, userId) => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            caseId: caseId,
            userId: userId,
            status: 1
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.deActivateResponsesByCaseId = async (obj, caseId, userId) => {
    return  await db.update(obj, {
        where: {
            // userId: userId,
            caseId: caseId,
            status: 1
        }
    });
}

const decryptionObject = (obj) => {
    if (obj.caseResponse) {
        obj.caseResponse = Encryption.decryptSensitiveData(obj.caseResponse)
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

Queries.findResponseByUuid = async (Uuid, userId) => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            caseResponseUuid: Uuid,
            userId: userId,
            status: 1
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.findCasesByIdOnly = async (caseId, userId) => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            caseId: caseId,
            userId: userId,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

module.exports = Queries;