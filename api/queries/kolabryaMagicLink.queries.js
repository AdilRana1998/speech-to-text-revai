const Queries = {};
const dbModel = require('../model');
const db = dbModel.magicLink;
const Op = dbModel.op;
const attributes_1 = ['id', 'requestUuid', 'magicLink', 'isVerified' , 'isActivated', 'isExpired', 'isSent', 'isResend', 'userId']

Queries.add = async (obj) => {
       const result = await db.create(obj,
        {
            returning: true
        });
    return [result.requestUuid];
}

Queries.findActiveLink = async (userId) => {
     const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() - 0); // chnage to zero, as we receive all calender events in UTC
    const fiveMinutesAgo = new Date(currentDateTime - 5 * 60 * 1000);
    return await db.findOne({
        attributes: attributes_1,
        where: {
            userId: userId,
            isActivated: true,
            isSent:true,
            isVerified: false,
            isExpired: false,
            featureType: 0
        },
        order: [['createdAt', 'DESC']], 
        raw: true,
    });
}

Queries.update = async (obj, requestUuid, userId) => {
    return await db.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
        }
    });
}

Queries.getDataByUuid = async (requestUuid, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            requestUuid: requestUuid,
            userId: userId,
            isActivated: true,
            featureType: 0,
            isSent: true
        },
        raw: true
    });
} 

Queries.deActiveLink = async () => {
    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() - 0);
    const fiveMinutesAgo = new Date(currentDateTime - 5 * 60 * 1000);
    return await db.findAll({
        attributes: attributes_1,
        where: {
            isActivated: true,
            isSent:true,
            isVerified: false,
            isExpired: false,
            featureType: 0,
            createdAt: {
                [Op.lt]: fiveMinutesAgo
            },
        },
        raw: true,
    });
}

module.exports = Queries;