const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const db = dbModel.caseNames;
const dbFiles = dbModel.caseFiles;
const dbResponses = dbModel.caseResponses;
const dbCaseIntakeQueries = dbModel.caseIntakeQueries;
const dbCaseIntakeQueriesTitles = dbModel.caseIntakeQueriesTitles;
const dbCaseIntakeAnswers = dbModel.caseIntakeAnswers;
const dbCaseFileTypes = dbModel.caseFileTypes;
const dbVectorStoreManager = dbModel.vectorStoreManager;
const attributes_1 = [ 'caseUuid', 'caseName', 'summary', 'status', 'createdAt']
const attributes_2 = ['id']
const attributes_3 = ['id', 'userId']
const attributes_4 = ['requestUuid', 'queryName']
const { Encryption } = require('../../utils')
const attributes_5 = ['id']
const attributes_6 = ['id', 'requestUuid', 'title']
const attributes_7 = ['requestUuid', 'response']

Queries.addCase = async (obj) => {
    return await db.create(obj)
};

Queries.findCaseByUserIdAndName = async (caseName, userId) => {
    return await db.findOne({
        where: {
            caseName: caseName,
            userId: userId,
            status: 1
        }
    });
};

Queries.getFileStatus = async (userId) => {
    let data = await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'summary',
            'caseTypeId',
            'caseUuid',
            'isProcessed',
            'createdAt'
        ],
        include: [
        { 
            model: dbFiles,
            as: "caseDetails",
            where: {
                userId: userId,
                status: 1,
                fileType: {
                    [Op.or]: [true, false]
                }
            },
            attributes: ['fileUuid', 'fileName', 'fileType', 'isProcessed'],
            include: [
                {
                    model: dbCaseFileTypes,
                    as: "filesTypeInfo",
                    attributes: ['requestUuid', 'title'],
                    status: true
                }, 
                {
                    model: dbVectorStoreManager,
                    as: "vectorInfo",
                    attributes: ['status'],
                    required: false
                }
            ]
        },
    ],
        where: {
            userId: userId,
            status: true
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 100,
        // logging: console.log,
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getFileOnlyStatus = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'summary',
            'caseTypeId',
            'caseUuid',
            'isProcessed',
            'createdAt'
        ],
        include: [{ 
            model: dbFiles,
            as: "caseDetails",
            where: {
                userId: userId,
                status: 1,
                fileType: {
                    [Op.or]: [true, false]
                }
            },
            attributes: ['fileUuid', 'fileName', 'fileType', 'isProcessed'],
            include: [
                {
                    model: dbCaseFileTypes,
                    as: "filesTypeInfo",
                    attributes: ['requestUuid', 'title'],
                    status: true
                }, 
                {
                    model: dbVectorStoreManager,
                    as: "vectorInfo",
                    attributes: ['status'],
                    required: false
                }
            ]
        }],
        where: {
            userId: userId,
            caseUuid: caseUuid,
            status: true
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 100,
        // logging: console.log,
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getFileStatusAssigness = async (caseId, userId) => {    
    let data = await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'summary',
            'caseTypeId',
            'caseUuid',
            'isProcessed',
            'createdAt'
        ],
        include: [{ 
            model: dbFiles,
            as: "caseDetails",
            where: {
                userId: {
                    [Op.in]: userId
                },
                status: true,
                fileType: {
                    [Op.or]: [true, false]
                }
            },
            attributes: ['fileUuid', 'fileName', 'fileType', 'isProcessed', 'userId'],
            include: [
                {
                    model: dbCaseFileTypes,
                    as: "filesTypeInfo",
                    attributes: ['requestUuid', 'title'],
                    status: 1
                },
                {
                    model: dbVectorStoreManager,
                    as: "vectorInfo",
                    attributes: ['status'],
                    required: false
                }
            ]
        }],
        where: {
            id: {
                [Op.in]: caseId
            },
            status: true
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 100,
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getCaseResponses = async (caseId, userId) => { 
    let data =  await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'summary',
            'caseUuid',
            'createdAt'
        ],
        include: [{
            model: dbResponses,
            as: "caseResponses",
            where: {
                userId: userId,
                status: 1,
                caseId: caseId
            },
            order: [
                ['id', 'DESC'],
            ],
            attributes: ['caseResponseUuid', 'caseResponseTitle', 'caseResponse']
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
        order: [
            ['id', 'DESC'],
        ],
        limit: 100,
        // logging: console.log,
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 


Queries.getCaseResponsesForGroup = async (caseId) => { 
    let data =  await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'summary',
            'caseUuid',
            'createdAt'
        ],
        include: [{
            model: dbResponses,
            as: "caseResponses",
            where: {
                status: 1,
                caseId: caseId
            },
            order: [
                ['id', 'DESC'],
            ],
            attributes: ['caseResponseUuid', 'caseResponseTitle', 'caseResponse', 'userId']
        }],
        where: {
            status: {
                [Sequelize.Op.eq]: 1
            },
            id: {
                [Sequelize.Op.eq]: caseId
            },
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 100,
        // logging: console.log,
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 

Queries.getAllCases = async (userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            userId: userId,
            status: 1
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 100
    });
}
 
Queries.getCaseId = async (caseId, userId) => {
    return await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'caseUuid',
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            where: {
                caseId: caseId,
                userId: userId,
                status: true,
                fileType: false
            },
            attributes: ['fileUuid', 'fileName', 'isProcessed', 'id']
        }],
        where: {
            userId: userId,
            status: true
        },
        raw: true
    });
}

