const WebhookQueries = {};
const db = require('../model').webhook;

WebhookQueries.create = async (obj) => {
    return await db.create(obj);
}

module.exports = WebhookQueries