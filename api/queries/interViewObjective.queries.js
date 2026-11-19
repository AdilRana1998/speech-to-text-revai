const Queries = {};
const dbModel = require('../model');
const { Sequelize } = require("sequelize");
const Op = dbModel.op;
const db = dbModel.interViewObjective;
const attributes_1 = ['botId', 'objective', 'objectiveUuid']
const attributes_2 = ['botId', 'objective', 'status', 'objectiveUuid']
 
Queries.addObjectives = async (obj) => {
    return await db.findOrCreate({
        where: {
            objective: obj.objective,
            userId: obj.userId,
            status: 1,
        },
        defaults: obj
    });
}

Queries.getObjectives = async (botId, userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            botId: botId,
            userId: userId,
            status: 0
        },
    });
}  

Queries.connectRoomwithObjectives = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            status: 1
        }
    });
}

Queries.getallObjectives = async (userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_2,
        where: {
            userId: userId,
            status: 1,
            botId: null
        },
    });
}  

Queries.deleteByObjective = async (obj, userId, delete_objective) => {
    return await db.update(obj, {
        raw: true,
        attributes: attributes_2,
        where: {
            userId: userId,
            status: 1,
            botId: null,
            objectiveUuid: delete_objective
        },
    });
}  

Queries.updateObjectiveById = async (obj, userId, objectiveId) => {
    return await db.update(obj, {
        raw: true,
        attributes: attributes_2,
        where: {
            status: 1,
            botId: null,
            objectiveUuid: objectiveId,
            userId: userId,
        }
    });
}  

module.exports = Queries;