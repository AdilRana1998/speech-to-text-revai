const router = require('express').Router();
const {
    agenda_controller,
} = require('../../controller');
const middleware = require('../../middlewares');

router.post('/agenda/sync-calender-email', [middleware.authValidation], agenda_controller.syncEmail);
router.post('/agenda/add-agenda', [middleware.authValidation], agenda_controller.addAgenda);
router.post('/agenda/redirect', [middleware.authValidation], agenda_controller.roomRedirect);

module.exports = router;


