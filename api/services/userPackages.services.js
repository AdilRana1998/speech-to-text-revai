const UserTypeServices = {};
const {
    UserPackagesQueries
} = require('../queries');
const { Strings } = require('../../utils')
UserTypeServices.getAll = async () => {
    const result = await UserPackagesQueries.getAll();
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserTypeServices.getAllUserPackages = async (userId) => {
    const result = await UserPackagesQueries.getAllUserPackages(userId);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserTypeServices.getUserActivePackage = async (userId) => {
    const result = await UserPackagesQueries.getUserActivePackage(userId);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserTypeServices.create = async (obj, userId) => {
    const userPackages = await UserPackagesQueries.getAllUserPackages(userId);
    if(userPackages.length > 0){
        await UserPackagesQueries.updateUserIsActiveToFalse({ isActive: false }, userId)
    }
    const result = await UserPackagesQueries.create({ packageId: obj.packageId, userId: userId });
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

module.exports = UserTypeServices