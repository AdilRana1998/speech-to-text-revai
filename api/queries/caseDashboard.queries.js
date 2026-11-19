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
const retryLimit = process.env.API_CALL_LIMITS;

const attributes_1 = ['id', 'requestUuid', 'tableName', 'tableType', 'tablePrompt', 'combineAccordian']
const attributes_2 = ['id']
const attributes_3 = [ 'caseResponseUuid', 'caseResponse']
const attributes_4 = [ 'id', 'userId', 'isProcessed', 'caseUuid']
const attributes_5 = [ 'id', 'requestUuid', 'caseId', 'userId', 'mapId', 'request']
const attributes_6 = [ 'id', 'requestUuid', 'caseId', 'userId', 'mapId', 'threadId', 'runId']
const attributes_7 = [ 'id', 'requestUuid', 'caseId', 'userId', 'mapId', 'response']
const attributes_8 = [ 'id', 'queryName', 'prompt']
const attributes_9 = [ 'response']

const { Encryption } = require('../../utils')

Queries.addCaseDashboard = async (obj) => {
    return await dbCaseDashboard.create(obj) 
};


Queries.addcaseDashboardMap= async (obj) => {
    return await caseDashboardMap.create(obj)
};


Queries.getGaseDashboardMap= async () => {
    return await caseDashboardMap.findAll({
        attributes: attributes_1,
        where: {
            status: true
        },
        raw: true
    });
};

Queries.getGaseDashboardMapById= async (id) => {
    return await caseDashboardMap.findAll({
        attributes: attributes_1,
        where: {
            id: id,
            status: true
        },
        raw: true
    });
};


Queries.getIntakeQueriesIds = async (record) => {
    return await dbCaseIntakeQueries.findAll({
        attributes: [ 
            'id',
            'requestUuid',
            'queryName',
            'textArea'
        ],
        include: [{ 
            model: dbCaseIntakeQueriesTitles,
            as: "caseIntakeQueriesTitles", 
            where: {
                status: true,
                id: record
            },
            attributes: ['id','requestUuid', 'title', 'required']
        }],
        where: {
            status: true
        },
        // logging: console.log,
        raw: true
    });
};

