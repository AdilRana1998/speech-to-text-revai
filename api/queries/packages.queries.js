const Packages = {};
const db = require('../model').packages;
const attributes_1 = ['packageId', 'plan', 'name', 'price', 'currency', 'stripeId', 'buttonText', 'expiry', 'description']

Packages.getAll = async () => {
    return await db.findAll({
        attributes: attributes_1
    });
}

Packages.getProductById = async (stripeId) => {
    return await db.findAll({
        where: {
            stripeId: stripeId
        },
        attributes: attributes_1,
        raw: true
    });
}

Packages.create = async (obj) => {
    return await db.create(obj);
}

Packages.update = async (obj, stripeId) => {
    return await db.update(obj, {
        where: {
            stripeId: stripeId
        }
    });
}

module.exports = Packages;