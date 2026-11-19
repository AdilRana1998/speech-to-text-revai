const Queries = {};
const { Op } = require('sequelize');
const dbModel = require('../model');
const db = dbModel.writeReport; 
const dbFiles = dbModel.caseFiles;
const dbCaseNames = dbModel.caseNames;
const dbWriteReportAssistant = dbModel.writeReportAssistant;
const { Sequelize } = require("sequelize");
const { Encryption } = require('../../utils')
const attributes_1 = ['id']
const attributes_2 = ['threadId']
const attributes_3 = ['requestUuid', 'status', 'isActivated']
const attributes_4 = ['requestUuid', 'status', 'isActivated', 'response']
const attributes_5 = ['caseUuid', 'status']

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
            // userId: userId,
        }
    });
}

Queries.getReport = async (reportUuid, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            reportUuid: reportUuid,
            userId: userId,
            status: 1
        },
        raw: true
    });
} 

Queries.findThreadId = async (caseId, userId) => {
    return await db.findOne({
        attributes: attributes_2,
        where: {
            userId: userId,
            caseId: caseId,
            threadId: {
                [Op.not]: null,
            },
            status: true,
            isActivated: true
        },
        order: [['createdAt', 'DESC']], 
        raw: true
    });
}

Queries.getRecordToAddMessage = async () => {
    const sql = `
        SELECT 
  t1.threadId,
  t1.requestUuid,
  t1.userId,
  t1.request AS content,
  t1.caseId AS caseId,
  toc.fileId AS fileId,
  cf.fileUuid AS fileUuid
FROM
  kolabrya_summary t1 
  INNER JOIN 
    (SELECT 
      userId,
      MIN(id) AS min_id 
    FROM
      kolabrya_summary 
    WHERE STATUS = 0 
      AND isActivated = 1 
      AND messageId IS NULL 
      AND response IS NULL 
    GROUP BY userId) t2 
    ON t1.userId = t2.userId 
    AND t1.id = t2.min_id 
  LEFT JOIN kolabrya_summary_files toc 
    ON t1.id = toc.summaryId
  LEFT JOIN case_files cf 
    ON toc.fileId = cf.id    
WHERE toc.isProcessed = 1 
  AND toc.status = 1
  AND cf.status = 1
      `;
      let data = await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getFileRecords = async (requestUuid, fileUuid, userId) => {
    return await dbCaseNames.findAll({
        attributes: [
            ...attributes_5,
             [Sequelize.col('caseDetails.fileUuid'), 'fileUuid'],
             [Sequelize.col('caseDetails.id'), 'fileId'],
             [Sequelize.col('caseDetails.summaryFileIdDetails.requestUuid'), 'summaryFileUuid'],
             [Sequelize.col('caseDetails.summaryFileIdDetails.summaryId'), 'summaryId'],
             [Sequelize.col('caseDetails.summaryFileIdDetails.summaryInfo.requestUuid'), 'summaryRequestUuid'],
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            attributes: [],
            where: {
                status: true,
                fileUuid: fileUuid,
                userId: userId,
            },
            include: [
                {
                    model: dbWriteReportAssistant,
                    as: "summaryFileIdDetails",
                    attributes: [],
                    where: {
                        isActivated: true,
                        isProcessed: false,
                        status: false
                    },
                    include: [
                        {
                            model: db,
                            as: "summaryInfo",
                            attributes: []
                        }
                    ]
                }
            ],
        }],
        where: {
            userId: userId,
            status: true,
            caseUuid: requestUuid
        },
        raw: true
    });
}

