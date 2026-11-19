const Queries = {};
const dbModel = require('../model');
const { Sequelize } = require("sequelize");
const Op = dbModel.op;
const db = dbModel.assistantThreads; 
const dbExternalDocQueries = dbModel.externalDocQueries; 
const dbExternalDocBatches = dbModel.externalDocBatches; 
const dbExternalDocFiles = dbModel.externalDocFiles; 
const dbExternalDocVectorStoreManager = dbModel.externalDocVectorStoreManager; 
const { Encryption } = require('../../utils')

const attributes_1 = ['threadId','createdAt', 'runId']
const attributes_2 = ['botId']
const attributes_3 = ['requestUuid', 'question', 'userQuery', 'answer', 'status',  'threadId', 'runId', 'createdAt', 'like', 'feedBack', 'caseId']
const attributes_4 = ['fileId']
const attributes_5 = ['threadId', 'runId']
const attributes_6 = ['id', 'userId', 'question', 'userQuery', 'answer', 'status',  'threadId', 'runId',  'stepId', 'jsonResponse', 'createdAt', 'updatedAt']
const attributes_7 = ['userQuery', 'question', 'answer', 'status', 'createdAt', 'userId']
const attributes_8 = ['userQuery']
const attributes_9 = ['question']
const attributes_10 = ['requestUuid', 'userQuery', 'answer', 'status']
const attributes_11 = ['id', 'userId', 'question', 'userQuery', 'answer', 'status',  'threadId', 'runId',  'stepId', 'jsonResponse', 'createdAt', 'updatedAt', 'requestUuid']
const attributes_12 = ['question', 'answer', 'status', 'requestUuid'];
const attributes_13 = ['id', 'userId', 'question', 'userQuery', 'answer', 'status',  'threadId', 'runId',  'stepId', 'jsonResponse', 'createdAt', 'updatedAt', 'requestUuid', 'retryCount']
const attributes_14 = ['id', 'userId', 'question', 'userQuery', 'answer', 'status',  'threadId', 'runId',  'stepId', 'jsonResponse', 'createdAt', 'updatedAt', 'requestUuid', 'retryCount', 'assistantId']
const attributes_15 = ['requestUuid', 'userQuery', 'answer', 'status',  'caseId', 'kolabryaAssistant']
const attributes_16 = ['requestUuid', 'userQuery', 'answer', 'status', 'caseId']
const attributes_17 = ['requestUuid', 'id']
const attributes_18 = ['requestUuid', 'userQuery', 'answer', 'status']
const attributes_19 = ['requestUuid', 'response', 'userQuery', 'status', 'retryCount']
const attributes_20 = ['requestUuid', 'response', 'userQuery']
const attributes_21 = ['requestUuid']
const attributes_22 = ['requestUuid', 'userId']
const attributes_23 = ['openAIFileId', 'vectorId']
const attributes_24 = ['vectorId']
const attributes_25 = ['fileName']
const attributes_26 = ['responseId']
const attributes_27 = ['responseId', 'retryCount', 'requestUuid', 'userId', 'batchId']
const retryLimit = process.env.API_CALL_LIMITS;

Queries.createBatch = async (obj) => {
    const result = await dbExternalDocBatches.create(obj, 
        { 
            returning: true 
        });
    return [result.requestUuid, result.id]; 
}

Queries.createQuery = async (obj) => {
    const result = await dbExternalDocQueries.create(obj, 
        { 
            returning: true 
        });
    return [result.id, result.requestUuid]; 
}

