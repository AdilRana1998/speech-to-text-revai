const Queries = {};
const dbModel = require('../model');
const db = dbModel.writeReportAssistant;
const Op = dbModel.op;
const attributes_1 = ['id', 'fileId', 'userId']
const attributes_2 = ['requestUuid', 'response', 'status', 'caseId', 'reportId', 'retryCount', 'userQuery', 'promptType']
const attributes_3 = ['threadId']
const { Encryption } = require('../../utils')
const { Sequelize } = require("sequelize");
const retryLimit = process.env.API_CALL_LIMITS;

Queries.add = async (obj) => { 
    const result = await db.create(obj, 
        { 
            returning: true 
        });
    return [result.requestUuid, result.id];
}

Queries.updateByRequestUuid = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
        }
    });
}

Queries.findFile = async (fileId, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            userId: userId,
            fileId: fileId,
            status: true,
            isProcessed: true,
            isActivated: true
        },
        raw: true
    });
} 

Queries.findFileGroup = async (fileId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            fileId: fileId,
            status: true,
            isProcessed: true,
            isActivated: true
        },
        raw: true
    });
} 

Queries.updateByFileUuid = async (obj, fileUuid, userId) => {
    return await db.update(obj, {
        where: {
            requestUuid: fileUuid,
            // userId: userId,
        }
    });
}

Queries.deleteReport = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            [Op.or]:
                [
                    { status: 1 },
                    { status: 0 }
                ],
            isActivated: true
        }
    });
}

//

Queries.getPendingRedLines = async () => {
    const sql = `
        SELECT
            t1.*
        FROM
            transcript_summary_chunks t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                transcript_summary_chunks
            WHERE status = 0 and isActivated = 1
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
 
Queries.getPendingReports = async () => {
    const sql = `
        SELECT
            t1.*
        FROM
            transcript_summary_chunks t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                transcript_summary_chunks
            WHERE status = 0 
            and isActivated = 1 
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

Queries.getFailedReports = async () => {
      const sql = `
        SELECT
            t1.*
        FROM
            transcript_summary_chunks t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                transcript_summary_chunks
            WHERE status = 2 
            and isActivated = 1 
            and retryCount < ${retryLimit}
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

Queries.getFailedRedLine = async () => {
    const sql = `
      SELECT
          t1.*
      FROM
          transcript_summary_chunks t1
      INNER JOIN (
          SELECT
              userId,
              MIN(id) AS min_id
          FROM
              transcript_summary_chunks
          WHERE status = 2 and isActivated = 1 and retryCount < ${retryLimit}
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
            status: false,
            assistantId: {
                [Op.not]: null
            },
            isActivated: true
        },
        raw: true
    });
    if (data == null) {
        return data;
    } else {
        data = [decryptionObject3(data)];
        return data;
        //enable it when forOf loop is working
        // data = decryptionArray(data);
        // return data;
    }    
}

Queries.getPendingReportsByReportId = async (reportId) => {
    return await db.count({
        where: {
            reportId: reportId,
            status: false,
            isActivated: true
        },
        raw: true
    });
} 

Queries.getPendingRedLineByUserId = async (userId) => {
    let data = await db.findOne({
        attributes: attributes_1,
        where: {
            userId: userId,
            status: false,
            type: true,
            assistantId: {
                [Op.not]: null
            },
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


Queries.update = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            requestUuid: requestUuid,
            status: false
        }
    });
}

Queries.updateFailed = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            requestUuid: requestUuid,
            status: 2
        }
    });
}

Queries.startPendingReports = async () => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            status: false,
            assistantId: {
                [Op.not]: null,
            },
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.startPendingRedLine = async () => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            status: 0,
            assistantId: {
                [Op.not]: null,
            },
            type: true
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

Queries.getReportsFromAssistant = async (reportId, userId) => {
    let data = await db.findAll({
        attributes: attributes_2,
        where: {
            reportId: reportId,
            userId: userId,
            status: 1,
            assistantId: {
                [Op.not]: null,
            },
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 


Queries.checkUsage = async (userId) => {
    return await db.count({
        where: {
            userId: userId,
            status: 0,
            isActivated: true
        }
    });
}

Queries.checkUsageRedLine = async (userId) => {
    return await db.count({
        where: {
            userId: userId,
            [Op.or]: {
                status: 0,
            },
            type: true
        }
    });
}

Queries.countRetryRedLine = async (userId) => {
    return await db.findOne({
        where: {
            userId: userId,
            [Op.or]: {
                status: 0,
            },
            type: true
        }
    });
}

Queries.countPendingReports = async (reportId, userId) => {
    return await db.count({
        where: {
            reportId: reportId,
            userId: userId,
            status: 0,
            [Op.or]: [
                { assistantId: { [Op.not]: null } },
                { assistantId: null },
              ],
        }
    });
}

Queries.countFaileOrExpiredReports = async (reportId, userId) => {
    return await db.count({
        where: {
            reportId: reportId,
            userId: userId,
            status: 2, 
            assistantId: {
                [Op.not]: null,
            },
        },
        order: [['createdAt', 'DESC']]
    });
}

Queries.getAllReportsFromAssistant = async (reportId, userId) => {
    let data = await db.findAll({
        attributes: attributes_2,
        where: {
            userId: userId,
            [Op.or]: [
                { status: 0 },
                { status: 1 },
                { status: 2 },
              ],
            reportId: reportId
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 


Queries.deleteRedLineInfo = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            [Op.or]:
                [
                    { status: 1 },
                    { status: 0 }
                ],
            type: true
        }
    });
}



Queries.getAllReportsByUserId = async (userId) => {
    let data = await db.findAll({
        attributes: attributes_2,
        where: {
            userId: userId,
            status: 1,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getAllRedLineByUserId = async (userId) => {
    let data = await db.findAll({
        attributes: attributes_2,
        where: {
            userId: userId,
            status: 1,
            type: true
        },
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
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    }
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    }
    if (obj.userQuery) {
        obj.userQuery = Encryption.decryptSensitiveData(obj.userQuery)
    }
    return obj;
}

Queries.countCompletedRequest = async (reportId, userId) => {
    return await db.count({
        where: {
            userId: userId,
            status : 1,
            reportId: reportId
        },
        raw: true
    });
} 

Queries.findThreadIdRedLine = async (userId) => {
    return await db.findOne({
        attributes: attributes_3,
        where: {
            userId: userId,
            [Op.or]: [
                { status: 0 },
                { status: 1 },
              ],
            assistantId: {
                [Op.not]: null,
            },
            type: true
        },
        order: [['createdAt', 'DESC']], 
        raw: true
    });
}

Queries.getAllSummaryData = async (reportId, userId) => {
    let data = await db.findAll({
        attributes: attributes_2,
        where: {
            userId: userId,
            status: true,
            [Op.not]: {
                reportId: reportId
            },
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 


Queries.getPreviousData = async (userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: { 
            status: true,
            userId: userId,
            isActivated: true
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.findReportId = async (requestUuid, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: { 
            status: true,
            requestUuid: requestUuid,
            userId: userId
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPreviousDataToImprove = async (reportId, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: { 
            status: true,
            reportId: reportId,
            userId: userId,
            isActivated: true
        }
    });
    data = decryptionArray(data);
    return data;
}


module.exports = Queries;