const Queries = {};
const dbModel = require('../model');
const db = dbModel.grokThreads;
const dbGrokFiles = dbModel.grokFiles;
const Op = dbModel.op;
const attributes_1 = ['id', 'fileUuid', 'fileName', 'filePath', 'isProcessed', 'fileHash', 'status', 'userId']
const attributes_2 = ['id', 'requestUuid']
const attributes_3 = ['requestUuid', 'response', 'userQuery', 'status']
const attributes_4 = ['threadId']
const attributes_5 = ['requestUuid', 'response', 'userQuery', 'status', 'isActivated', 'request', 'jurisdiction']
const attributes_6 = ['requestUuid', 'userId', 'response', 'userQuery', 'status', 'isActivated', 'request', 'jurisdiction']
const { Encryption } = require('../../utils')
const { Sequelize } = require("sequelize");

Queries.add = async (obj) => {
    const result = await db.create(obj,
        {
            returning: true
        });
    return [result.requestUuid, result.id];
}

Queries.addFile = async (obj) => {
    const result = await dbGrokFiles.create(obj,
        {
            returning: true
        });
    return [result.fileUuid, result.fileName];
}

Queries.validateContent = async (md5, userId) => {
    let data = await dbGrokFiles.findOne({
        attributes: attributes_1,
        include: [{
            model: db,
            as: "grokFilesInfo",
            attribute: [],
            where: {
                status: true,
                userId: userId,
                isActivated: true,
                messageId: {
                    [Op.ne]: null
                },
                response: {
                    [Op.ne]: null
                },
                threadId: {
                    [Op.ne]: null
                },
            },
        }],
        where: {
            userId: userId,
            status: true,
            isProcessed: true,
            fileHash: md5
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

Queries.updateByRequestUuid = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
        }
    });
}

Queries.updateByThreadId = async (obj, messageId, threadId) => {
    return await db.update(obj, {
        where: {
            threadId: threadId,
            messageId: messageId
        }
    });
}

Queries.getFileRecords = async (requestUuid, userId) => {
    const sql = `
        SELECT 
  t1.id,
  t1.requestUuid,
  t1.userId,
  toc.fileUuid,
  toc.fileName 
FROM
  grok_threads t1 
  INNER JOIN grok_threads t2 
    ON t1.userId = t2.userId 
    AND t1.requestUuid = '${requestUuid}'
    AND t1.userId = '${userId}'
    AND t2.status = 0 
    AND t2.isActivated = 1 
  LEFT JOIN grok_files toc 
    ON t1.id = toc.grokThreadId 
WHERE toc.isProcessed = 0 
  AND toc.status = 0
  ORDER BY toc.id ASC
      `;
    return await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
}

Queries.getRecordToAddMessage = async () => {
    const sql = `
        SELECT 
  t1.id,
  t1.requestUuid,
  t1.threadId,
  t1.userId,
  t1.request,
  t1.jurisdiction,
  toc.fileUuid,
  toc.fileName
FROM
  grok_threads t1
  INNER JOIN
    (SELECT
      userId,
      MIN(id) AS min_id
    FROM
      grok_threads
    WHERE STATUS = 0
      AND isActivated = 1
      AND messageId IS NULL
      AND response IS NULL
    GROUP BY userId) t2
    ON t1.userId = t2.userId
    AND t1.id = t2.min_id
  LEFT JOIN grok_files toc
    ON t1.id = toc.grokThreadId
WHERE toc.isProcessed = 1
  AND toc.status = 1
      `;
      let data = await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });

    data = decryptionArray(data);
    return data;
}

const decryptionObject3 = (obj) => {
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    if (obj.filePath) {
        obj.filePath = Encryption.decryptSensitiveData(obj.filePath)
    }
    return obj;
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
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    }
    if (obj.userQuery) {
        obj.userQuery = Encryption.decryptSensitiveData(obj.userQuery)
    }
    if (obj.jurisdiction) {
        obj.jurisdiction = Encryption.decryptSensitiveData(obj.jurisdiction)
    }
    return obj;
}

