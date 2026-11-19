const router = require('express').Router();
const { usersGroup_controller } = require('../../controller');
const middleware = require('../../middlewares');

//Group Routes
router.post('/add/group', [middleware.openApi], usersGroup_controller.generateGroup);
router.get('/get/group', [middleware.openApi], usersGroup_controller.getGroup);
router.post('/update/group', [middleware.openApi], usersGroup_controller.updateGroup);

//Company Routes
router.post('/add/company', [middleware.openApi], usersGroup_controller.generateCompany);
router.get('/get/company', [middleware.openApi], usersGroup_controller.getCompany);
router.post('/update/company', [middleware.openApi], usersGroup_controller.updateCompany);


//Assistant
router.post('/add/firm', [middleware.openApi], usersGroup_controller.addFirm);
router.get('/get/firm', [middleware.openApi], usersGroup_controller.getFirm);
router.post('/update/firm', [middleware.openApi], usersGroup_controller.updateFirm);

module.exports = router;