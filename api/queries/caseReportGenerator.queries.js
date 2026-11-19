const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const db = dbModel.caseResponses;
const dbcaseNames = dbModel.caseNames;
const dbFiles = dbModel.caseFiles;
const dbCaseDashboard = dbModel.caseDashboard;
const caseDashboardMap = dbModel.caseDashboardMap;
const dbCaseIntakeQueriesTitles = dbModel.caseIntakeQueriesTitles;
const dbCaseIntakeQueries = dbModel.caseIntakeQueries;
const dbCaseIntakeAnswers = dbModel.caseIntakeAnswers;
const dbCaseReportGenerator = dbModel.caseReportGenerator;
const dbCaseReportTimeline = dbModel.caseReportTimeline;
const dbVectorStoreManager = dbModel.vectorStoreManager;
const retryLimit = process.env.API_CALL_LIMITS;

const attributes_1 = ['id', 'requestUuid', 'tableName', 'tableType', 'tablePrompt', 'combineAccordian']
const attributes_2 = ['id']
const attributes_3 = [ 'caseResponseUuid', 'caseResponse']
const attributes_4 = [ 'id', 'userId', 'isProcessed', 'caseUuid']
const attributes_5 = [ 'id', 'requestUuid', 'caseId', 'userId', 'request']
const attributes_6 = [ 'id', 'requestUuid', 'userId', 'threadId', 'runId']
const attributes_7 = [ 'id', 'requestUuid', 'caseId', 'userId', 'response']
const attributes_8 = [ 'id', 'queryName']
const attributes_9 = [ 'requestUuid', 'caseId']
const attributes_10 = [ 'id', 'requestUuid', 'caseId', 'userId', 'response', 'status']
const attributes_11 = [ 'id', 'requestUuid', 'userId', 'request']
const attributes_12 = ['openAIFileId', 'vectorId']
const attributes_13 = ['fileName']
const attributes_14 = ['response']
const attributes_15 = ['vectorId']
const attributes_16 = ['isProcessed']
const attributes_17 = [ 'id', 'requestUuid', 'userId', 'responseId']
const { Encryption } = require('../../utils')

Queries.add = async (obj) => {
    return await dbCaseReportTimeline.create(obj) 
};

Queries.addReport = async (obj) => {
    return await dbCaseReportGenerator.create(obj) 
};

