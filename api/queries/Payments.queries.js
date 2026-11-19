const Payments = {};
const db = require('../model').payments

const attributes_1 = ['paymentsId', 'stripeProductId']

Payments.getAll = async () => {
    return await db.findAll({});
}

Payments.getPayment = async (id) => {
    return await db.findAll({
        where: {
            stripeCheckoutId: id
        },
        attributes: attributes_1,
        raw: true
    })
}

Payments.create = async (obj) => {
    return await db.create(obj);
}

Payments.update = async (obj, id) => {
    return await db.update(obj, {
        where: {
            stripeCheckoutId: id
        }
    });
}

module.exports = Payments;