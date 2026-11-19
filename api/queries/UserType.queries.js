const UserTypeQueries = {};
const db = require('../model').users_types;

UserTypeQueries.getAll = async (obj, email) => {
    return await db.findAll({});
}

module.exports = UserTypeQueries