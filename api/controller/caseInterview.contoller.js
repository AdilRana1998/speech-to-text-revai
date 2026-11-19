const Controller = {}
const { sendStatus } = require('../../utils')
const {
    createForm,
    createType,
    getForm,
    createInterview,
    getInterview,
    deleteInterview,
    fetchInterview,
    editInterview,
    startCaseInterviewFileInc,
    runCaseInterviewFileInc,
    postIncPrompt,
    getRoomData,
    caseMeetingFileInc,
    runCaseMeetingFileInc,
    post,
    postFileInc,
    interviewDetails
} = require('../services/caseInterview.services');

Controller.createForm = async (req, res, next) => {
    const data = req.body;
    const result =  await createForm(data);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Interview-Form", result.statusCode);
}

Controller.createType = async (req, res, next) => {
    const data = req.body;
    const result =  await createType(data);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Interview-Type", result.statusCode);
}

Controller.getForm = async (req, res, next) => {
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
    const caseUuid = req.params?.caseUuid;
    const userId = req.userId;
    const groupUsers = req.groupUsers;
    const result =  await getForm(caseUuid, isFirm, firmAssistant, firmUsers, groupUsers, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Interview-Form-By-CaseUuid", result.statusCode);
}

Controller.createInterview = async (req, res, next) => {
    const interviewType = req.body.interviewType;
    const caseData = req.body.fileDetails;
    const interviewRole = req.body.interviewRole;
    const interviewName = req.body.interviewName;
    const interviewGoal = req.body.interviewGoal;
    const interviewQuestion = req.body.interviewQuestion;
    const interviewDate = req.body.interviewDate;
    const interviewLink = req.body.interviewLink;
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmUsers = req.firmUsers;
	const firmId = req.firmId;
    const userId = req.userId;
    const result =  await createInterview(interviewType, caseData, interviewRole, interviewName, interviewGoal, interviewQuestion, interviewDate, interviewLink, isFirm, firmAssistant, firmId, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Interview", result.statusCode);
}

Controller.getInterview = async (req, res, next) => {
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmId = req.firmId;
    const caseUuid = req.params?.caseUuid;
    const userId = req.userId;
    const result =  await getInterview(isFirm, firmId, firmAssistant, caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Interview-Form-By-CaseUuid", result.statusCode);
}

Controller.interviewDetails = async (req, res, next) => {
    const interviewUuid = req.params?.interviewUuid;
    const userId = req.userId;
    const result =  await interviewDetails(interviewUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Interview-Details-By-InterviewUuid", result.statusCode);
}

Controller.deleteInterview = async (req, res, next) => {
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmId = req.firmId;
    const requestUuid = req.body?.requestUuid;
    const caseUuid = req.body?.caseUuid;
    const userId = req.userId;
    const result =  await deleteInterview(isFirm, firmId, firmAssistant, requestUuid, caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Delete-Interview-Form-By-CaseUuid", result.statusCode);
}

Controller.fetchInterview = async (req, res, next) => {
    const requestUuid = req.body?.requestUuid;
    const caseUuid = req.body?.caseUuid;
    const userId = req.userId;
    const result =  await fetchInterview(requestUuid, caseUuid, userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Fectch-Interview-Form-By-CaseUuid-InterviewUuid", result.statusCode);
}

Controller.editInterview = async (req, res, next) => {
    const interviewType = req.body.interviewType;
    const caseData = req.body.fileDetails;
    const interviewRole = req.body.interviewRole;
    const interviewName = req.body.interviewName;
    const interviewGoal = req.body.interviewGoal;
    const interviewQuestion = req.body.interviewQuestion;
    const interviewDate = req.body.interviewDate;
    const joinAt = req.body.joinAt;
    const interviewLink = req.body.interviewLink;
    const requestUuid = req.body?.requestUuid;
    const isFirm = req.isFirm;
	const firmAssistant = req.firmAssistant;
	const firmId = req.firmId;
    const caseUuid = req.body?.caseUuid;
    const userId = req.userId;
    const result =  await editInterview(interviewType, caseData, interviewRole, interviewName, interviewGoal, interviewQuestion, interviewDate, interviewLink, joinAt, requestUuid, caseUuid, userId, isFirm, firmId, firmAssistant);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Edit-Interview-Form-By-CaseUuid-InterviewUuid", result.statusCode);
}


Controller.postIncPrompt = async (req, res, next) => {
    const result =  await postIncPrompt();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Post-Inc-Prompt", result.statusCode);
}

Controller.startCaseInterviewFileInc = async (req, res, next) => {
    const result =  await startCaseInterviewFileInc();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Case-Interview-File-Inc", result.statusCode);
}

Controller.runCaseInterviewFileInc = async (req, res, next) => {
    const result =  await runCaseInterviewFileInc();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Case-Interview-File-Inc", result.statusCode);
}

Controller.getRoomData = async (req, res, next) => {
    const result =  await getRoomData();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Room-Data", result.statusCode);
}

Controller.caseMeetingFileInc = async (req, res, next) => {
    const result =  await caseMeetingFileInc();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Case-Interview-File-Meeting-Inc", result.statusCode);
}

Controller.runCaseMeetingFileInc = async (req, res, next) => {
    const result =  await runCaseMeetingFileInc();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Case-Interview-File-Meeting-Inc", result.statusCode);
}

Controller.post = async (req, res, next) => {
    const result =  await post();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Case-Interview-File-Meeting-Inc", result.statusCode);
}

Controller.postFileInc = async (req, res, next) => {
    const result =  await postFileInc();
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Generate-Pending-Case-Interview-File-Inc", result.statusCode);
}

module.exports = Controller;