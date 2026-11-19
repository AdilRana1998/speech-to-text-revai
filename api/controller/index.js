const user_controller = require('./users.controller');
const agenda_controller = require('./agenda.controller');
const users_types_controller = require('./users_types.controller');
const rooms_controller = require('./rooms.controller');
const payment_controller = require('./payments.controller')
const packages_controller = require('./packages.controller')
const user_packages_controller = require('./userPackages.controller')
const forgot_controller = require('./forgot.controller');
const report_controller = require('./report.controller');
const calendar_controller = require('./calendar.controller');
const chatgpt_controller = require('./chatGpt.controller');
const interview_objectives_controller = require('./interviewObjectives.controller');
const caseFile_controller = require('./caseFile.controller');
const sampleFile_controller = require('./sampleFile.controller');
const writeReport_controller = require('./writeReport.controller');
const admin_controller = require('./admin.controller');
const activityLogs_controller = require('./activityLogs.controller');
const otp_controller = require('./otp.controller');
const speechToText = require('./speechToText.controller');
const redLine_controller = require('./redLine.controller');
const usersGroup_controller = require('./usersGroup.controller');
const textFormatter_controller = require('./textFormatter.controller');
const healthCheck_controller = require('./healthCheck.controller');
const realTimeVoice_controller = require('./realTimeVoice.controller');
const caseDashboard_controller = require('./caseDashboard.controller');
const caseReport_controller = require('./caseReportGenerator.controller');
const kolabryaAnalysis_controller = require('./kolabryaAnalysis.controller');
const kolabryaVisuals_controller = require('./kolabryaVisuals.controller');
const caseInterview_controller = require('./caseInterview.contoller');
const jsonAssistant_controller = require('./jsonAssistant.controller');
const caseDocAssistant_controller = require('./caseDocAssistant.controller');
const kolabryaGrok_controller = require('./kolabryaGrok.controller');
const incCaseFile_controller = require('./incCaseFile.controller');
const kolabryaMagicLink_controller = require('./kolabryaMagicLink.controller');
const documentEnhance_controller = require('./documentEnhance.controller');
const caseAssignees_controller = require('./caseAssignees.controller');
const caseIntelligentMap_controller = require('./caseIntelligentMap.controller');
const canadian_law_source_controller = require('./canadianLawSource.controller');
const orderBooking_controller = require('./orderBooking.controller');

module.exports = {
    agenda_controller,
    user_controller,
    users_types_controller,
    rooms_controller,
    payment_controller,
    packages_controller,
    user_packages_controller,
    forgot_controller,
    report_controller,
    calendar_controller,
    chatgpt_controller,
    interview_objectives_controller,
    caseFile_controller,
    sampleFile_controller,
    writeReport_controller,
    admin_controller,
    activityLogs_controller,
    otp_controller,
    speechToText,
    redLine_controller,
    usersGroup_controller,
    textFormatter_controller,
    healthCheck_controller,
    realTimeVoice_controller,
    caseDashboard_controller,
    caseReport_controller,
    kolabryaAnalysis_controller,
    kolabryaVisuals_controller,
    caseInterview_controller,
    jsonAssistant_controller,
    caseDocAssistant_controller,
    kolabryaGrok_controller,
    incCaseFile_controller,
    kolabryaMagicLink_controller,
    documentEnhance_controller,
    caseAssignees_controller,
    caseIntelligentMap_controller,
    canadian_law_source_controller,
    orderBooking_controller
}
