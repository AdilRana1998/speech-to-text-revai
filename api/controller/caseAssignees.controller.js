const Controller = {}
const { sendStatus } = require('../../utils')
const {
	assign,
	listFirmCasesGrouped,
	deleteAssignedCaseFile,
	editAssignedCase,
	fetchAssigneeCase,
	fetchOnlyCaseAssignee,
	unassign
} = require('../services/caseAssignees.services');

Controller.assign = async (req, res, next) => {
	const caseUuid = req.body?.caseUuid;
	const userEmails = req.body?.userEmails;
	const firmId = req.firmId;
	const isFirm = req.isFirm;
	const userId = req.userId;
	const result = await assign(caseUuid, userEmails, firmId, isFirm, userId);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Assistant-Assign-Case", result.statusCode);
}

Controller.assignedCases = async (req, res, next) => {
	const isFirm = req.isFirm;
	const firmUsers = req.firmUsers;
	const firmAssistant = req.firmAssistant;
	const userId = req.userId;
	const result = await listFirmCasesGrouped(isFirm, firmUsers, firmAssistant, userId);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Assistant-Assigned-Cases", result.statusCode);
}

Controller.deleteAssignedCaseFile = async (req, res, next) => {
	const caseUuid = req.body?.caseUuid;
	const fileUuid = req.body?.fileUuid;
	const isFirm = req.isFirm;
	const firmUsers = req.firmUsers;
	const userType = req.userType;
	const firmAssistant = req.firmAssistant;
	const userId = req.userId;
	const result = await deleteAssignedCaseFile(caseUuid, fileUuid, isFirm, firmUsers, userType, firmAssistant, userId);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Assistant-Assigned-Cases-File", result.statusCode);
}

Controller.editAssignedCase = async (req, res, next) => {
	const caseName = req.body?.caseName;
    const caseSummary = req.body?.caseSummary;
    const caseDoc = req.files?.caseFiles;
    const caseAudio = req.files?.caseAudio;
    const caseQueries = req.body?.caseQueries;
    const casefilesData = req.body?.casefilesData;
    const assignees = req.body?.assignees;
    const caseUuid = req.params.caseUuid;
	const userType = req.userType;
	const firmId = req.firmId;
	const isFirm = req.isFirm;
	const firmUsers = req.firmUsers;
	const firmAssistant = req.firmAssistant;
	const userId = req.userId;
	const result = await editAssignedCase(caseName, caseSummary, caseDoc, caseAudio, caseQueries, casefilesData, caseUuid, userId, assignees, firmId, isFirm, userType, firmUsers, firmAssistant);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update/Edit-Assigned-Cases-By-Assistant", result.statusCode);
}

Controller.getCase = async (req, res, next) => {
	const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
	const userId = req.userId;
	const result = await fetchAssigneeCase(isFirm, firmAssistant, firmUsers, userId)
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Assigness-Active-Cases", result.statusCode);
}

Controller.getOnlyCase = async (req, res, next) => {
	const caseUuid = req.params.caseUuid;
	const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
	const userId = req.userId;
	const result = await fetchOnlyCaseAssignee(caseUuid, isFirm, firmAssistant, firmUsers, userId)
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Assigness-User-Only-Active-Cases", result.statusCode);
}

Controller.unassign = async (req, res, next) => {
	const caseUuid = req.body?.caseUuid;
	const email = req.body?.email;
	const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
	const userId = req.userId;
	const result = await unassign(caseUuid, email, isFirm, firmAssistant, firmUsers, userId);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Assistant-Unassign-Case", result.statusCode);
}

Controller.assignees = async (req, res, next) => {
	const caseUuid = req.params?.caseUuid;
	const result = await listAssignees(caseUuid);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Assistant-Case-Assignees", result.statusCode);
}

module.exports = Controller;