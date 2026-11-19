const UserTypeServices = {};
const {
    UserTypeQueries
} = require('../queries')
const { Strings } = require('../../utils');
UserTypeServices.getAllUserTypes = async () => {
    const result = await UserTypeQueries.getAll();
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserTypeServices.getUserType = () => {

}

module.exports = UserTypeServices