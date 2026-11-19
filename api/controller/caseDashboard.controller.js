const Controller = {}
const { sendStatus } = require('../../utils')
const {
    createCaseDashboardMap,
    getCaseDashboardMap,
    combineCaseDashboardData,
    getPendingDashboardData,
    sendPendingDashboardData,
    startPendingDashboard,
    viewData,
    getPendingDashboardDataUpdate,
    runFailedDashboardData,
    viewReportData
} = require('../services/caseDashboard.services');

Controller.createCaseDashboardMap = async (req, res, next) => {
    const data = req.body;
    const result =  await createCaseDashboardMap(data);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Case-Dashboard-Map-Bulk", result.statusCode);
}

Controller.getCaseDashboardMap = async (req, res, next) => {
    const result = await getCaseDashboardMap()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Case-Dashboard-Map-Bulk", result.statusCode);
}

Controller.combineCaseDashboardData = async (req, res, next) => {
    const result = await getPendingDashboardData()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Combine-Case-Dashboard-Data", result.statusCode);
}

Controller.sendPendingDashboardData = async (req, res, next) => {
    const result = await sendPendingDashboardData()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Send-Pending-Dashboard-Data-To-OpenAI", result.statusCode);
}

Controller.startPendingDashboard = async (req, res, next) => {
    const result = await startPendingDashboard()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-Dashboard-Data-To-OpenAI", result.statusCode);
}

Controller.viewData = async (req, res, next) => {
    let isGroup = false;
    const groupUsers = req.groupUsers;
    const groupName = req.groupName;
    if (req.isGroup == true && req.query.group == 'true') {
        isGroup = true
    }
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
	const firmId = req.firmId;    
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const result = await viewData(isGroup, groupUsers, isFirm, firmId, caseUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "View-Dashboard-Data-From-OpenAI", result.statusCode);
}

Controller.combineCaseDashboardDataUpdate = async (req, res, next) => {
    const result = await getPendingDashboardDataUpdate()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Combine-Case-Dashboard-Data-On-Update", result.statusCode);
}

Controller.viewReportData = async (req, res, next) => {
    let isGroup = false;
    const groupUsers = req.groupUsers;
    if (req.isGroup == true && req.query.group == 'true') {
        isGroup = true
    }
    const isFirm = req.isFirm;
    const firmId = req.firmId;    
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const result = await viewReportData(isGroup, groupUsers, isFirm, firmId, caseUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "View-Report-Generate-Data-From-OpenAI", result.statusCode);
}

module.exports = Controller;