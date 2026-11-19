const Queries = {};
const dbModel = require('../model');
const db = dbModel.caseDocAssistant;
const dbFiles = dbModel.caseFiles;
const dbcaseNames = dbModel.caseNames;
const Op = dbModel.op;
const attributes_1 = ['id', 'requestUuid', 'userId', 'caseId', 'runId', 'messageId', 'request', 'response', 'status']
const attributes_2 = ['threadId']
const attributes_3 = ['threadId', 'runId', 'requestUuid', 'userId', 'caseId', 'id']
const attributes_4 = ['caseName', 'caseUuid']
const attributes_5 = ['requestUuid', 'userId', 'caseId', 'request', 'response', 'status', 'userNote']
const { Encryption } = require('../../utils')
const { Sequelize } = require("sequelize");
const retryLimit = process.env.API_CALL_LIMITS;

Queries.add = async (obj) => {
    return await db.create(obj)
}

Queries.getPendingFileData = async () => {
    const sql = `      
    SELECT
        t1.id,t1.fileUuid,t1.caseId,t1.userId,t1.fileName
            FROM
                case_files t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_files
                WHERE
                STATUS = 1
                AND fileType = 0
                AND vectorId IS NOT NULL
                AND isOpenAIProcessed = 1
                AND openAIFileId IS NOT NULL
                AND isDocProcessed = 0
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


Queries.getPendingData = async () => {
    const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.request
            FROM
                case_doc_assistant t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_doc_assistant
                WHERE
                status = 0
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

Queries.getPendingReportsByUserId = async (userId) => {
    let data = await db.findOne({
        attributes: attributes_1,
        where: {
            userId: userId,
            status: false,
            isActivated: true,
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

Queries.findThreadId = async (caseId, userId) => {
    return await db.findOne({
        attributes: attributes_2,
        where: {
            userId: userId,
            caseId: caseId,
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

Queries.startPendingReports = async () => {
    let data = await db.findAll({
        attributes: attributes_3,
        where: {
            status: false,
            assistantId: {
                [Op.not]: null,
            },
            response: { //commment this to disable json assistant
                [Op.eq]: null,
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

Queries.updateById = async (obj, id) => {
    return await db.update(obj, {
        where: {
            id: id
        }
    });
}

Queries.getFailedReports = async () => {
    const sql = `
      SELECT
          t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.request, t1.retryCount
      FROM
          case_doc_assistant t1
      INNER JOIN (
          SELECT
              userId,
              MIN(id) AS min_id
          FROM
              case_doc_assistant
          WHERE 
              status = 2 
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
            status: 0,
            isActivated: true
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

Queries.getFileOnlyStatus = async (caseUuid, userId) => {
    let data = await dbcaseNames.findAll({
        attributes: [
            ...attributes_4,
            [Sequelize.col('caseDetails.fileUuid'), 'requestUuid'],
            [Sequelize.col('caseDetails.fileName'), 'fileName'],
            [Sequelize.col('caseDetails.fileIdDetails.requestUuid'), 'requestUuid'],
            [Sequelize.col('caseDetails.fileIdDetails.status'), 'status'],
            [Sequelize.col('caseDetails.fileIdDetails.response'), 'response'],
            [Sequelize.col('caseDetails.fileIdDetails.retryCount'), 'retryCount'],
            [Sequelize.col('caseDetails.fileIdDetails.userNote'), 'userNote']
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            where: {
                userId: userId,
                status: true,
                fileType: false,
                isDocProcessed: {
                    [Op.or]: [true, false]
                }
            },
            attributes: [],
            include: [
                {
                    model: db,
                    as: "fileIdDetails",
                    attributes: [],
                    where: {
                        isActivated: true
                    },
                    required: false
                }
            ],

        }],
        where: {
            userId: userId,
            caseUuid: caseUuid,
            status: true
        },
        // logging: console.log,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getFileOnlyStatusForFirm = async (caseUuid) => {
    let data = await dbcaseNames.findAll({
        attributes: [
            ...attributes_4,
            [Sequelize.col('caseDetails.fileUuid'), 'requestUuid'],
            [Sequelize.col('caseDetails.fileName'), 'fileName'],
            [Sequelize.col('caseDetails.fileIdDetails.requestUuid'), 'requestUuid'],
            [Sequelize.col('caseDetails.fileIdDetails.status'), 'status'],
            [Sequelize.col('caseDetails.fileIdDetails.response'), 'response'],
            [Sequelize.col('caseDetails.fileIdDetails.retryCount'), 'retryCount'],
            [Sequelize.col('caseDetails.fileIdDetails.userNote'), 'userNote']
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            where: {
                status: true,
                fileType: false,
                isDocProcessed: {
                    [Op.or]: [true, false]
                }
            },
            attributes: [],
            include: [
                {
                    model: db,
                    as: "fileIdDetails",
                    attributes: [],
                    where: {
                        isActivated: true
                    },
                    required: false
                }
            ],

        }],
        where: {
            caseUuid: caseUuid,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.findRecord = async (requestUuid, caseUuid, userId) => {
    let data = await dbcaseNames.findAll({
        attributes: [
            ...attributes_4,
            [Sequelize.col('caseDetails.fileUuid'), 'requestUuid'],
            [Sequelize.col('caseDetails.fileName'), 'fileName'],
            [Sequelize.col('caseDetails.fileIdDetails.requestUuid'), 'requestUuid'],
            [Sequelize.col('caseDetails.fileIdDetails.status'), 'status'],
            [Sequelize.col('caseDetails.fileIdDetails.response'), 'response'],
            [Sequelize.col('caseDetails.fileIdDetails.retryCount'), 'retryCount'],
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            where: {
                userId: userId,
                status: true,
                fileType: false,
                isDocProcessed: {
                    [Op.or]: [true, false]
                }
            },
            attributes: [],
            include: [
                {
                    model: db,
                    as: "fileIdDetails",
                    attributes: [],
                    where: {
                        isActivated: true,
                        requestUuid: requestUuid
                    },
                }
            ],

        }],
        where: {
            userId: userId,
            caseUuid: caseUuid,
            status: true
        },
        // logging: console.log,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.updateUserNotes = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            requestUuid: requestUuid,
        }
    });
}

Queries.updateFileById = async (obj, fileId) => {
    return await db.update(obj, {
        where: {
            fileId: fileId
        }
    });
}

Queries.getAllByUserId = async (userId) => {
    return await db.findAll({
        attributes: attributes_5,
        where: {
            isActivated: true,
            userId: userId
        },
        order: [['createdAt', 'DESC']]
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
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    if (obj.caseName) {
        obj.caseName = Encryption.decryptSensitiveData(obj.caseName)
    }
    if (obj.userNote) {
        obj.userNote = Encryption.decryptSensitiveData(obj.userNote)
    }
    return obj;
}

module.exports = Queries;