Queries.getFileRecordsGroup = async (requestUuid, fileUuid) => {
    return await dbCaseNames.findAll({
        attributes: [
            ...attributes_5,
             [Sequelize.col('caseDetails.fileUuid'), 'fileUuid'],
             [Sequelize.col('caseDetails.id'), 'fileId'],
             [Sequelize.col('caseDetails.summaryFileIdDetails.requestUuid'), 'summaryFileUuid'],
             [Sequelize.col('caseDetails.summaryFileIdDetails.summaryId'), 'summaryId'],
             [Sequelize.col('caseDetails.summaryFileIdDetails.summaryInfo.requestUuid'), 'summaryRequestUuid'],
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            attributes: [],
            where: {
                status: true,
                fileUuid: fileUuid,
            },
            include: [
                {
                    model: dbWriteReportAssistant,
                    as: "summaryFileIdDetails",
                    attributes: [],
                    where: {
                        isActivated: true,
                        isProcessed: false,
                        status: false
                    },
                    include: [
                        {
                            model: db,
                            as: "summaryInfo",
                            attributes: []
                        }
                    ]
                }
            ],
        }],
        where: {
            status: true,
            caseUuid: requestUuid
        },
        raw: true
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

Queries.updateByThreadId = async (obj, messageId, threadId) => {
    return await db.update(obj, {
        where: {
            threadId: threadId,
            messageId: messageId
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

Queries.getData = async (reportUuid, userId) => {
    return await db.findAll({
        attributes: attributes_3,
        where: {
            requestUuid: reportUuid,
            userId: userId,
            isActivated: true
        },
        raw: true
    })
}

Queries.getDataOnComplete = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_4,
            [Sequelize.col('summaryDetails.summaryFileIdInfo.fileUuid'), 'fileUuid']
        ],
        include: [
            {
                model: dbCaseNames,
                as: "writeSummaryInfo",
                where: {
                    status: true,
                    caseUuid: caseUuid,
                    // userId: userId
                },
                attributes: []
            },
            {
                model: dbWriteReportAssistant,
                as: "summaryDetails",
                where: {
                    status: true,
                    userId: userId
                },
                include: [{
                    model:dbFiles,
                    as: "summaryFileIdInfo",
                    where: {
                        status: true,
                    },
                    attributes: []
                }],
                attributes: []
            }
        ],
        where: {
            status: true,
            isActivated: true,
            userId: userId
        },
        // logging: console.log,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

//

Queries.deleteRedLine = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            [Op.or]:
                [
                    { status: 1 },
                    { status: 0 }
                ],
            pagesCount: {
                [Op.eq]: null,
            }
        }
    });
}

Queries.getFileDetails = async (fileId, id) => {
    let data = await dbFiles.findAll({
        attributes: [ 
            'id',
            'fileUUid',
            'filePath',
            'userId'
        ],
        include: [{
            model: db,
            as: "writeReportFileIdDetails",
            where: {
                isActivated: true,
                areChunksProcessed: false,
                id: id
            },
            attributes: ['id', 'intervieweeName', 'interviewerName']
        }],
        where: {
            status: true,
            id: fileId
        },
        // logging: console.log,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.updateAfterChunk = async (obj, reportId, userId) => {
    return await db.update(obj, {
        where: {
            id: reportId,
            userId: userId,
            isActivated: true,
            areChunksProcessed: false
        }
    });
}

Queries.updateAfterOpenAIChunkProcessed = async (obj, reportId) => {
    return await db.update(obj, {
        where: {
            id: reportId,
            isActivated: true,
            areChunksProcessed: true
        }
    });
}

Queries.updateAfterOpenAIMeregeChunkProcessed = async (obj, reportId) => {
    return await db.update(obj, {
        where: {
            id: reportId,
            isActivated: true,
            areChunksProcessed: true,
            areChunksOpenAIProcessed: true,
            mergeChunksOpenAIProcessed: false
        }
    });
}

Queries.updateOnError = async (obj, reportId) => {
    return await db.update(obj, {
        where: {
            id: reportId,
            isActivated: true,
            status: true,
            areChunksProcessed: false
        }
    });
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
    if (obj.filePath) {
        obj.filePath = Encryption.decryptSensitiveData(obj.filePath)
    }
    if (obj['writeReportFileIdDetails.intervieweeName']) {
        obj['writeReportFileIdDetails.intervieweeName'] = Encryption.decryptSensitiveData(obj['writeReportFileIdDetails.intervieweeName'])
    }
    if (obj['writeReportFileIdDetails.interviewerName']) {
        obj['writeReportFileIdDetails.interviewerName'] = Encryption.decryptSensitiveData(obj['writeReportFileIdDetails.interviewerName'])
    }
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    }
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    }
    if (obj.content) {
        obj.content = Encryption.decryptSensitiveData(obj.content)
    }
    return obj;
}

Queries.getMergingData = async (report) => {
    let data = await db.findAll({
        attributes: [ 
            ...attributes_2,
            [Sequelize.col('reportDetails.request'), 'request'],
            [Sequelize.col('reportDetails.response'), 'response'],
        ],
        include: [{
            model: dbWriteReportAssistant,
            as: "reportDetails",
            where: {
                isActivated: true,
                status: true,
            },
            attributes: []
        }],
        where: {
            status: true,
            isActivated: true,
            areChunksProcessed: true,
            areChunksOpenAIProcessed: true,
            id: report
        },
        // logging: console.log,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}



Queries.getDataByUserId = async (userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_3,
            [Sequelize.col('mergeReportDetails.request'), 'request'],
            [Sequelize.col('mergeReportDetails.response'), 'response'],
            [Sequelize.col('mergeReportDetails.requestUuid'), 'requestUuid'],
        ],
        include: [{
            model: dbWriteReportMergingAssistant,
            as: "mergeReportDetails",
            where: {
                isActivated: true,
                status: true,
            },
            attributes: []
        }],
        where: {
            status: true,
            isActivated: true,
            mergeChunksOpenAIProcessed: true,
            userId: userId
        },
        // logging: console.log,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

module.exports = Queries;