Queries.getCaseIdForDelete = async (caseUuid, fileUuid, userId) => {
    return await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'caseUuid',
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            where: {
                fileUuid: fileUuid,
                userId: userId,
                status: true,
                fileType: false
            },
            attributes: ['fileUuid', 'fileName', 'isProcessed', 'id']
        }],
        where: {
            userId: userId,
            status: true,
            caseUuid: caseUuid
        },
        raw: true
    });
}

Queries.getCaseIdGroup = async (caseId) => {
    return await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'caseUuid',
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            where: {
                caseId: caseId,
                status: true,
                fileType: false
            },
            attributes: ['fileUuid', 'fileName', 'isProcessed', 'id']
        }],
        where: {
            status: true
        },
        raw: true
    });
}

Queries.findCaseId = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseId,
            userId: userId,
            status: 1
        },
        raw: true
    });
} 

Queries.getCasesId = async (caseId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseId,
            status: 1
        },
        raw: true
    });
} 

Queries.getCasesIdForGroup = async (caseId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseId,
            status: 1
        },
        raw: true
    });
} 

Queries.deActivateCase = async (obj, caseId, userId) => {
    return  await db.update(obj, {
        where: {
            // userId: userId,
            caseUuid: caseId,
            status: 1
        }
    });
}

Queries.findCases = async (caseName, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            caseName: {
                [Op.like]: `%${caseName}%`,
            },
            userId: userId,
            status: 1
        },
        order: [
            ['id', 'DESC'],
        ],
    });
} 

Queries.findCasesByUuid = async (caseUuid, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            caseUuid: caseUuid,
            userId: userId,
            status: 1
        }
    });
} 


Queries.updateCase = async (obj, caseId, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            caseUuid: caseId,
            status: 1
        }
    });
}

Queries.findCasesById = async (caseId, userId) => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            id: caseId,
            userId: userId,
            status: 1
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.findCasesByIdOnly = async (caseId) => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            id: caseId,
            status: 1
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

const decryptionObject = (obj) => {
    if (obj["caseResponses.caseResponseTitle"]) {
        obj["caseResponses.caseResponseTitle"] = Encryption.decryptSensitiveData(obj["caseResponses.caseResponseTitle"])
    }
    if (obj["caseResponses.caseResponse"]) {
        obj["caseResponses.caseResponse"] = Encryption.decryptSensitiveData(obj["caseResponses.caseResponse"])
    }
    if (obj["caseDetails.fileName"]) {
        obj["caseDetails.fileName"] = Encryption.decryptSensitiveData(obj["caseDetails.fileName"])
    }
    if (obj.caseName) {
        obj.caseName = Encryption.decryptSensitiveData(obj.caseName)
    }
    if (obj.summary) {
        obj.summary = Encryption.decryptSensitiveData(obj.summary)
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

Queries.findUserIdWithCaseUuid = async (caseUuid) => {
    return await db.findAll({
        attributes: attributes_3,
        where: {
            caseUuid: caseUuid,
            status: 1
        },
        raw: true
    });
} 

Queries.getAllCaseResponses = async (userId) => { 
    let data =  await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'summary',
            'caseUuid',
            'createdAt'
        ],
        include: [{
            model: dbResponses,
            as: "caseResponses",
            where: {
                userId: userId,
                status: 1,
            },
            attributes: ['caseResponseUuid', 'caseResponseTitle', 'caseResponse']
        }],
        where: {
            userId: {
                [Sequelize.Op.eq]: userId
            },
            status: {
                [Sequelize.Op.eq]: 1
            }
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 100,
        // logging: console.log,
        raw: true
    });

    data = decryptionArray(data);
    return data;
} 

