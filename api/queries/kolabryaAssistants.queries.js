const Queries = {};
const dbModel = require('../model');
const db = dbModel.kolabryaAssistants;
const dbKolabryaFeatures = dbModel.kolabryaFeatures;
const Op = dbModel.op;

const attributes_1 = ['id', 'requestUuid', 'userId', 'caseId', 'fileDetails', 'isCitation' , 'request', 'status']
const attributes_2 = ['reWriteUuid', 'response', 'requestHtml', 'status', 'caseId', 'reportId', 'retryCount', 'userQuery', 'promptType']
const attributes_3 = ['threadId']
const attributes_4 = ['responseId', 'retryCount', 'requestUuid', 'userId', 'caseId', 'featureType', 'fileDetails']
const attributes_5 = ['requestUuid', 'response', 'caseId', 'featureType', 'userQuery', 'status', 'retryCount']
const attributes_6 = ['requestUuid', 'response', 'featureType', 'userQuery', 'caseId']
const attributes_7 = ['responseId']
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

Queries.findPreviousResponseId = async (caseId, userId) => {
    return await db.findOne({
        attributes: attributes_7,
        where: {
            caseId: caseId ,
            status: true,
            isActivated: true,
            userId: userId
        },
        order: [['id', 'DESC']],
        raw: true
    })
}

Queries.getPendingData = async () => {
const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.request, t1.featureType, t1.fileDetails
            FROM
                kolabrya_assistants t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    kolabrya_assistants
                WHERE
                status IS NULL
                AND isActivated = 1
                AND (featureType = 1 OR featureType = 2 OR featureType = 3) 
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
            isActivated: true,
            status: false,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
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

Queries.findThreadId = async (caseId, userId) => {
    return await db.findOne({
        attributes: attributes_3,
        where: {
            userId: userId,
            caseId: caseId,
            status: true,
            isActivated: true,
            assistantId: {
                [Op.not]: null,
            },
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
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
            // status: false
        }
    });
}

Queries.startPendingReports = async () => {
    let data = await db.findAll({
        attributes: attributes_4,
        where: {
            status: false,
            responseId: {
                [Op.not]: null,
            },
            isActivated: true,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
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

Queries.getDataByUuid = async (requestUuid, userId) => {
    let data = await db.findAll({
        attributes: attributes_5,
        where: {
            requestUuid: requestUuid,
            userId: userId,
            // status: false,
            isActivated: true,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getAllData = async (userId) => {
    let data = await db.findAll({
        attributes: attributes_6,
        where: { 
            userId: userId,
            status: true,
            isActivated: true,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
        },
        order: [['createdAt', 'ASC']], 
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getDataByCaseIdUuid = async (requestUuid, caseId, userId) => {
    let data = await db.findAll({
        attributes: attributes_5,
        where: {
            requestUuid: requestUuid,
            caseId: caseId,
            userId: userId,
            // status: false,
            isActivated: true,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getAllDataByCaseId = async (caseId, userId) => {
    let data = await db.findAll({
        attributes: attributes_6,
        where: { 
            caseId: caseId,
            userId: userId,
            status: true,
            isActivated: true,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
        },
        order: [['createdAt', 'ASC']], 
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getVisualsData = async (requestUuid, userId) => {
    let data = await db.findAll({
        attributes: attributes_5,
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: true,
            isActivated: true,
            featureType: 1
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.deleteAnalysis = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            isActivated: true,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
        }
    });
}

Queries.deleteAnalysisByCaseId = async (obj, caseId, userId) => {
    return await db.update(obj, {
        where: {
            caseId: caseId,
            userId: userId,
            isActivated: true,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
        }
    });
}

Queries.getFailedReports = async () => {
    const sql = `
      SELECT
          t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.request, t1.featureType, t1.retryCount
      FROM
          kolabrya_assistants t1
      INNER JOIN (
          SELECT
              userId,
              MIN(id) AS min_id
          FROM
              kolabrya_assistants
          WHERE 
              status = 2 
              AND isActivated = 1
              AND (featureType = 1 OR featureType = 2 OR featureType = 3) 
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
            status: false,
            isActivated: true,
            [Op.or]: [
                { featureType: 1 },
                { featureType: 2 },
                { featureType: 3 }
            ]
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

Queries.findFeature = async (featureType) => {
    return await dbKolabryaFeatures.findAll({
        where: {
            status: true,
            id: featureType
        },
        raw: true
    });
} 

//

Queries.getPendingRedLines = async () => {
    const sql = `
        SELECT
            t1.*
        FROM
            report_assistant t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                report_assistant
            WHERE status = 0 and type = 1
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
            report_assistant t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                report_assistant
            WHERE status = 0 
            and (type = 0 OR type = 2 OR type = 3 OR type = 4) 
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
          report_assistant t1
      INNER JOIN (
          SELECT
              userId,
              MIN(id) AS min_id
          FROM
              report_assistant
          WHERE status = 2 and type = 1 and retryCount < ${retryLimit}
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
            [Op.or]: [
                { type: 0 },
                { type: 2 },
                { type: 3 },
                { type: 4 },
            ]
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
            [Op.or]: [
                { type: 0 },
                { type: 2 },
                { type: 3 },
                { type: 4 },
            ]
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
            [Op.or]: [
                { type: 0 },
                { type: 2 },
                { type: 3 },
                { type: 4 },
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.findReportId = async (reWriteUuid, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: { 
            status: true,
            reWriteUuid: reWriteUuid,
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
            [Op.or]: [
                { type: 0 },
                { type: 2 },
                { type: 3 },
                { type: 4 },
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}

module.exports = Queries;