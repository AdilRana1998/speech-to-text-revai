const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const db = dbModel.samplePrompts;
const sampleAttachments = dbModel.sampleAttachments;
const attributes_1 = [ 'promptUuid', 'samplePrompt', 'status', 'createdAt']
const attributes_2 = ['id']

Queries.addSample = async (obj) => {
    return await db.create(obj)
};

Queries.countSample = async (userId) => {
    return await db.count({
        where: {
            userId: userId,
            status: 1
        }
    });
}
 
Queries.findCaseByUserIdAndName = async (userId, caseName) => {
    return await db.findOne({
        where: {
            userId: userId,
            caseName: caseName,
            status: 1
        }
    });
};

Queries.getSampleFileStatus = async (userId) => {
    return await db.findAll({
        attributes: [ 
            'id',
            'samplePrompt',
            'promptUuid',
            'createdAt'
        ],
        include: [{
            model: sampleAttachments,
            as: "promptDetails",
            where: {
                userId: userId,
                status: 1
            },
            attributes: ['attachmentUuid', 'fileName'],
            order: [
                ['createdAt', 'DESC'],
            ],
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
            ['createdAt', 'DESC'],
        ],
        limit: 1,
        // logging: console.log,
        raw: true
    });
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
        limit: 10
    });
} 

Queries.getPromptId = async (promptId, userId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            promptUuid: promptId,
            userId: userId,
            status: 1
        },
        raw: true
    });
} 

Queries.deActivatePrompt = async (obj, promptId, userId) => {
    const getDelete =  await db.update(obj, {
        where: {
            userId: userId,
            promptUuid: promptId,
            status: 1
        },
    });

    const getId = await db.findOne({
        where: {
            userId: userId,
            promptUuid: promptId
        },
        raw: true
    });

    return [getDelete, getId]
}

Queries.findSample = async (sampleName, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            samplePrompt: {
                [Op.like]: `%${sampleName}%`,
            },
            userId: userId,
            status: 1
        },
        order: [
            ['id', 'DESC'],
        ],
    });
} 

Queries.findSampleByUuid = async (promptUuid, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            promptUuid: promptUuid,
            userId: userId,
            status: 1
        }
    });
} 

Queries.getActivePromptId = async (promptUuid, userId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            userId: userId,
            promptUuid: promptUuid,
            status: 1
        }
    });
}

Queries.updatePrompt = async (obj, promptUuid, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            promptUuid: promptUuid,
            status: 1
        },
    });
}

module.exports = Queries;