const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const db = dbModel.documentEnhance;
const attributes_1 = ['requestUuid', 'prompt', 'isProcessed', 'fileName', 'jobUuid']
const { Encryption } = require('../../utils')

Queries.addCase = async (obj) => {
    return await db.create(obj)
};

Queries.getFileStatus = async (userId) => {
    let data = await db.findAll({
        attributes: attributes_1, 
        where: {
            userId: userId,
            status: true,
            isActivated: true
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

const decryptionArray = (array = []) => {
    const arr = [];
    array.forEach(thread => {
        thread = decryptionObject(thread);
        arr.push(thread);
    })
    return arr;
}

const decryptionObject = (obj) => {
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    if (obj.prompt) {
        obj.prompt = Encryption.decryptSensitiveData(obj.prompt)
    }
    return obj;
}

Queries.getFileStatusByCaseUuid = async (requestUuid, userId) => {
    let data = await db.findAll({
        attributes: attributes_1, 
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: true,
            isActivated: true
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.deActivateCase = async (obj, requestUuid, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            requestUuid: requestUuid,
            status: true,
            isActivated: true
        }
    });
}

Queries.getPendingData = async () => {
const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.userId,t1.prompt, t1.fileName
            FROM
                document_enhance t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    document_enhance
                WHERE
                status = 1
                AND isProcessed IS NULL
                AND isActivated = 1
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
    let data = await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingReportsByUserId = async (userId) => {
    let data = await db.findOne({
        attributes: attributes_1,
        where: {
            userId: userId,
            status: true,
            isActivated: true,
            isProcessed: 0
        },
        raw: true
    });
    if (data == null) {
        return data;
    } else {
        data = [decryptionObject3(data)];
        return data;
    }    
}

const decryptionObject3 = (obj) => {
    if (obj.prompt) {
        obj.prompt = Encryption.decryptSensitiveData(obj.prompt)
    }
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    return obj;
}

Queries.updateCase = async (obj, requestUuid, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            requestUuid: requestUuid,
            status: true,
            isActivated: true
        }
    });
}

Queries.getCaseDetails = async (requestUuid, jobUuid) => {
    let data = await db.findAll({
        attributes: attributes_1, 
        where: {
            requestUuid: requestUuid,
            jobUuid: jobUuid,
            status: true,
            isActivated: true,
            isProcessed: 0
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.updateCaseByJobUuid = async (obj, requestUuid, jobUuid) => {
    return  await db.update(obj, {
        where: {
            isProcessed: 0,
            requestUuid: requestUuid,
            jobUuid: jobUuid,
            status: true,
            isActivated: true
        }
    });
}

module.exports = Queries;