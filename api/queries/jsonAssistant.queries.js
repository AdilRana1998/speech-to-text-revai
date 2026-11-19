const Queries = {};
const dbModel = require('../model');
const db = dbModel.jsonAssistant;
const Op = dbModel.op;
const attributes_1 = ['id', 'requestUuid', 'userId' , 'runId', 'messageId', 'request', 'response', 'status']
const attributes_3 = ['threadId']
const attributes_4 = ['threadId', 'runId', 'requestUuid', 'requestId', 'userId', 'roomId']
const { Encryption } = require('../../utils')
const { Sequelize } = require("sequelize");
const retryLimit = process.env.API_CALL_LIMITS;

Queries.add = async (obj) => {
    const result = await db.create(obj, 
        { 
            returning: true 
        });
    return [result.requestUuid]; 
}

Queries.getPendingJsonData = async () => {
const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.userId,t1.request, t1.requestId, t1.roomId
            FROM
                json_assistants t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    json_assistants
                WHERE
                STATUS = 0
                AND assistantId IS NULL
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

Queries.getPendingJsonByUserId = async (userId) => {
    let data = await db.findOne({
        attributes: attributes_1,
        where: {
            userId: userId,
            status: false,
            isActivated: true,
            assistantId: {
                [Op.not]: null
            }
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

Queries.findThreadId = async (roomId, userId) => {
    return await db.findOne({
        attributes: attributes_3,
        where: {
            roomId: roomId,
            userId: userId,
            status: true,
            isActivated: true,
            assistantId: {
                [Op.not]: null,
            }
        },
        order: [['createdAt', 'DESC']], 
        raw: true
    });
}

Queries.update = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: false
        }
    });
}

Queries.startPendingJson = async () => {
    let data = await db.findAll({
        attributes: attributes_4,
        where: {
            status: false,
            assistantId: {
                [Op.not]: null,
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.updateThreadById = async (obj, runId) => {
    return await db.update(obj, {
        where: {
            runId: runId
        }
    });
}

Queries.getFailedJson = async () => {
    const sql = `
    SELECT
          t1.id,t1.requestUuid,t1.userId,t1.request,t1.retryCount,t1.requestId
      FROM
          json_assistants t1
      INNER JOIN (
          SELECT
              userId,
              MIN(id) AS min_id
          FROM
              json_assistants
          WHERE 
              STATUS = 2 
              AND isActivated = 1
              AND retryCount < ${retryLimit}
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

Queries.checkUsage = async (userId) => {
    return await db.count({
        where: {
            userId: userId,
            status: 0
        }
    });
}

Queries.updateFailed = async (obj, requestUuid, requestId, userId) => {
    return await db.update(obj, {
        where: {
            requestId: requestId,
            userId: userId,
            requestUuid: requestUuid,
            status: 2
        }
    });
}

const decryptionObject3 = (obj) => {
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    }
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    }
    return obj;
}

Queries.getThreadId = async (userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: { 
            status: 0,
            userId: userId
        },
        order: [['createdAt', 'DESC']],
        limit: 1
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
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    }
    if (obj.requestHtml) {
        obj.requestHtml = Encryption.decryptSensitiveData(obj.requestHtml)
    }
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    }
    if (obj.userQuery) {
        obj.userQuery = Encryption.decryptSensitiveData(obj.userQuery)
    }
    if (obj.fileDetails) {
        obj.fileDetails = Encryption.decryptSensitiveData(obj.fileDetails)
    }
    return obj;
}

module.exports = Queries;