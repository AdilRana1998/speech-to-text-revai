const UserPackagesQueries = {};
const model = require('../model');
const db = model.userPackages;
const Packages = model.packages;

const package_attribute_1 = ['packageId', 'plan', 'hours']

UserPackagesQueries.getAll = async () => {
    return await db.findAll({});
}

UserPackagesQueries.getAllUserPackages = async (userId) => {
    return await db.findAll({
        where: {
            userId: userId
        }
    });
}

UserPackagesQueries.getUserActivePackage = async (userId) => {
    return await db.findAll({
        where: {
            userId: userId,
            isActive: true,
        },
        include: {
            model: Packages,
            as: 'packageInfo',
            attributes: package_attribute_1
        }
    });
}


UserPackagesQueries.updateUserIsActiveToFalse = async (obj, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId
        }
    });
}

UserPackagesQueries.create = async (obj) => {
    return await db.create(obj);
}

module.exports = UserPackagesQueries