const Queries = {};
const dbModel = require('../model');
const Op = dbModel.op;
const db = dbModel.canadianLawSource;
const { Encryption } = require('../../utils')
const { Sequelize } = require("sequelize");
const retryLimit = process.env.API_CALL_LIMITS;


Queries.getPendingData = async () => {
    let data = await db.findAll({
        where: {
            status: 'pending',
            isDeleted: false,
            retryCount: {
                [Op.lte]: 3,
            }
        },
        order: [['createdAt', 'ASC']],
        limit: 1,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.chatHistory = async (userId) => {
    let data = await db.findAll({
        where: {
            status: 'completed',
            userId: userId,
            isDeleted: false,
        },
        order: [['createdAt', 'DESC']],
        raw: true,
        attributes: ['id', 'response', 'status', 'createdAt', 'request']
    })
    data = decryptionArray(data);
    return data;
}

Queries.getLastMessageChatHistory = async (userId) => {
    let data = await db.findAll({
        where: {
            status: 'completed',
            userId: userId,
            isDeleted: false,
        },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'responseId'],
        raw: true,
        limit: 1
    })
    data = decryptionArray(data);
    return data;
}

Queries.update = async (obj, id) => {
    return await db.update(obj, {
        where: {
            id: id
        }
    });
}

Queries.updateByUserId = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            isDeleted: false,
        }
    });
}

Queries.createPrompt = async (obj) => {
    return await db.create(obj);
}

Queries.requestStatus = async (userId) => {
    let data = await db.findAll({
        where: {
            status: {
                [Op.in]: ['in_progress', 'pending']
            },
            userId,
            isDeleted: false,
        },
        raw: true,
        attributes: ['id', 'status']
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

module.exports = Queries;