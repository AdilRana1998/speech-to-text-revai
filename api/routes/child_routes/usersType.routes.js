const router = require('express').Router();
const {
    users_types_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.get('/usersType',[middleware.authValidation],users_types_controller.getAll);

module.exports = router;