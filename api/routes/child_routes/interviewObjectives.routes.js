const router = require('express').Router();
const { interview_objectives_controller } = require('../../controller');
const middleware = require('../../middlewares');

router.post('/interview/add-objectives', [middleware.authValidation], interview_objectives_controller.addobjectives);
router.get('/interview/get-objectives/:botId', [middleware.authValidation], interview_objectives_controller.roomobjectives);
router.get('/interview/get-objectives', [middleware.authValidation], interview_objectives_controller.roomallobjectives);
router.post('/interview/delete-objectives', [middleware.authValidation], interview_objectives_controller.deleteobjectives);
router.post('/interview/update-objectives', [middleware.authValidation], interview_objectives_controller.updateobjectives);

module.exports = router;


 