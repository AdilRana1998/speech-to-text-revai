const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const dbCaseReportGenerator = dbModel.caseReportGenerator;
const dbVectorStoreManager = dbModel.vectorStoreManager;
const dbExternalDocVectorStoreManager = dbModel.externalDocVectorStoreManager;
const dbExternalDocFiles = dbModel.externalDocFiles;
const dbFiles = dbModel.caseFiles;
const attributes_1 = ['id', 'requestUuid', 'userId', 'request']
const attributes_2 = ['vectorId', 'userId', 'id']
const { Encryption } = require('../../utils')
const vectorStoreTimer = process.env.RECREATE_VECTOR_STORE_TIMER;

Queries.add = async (obj) => {
    return await dbVectorStoreManager.create(obj)
};

Queries.addExternalDoc = async (obj) => {
    return await dbExternalDocVectorStoreManager.create(obj)
};

Queries.checkVectorStoreStatusExternalDoc = async () => {
    return await dbExternalDocVectorStoreManager.findAll({
        attributes: attributes_2,
        where: {
            isActivated: true,
            status: false
        },
        raw: true
    });
}

Queries.getReportIdByUuid = async (reportUuid, userId) => {
    return await dbVectorStoreManager.findAll({
        attributes: attributes_1,
        where: {
            requestUuid: reportUuid,
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
}

Queries.totalCount = async (timeLineId, userId) => {
    return await dbVectorStoreManager.count({
        where: {
            timeLineId: timeLineId,
            userId: userId,
            isActivated: true,
        },
        raw: true
    });
}

Queries.getVectorExternalDoc = async (vectorId, userId) => {
    return await dbExternalDocVectorStoreManager.findOne({
        attributes: attributes_2,
        include: [{ 
            model: dbExternalDocFiles,
            as: "externalVectorDetails",
            where: {
                userId: userId,
                status: true,
            },
            attributes: ['fileUuid', 'batchId'],
        }],
        where: {
            userId: userId,
            id: vectorId
        },
        raw: true
    })
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

Queries.getPendingData = async () => {
    const sql = `      
                    SELECT t1.id,
                    t1.fileUuid,
                    t1.caseId,
                    t1.createdByUserId,
                    t1.userId,
                    t2.total_records,
                    t2.allFileIds
                    FROM case_files t1 
                    INNER JOIN 
                    (SELECT 
                        caseId,
                        MIN(id) AS min_id,
                        COUNT(*) AS total_records,
                        GROUP_CONCAT(openAIFileId) AS allFileIds
                    FROM
                        case_files 
                    WHERE STATUS = 1 
                        AND fileType = 0 
                        AND isFileUpdated = 0 
                        AND isFileDeleted = 0 
                        AND isOpenAIProcessed = 1 
                        AND openAIFileId IS NOT NULL 
                        AND vectorId IS NULL 
                        AND caseId NOT IN 
                        (SELECT DISTINCT 
                        caseId 
                        FROM
                        case_files 
                        WHERE isOpenAIProcessed = 0 
                        OR openAIFileId IS NULL) 
                    GROUP BY caseId) t2 
                    ON t1.caseId = t2.caseId 
                    AND t1.id = t2.min_id ;
            `;
    let data = await dbVectorStoreManager.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}


Queries.getPendingDataForExternalDoc = async () => {
    const sql = `      
                SELECT t1.id,
                t1.fileUuid,
                t1.batchId,
                t1.userId,
                t2.total_records,
                t2.allFileIds
                FROM external_doc_files t1 
                INNER JOIN 
                (SELECT 
                    batchId,
                    MIN(id) AS min_id,
                    COUNT(*) AS total_records,
                    GROUP_CONCAT(openAIFileId) AS allFileIds
                FROM
                    external_doc_files 
                WHERE STATUS = 1 
                    AND isFileUpdated = 0 
                    AND isFileDeleted = 0 
                    AND isOpenAIProcessed = 1 
                    AND openAIFileId IS NOT NULL 
                    AND vectorId IS NULL 
                    AND batchId NOT IN 
                    (SELECT DISTINCT 
                    batchId 
                    FROM
                    external_doc_files 
                    WHERE isOpenAIProcessed = 0 
                    OR openAIFileId IS NULL) 
                GROUP BY batchId) t2 
                ON t1.batchId = t2.batchId 
                AND t1.id = t2.min_id ;
            `;
    let data = await dbExternalDocVectorStoreManager.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingDataOnCaseUpdate = async () => {
    const sql = `      
                    SELECT 
  t1.id,
  t1.fileUuid,
  t1.caseId,
  t1.userId,
  t2.total_records,
  t2.allFileIds,
  t3.groupId 
FROM
  case_files t1 
  INNER JOIN 
    (SELECT 
      caseId,
      MIN(id) AS min_id,
      COUNT(*) AS total_records,
      GROUP_CONCAT(openAIFileId) AS allFileIds 
    FROM
      case_files 
    WHERE STATUS = 1 
      AND fileType = 0 
      AND isFileUpdated = 1 
      AND isFileDeleted = 0 
      AND isOpenAIProcessed = 1 
      AND openAIFileId IS NOT NULL 
      AND vectorId IS NULL 
      AND caseId NOT IN 
      (SELECT DISTINCT 
        caseId 
      FROM
        case_files 
      WHERE (
          isOpenAIProcessed = 0 
          OR openAIFileId IS NULL
        ) 
        AND STATUS = 1) 
    GROUP BY caseId) t2 
    ON t1.caseId = t2.caseId 
    AND t1.id = t2.min_id 
  INNER JOIN users t3 
    ON t1.userId = t3.userId ;
            `;
    let data = await dbVectorStoreManager.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingDataOnCaseUpdateExternalDoc = async () => {
    const sql = `      
        SELECT 
  t1.id,
  t1.fileUuid,
  t1.batchId,
  t1.userId,
  t2.total_records,
  t2.allFileIds
FROM
  external_doc_files t1 
  INNER JOIN 
    (SELECT 
      batchId,
      MIN(id) AS min_id,
      COUNT(*) AS total_records,
      GROUP_CONCAT(openAIFileId) AS allFileIds 
    FROM
      external_doc_files 
    WHERE STATUS = 1 
      AND isFileUpdated = 1 
      AND isFileDeleted = 0 
      AND isOpenAIProcessed = 1 
      AND openAIFileId IS NOT NULL 
      AND vectorId IS NULL 
      AND batchId NOT IN 
      (SELECT DISTINCT 
        batchId 
      FROM
        external_doc_files 
      WHERE (
          isOpenAIProcessed = 0 
          OR openAIFileId IS NULL
        ) 
        AND STATUS = 1) 
    GROUP BY batchId) t2 
    ON t1.batchId = t2.batchId 
    AND t1.id = t2.min_id 
  INNER JOIN users t3 
    ON t1.userId = t3.userId ;
            `;
    let data = await dbExternalDocVectorStoreManager.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getDeletedRecordsOfVectorStore = async () => {
    const sql = `      
                SELECT t1.id,
                t1.fileUuid,
                t1.caseId,
                t1.userId,
                t2.total_records,
                t2.allFileIds,
                t3.groupId 
                FROM case_files t1 
                INNER JOIN 
                (SELECT 
                    caseId,
                    MIN(id) AS min_id,
                    COUNT(*) AS total_records,
                    GROUP_CONCAT(openAIFileId) AS allFileIds
                FROM
                    case_files 
                WHERE STATUS = 0 
                    AND fileType = 0 
                    AND isFileDeleted = 1 
                    AND isOpenAIProcessed = 1 
                    AND openAIFileId IS NOT NULL 
                    AND vectorId IS NOT NULL 
                    AND caseId NOT IN 
                    (SELECT DISTINCT 
                    caseId 
                    FROM
                    case_files 
                    WHERE isOpenAIProcessed = 0 
                    OR openAIFileId IS NULL) 
                GROUP BY caseId) t2 
                ON t1.caseId = t2.caseId 
                AND t1.id = t2.min_id 
                INNER JOIN users t3 
                ON t1.userId = t3.userId;
            `;
    let data = await dbVectorStoreManager.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getDeletedRecordsOfVectorStoreExternalDoc = async () => {
    const sql = `      
                SELECT t1.id,
                t1.fileUuid,
                t1.batchId,
                t1.userId,
                t2.total_records,
                t2.allFileIds,
                t3.groupId 
                FROM external_doc_files t1 
                INNER JOIN 
                (SELECT 
                    batchId,
                    MIN(id) AS min_id,
                    COUNT(*) AS total_records,
                    GROUP_CONCAT(openAIFileId) AS allFileIds
                FROM
                    external_doc_files 
                WHERE STATUS = 0 
                    AND isFileDeleted = 1 
                    AND isOpenAIProcessed = 1 
                    AND openAIFileId IS NOT NULL 
                    AND vectorId IS NOT NULL 
                    AND batchId NOT IN 
                    (SELECT DISTINCT 
                    batchId 
                    FROM
                    external_doc_files 
                    WHERE isOpenAIProcessed = 0 
                    OR openAIFileId IS NULL) 
                GROUP BY batchId) t2 
                ON t1.batchId = t2.batchId 
                AND t1.id = t2.min_id 
                INNER JOIN users t3 
                ON t1.userId = t3.userId;
            `;
    let data = await dbVectorStoreManager.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
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
    return await dbVectorStoreManager.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: 0
        }
    });
}

Queries.disableParentVectorStore = async (obj, featureType, id, userId) => {
    return await dbVectorStoreManager.update(obj, {
        where: {
            id: id,
            userId: userId,
            featureType: featureType,
            isActivated: true,
            status: true
        }
    });
}

Queries.checkVectorStoreStatus = async () => {
    return await dbVectorStoreManager.findAll({
        attributes: attributes_2,
        where: {
            isActivated: true,
            status: false
        },
        raw: true
    });
}

Queries.updateVectorExternalDoc = async (obj, vectorId) => {
    return await dbExternalDocVectorStoreManager.update(obj, {
        where: {
            vectorId: vectorId,
            status: false
        },
        raw: true
    });
}

Queries.updateVector = async (obj, vectorId) => {
    return await dbVectorStoreManager.update(obj, {
        where: {
            vectorId: vectorId,
            status: false
        },
        raw: true
    });
}

Queries.updateVectorFailed = async (obj, vectorId) => {
    return await dbVectorStoreManager.update(obj, {
        where: {
            vectorId: vectorId
        },
        raw: true
    });
}

Queries.updateVectorFailedExternalDoc = async (obj, vectorId) => {
    return await dbExternalDocVectorStoreManager.update(obj, {
        where: {
            vectorId: vectorId
        },
    });
}
 
Queries.getVectorId = async (vectorId, userId) => {
    return await dbVectorStoreManager.findOne({
        attributes: attributes_2,
        include: [{ 
            model: dbFiles,
            as: "vectorDetails",
            where: {
                userId: userId,
                status: 1,
                fileType: false
            },
            attributes: ['fileUuid', 'caseId'],
        }],
        where: {
            userId: userId,
            vectorId: vectorId
        },
        // logging: console.log,
        raw: true
    })
}

Queries.getVector = async (vectorId, userId) => {
    return await dbVectorStoreManager.findOne({
        attributes: attributes_2,
        include: [{ 
            model: dbFiles,
            as: "vectorDetails",
            where: {
                userId: userId,
                status: 1,
                fileType: false
            },
            attributes: ['fileUuid', 'caseId'],
        }],
        where: {
            userId: userId,
            id: vectorId
        },
        raw: true
    })
}

Queries.checkVectorStoreTime = async (vectorId, userId) => {
    const endTimeThreshold = new Date();
    endTimeThreshold.setMinutes(endTimeThreshold.getMinutes() - Number(vectorStoreTimer));
    return await dbVectorStoreManager.findOne({
        attributes: attributes_2,
        include: [{ 
            model: dbFiles,
            as: "vectorDetails",
            where: {
                userId: userId,
                status: 1,
                fileType: false
            },
            attributes: ['fileUuid', 'caseId'],
        }],
        where: {
            userId: userId,
            vectorId: vectorId,
            createdAt: {
                [Op.lte]: endTimeThreshold
            },
        },
        // logging: console.log,
        raw: true
    })
}


Queries.checkVectorStoreTimeExternalDoc = async (vectorId, userId) => {
    const endTimeThreshold = new Date();
    endTimeThreshold.setMinutes(endTimeThreshold.getMinutes() - Number(vectorStoreTimer));
    return await dbExternalDocVectorStoreManager.findOne({
        attributes: attributes_2,
        include: [{ 
            model: dbExternalDocFiles,
            as: "externalVectorDetails",
            where: {
                userId: userId,
                status: true,
            },
            attributes: ['fileUuid', 'batchId'],
        }],
        where: {
            userId: userId,
            vectorId: vectorId,
            createdAt: {
                [Op.lte]: endTimeThreshold
            },
        },
        // logging: console.log,
        raw: true
    })
}
  
Queries.getVectorDetails = async (caseId, userId) => {
    return await dbFiles.findOne({
        attributes: [
            ...attributes_2,
            [Sequelize.col('vectorInfo.vectorId'), 'vectorId'],
            [Sequelize.col('vectorInfo.id'), 'id'],
            [Sequelize.col('vectorInfo.fileIds'), 'fileIds'],
            [Sequelize.col('vectorInfo.fileCounts'), 'fileCounts']
        ],
        include: [{ 
            model: dbVectorStoreManager,
            as: "vectorInfo",
            attributes: [],
            where: {
                userId: userId,
                status: true,
                isActivated: true
            },
        }],
        where: {
            userId: userId,
            caseId: caseId,
            [Op.or]: [
                { status: true },
                { status: false }
            ],
            fileType: false
        },
        order: [['createdAt', 'DESC']],
        // logging: console.log,
        raw: true
    })
}
Queries.getVectorDetailsExternal = async (batchId, userId) => {
    return await dbExternalDocFiles.findOne({
        attributes: [
            ...attributes_2,
            [Sequelize.col('externalVectorInfo.vectorId'), 'vectorId'],
            [Sequelize.col('externalVectorInfo.id'), 'id'],
            [Sequelize.col('externalVectorInfo.fileIds'), 'fileIds'],
            [Sequelize.col('externalVectorInfo.fileCounts'), 'fileCounts']
        ],
        include: [{ 
            model: dbExternalDocVectorStoreManager,
            as: "externalVectorInfo",
            attributes: [],
            where: {
                userId: userId,
                status: true,
                isActivated: true
            },
        }],
        where: {
            userId: userId,
            batchId: batchId,
            [Op.or]: [
                { status: true },
                { status: false }
            ],
        },
        order: [['createdAt', 'DESC']],
        raw: true
    })
}

Queries.getVectorDetailsForGroup = async (caseId) => {
    return await dbFiles.findOne({
        attributes: [
            ...attributes_2,
            [Sequelize.col('vectorInfo.vectorId'), 'vectorId'],
            [Sequelize.col('vectorInfo.id'), 'id'],
            [Sequelize.col('vectorInfo.fileIds'), 'fileIds'],
            [Sequelize.col('vectorInfo.fileCounts'), 'fileCounts']
        ],
        include: [{ 
            model: dbVectorStoreManager,
            as: "vectorInfo",
            attributes: [],
            where: {
                status: true,
                isActivated: true
            },
        }],
        where: {
            caseId: caseId,
            [Op.or]: [
                { status: true },
                { status: false }
            ],
            fileType: false
        },
        order: [['createdAt', 'DESC']],
        raw: true
    })
}


Queries.updateOnEdit = async (obj, id) => {
    return await dbVectorStoreManager.update(obj, {
        where: {
            id: id,
            status: true
        }
    });
}

Queries.updateOnEditExternal = async (obj, id) => {
    return await dbExternalDocVectorStoreManager.update(obj, {
        where: {
            id: id,
            status: true
        }
    });
}

Queries.getDeletedFilesForVectorStore = async (openAIFileId, caseId, userId) => {
    return await dbFiles.findOne({
        attributes: [
            ...attributes_2,
            [Sequelize.col('vectorInfo.vectorId'), 'vectorId'],
            [Sequelize.col('vectorInfo.id'), 'id'],
            [Sequelize.col('vectorInfo.fileIds'), 'fileIds'],
            [Sequelize.col('vectorInfo.fileCounts'), 'fileCounts']
        ],
        include: [{ 
            model: dbVectorStoreManager,
            as: "vectorInfo",
            attributes: [],
            where: {
                userId: userId,
                status: 2,
                isActivated: false
            },
        }],
        where: {
            userId: userId,
            openAIFileId: openAIFileId,
            caseId: caseId,
            status: false,
            fileType: false
        },
        raw: true
    })
}

Queries.getDeletedFilesForVectorStoreExternalDoc = async (openAIFileId, batchId, userId) => {
    return await dbExternalDocFiles.findOne({
        attributes: [
            ...attributes_2,
            [Sequelize.col('externalVectorInfo.vectorId'), 'vectorId'],
            [Sequelize.col('externalVectorInfo.id'), 'id'],
            [Sequelize.col('externalVectorInfo.fileIds'), 'fileIds'],
            [Sequelize.col('externalVectorInfo.fileCounts'), 'fileCounts']
        ],
        include: [{ 
            model: dbExternalDocVectorStoreManager,
            as: "externalVectorInfo",
            attributes: [],
            where: {
                userId: userId,
                status: 2,
                isActivated: false
            },
        }],
        where: {
            userId: userId,
            openAIFileId: openAIFileId,
            batchId: batchId,
            status: false,
        },
        raw: true
    })
}

Queries.updateOnDelete = async (obj, id) => {
    return await dbVectorStoreManager.update(obj, {
        where: {
            id: id,
            status: 2,
            isActivated: false
        }
    });
}

Queries.updateOnDeleteExternalDoc = async (obj, id) => {
    return await dbExternalDocVectorStoreManager.update(obj, {
        where: {
            id: id,
            status: 2,
            isActivated: false
        }
    });
}

module.exports = Queries;