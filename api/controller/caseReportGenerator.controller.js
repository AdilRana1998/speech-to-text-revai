const Controller = {}
const { sendStatus } = require('../../utils')
const {
    createCaseTimeLine,
    sendPendingDashboardData,
    startPendingDashboard,
    viewReportData,
    combineJSONDataToGenerateReport,
    sendCombineData,
    startPendingReport,
    downloadReport
} = require('../services/caseReportGenerator.services');

Controller.createCaseTimeLine = async (req, res, next) => {
    const isFirm = req.isFirm;
    const firmId = req.firmId; 
    const groupUsers = req.groupUsers; 
    const caseUuid = req.body?.caseUuid;
    const userId = req.userId;
    const result =  await createCaseTimeLine(isFirm, firmId, caseUuid, groupUsers, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Case-Time-Line", result.statusCode);
}

Controller.getCaseDashboardMap = async (req, res, next) => {
    const result = await sendPendingDashboardData()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Case-Dashboard-Map-Bulk", result.statusCode);
}

Controller.startPendingDashboard = async (req, res, next) => {
    const result = await startPendingDashboard()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-TimeLine-Data-To-OpenAI", result.statusCode);
}

Controller.viewReportData = async (req, res, next) => {
    const groupUsers = req.groupUsers;
    const isFirm = req.isFirm;
    const firmId = req.firmId;
    const caseUuid = req.params.caseUuid;
    const userId = req.userId;
    const result = await viewReportData(groupUsers, isFirm, firmId, caseUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "View-Report-Generate-Data-From-OpenAI", result.statusCode);
}

Controller.combineData = async (req, res, next) => {
    const result = await combineJSONDataToGenerateReport()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Combine-JSON-For-Report", result.statusCode);
}

Controller.sendCombineData = async (req, res, next) => {
    const result = await sendCombineData()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Send-Combine-Data-For-Report", result.statusCode);
}

Controller.startPendingReport = async (req, res, next) => {
    const result = await startPendingReport()
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-Report-Data-To-OpenAI", result.statusCode);
}

Controller.downloadReport = async (req, res, next) => {
    let isGroup = false;
    const groupUsers = req.groupUsers;
    const groupName = req.groupName;
    if (req.isGroup == true && req.query.group == 'true') {
        isGroup = true
    }    
    const reportUuid = req.params.reportUuid;
    const userId = req.userId;
    const result = await downloadReport(isGroup, groupUsers, groupName, reportUuid, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Start-Pending-Report-Data-To-OpenAI", result.statusCode);
}

module.exports = Controller;