Queries.findTimeLine = async (caseId, userId) => {
    return await dbCaseReportTimeline.findAll({
        attributes: attributes_2,
        where: {
            caseId: caseId,
            userId: userId,
            [Op.or]: [
                { status: 0 },
                { status: 1 }
            ]
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    });
};


Queries.getTimeLine = async (caseId, userId) => {
    let data = await dbCaseReportTimeline.findAll({
        attributes: attributes_10,
        where: {
            caseId: caseId,
            userId: userId,
            // [Op.or]: [
            //     { status: 0 },
            //     { status: 1 },
            //     { status: 2 }
            // ],
        },
        order: [['createdAt', 'DESC']],
        limit: 1, 
        raw: true
    });
    data = decryptionArray(data);
    return data;
};

Queries.findQueryByQueryId = async (queryId, caseId, userId) => {
    let data = await dbCaseIntakeAnswers.findOne({
        attribute: [ attributes_7 ],
        where: {
            queryId: queryId,
            caseId: caseId,
            userId: userId,
            [Op.or]: [
                { isUpdated: false },
                { isUpdated: true }
            ]
        },
        raw: true 
    });
    if (data == null) {
        return data;
    } else {
        data = decryptionObject3(data);
        return data;
    }    
};

Queries.findQueryByQueryIdForFirm = async (queryId, caseId) => {
    let data = await dbCaseIntakeAnswers.findOne({
        attribute: [ attributes_7 ],
        where: {
            queryId: queryId,
            caseId: caseId,
            [Op.or]: [
                { isUpdated: false },
                { isUpdated: true }
            ]
        },
        raw: true 
    });
    if (data == null) {
        return data;
    } else {
        data = decryptionObject3(data);
        return data;
    }    
};


Queries.findQueryByQueryIdForUpdate = async (queryId, caseId, userId) => {
    let data = await dbCaseIntakeAnswers.findOne({
        attribute: [ attributes_7 ],
        where: {
            queryId: queryId,
            caseId: caseId,
            userId: userId,
            isUpdated: true,
            isUsedByToc: false,
        },
        raw: true 
    });
    if (data == null) {
        return data;
    } else {
        data = decryptionObject3(data);
        return data;
    }    
};

Queries.findQueryByQueryIdForUpdateFirm = async (queryId, caseId) => {
    let data = await dbCaseIntakeAnswers.findOne({
        attribute: [ attributes_7 ],
        where: {
            queryId: queryId,
            caseId: caseId,
            isUpdated: true,
            isUsedByToc: false,
        },
        raw: true 
    });
    if (data == null) {
        return data;
    } else {
        data = decryptionObject3(data);
        return data;
    }    
};


Queries.findQueryOnly = async (queryId) => {
    return await dbCaseIntakeQueries.findOne({
        attribute: [ attributes_8 ],
        where: {
            id: queryId,
            status: true
        },
        raw: true 
    });
};


Queries.deactivateCaseTOC = async (obj, tocId, caseId, userId) => {
    return await dbCaseReportTimeline.update(obj, {
        where: {
            id: tocId,
            caseId: caseId,
            userId: userId,
            status: true,
            isProcessed: true,
            isActivated: true
        }
    });
};

Queries.deactivateCaseReport = async (obj, tocId, userId) => {
    return await dbCaseReportGenerator.update(obj, {
        where: {
            timeLineId: tocId,
            userId: userId,
            isActivated: true
        }
    });
};


Queries.updateCaseTOC = async (obj, caseId, userId) => {
    return await dbCaseReportTimeline.update(obj, {
        where: {
            caseId: caseId,
            userId: userId,
            status: true,
            isProcessed: false
        }
    });
};

Queries.findProgress = async (caseId, userId) => {
    return await dbCaseReportTimeline.findAll({
        attributes: attributes_16,
        include: [{
            attributes: ['requestUuid', 'request', 'response', 'timeLineId', 'status'],
            model: dbCaseReportGenerator,
            as: "caseReportGeneratorDetails",
            where: {
                isActivated: true,
                status: false
            }
        }],
        where: {
            caseId: caseId,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    });
};

Queries.updateQueryAfterTOCUsed = async (obj, queryId, caseId, userId) => {
    return await dbCaseIntakeAnswers.update(obj, {
        where: {
            queryId: queryId,
            caseId: caseId,
            userId: userId,
            isUpdated: true,
        }
    });
};


Queries.getMap = async (id) => {
    return await caseDashboardMap.findAll({
        attributes: attributes_1,
        where: {
            id: id,
            status: true
        },
        raw: true
    });
} 


const decryptionObject = (obj) => {
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    }
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    }    
    if (obj.caseName) {
        obj.caseName = Encryption.decryptSensitiveData(obj.caseName)
    }    
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }    
    if (obj["caseMappingDetails.response"]) {
        obj["caseMappingDetails.response"] = Encryption.decryptSensitiveData(obj["caseMappingDetails.response"])
    }
    if (obj["caseReportGeneratorDetails.request"]) {
        obj["caseReportGeneratorDetails.request"] = Encryption.decryptSensitiveData(obj["caseReportGeneratorDetails.request"])
    }
    if (obj["caseReportGeneratorDetails.response"]) {
        obj["caseReportGeneratorDetails.response"] = Encryption.decryptSensitiveData(obj["caseReportGeneratorDetails.response"])
    }
    return obj;
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
    array.forEach(resp => {
        resp = decryptionObject(resp);
        arr.push(resp);
    })
    return arr;
}

