const router = require('express').Router();
const { kolabryaMagicLink_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
// router.post('/kolabrya/send-magic-link', [middleware.openApi], kolabryaMagicLink_controller.sendMagicLink);
// router.post('/kolabrya/verify-link/:userUuid/:caseUuid/:linkUuid', [middleware.openApi], kolabryaMagicLink_controller.verifyLink);

module.exports = router;