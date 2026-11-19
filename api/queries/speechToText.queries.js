const Queries = {};
const dbModel = require('../model');
const Op = dbModel.op;
const db = dbModel.speechToText;
const attributes_1 = ['requestUuid', 'fileName', 'filePath', 'status']
const attributes_2 = ['requestUuid', 'transcriptName', 'status', 'createdAt']
const attributes_3 = ['requestUuid', 'transcriptName', 'status', 'createdAt', 'transcript', 'fileName']
const { Encryption } = require('../../utils')
const { Sequelize } = require("sequelize");

Queries.createFile = async (obj) => {
    return await db.create(obj);
}

Queries.getFiles = async () => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            isActivated: true,
            status: false
        },
        order: [
            ['id', 'ASC'],
        ],
        limit: 10,
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingData = async () => {
    const sql = `      
    SELECT
        t1.id, t1.requestUuid, t1.fileName, t1.filePath, t1.status, t1.userId
            FROM
                speech_to_text t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    speech_to_text
                WHERE
                status = 0
                AND isActivated = 1
                AND transcript IS NULL
                AND isSent = 0
                GROUP BY
                    userId
                    LIMIT 10
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

Queries.getPendingUploadedFiles = async () => {
    const sql = `      
        SELECT
            t1.id, t1.requestUuid, t1.fileName, t1.filePath, t1.status, t1.userId, t1.transcriptId
                FROM
                    speech_to_text t1
                INNER JOIN (
                    SELECT
                        userId,
                        MIN(id) AS min_id
                    FROM
                        speech_to_text
                    WHERE
                    status = 0
                    AND isActivated = 1
                    AND transcript IS NULL
                    AND isSent = 1
                    AND fileStatus = 0
                    AND transcriptId IS NOT NULL
                    GROUP BY
                        userId
                        LIMIT 10
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

Queries.getTranscript = async () => {
    const sql = `      
        SELECT
            t1.id, t1.requestUuid, t1.fileName, t1.filePath, t1.status, t1.userId, t1.transcriptId
                FROM
                    speech_to_text t1
                INNER JOIN (
                    SELECT
                        userId,
                        MIN(id) AS min_id
                    FROM
                        speech_to_text
                    WHERE
                    status = 0
                    AND isActivated = 1
                    AND transcript IS NULL
                    AND isSent = 1
                    AND fileStatus = 1
                    AND transcriptId IS NOT NULL
                    GROUP BY
                        userId
                        LIMIT 10
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

Queries.update = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
        }
    });
}

const decryptionObject = (obj) => {
    if (obj.transcriptName) {
        obj.transcriptName = Encryption.decryptSensitiveData(obj.transcriptName)
    }
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


Queries.getAll = async (userId) => {
    let data = await db.findAll({
        attributes: attributes_2,
        where: {
            userId: userId,
            isActivated: true,
        },
        order: [
            ['createdAt', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllByrequestUuid = async (requestUuid, userId) => {
    let data = await db.findAll({
        attributes: attributes_3,
        where: {
            isActivated: true,
            requestUuid: requestUuid,
            userId: userId
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

module.exports = Queries;