Queries.findCasesByCaseUuidAndUserId = async (caseUuid, userId) => {
    return await dbExternalDocBatches.findAll({
        attributes: attributes_17,
        where: {
            requestUuid: caseUuid,
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
} 

Queries.findFilesByBatchId = async (batchUuid, userId) => {
    return await dbExternalDocBatches.findAll({
        attributes: attributes_17,
        include: [{
            model: dbExternalDocFiles,
            as: "externalDocBatchDetails",
            where: {
                userId: userId,
                status: true,
            },
            attributes: ['fileUuid', 'fileName'],
        }],
        where: {
            requestUuid: batchUuid,
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
}

Queries.findBatch = async (batchUuid, userId) => {
    let data = await dbExternalDocBatches.findAll({
        attributes: [
            ...attributes_21,
            [Sequelize.col('externalDocBatchDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('externalDocBatchDetails.fileName'), 'fileName']
        ],
        include: [{
            model: dbExternalDocFiles,
            as: "externalDocBatchDetails",
            where: {
                userId: userId,
                status: true,
            },
            attributes: [],
        }],
        where: {
            requestUuid: batchUuid,
            userId: userId,
            isActivated: true,
        },
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 

Queries.findRecentBatch = async (userId) => {
    let data = await dbExternalDocBatches.findAll({
        attributes: attributes_21,
        where: {
            userId: userId,
            isActivated: true,
        },
        order: [['id', 'DESC']],
        limit: 1,
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 

Queries.getAllData = async (userId) => {
    let data = await dbExternalDocQueries.findAll({
        attributes: [
            ...attributes_20,
            [Sequelize.col('externalDocInfo.requestUuid'), 'batchUuid']
        ],
        include: [{
            model: dbExternalDocBatches,
            as: "externalDocInfo",
            where: {
                isActivated: true,
            },
            attributes: [],
        }],
        where: {
            userId: userId,
            isActivated: true,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);  
    return data;
}

Queries.getDataByUuid = async (requestUuid, userId) => {
    let data = await dbExternalDocQueries.findAll({
        attributes: attributes_19,
        where: {
            requestUuid: requestUuid,
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.deleteAnalysis = async (obj, userId) => {
    return await dbExternalDocQueries.update(obj, {
        where: {
            userId: userId,
            isActivated: true,
        }
    });
}

Queries.deleteAnalysisOnFileDelete = async (obj, batchId, userId) => {
    return await dbExternalDocQueries.update(obj, {
        where: {
            responseId: {
                [Op.ne]: null 
            },
            batchId: batchId,
            userId: userId,
            status: true,
            isActivated: true,
        }
    });
}

Queries.deleteBatch = async (obj, userId) => {
    return await dbExternalDocBatches.update(obj, {
        where: {
            userId: userId,
            isActivated: true,
        }
    });
}

Queries.deleteFiles = async (obj, userId) => {
    return await dbExternalDocFiles.update(obj, {
        where: {
            userId: userId,
            status: true,
        }
    });
}

Queries.deleteVectorStore = async (obj, userId) => {
    return await dbExternalDocVectorStoreManager.update(obj, {
        where: {
            userId: userId,
            isActivated: true,
        }
    });
}

Queries.getPendingData = async () => {
const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.batchId,t1.userId,t1.request
            FROM
                external_doc_queries t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    external_doc_queries
                WHERE
                status IS NULL
                AND isActivated = 1
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
    let data = await dbExternalDocQueries.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingReportsByUserId = async (userId) => {
    let data = await dbExternalDocQueries.findOne({
        attributes: attributes_22,
        where: {
            userId: userId,
            isActivated: true,
            status: false,
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

Queries.checkCaseFileAvaiablity = async (batchId) => {
    // count of files in process + vector store's
    const countInProgress = await dbExternalDocFiles.count({
        where: {
            batchId: batchId,
            status: true,
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
        const getFileId = await dbExternalDocFiles.findAll({
            attributes: attributes_23,
            where: {
                batchId: batchId,
                status: true,
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
            const getOpenAIVectorId = await dbExternalDocVectorStoreManager.findAll({
                attributes: attributes_24,
                where: {
                    id: getFileId[0].vectorId,
                    status: true,
                    isActivated: true,
                },
                raw: true
            });    
            if (getOpenAIVectorId.length > 0) {
                let getFileName = await dbExternalDocFiles.findAll({
                    attributes: attributes_25,
                    where: {
                        batchId: batchId,
                        status: true,
                        isOpenAIProcessed : true,
                        openAIFileId:  {
                            [Op.not]: null,
                        },
                        vectorId:  {
                            [Op.not]: null,
                        },
                    },
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

Queries.findPreviousResponseId = async (batchId, userId) => {
    return await dbExternalDocQueries.findOne({
        attributes: attributes_26,
        where: {
            responseId: {
                [Op.not]: null,
            },
            batchId: batchId,
            userId: userId,
            status: true,
            isActivated: true,
            userId: userId
        },
        order: [['id', 'DESC']],
        raw: true
    })
}

Queries.startPendingReports = async () => {
    let data = await dbExternalDocQueries.findAll({
        attributes: attributes_27,
        where: {
            status: false,
            responseId: {
                [Op.not]: null,
            },
            isActivated: true,
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 


Queries.getFailedReports = async () => {
    const sql = `
      SELECT
          t1.id, t1.requestUuid, t1.batchId, t1.userId, t1.request, t1.retryCount
      FROM
          external_doc_queries t1
      INNER JOIN (
          SELECT
              userId,
              MIN(id) AS min_id
          FROM
              external_doc_queries
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
  let data = await dbExternalDocQueries.sequelize.query(sql, {
      type: Sequelize.QueryTypes.SELECT,
      raw: true
  });
  data = decryptionArray(data);
  return data;
}

Queries.checkUsage = async (userId) => {
    return await dbExternalDocQueries.count({
        where: {
            userId: userId,
            status: false
        }
    });
}

Queries.getCaseIdForDelete = async (requestUuid, fileUuid, userId) => {
    return await dbExternalDocBatches.findAll({
        attributes: [ 
            'requestUuid', 'id'
        ],
        include: [{
            model: dbExternalDocFiles,
            as: "externalDocBatchDetails",
            where: {
                fileUuid: fileUuid,
                userId: userId,
                status: true,
            },
            attributes: ['fileUuid', 'fileName']
        }],
        where: {
            userId: userId,
            isActivated: true,
            requestUuid: requestUuid
        },
        raw: true
    });
}

//

Queries.createThreadCite = async (obj) => {
    const result = await db.create(obj, 
        { 
            returning: true 
        });
    return [result.id, result.requestUuid]; 
}

Queries.createThread = async (obj) => {
    const result = await db.create(obj, 
        { 
            returning: true 
        });
    return [result.id, result.requestUuid]; 
}

Queries.getRunIdByThreadIdAss = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            kolabryaAssistant: 1,
            threadId: threadId,
            userId: userId
        }
    });
}

Queries.getRunIdByThreadIdAssIns = async (requestUuid, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            kolabryaAssistant: 26,
            requestUuid: requestUuid,
            userId: userId
        }
    });
}

Queries.getRunIdByThreadIdDoc = async (requestUuid, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            requestUuid: requestUuid,
            userId: userId,
            [Op.or]: [
                { kolabryaAssistant: 0 },
                { kolabryaAssistant: 3 },
                { kolabryaAssistant: 22 },
                { kolabryaAssistant: 25 },
            ]
        },
    });
}

Queries.getRunIdByThreadIdReport = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            threadId: threadId,
            userId: userId,
            [Op.or]: [
                { kolabryaAssistant: 2 },
                { kolabryaAssistant: 4 }
            ]
        }
    });
}

Queries.updateThreadById = async (obj, runId) => {
    return await db.update(obj, {
        where: {
            runId: runId
        }
    });
}

Queries.getUpdatedThreadById = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_2,
        where: {
            threadId: threadId,
            status: 1, //check
            answer: {
                [Op.not]: null,
            },
            userId: userId
        },
        group: ['botId']
    });
} 

Queries.getQNA = async (botId, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 1,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getQNAIns = async (userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_18,
        where: {
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 26,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getQNADoc = async (userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_15,
        where: {
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            [Op.or]: [
                { kolabryaAssistant: 0 },
                { kolabryaAssistant: 3 },
                { kolabryaAssistant: 22 },
                { kolabryaAssistant: 25 },
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getQNAReport = async (botId, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            [Op.or]: [
                { kolabryaAssistant: 2 },
                { kolabryaAssistant: 4 }
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getQNAReWriteReport = async (botId, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            [Op.or]: [
                { kolabryaAssistant: 6 },
                { kolabryaAssistant: 8 }
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getCleanTranscript = async (botId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: {
                [Op.eq]: null,
            },
            status: {
                [Op.or]: [0, 1]
            },
            [Op.or]: [
                { answer: { [Op.not]: null } },
                { answer: null },
              ],
            kolabryaAssistant: { 
                [Op.eq]: 2,
            }
        },
        order: [['createdAt', 'DESC']], 
        limit: 1
    });
}

Queries.getAllThreadResponses = async (botId, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 1,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllThreadResponsesIns = async (userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_18,
        where: {
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 26,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllThreadResponsesDoc = async (userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_15,
        where: {
            userId: userId,
            status: true,
            answer: {
                [Op.not]: null,
            },
            [Op.or]: [
                { kolabryaAssistant: 0 },
                { kolabryaAssistant: 3 },
                { kolabryaAssistant: 22 },
                { kolabryaAssistant: 25 },
            ]
        },   
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllReports = async (botId, userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            [Op.or]: [
                { kolabryaAssistant: 2 },
                { kolabryaAssistant: 4 }
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getFileId = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_4,
        where: {
            threadId: threadId,
            userId: userId,
        }
    });
}

Queries.changeStatus = async (obj, botId, userId) => {
    return await db.update(obj, {
        where: {
            botId: botId,
            userId: userId
        }
    });
}

Queries.changeStatusDoc = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            [Op.or]: [
                { status: 0 },
                { status: 1 }
            ],
            kolabryaAssistant: {
                [Op.not]: 21,
            }
        }
    });
}

Queries.getCleanTrasnscriptRecord = async () => {
    return await db.findAll({
        raw: true,
        attributes: attributes_5,
        where: {
            userId: null,
            kolabryaAssistant: {
                [Op.eq]: 2,
            },
            status: {
                [Op.eq]: 0,
            }
        }
    });
}

Queries.getMdfTranscript = async (botId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            status: 1,
            botId: botId
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
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    }
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    }
    if (obj.question) {
        obj.question = Encryption.decryptSensitiveData(obj.question)
    }
    if (obj.answer) {
        obj.answer = Encryption.decryptSensitiveData(obj.answer)
    }
    if (obj.userQuery) {
        obj.userQuery = Encryption.decryptSensitiveData(obj.userQuery)
    }
    if (obj.feedBack) {
        obj.feedBack = Encryption.decryptSensitiveData(obj.feedBack)
    }
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    return obj;
}

Queries.getAll = async (botId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_3,
    });
}

Queries.updateThread = async (obj, Id) => {
    return await db.update(obj, {
        where: {
            id: Id
        }
    });
}

Queries.getThreadId = async (assistantType, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: { 
            status: 1,
            kolabryaAssistant: assistantType,
            userId: userId
        },
        order: [['createdAt', 'DESC']],
        limit: 1
    });
}

Queries.getAllRecords = async () => {
    return await db.findAll({
        raw: true,
        attributes: attributes_6,
    });
}

Queries.getThreadIdForImprovedPrompt = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            kolabryaAssistant: 5, 
            threadId: threadId,
            userId: userId
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
    });
}

Queries.getUpdatedPromptById = async (threadId, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            userId: userId,
            threadId: threadId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 5,
            }
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
    });
    data = decryptionArray(data);
    return data;
}

Queries.feedBack = async (obj, runId, userId) => {
    return await db.update(obj, {
        where: {
            runId: runId,
            userId: userId
        }
    });
}

Queries.getUserRecordyId = async (userId) => {
    let data = await db.findAll({
        attributes: attributes_7,
        raw: true,
        where: {
            userId: userId,
        },
        order: [['createdAt', 'DESC']],
    });
    data = decryptionArray(data);
    return data;
}

Queries.getRunIdByThreadIdReWriteReport = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            [Op.or]: [
                { kolabryaAssistant: 6 },
                { kolabryaAssistant: 8 }
            ],
            threadId: threadId,
            userId: userId,
        }
    });
}

Queries.getAllReWriteReports = async (botId, userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            [Op.or]: [
                { kolabryaAssistant: 6 },
                { kolabryaAssistant: 8 }
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getRunIdByThreadIdResearch = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            kolabryaAssistant: 7,
            threadId: threadId,
            userId: userId,
        }
    });
}

Queries.getQNAReWriteResearch = async (botId, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 7,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllResearches = async (botId, userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 7,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllPrompts = async (userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_8,
        where: {
            userId: userId,
            status: {
                [Op.not]: 0,
            },
            userQuery: {
                [Op.not]: '',
            }  
        },
        group: attributes_8
    });
    data = decryptionArray(data);
    return data;
}

Queries.getRunIdByThreadIdEmpLaw = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            threadId: threadId,
            userId: userId,
            [Op.or]: [
                { kolabryaAssistant: 9 },
                { kolabryaAssistant: 10 }
            ]
        }
    });
}

Queries.getQNAEmpLaw = async (botId, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            [Op.or]: [
                { kolabryaAssistant: 9 },
                { kolabryaAssistant: 10 }
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllLaw = async (botId, userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            botId: botId,
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            [Op.or]: [
                { kolabryaAssistant: 9 },
                { kolabryaAssistant: 10 }
            ]
        }
    });
    data = decryptionArray(data);
    return data;
}
Queries.getUserAllPrompt = async (userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_9,
        where: {
            userId: userId, 
            question: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.not]: 20,
            }
        },
        group: ['question']
    });
    data = decryptionArray(data);
    return data;
}

Queries.getUserLastPrompt = async (userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_14,
        where: {
            userId: userId,
            [Op.or]: [
                { kolabryaAssistant: 0 },
                { kolabryaAssistant: 3 }
            ]
        },
        order: [['createdAt', 'DESC']], 
        limit: 1
    });
    data = decryptionArray(data);
    return data;
}

Queries.getRunIdByThreadIdAgent = async (requestUuid, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            kolabryaAssistant: 20,
            requestUuid: requestUuid,
            userId: userId,
        }
    });
}

Queries.getRunIdByThreadIdCaidi = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: 0,
            kolabryaAssistant: 21,
            threadId: threadId,
            userId: userId,
        }
    });
}

Queries.getQNAReWriteAgent = async (userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_10,
        where: {
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 20,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getCaidiData = async (userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_10,
        where: {
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 21,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllAgent = async (userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_10,
        where: {
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 20,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAgentAllThread = async () => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            [Op.and]: [
                {
                    [Op.or]: [
                        { kolabryaAssistant: 20 }, 
                        { kolabryaAssistant: 21 }
                    ]
                },
                {
                    [Op.or]: [
                        { status: 0 }, 
                        { status: 1 }
                    ]
                }
            ]
        },
    });
    data = decryptionArray(data);
    return data;
}

Queries.deleteAgentThread = async (obj, threadId) => {
    return await db.update(obj, {
        where: {
            threadId: threadId,
            [Op.and]: [
                {
                    [Op.or]: [
                        { kolabryaAssistant: 20 }, 
                        { kolabryaAssistant: 21 }
                    ]
                },
                {
                    [Op.or]: [
                        { status: 0 }, 
                        { status: 1 }
                    ]
                }
            ]
        }
    });
}

Queries.deleteCaidiAgentThread = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            kolabryaAssistant: {
                [Op.eq]: 21,
            },
            [Op.or]: [
                {status: 0}, 
                {status: 1}
            ]
        }
    });
}

Queries.getPendingTextFormatter = async () => {
    let data = await db.findAll({
        attributes: attributes_14,
        where: {
            kolabryaAssistant: {
                [Op.eq]: 24,
            },
            status: false,
            assistantId : {
                [Op.not]: null 
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingRecordsByUserId = async (userId) => { 
    let data = await db.findOne({
        attributes: attributes_1,
        where: {
            userId: userId,
            status: false,
            threadId: {
                [Op.not]: null 
            },
            assistantId: {
                [Op.not]: null
            },
            kolabryaAssistant: {
                [Op.eq]: 24,
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

const decryptionObject3 = (obj) => {
    if (obj.question) {
        obj.question = Encryption.decryptSensitiveData(obj.question)
    }
    if (obj.answer) {
        obj.answer = Encryption.decryptSensitiveData(obj.answer)
    }
    return obj;
}

Queries.findThreadIdTextFormatter = async (userId) => {
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
            kolabryaAssistant: {
                [Op.eq]: 24,
            },
            threadId: {
                [Op.not]: null
            }
        },
        order: [['createdAt', 'DESC']], 
        raw: true
    });
}

Queries.update = async (obj, requestUuid, userId) => {
    return await dbExternalDocQueries.update(obj, {
        where: {
            userId: userId,
            requestUuid: requestUuid,
        }
    });
}

Queries.updateAssistantThreads = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            requestUuid: requestUuid,
        }
    });
}

Queries.startPendingTextFormatter = async () => {
    let data = await db.findAll({
        attributes: attributes_11,
        where: {
            status: false,
            assistantId: {
                [Op.not]: null,
            },
            threadId: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 24,
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getTextFormatterData = async (requestUuid, userId) => {
    let data = await db.findAll({
        attributes: attributes_12,
        where: {
            requestUuid: requestUuid,
            userId: userId,
            [Op.or]: [
                { status: 0 },
                { status: 1 },
                { status: 2 },
              ],
            assistantId: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 24,
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 


Queries.getTextFormatterAllData = async (userId) => {
    let data = await db.findAll({
        attributes: attributes_13,
        where: {
            userId: userId,
            [Op.or]: [
                { status: 0 },
                { status: 1 },
                { status: 2 },
            ],
            assistantId: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 24,
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getTextFormatterDataPageLoad = async (userId) => {
    let data = await db.findAll({
        attributes: attributes_12,
        where: {
            userId: userId,
            // [Op.or]: [
            //     { status: 0 },
            //     { status: 1 },
            //     { status: 2 },
            // ],
            status: 1,
            assistantId: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 24,
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.deleteTextFormatter = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            [Op.or]:
                [
                    { status: 1 },
                    { status: 0 }
                ],
            kolabryaAssistant: {
                [Op.eq]: 24,
            }
        }
    }); 
}

Queries.getFailedTextFormatter = async () => {
    let data = await db.findAll({
        attributes: attributes_13,
        where: {
            status: 2, 
            assistantId: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 24,
            },
            retryCount : {
                [Op.lt] : retryLimit 
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 




Queries.findActiveChatCaidi = async (userId) => {
    return await db.count({
        where: {
            userId: userId,
            status: 1,
            kolabryaAssistant: {
                [Op.eq]: 21,
            }
        }
    });
}

Queries.updateFailed = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            requestUuid: requestUuid,
            status: 2,
            kolabryaAssistant: {
                [Op.eq]: 24,
            }
        }
    });
}


Queries.validateRecord = async (requestUuid, userId) => {
    let data = await db.findAll({
        raw: true,
        attributes: attributes_3,
        where: {
            status: 1,
            requestUuid: requestUuid,
            [Op.or]: [
                {kolabryaAssistant: 0},
                {kolabryaAssistant: 3}
            ],
            userId: userId
        }
    });
    data = decryptionArray(data);
    return data;
}


Queries.createThreadForVisuals = async (obj) => {
    const result = await db.create(obj, 
        { 
            returning: true 
        });
    return [result.id, result.requestUuid]; 
}

Queries.getVisualsThreadId = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            status: false,
            kolabryaAssistant: 23,
            threadId: threadId,
            userId: userId,
        }
    });
}

Queries.fetchVisuals = async (userId) => {
    let data =  await db.findAll({
        raw: true,
        attributes: attributes_16,
        where: {
            userId: userId,
            status: 1,
            answer: {
                [Op.not]: null,
            },
            kolabryaAssistant: {
                [Op.eq]: 23,
            }
        }
    });
    data = decryptionArray(data);
    return data;
}


Queries.getDetailsForCite = async (threadId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_17,
        where: {
            userId: userId,
            threadId: threadId,
            status: false,
            isCitation: true,
            [Op.or]: [
                { kolabryaAssistant: 0 },
                { kolabryaAssistant: 3 }
            ]
        }
    });
} 


Queries.updateByRequestUuid = async (obj, requestUuid) => {
    return await db.update(obj, {
        where: {
            requestUuid: requestUuid
        }
    });
}

Queries.findOldRecords = async () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return await db.findAll({
        raw: true,
        attributes: attributes_17,
        where: {
            [Op.and]: [
                {
                    [Op.or]: [
                        { kolabryaAssistant: 24 },
                        { kolabryaAssistant: 25 }, 
                        { kolabryaAssistant: 22 }, 
                        { kolabryaAssistant: 0 },
                        { kolabryaAssistant: 26 }
                    ]
                },
                {
                    [Op.or]: [
                        { status: 0 }, 
                        { status: 1 }
                    ]
                }
            ],
            createdAt: {
                [Op.lt]: fiveDaysAgo,
            }
        },
    });
}

Queries.deActivateOldRecords = async (obj) => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return await db.update(obj, {
        where: {
            [Op.and]: [
                {
                    [Op.or]: [
                        { kolabryaAssistant: 24 },
                        { kolabryaAssistant: 25 }, 
                        { kolabryaAssistant: 22 }, 
                        { kolabryaAssistant: 0 }
                    ]
                },
                {
                    [Op.or]: [
                        { status: 0 }, 
                        { status: 1 }
                    ]
                }
            ],
            createdAt: {
                [Op.lt]: fiveDaysAgo,
            }
        },
    });
} 

module.exports = Queries;