Queries.findQueryByQueryId = async (queryId, caseId, userId) => {
    let data = await dbCaseIntakeAnswers.findOne({
        attribute: [ attributes_7 ],
        where: {
            queryId: queryId,
            caseId: caseId,
            userId: userId,
            isUpdated: false,
            status: true
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


Queries.findQueryByQueryIdOnUpdate = async (queryId, caseId, userId) => {
    let data = await dbCaseIntakeAnswers.findOne({
        attribute: [ attributes_7 ],
        where: {
            queryId: queryId,
            caseId: caseId,
            userId: userId,
            isUpdated: true,
            // status: true
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


Queries.findQueryByQuery = async (queryId, caseId, userId) => {
    let data = await dbCaseIntakeAnswers.findOne({
        attribute: [ attributes_7 ],
        where: {
            queryId: queryId,
            caseId: caseId,
            userId: userId,
            // isUpdated: true,
            // status: true
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


Queries.updateCaseById = async (obj, caseId, userId) => {
    return await dbcaseNames.update(obj, {
        where: {
            id: caseId,
            userId: userId,
            status: true
        }
    });
}

Queries.addCaseDashboardOnUpdate = async (obj, mapId, caseId, userId) => {
    return await dbCaseDashboard.update(obj, {
        where: {
            mapId: mapId,
            caseId: caseId,
            userId: userId,
            status: true,
            isReady: true
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


Queries.findCasesById = async (caseId, userId) => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            caseId: caseId,
            userId: userId,
            status: 1
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
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
    if (obj["caseMappingDetails.response"]) {
        obj["caseMappingDetails.response"] = Encryption.decryptSensitiveData(obj["caseMappingDetails.response"])
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
    return await dbcaseNames.findAll({
        attributes: attributes_4,
        where: {
            isProcessed: {
                [Op.eq]: null,
            },
            status: true
        },
        raw: true
    });
}


// Queries.getPendingDataUpdate = async () => {
//     let data =  await dbcaseNames.findAll({
//         attributes: attributes_4,
//         include: [{
//             model: dbCaseIntakeAnswers,
//             as: "caseIntakeAnswersDetails",
//             where: {
//                 isUpdated: true,
//                 status: true
//             },
//         }],
//         where: {
//             status: {
//                 [Sequelize.Op.eq]: true
//             },
//             isProcessed: {
//                 [Sequelize.Op.eq]: null
//             },
//         },
//         group: ['userId', 'id'],
//         // logging: console.log,
//         raw: true
//     });
//     data = decryptionArray(data);
//     return data;
// }

Queries.getPendingDataUpdate = async () => {
    let data = await dbcaseNames.findAll({
        attributes: [
            'userId',
            'id',
            [Sequelize.fn('MIN', Sequelize.col('isProcessed')), 'isProcessed'],
            [Sequelize.fn('MIN', Sequelize.col('caseUuid')), 'caseUuid']
        ],
        include: [{
            model: dbCaseIntakeAnswers,
            as: "caseIntakeAnswersDetails",
            attributes: [
                [Sequelize.fn('MIN', Sequelize.col('caseIntakeAnswersDetails.id')), 'id'],
                [Sequelize.fn('MIN', Sequelize.col('caseIntakeAnswersDetails.requestUuid')), 'requestUuid'],
                [Sequelize.fn('MIN', Sequelize.col('caseIntakeAnswersDetails.response')), 'response'],
                [Sequelize.fn('MIN', Sequelize.col('caseIntakeAnswersDetails.createdAt')), 'createdAt']
            ],
            where: {
                isUpdated: true,
                status: true
            },
        }],
        where: {
            status: {
                [Sequelize.Op.eq]: true
            },
            isProcessed: {
                [Sequelize.Op.eq]: null
            },
        },
        group: ['userId', 'id'],
        // logging: console.log,
        raw: true
    });

    data = decryptionArray(data);
    return data;
};

Queries.getPendingDashboardData = async (userId) => {
    return await dbcaseNames.findOne({
        attributes: attributes_4,
        where: {
            userId: userId,
            isProcessed: false,
            status: true,
        },
        raw: true
    });
} 


Queries.getPendingDataForOpenAI = async () => {

const sql = `      
SELECT
	t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.mapId,t1.request
        FROM
            case_dashboard t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                case_dashboard
            WHERE isProcessed = 0 
            AND isReady = 1
            AND STATUS = 0
            GROUP BY
                userId
        ) t2
        ON
        t1.userId = t2.userId AND t1.id = t2.min_id;
            `;
    let data = await dbCaseDashboard.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingDataForOpenAIByUserId = async (caseId, userId) => {
    return await dbCaseDashboard.findOne({
        attributes: attributes_5,
        where: {
            caseId: caseId,
            userId: userId,
            isProcessed: false,
            assistantId: {
                [Op.eq]: null
            }
        },
        raw: true
    });
}

Queries.update = async (obj, requestUuid, userId) => {
    return await dbCaseDashboard.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: 0,
            isProcessed: false,
        }
    });
}

Queries.updateOnError = async (obj, requestUuid, userId) => {
    return await dbCaseDashboard.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: 2,
            isProcessed: true
        }
    });
}

Queries.startPendingDashboard = async () => {
    const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.mapId,t1.threadId, t1.runId
            FROM
                case_dashboard t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_dashboard
                WHERE isProcessed = 1 
                AND isReady = 1
                AND STATUS = 0
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
        return await dbCaseDashboard.sequelize.query(sql, {
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        });


    // return await dbCaseDashboard.findAll({
    //     attributes: attributes_6,
    //     where: {
    //         isProcessed: true,
    //         isReady: true,
    //         status: false
    //     },
    //     raw: true
    // });
}

Queries.pendingDataQueue = async (caseId, userId) => {
    const sql = `      
    SELECT
        t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.mapId,t1.threadId, t1.runId
            FROM
                case_dashboard t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_dashboard
                WHERE isProcessed = 1 
                AND isReady = 1
                AND STATUS = 0
                AND threadId IS NULL
                AND runId IS NUll
                AND caseId = ${caseId}
                AND userId = ${userId}
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
        return await dbCaseDashboard.sequelize.query(sql, {
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        });


    // return await dbCaseDashboard.findAll({
    //     attributes: attributes_6,
    //     where: {
    //         isProcessed: true,
    //         isReady: true,
    //         status: false
    //     },
    //     raw: true
    // });
}

Queries.pendingDataQueueCount = async (caseId, userId) => {
    const sql = `      
    SELECT count(*) as count
            FROM
                case_dashboard t1
            INNER JOIN (
                SELECT
                    userId,
                    MIN(id) AS min_id
                FROM
                    case_dashboard
                WHERE 
                isReady = 1
                AND STATUS = 0
                AND threadId IS NULL
                AND runId IS NUll
                AND caseId = ${caseId}
                AND userId = ${userId}
                GROUP BY
                    userId
            ) t2
            ON
            t1.userId = t2.userId AND t1.id = t2.min_id;
                `;
        return await dbCaseDashboard.sequelize.query(sql, {
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        });
}

Queries.startFailedDashboard = async () => {
    const sql = `      
SELECT
	t1.id,t1.requestUuid,t1.caseId,t1.userId,t1.mapId,t1.request, t1.retryCount
        FROM
            case_dashboard t1
        INNER JOIN (
            SELECT
                userId,
                MIN(id) AS min_id
            FROM
                case_dashboard
            WHERE isProcessed = 1 
            AND isReady = 1
            AND STATUS = 2
            AND retryCount < ${retryLimit}
            GROUP BY
                userId
        ) t2
        ON
        t1.userId = t2.userId AND t1.id = t2.min_id;
            `;
    return await dbCaseDashboard.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
}

Queries.updateThreadById = async (obj, runId) => {
    return await dbCaseDashboard.update(obj, {
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



Queries.getCaseResponses = async (caseId, userId) => { 
    let data =  await dbcaseNames.findAll({
        attributes: ['caseName', 'caseUuid'],
        include: [{
            model: dbCaseDashboard,
            as: "caseMappingDetails",
            where: {
                userId: userId,
                status: 1,
                caseId: caseId
            },
            attributes: ['requestUuid', 'response'],
            include: [
                {
                    model: caseDashboardMap,
                    as: "caseDashboardInfo",
                    attributes: ['requestUuid', 'tableName'],
                    status: 1
                }
            ]
        }],
        where: {
            userId: {
                [Sequelize.Op.eq]: userId
            },
            status: {
                [Sequelize.Op.eq]: 1
            },
            id: {
                [Sequelize.Op.eq]: caseId
            },
        },
        // logging: console.log,
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 

Queries.getCaseResponsesForGroup = async (caseId) => { 
    let data =  await dbcaseNames.findAll({
        attributes: ['caseName', 'caseUuid'],
        include: [{
            model: dbCaseDashboard,
            as: "caseMappingDetails",
            where: {
                status: 1,
                caseId: caseId
            },
            attributes: ['requestUuid', 'response'],
            include: [
                {
                    model: caseDashboardMap,
                    as: "caseDashboardInfo",
                    attributes: ['requestUuid', 'tableName'],
                    status: 1
                }
            ]
        }],
        where: {
            status: {
                [Sequelize.Op.eq]: 1
            },
            id: {
                [Sequelize.Op.eq]: caseId
            },
        },
        // logging: console.log,
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 

Queries.checkUsage = async (caseId, userId) => {
    return await dbCaseDashboard.count({
        where: {
            userId: userId,
            caseId: caseId,
            status: 0,
            isReady: 1
        }
    });
}


Queries.disableIntakeAnswers = async (obj, caseId, userId) => {
    return await dbCaseIntakeAnswers.update(obj, {
        where: {
            caseId: caseId,
            userId: userId,
            status: true
        }
    });
}

Queries.findCaseAnswers = async (queryId, caseId, userId) => {
    let data = await dbCaseIntakeAnswers.findOne({
        attributes: attributes_9,
        where: {
            queryId: queryId,
            caseId: caseId,
            userId: userId,
        },
        raw: true

    });
    if (data != null) {
        return decryptionObject3(data);
    } else {
        return null
    }
}

Queries.getCaseResponsesByType = async (caseId, mapId, userId) => { 
    let data =  await dbcaseNames.findAll({
        attributes: ['caseName', 'caseUuid'],
        include: [{
            model: dbCaseDashboard,
            as: "caseMappingDetails",
            where: {
                mapId: mapId,
                userId: userId,
                status: 1,
                caseId: caseId
            },
            attributes: ['requestUuid', 'response'],
            include: [
                {
                    model: caseDashboardMap,
                    as: "caseDashboardInfo",
                    attributes: ['requestUuid', 'tableName'],
                    status: 1
                }
            ]
        }],
        where: {
            userId: {
                [Sequelize.Op.eq]: userId
            },
            status: {
                [Sequelize.Op.eq]: 1
            },
            id: {
                [Sequelize.Op.eq]: caseId
            },
        },
        // logging: console.log,
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 

Queries.getCaseResponsesForGroupWithType = async (caseId, mapId) => { 
    let data =  await dbcaseNames.findAll({
        attributes: ['caseName', 'caseUuid'],
        include: [{
            model: dbCaseDashboard,
            as: "caseMappingDetails",
            where: {
                mapId: mapId,
                status: 1,
                caseId: caseId
            },
            attributes: ['requestUuid', 'response'],
            include: [
                {
                    model: caseDashboardMap,
                    as: "caseDashboardInfo",
                    attributes: ['requestUuid', 'tableName'],
                    status: 1
                }
            ]
        }],
        where: {
            status: {
                [Sequelize.Op.eq]: 1
            },
            id: {
                [Sequelize.Op.eq]: caseId
            },
        },
        // logging: console.log,
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 

module.exports = Queries;