const router = require('express').Router();
const {
    user_controller,
    calendar_controller
} = require('../../controller');
const middleware = require('../../middlewares');
const throttle = require('../../middlewares/throttle');
const { UserServices } = require('../../services');

router.post('/users', [middleware.openApi], user_controller.postUser);
router.post('/users/login', [throttle, middleware.openApi], user_controller.userLogin);


router.get('/users', [middleware.authValidation], user_controller.getAll);
router.post('/chat', [middleware.authValidation], user_controller.chatwithpython);
router.post('/users/refresh-token', [middleware.openApi], user_controller.refreshToken);



module.exports = router;