Queries.getPendingDataForOpenAI = async () => {
const sql = `      
SELECT
	t1.id, t1.requestUuid, t1.caseId, t1.userId, t1.request
        FROM
            case_report_toc t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                case_report_toc
            WHERE
            STATUS IS NULL
            AND isActivated = 1
            GROUP BY
                userId
        ) t2
        ON
        t1.userId = t2.userId AND t1.id = t2.min_id;
            `;
    let data = await dbCaseReportTimeline.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getReportPendingDataForOpenAI = async () => {
    const sql = `SELECT 
  t1.id,
  t1.requestUuid,
  t1.userId,
  t1.request,
  toc.caseId 
FROM
  case_report_generator t1 
  INNER JOIN 
    (SELECT 
      userId,
      MIN(id) AS min_id 
    FROM
      case_report_generator 
    WHERE STATUS IS NULL
      AND isActivated = 1 
    GROUP BY userId) t2 
    ON t1.userId = t2.userId 
    AND t1.id = t2.min_id 
  LEFT JOIN case_report_toc toc 
    ON t1.timelineId = toc.id ;`

    let data = await dbCaseReportTimeline.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.findPreviousResponseId = async (timelineId, userId) => {
    return await dbCaseReportGenerator.findOne({
        attributes: attributes_17,
        where: {
            timelineId: timelineId ,
            status: true,
            isActivated: true,
            userId: userId
        },
        order: [['id', 'DESC']],
        raw: true
    })
}

Queries.getPendingDataForOpenAIByUserId = async (caseId, userId) => {
    return await dbCaseReportTimeline.findOne({
        attributes: attributes_5,
        where: {
            caseId: caseId,
            userId: userId,
            responseId: {
                [Op.eq]: null
            }
        },
        raw: true
    });
}

Queries.getReportPendingDataForOpenAIByUserId = async (userId) => {
    return await dbCaseReportGenerator.findOne({
        attributes: attributes_11,
        where: {
            userId: userId,
            responseId: {
                [Op.not]: null
            },
            status: false,
            isActivated: true
        },
        raw: true
    });
}


Queries.getReportIdByUuid = async (reportUuid, userId) => {
    return await dbCaseReportTimeline.findAll({
        attributes: attributes_11,
        where: {
            requestUuid: reportUuid,
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
}

Queries.totalCount = async (timeLineId, userId) => {
    return await dbCaseReportGenerator.count({
        where: {
            timeLineId: timeLineId,
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
}

Queries.pendingCount = async (timeLineId, userId) => {
    return await dbCaseReportGenerator.count({
        where: {
            timeLineId: timeLineId,
            userId: userId,
            isActivated: true,
            [Op.or]: [
                { status: 1 },
            ]
        },
        raw: true
    });
}

Queries.update = async (obj, requestUuid, userId) => {
    return await dbCaseReportTimeline.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
        }
    });
}

Queries.updateReport = async (obj, requestUuid, userId) => {
    return await dbCaseReportGenerator.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
        }
    });
}

Queries.updateOnError = async (obj, requestUuid, userId) => {
    return await dbCaseReportTimeline.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: 2
        }
    });
}

Queries.updateOnErrorReport = async (obj, requestUuid, userId) => {
    return await dbCaseReportGenerator.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: 2
        }
    });
}

Queries.startPendingDashboard = async () => {
    const sql = `      
    SELECT
        t1.id, t1.requestUuid, t1.caseId, t1.userId, t1.responseId, t1.retryCount
            FROM
                case_report_toc t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_toc
                WHERE status = 0
                AND responseId IS NOT NULL
                AND isActivated = 1
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
    return await dbCaseReportTimeline.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
}

Queries.startPendingReport = async () => {
    const sql = `      
    SELECT
        t1.id, t1.requestUuid, t1.userId, t1.responseId, t1.retryCount
            FROM
                case_report_generator t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_generator
                WHERE STATUS = 0
                AND responseId IS NOT NULL
                AND isActivated = 1
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
    return await dbCaseReportTimeline.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
}

Queries.pendingDataQueue = async (caseId, userId) => {
    const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.responseId
            FROM
                case_report_toc t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_toc
                WHERE
                STATUS = 0
                AND responseId IS NOT NULL
                AND caseId = ${caseId}
                AND userId = ${userId}
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
        return await dbCaseReportTimeline.sequelize.query(sql, {
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        });
}

Queries.pendingReportDataQueue = async (userId) => {
    const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.userId,t1.responseId
            FROM
                case_report_generator t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_generator
                WHERE
                status = 0
                AND responseId IS NOT NULL
                AND isActivated = 1
                AND userId = ${userId}
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
        return await dbCaseReportTimeline.sequelize.query(sql, {
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        });
}