Queries.updateByFileUuid = async (obj, fileUuid, userId) => {
    return await dbGrokFiles.update(obj, {
        where: {
            fileUuid: fileUuid,
            userId: userId,
        }
    });
}

Queries.findByMessageId = async (messageId, threadId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            messageId: messageId,
            threadId: threadId,
            status: false,
            isActivated: true,
            response: {
                [Op.eq]: null
            },
        },
        raw: true
    });
}

Queries.getDataByUuid = async (requestUuid, subscription, userId) => {
    let data = await db.findAll({
        attributes: attributes_3,
        where: {
            requestUuid: requestUuid,
            subscription: subscription,
            userId: userId,
            // isActivated: true,
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllData = async (subscription, userId) => {
    let data = await db.findAll({
        attributes: attributes_3,
        where: {
            subscription: subscription,
            userId: userId,
            isActivated: true,
        },
        order: [['createdAt', 'ASC']], 
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllDataPageLoad = async (subscription, userId) => {
    let data = await db.findAll({
        attributes: attributes_3,
        where: {
            subscription: subscription,
            userId: userId,
            isActivated: true,
            status: true,
        },
        order: [['createdAt', 'ASC']], 
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.findThreadId = async (userId) => {
    return await db.findOne({
        attributes: attributes_4,
        where: {
            userId: userId,
            status: true,
            isActivated: true,
        },
        raw: true
    })
}

Queries.deleteThread = async (data, userId) => {
    return await db.update(data, {
        where: {
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
}

Queries.deleteFile = async (data, userId) => {
    const files = await dbGrokFiles.findAll({
        where: {
            userId: userId,
            isActivated: true,
        },
        attributes: ['fileUuid'],
        raw: true
    });
    const fileUuids = files.map(file => file?.fileUuid);
    const result = await dbGrokFiles.update(data, {
        where: {
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
    return [result, fileUuids]; 
}

Queries.findUser = async (userId) => {
    return await db.findOne({
        attributes: attributes_2,
        where: {
            userId: userId,
        },
        raw: true
    })
}

Queries.count = async () => {
    const totalPrompt = await db.count({
        raw: true
    });
    const totalSuccessPrompt = await db.count({
        where: {
            status: true
        },
        raw: true
    });
    const totalActPrompt = await db.count({
        where: {
            isActivated: true
        },
        raw: true
    });
    const totalPendingPrompt = await db.count({
        where: {
            status: false
        },
        raw: true
    });
    const totalErrorPrompt = await db.count({
        where: {
            status: 2
        },
        raw: true
    });
    const totalDeActPrompt = await db.count({
        where: {
            isActivated: false
        },
        raw: true
    });
    const totalSessions = await db.count({
        where: {
            isActivated: {
                [Op.or]: [true, false]
            }
        },
        distinct: true,
        col: 'userId',
        raw: true
    });
    const totalActiveSessions = await db.count({
        where: {
            isActivated: true
        },
        distinct: true,
        col: 'userId',
        raw: true
    });
    const totalDeActiveSessions = await db.count({
        where: {
            isActivated: false
        },
        distinct: true,
        col: 'userId',
        raw: true
    });
    return [totalPrompt, totalSuccessPrompt, totalActPrompt, totalPendingPrompt, totalErrorPrompt, totalDeActPrompt, totalSessions, totalActiveSessions, totalDeActiveSessions];
}

Queries.getRecord = async () => {
    let data = await db.findAll({
        attributes: attributes_6,
        order: [['id', 'DESC']], 
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.countPublicUsage = async (subscription, userId) => {
    return await db.count({
        where: {
            userId: userId,
            subscription: subscription,
            isActivated: true,
            status: true
        }
    });
}

module.exports = Queries;