const Queries = {};
const db = require('../model').forgotPassword;
const attributes_1 = ['forgotId', 'email']

Queries.create = async (obj) => {
    return await db.create(obj)
}

Queries.getEntry = async (obj, isUsed = false) => {
    return await db.findAll({
        where: {
            forgotUuid: obj.id,
            isUsed: isUsed
        },
        attributes: attributes_1,
        raw: true
    });
}

Queries.update = async (obj, id) => {
    return await db.update(obj, {
        where: {
            forgotUuid: id
        }
    });
}

module.exports = Queries;