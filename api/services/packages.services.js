const PackagesServices = {};
const {
    PackagesQueries
} = require('../queries');
const { Strings } = require('../../utils')
PackagesServices.create = async (obj) => {
    await PackagesQueries.create(obj);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {}
    };
}


module.exports = PackagesServices