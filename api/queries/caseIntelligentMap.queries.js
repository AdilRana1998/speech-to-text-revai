const Queries = {};
const dbModel = require('../model');
const Op = dbModel.op;
const db = dbModel.intelligentMap;
const dbOpenAIPrompts = dbModel.openAIPrompts;
const dbCaseNames = dbModel.caseNames;
const attributes_1 = ['prompt']
const attributes_2 = ['requestUuid', 'response', 'status', 'retryCount']
const { Encryption } = require('../../utils')
const { Sequelize } = require("sequelize");
const retryLimit = process.env.API_CALL_LIMITS;


Queries.getPendingData = async () => {
const sql = `      
    SELECT 
  t1.id AS caseId,
  t1.caseUuid,
  t1.userId,
  vsm.vectorId 
FROM
  case_names t1 
  INNER JOIN 
    (SELECT 
      userId,
      MIN(id) AS min_id 
    FROM
      case_names 
    WHERE isIntelligentMap IS NULL 
      AND status = 1 
    GROUP BY userId) t2 
    ON t1.userId = t2.userId 
    AND t1.id = t2.min_id 
  LEFT JOIN case_files toc 
    ON t1.id = toc.caseId 
  LEFT JOIN vector_store_manager vsm 
    ON vsm.id = toc.vectorId
WHERE vsm.status = 1 
  AND toc.status = 1 
ORDER BY toc.createdAt DESC 
LIMIT 1 ;`;
    let data = await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingFailedData = async () => {
const sql = `      
    SELECT 
  t1.id AS caseId,
  t1.caseUuid,
  t1.userId,
  cim.requestUuid,
  cim.request,
  cim.retryCount
FROM
  case_names t1 
  INNER JOIN 
    (SELECT 
      userId,
      MIN(id) AS min_id 
    FROM
      case_names 
    WHERE isIntelligentMap = 2
      AND STATUS = 1 
    GROUP BY userId) t2 
    ON t1.userId = t2.userId 
    AND t1.id = t2.min_id 
  LEFT JOIN case_intelligent_map cim 
    ON t1.id = cim.caseId 
WHERE cim.status = 2 AND cim.isActivated = 1 AND cim.retryCount < ${retryLimit}`;
    let data = await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.create = async (obj) => {
    return await db.create(obj);
}

Queries.getOpenAIPromptsByType = async (type) => {
    return await dbOpenAIPrompts.findAll({
        attributes: attributes_1,
        where: {
            type: type,
            isActivated: true
        },
        raw: true
    });
}

Queries.updateCaseById = async (obj, caseId) => {
    return await dbCaseNames.update(obj, {
        where: {
            id: caseId,
            status: true,
        }
    });
}

Queries.updateIntellignetMapByRequestUuid = async (obj, requestUuid) => {
    return await db.update(obj, {
        where: {
            requestUuid: requestUuid,
        }
    });
}

Queries.getSummaryDataOnComplete = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: [...attributes_2,
            [Sequelize.col('caseIntelligentInfo.isIntelligentMap'), 'isIntelligentMap'],
        ],
        include: [
        {
            model: dbCaseNames,
            as: "caseIntelligentInfo",
            where: {
                userId: userId,
                caseUuid: caseUuid,
                status: true
            },
            attributes: [],
        }],
        where: {
            // status: true,
            isActivated: true,
            userId: userId
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

const decryptionObject = (obj) => {
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    }
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
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

module.exports = Queries;