Queries.pendingDataQueueCount = async (caseId, userId) => {
    const sql = `      
    SELECT count(*) as count
            FROM
                case_report_toc t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_toc
                WHERE status = 0
                AND responseId IS NULL
                AND isActivated = 1
                AND caseId = ${caseId}
                AND userId = ${userId}
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
        return await dbCaseReportTimeline.sequelize.query(sql, {
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        });
}

Queries.startFailedToc = async () => {
    const sql = `      
SELECT
	t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.request, t1.retryCount
        FROM
            case_report_toc t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                case_report_toc
            WHERE isActivated = 1 
            AND status = 2
            AND retryCount < ${retryLimit}
            GROUP BY
                userId
        ) t2
        ON
        t1.userId = t2.userId AND t1.id = t2.min_id;
            `;
    let data = await dbCaseReportTimeline.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.startFailedReport = async () => {
    const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.userId,t1.request, t1.retryCount, toc.caseId 
            FROM
                case_report_generator t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_generator 
                WHERE isActivated = 1 
                AND STATUS = 2
                AND retryCount < ${retryLimit}
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id
            LEFT JOIN case_report_toc toc 
                      ON t1.timelineId = toc.id ;`
    let data = await dbCaseReportGenerator.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.updateThreadById = async (obj, runId) => {
    return await dbCaseReportTimeline.update(obj, {
        where: {
            runId: runId
        }
    });
}

Queries.updateReportThreadById = async (obj, runId) => {
    return await dbCaseReportGenerator.update(obj, {
        where: {
            runId: runId
        }
    });
}

Queries.getCasesId = async (caseId, userId) => {
    return await dbcaseNames.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseId,
            userId: userId,
            status: 1
        },
        raw: true
    });
} 


