const Controller = {}
const { sendStatus } = require('../../utils')
const {
    sendMagicLink,
    verifyLink
} = require('../services/kolabryaMagicLink.services');

Controller.sendMagicLink = async (req, res, next) => {
    const email = req.body?.email;
    const result =  await sendMagicLink(email);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Send-Magic-Link", result.statusCode);
}

Controller.verifyLink = async (req, res, next) => {
    const userUuid = req.params.userUuid;
    const caseUuid = req.params.caseUuid;
    const linkUuid = req.params.linkUuid;
    const result =  await verifyLink(userUuid, caseUuid, linkUuid);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Send-Verify-Link", result.statusCode);
}

module.exports = Controller;