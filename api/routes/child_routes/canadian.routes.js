const router = require('express').Router();
const {
    canadian_law_source_controller,
} = require('../../controller');
const middleware = require('../../middlewares');

router.post('/canadian-law-source/create', [middleware.authValidation], canadian_law_source_controller.createNewPrompt);
router.get('/canadian-law-source/chat-history', [middleware.authValidation], canadian_law_source_controller.getChatHistory);
router.get('/canadian-law-source/request-status', [middleware.authValidation], canadian_law_source_controller.getRequestStatus);
router.get('/canadian-law-source/process-request', [middleware.authValidation], canadian_law_source_controller.processRequest);
router.post('/canadian-law-source/clear-out', [middleware.authValidation], canadian_law_source_controller.clearOut);

module.exports = router;