Queries.getAllAudioFiles = async (userId) => {
    let data = await db.findAll({
        attributes: [ 
            'id',
            'caseName',
            'caseUuid',
        ],
        include: [{
            model: dbFiles,
            as: "caseDetails",
            where: {
                userId: userId,
                status: 1,
                fileType: true
            },
            attributes: ['fileUuid', 'fileName', 'isProcessed']
        }],
        where: {
            userId: {
                [Sequelize.Op.eq]: userId
            },
            status: {
                [Sequelize.Op.eq]: 1
            }
        },
        order: [
            ['id', 'DESC'],
        ],
        limit: 100,
        // logging: console.log,
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.addIntakeQueries = async (obj) => {
    return await dbCaseIntakeQueries.create(obj)
};

Queries.getIntakeQueries = async () => {
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
            },
            attributes: ['requestUuid', 'title', 'required']
        }],
        where: {
            status: true
        },
        // logging: console.log,
        raw: true
    });
};

Queries.updateCaseQueriesByUuid = async (obj, requestUuid) => {
    return  await dbCaseIntakeQueries.update(obj, {
        where: {
            requestUuid: requestUuid,
            status: true
        }
    });
}

Queries.getCaseQueriesByuuid = async (requestUuid) => {
    return  await dbCaseIntakeQueries.findAll({
        attributes: attributes_5,
        where: {
            requestUuid: requestUuid,
            status: true
        },
        raw: true
    });
}

Queries.createCaseAnswersByUuid = async (obj) => {
    return await dbCaseIntakeAnswers.create(obj);
}

Queries.addIntakeQueriesTitle = async (obj) => {
    return await dbCaseIntakeQueriesTitles.create(obj)
};

Queries.updateCaseTitlesByUuid = async (obj, requestUuid) => {
    return  await dbCaseIntakeQueriesTitles.update(obj, {
        where: {
            requestUuid: requestUuid,
            status: true
        }
    });
}

Queries.getCaseQueriesTitle = async () => {
    return await dbCaseIntakeQueriesTitles.findAll({
        attributes: attributes_6,
        where: {
            status: true
        },
        raw: true
    });
}

Queries.findIntakeAnswers = async (caseId, queryId, userId) => {
    let data = await dbCaseIntakeAnswers.findAll({
        attributes: attributes_7,
        where: {
            caseId: caseId,
            queryId: queryId,
            userId: userId,
            status: {
                [Op.or]: [true, false]
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.validateCaseIntakeAnswers = async (caseId, queryId, userId) => {
    return  await dbCaseIntakeAnswers.findAll({
        attributes: attributes_5,
        where: {
            caseId: caseId,
            queryId: queryId,
            userId: userId,
            status: false
        },
        raw: true
    });
}

Queries.updateCaseIntakeAnswers = async (obj, caseId, queryId, userId) => {
    return  await dbCaseIntakeAnswers.update(obj, {
        attributes: attributes_5,
        where: {
            caseId: caseId,
            queryId: queryId,
            userId: userId,
            status: false,
            isUpdated: {
                [Op.or]: [true, false]
            }
            // isUpdated: false fix if we update one recod more that two time's
        },
        raw: true
    });
}

Queries.updateCaseOnUpdateRecord = async (obj, caseId, userId) => {
    return  await db.update(obj, {
        attributes: attributes_5,
        where: {
            id: caseId,
            userId: userId,
            status: true,
            // isUpdated: false
        },
        raw: true
    });
}


Queries.addCaseFileTitle = async (obj) => {
    return await dbCaseFileTypes.create(obj)
};

Queries.getCaseFileTitle = async () => {
    return await dbCaseFileTypes.findAll({
        attributes: attributes_6,
        where: {
            status: true
        },
        raw: true
    });
}

Queries.getCaseFileTypesByuuid = async (requestUuid) => {
    return  await dbCaseFileTypes.findAll({
        attributes: attributes_5,
        where: {
            requestUuid: requestUuid,
            status: true
        },
        raw: true
    });
}

Queries.getDataForCitation = async (caseId) => {
    let data = await db.findAll({
        attributes: [ 
            'caseUuid',
            'userId',
        ],
        include: [{ 
            model: dbFiles,
            as: "caseDetails",
            where: {
                status: true,
                fileType: false,
                isCitation: {
                    [Op.eq]: null
                },
                caseId: caseId
            },
            attributes: ['fileUuid', 'fileName'],
        }],
        where: {
            status: true
        },
        raw: true
    });

    data = decryptionArray(data);
    return data;
}

Queries.getCases = async () => { 
    return await db.findAll({ 
        attributes: attributes_5,
        where: {
            status: true,
        }
    })
}

Queries.findCaseIdForFirm = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseId,
            userId: userId,
            createdByUserId: userId,
            status: true
        },
        raw: true
    });
}

Queries.findCaseByUserId = async (userId) => {
    return await db.findAll({
        attributes: [['id', 'caseId']],
        where: {
            createdByUserId: { [Op.is]: null },
            userId: userId,
            status: true
        },
        raw: true
    });
};

Queries.findCaseIdAssignee = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            createdByUserId: { [Op.is]: null },
            caseUuid: caseId,
            userId: userId,
            status: true
        },
        raw: true
    });
} 

module.exports = Queries;