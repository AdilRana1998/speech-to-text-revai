const router = require('express').Router();
const { caseDashboard_controller } = require('../../controller');
const middleware = require('../../middlewares');
 
router.post('/case-dashboard-map/add', [middleware.authValidation], caseDashboard_controller.createCaseDashboardMap);
router.get('/case-dashboard-map/get', [middleware.authValidation], caseDashboard_controller.getCaseDashboardMap);
router.post('/case-dashboard-map/combine', [middleware.authValidation], caseDashboard_controller.combineCaseDashboardData);
router.post('/case-dashboard-map/post', [middleware.authValidation], caseDashboard_controller.sendPendingDashboardData);
router.post('/case-dashboard-map/retrive', [middleware.authValidation], caseDashboard_controller.startPendingDashboard);
router.post('/case-dashboard-map/get/:caseUuid', [middleware.authValidation], caseDashboard_controller.viewData);
router.post('/case-dashboard-map/update/combine', [middleware.authValidation], caseDashboard_controller.combineCaseDashboardDataUpdate);
router.post('/case-dashboard-map/report/get/:caseUuid', [middleware.authValidation], caseDashboard_controller.viewReportData);

module.exports = router;