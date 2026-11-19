const Queries = {};
const dbModel = require('../model');
const { Sequelize } = require("sequelize");
const Op = dbModel.op;
const db = dbModel.activityLogs;
const dbActivityTypes = dbModel.activityTypes;
const attributes_1 = ['id', 'route', 'title', 'description']
const attributes_2 = ['activityType']
const attributes_3 = []

Queries.create = async (obj) => { 
    return await db.create(obj);
}

Queries.getAllTypes = async () => {
    return await dbActivityTypes.findAll({ 
        raw: true,
        attributes: attributes_1,
        where: {
            status: 1
        },
    });
} 

Queries.createTypes = async (obj) => {
    return await dbActivityTypes.create(obj);
}

Queries.getTypeByRoute = async (route) => {
    return await dbActivityTypes.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            route: route,
            status: 1
        },
    });
} 

Queries.findUserScreen = async (userId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_2,
        where: {
            userId: userId,
            status: 1,
            [Op.or]: [
                { activityType: 21 }, //Specialized Summary 
                { activityType: 20 }, //Title IX Investigation *
                { activityType: 19 }, //changePassword *
                { activityType: 18 }, //meetinghistory *
                { activityType: 17 }, //room/b14331e8-0b26-4966-b7ab-6946bf3f0193 *
                { activityType: 16 }, //meetingassistant Interview Assistant *
                { activityType: 15 }, //reportAssistant radio button of Proofread a Report is selected *
                { activityType: 14 }, //reportAssistant radio button of create a report is selected *
                { activityType: 13 }, //documentAssistant *
                { activityType: 12 }, //case/get -> home - screen *
            ]
        },
        order: [['createdAt', 'DESC']], 
        limit: 1
    });
} 

Queries.getActivityTitleById = async (id) => {
    return await dbActivityTypes.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            id: id,
            status: 1
        },
    });
} 

Queries.CountUserLogin = async (userId) => {
    return await db.count({ 
        raw: true,
        where: {
            activityType: 11,
            userId: userId,
            status: 1,
        }
    });
} 

module.exports = Queries;