Queries.gatherData = async () => {
    const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.response
            FROM
                case_report_toc t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_toc
                WHERE
                STATUS = 1
                AND responseId IS NOT NULL
                AND isActivated = 1
                AND isProcessed = 0
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
    let data = await dbCaseReportTimeline.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.gatherDataForNewFiles = async (caseId) => {
    const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.response
            FROM
                case_report_toc t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_toc
                WHERE
                STATUS = 1
                AND responseId IS NOT NULL
                AND isActivated = 1
                AND isProcessed = 1
                AND caseId = ${caseId}
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
    let data = await dbCaseReportTimeline.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.gatherDataQueue = async (caseId, userId) => {
    return await dbCaseReportTimeline.findOne({
        attributes: attributes_5,
        where: {
            caseId: caseId,
            userId: userId,
            responseId: {
                [Op.not]: null
            },
            status: true,
            isActivated: true
        },
        raw: true
    });
} 

Queries.findReportData = async (reportUuid, userId) => { 
    let data = await dbCaseReportTimeline.findAll({
        attributes: attributes_9,
        include: [{
            attributes: ['requestUuid', 'request', 'response', 'timeLineId'],
            model: dbCaseReportGenerator,
            as: "caseReportGeneratorDetails",
            where: {
                isActivated: true,
                status: true
            }
        }],
        where: {
            requestUuid: reportUuid,
            userId: userId,
            isActivated: true,
            isProcessed: true,
            status: true,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}


Queries.findReportToc = async (timeLineId) => { 
    let data = await dbCaseReportTimeline.findAll({
        attributes: attributes_14,
        where: {
            id: timeLineId,
            isActivated: true,
            isProcessed: true,
            status: true,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.countReportData = async (reportUuid, userId) => { 
    return await dbCaseReportTimeline.count({
        attributes: attributes_9,
        include: [{
            attributes: ['requestUuid', 'request', 'response'],
            model: dbCaseReportGenerator,
            as: "caseReportGeneratorDetails",
            where: {
                isActivated: true,
                status: {
                    [Op.not]: true
                }
            }
        }],
        where: {
            requestUuid: reportUuid,
            userId: userId,
            isActivated: true,
            isProcessed: true,
            status: true,
            isActivated: true
        },
        raw: true
    });
}


Queries.reportPendingQueue = async (userId) => {
    const sql = `      
    SELECT count(*) as count
            FROM
                case_report_toc t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_report_generator
                WHERE status = 0
                AND isActivated = 1
                AND userId = ${userId}
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
        return await dbCaseReportGenerator.sequelize.query(sql, {
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        });
}


Queries.checkCaseFileAvaiablity = async (caseId) => {
    // count of files in process + vector store's
    const countInProgress = await dbFiles.count({
        where: {
            caseId: caseId,
            status: true,
            fileType: false,
            isOpenAIProcessed : false,
            openAIFileId:  {
                [Op.eq]: null,
            },
            vectorId:  {
                [Op.eq]: null,
            },
        },
        raw: true
    });
    if (countInProgress <= 0) {
        const getFileId = await dbFiles.findAll({
            attributes: attributes_12,
            where: {
                caseId: caseId,
                status: true,
                fileType: false,
                isOpenAIProcessed : true,
                openAIFileId:  {
                    [Op.not]: null,
                },
                vectorId:  {
                    [Op.not]: null,
                },
            },
            limit: 1,
            raw: true
        });
        if (getFileId.length > 0) {
            const getOpenAIVectorId = await dbVectorStoreManager.findAll({
                attributes: attributes_15,
                where: {
                    id: getFileId[0].vectorId,
                    status: true,
                    isActivated: true,
                },
                raw: true
            });    
            if (getOpenAIVectorId.length > 0) {
                let getFileName = await dbFiles.findAll({
                    attributes: attributes_13,
                    where: {
                        caseId: caseId,
                        status: true,
                        fileType: false,
                        isOpenAIProcessed : true,
                        openAIFileId:  {
                            [Op.not]: null,
                        },
                        vectorId:  {
                            [Op.not]: null,
                        },
                    },
                    // logging: console.log,
                    raw: true
                });
                getFileName = decryptionArray(getFileName);
                return [getOpenAIVectorId[0].vectorId, getFileName]
            } else {
                return [];
            }
        } else {
            return [];
        }
    } else {
        return [];
    }
}

Queries.countEditFiles = async (caseId) => {
    return await dbFiles.count({
        where: {
            caseId: caseId,
            status: true,
            fileType: false,
            // isFileUpdated: true
            isReport: false
        },
        raw: true
    });
}

Queries.countDeletedFiles = async (caseId) => {
    return await dbFiles.count({
        where: {
            caseId: caseId,
            status: false,
            fileType: false,
            // isFileDeleted: true
            isReport: false
        },
        raw: true
    });
}


Queries.deactivateEditFiles = async (obj, caseId) => {
    return await dbFiles.update(obj,{
        where: {
            caseId: caseId,
            status: true,
            fileType: false,
            // isFileUpdated: true
        },
        raw: true
    });
}

Queries.deactivateDeletedFiles = async (obj, caseId) => {
    return await dbFiles.update(obj,{
        where: {
            caseId: caseId,
            status: false,
            fileType: false,
            isFileDeleted: true
        },
        raw: true
    });
}

Queries.updateReportOnDeletedFiles = async (obj, caseId) => {
    return await dbFiles.update(obj,{
        where: {
            caseId: caseId,
            status: false,
            fileType: false,
            isReport: false
        },
        raw: true
    });
}

Queries.findThreadId = async (userId) => {
    return await dbCaseReportGenerator.findOne({
        attributes: attributes_6,
        where: {
            userId: userId,
            // status: true,
            isActivated: true,
            assistantId: {
                [Op.not]: null,
            },
        },
        order: [['createdAt', 'DESC']], 
        raw: true
    });
}

Queries.findProgressForDelete = async (caseId) => {
    return await dbCaseReportTimeline.findAll({
        attributes: attributes_16,
        include: [{
            attributes: ['requestUuid', 'request', 'response', 'timeLineId', 'status'],
            model: dbCaseReportGenerator,
            as: "caseReportGeneratorDetails",
            where: {
                isActivated: true,
                status: false
            }
        }],
        where: {
            caseId: caseId,
            status: true,
            isActivated: true
        },
        raw: true
    });
};

module.exports = Queries;