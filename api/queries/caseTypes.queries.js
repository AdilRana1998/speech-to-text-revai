const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const db = dbModel.caseTypes;
const dbCaseName = dbModel.caseNames;
const attributes_1 = ['id', 'caseTypeUuid', 'caseType']
const attributes_2 = ['id']

Queries.addType = async (obj) => {
    return await db.create(obj)
};

Queries.getAllTypes = async () => {
    return await db.findAll({
        where: {
            status: 1
        },
        raw: true
    });
};

Queries.getAllTypesById = async (id) => {
    const getValidData = await db.findAll({
        attributes: attributes_1, 
        where: {
            status: 1,
            id: id
        },
        order: [['id', 'ASC']], 
        raw: true
    });

    const getUnValidData = await db.findAll({
        attributes: attributes_1, 
        where: {
            status: 1,
            id: {
                [Op.not]: id,
            },
        },
        order: [['id', 'ASC']], 
        raw: true
    });
    return [getValidData, getUnValidData];
};

Queries.findIdFromUuid = async (uuid) => {
    return await db.findAll({
        attributes: attributes_1, 
        where: {
            status: 1,
            caseTypeUuid: uuid 
        },
        raw: true
    });
}

Queries.updateCaseTypeById = async (obj, caseUuid, userId) => {
    return await dbCaseName.update(obj, {
        where: {
            caseUuid: caseUuid,
            userId: userId,
            status: 1
        }
    });
}

Queries.findCurrentStatus = async (caseUuid, id) => {
    return await dbCaseName.findAll({
        where: {
            caseUuid: caseUuid,
            caseTypeId: id,
            status: 1, 
        },
        raw: true
    });
}

module.exports = Queries;