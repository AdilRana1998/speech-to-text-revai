const userRoutes = require('./users.routes');
const usersTypeRoutes = require('./usersType.routes');
const roomsRoutes = require('./rooms.routes');
const paymentRoutes = require('./payments.routes');
const packagesRoutes = require('./packages.routes');
const userPackagesRoutes = require('./userPackages.routes');
const forgotPasswordRoutes = require('./forgot.routes');
const agendaRoutes = require('./agenda.routes');
const reportRoutes = require('./report.routes');
const chatGptRoutes = require('./chatGpt.routes');
const interviewObjectivesRoutes = require('./interviewObjectives.routes');
const caseFileRoutes = require('./caseFile.routes');
const sampleFileRoutes = require('./sampleFile.routes');
const writeReportRoutes = require('./writeReport.routes');
const adminRoutes = require('./admin.routes');
const activityLogs = require('./activityLogs.routes');
const otpRoutes = require('./otp.routes');
const speechToText = require('./speechToText.routes');
const redLine = require('./redLine.routes');
const usersGroup = require('./usersGroup.routes');
const textFormatter = require('./textFormatter.routes');
const healthCheck = require('./healthCheck.routes');
const realTimeVoice = require('./realTimeVoice.routes');
const caseDashboard = require('./caseDashboard.routes');
const caseReportGenerator = require('./caseReportGenerator.routes');
const kolabryaAnalysis = require('./kolabryaAnalysis.routes');
const kolabryaVisuals = require('./kolabryaVisuals.routes');
const caseInterview = require('./caseInterview.routes');
const jsonAssistant = require('./jsonAssistant.routes');
const caseDocAssistant = require('./caseDocAssistant.routes');
const kolabryaGrok = require('./kolabryaGrok.routes');
const incCaseFile = require('./incCaseFile.routes');
const kolabryaMagicLink = require('./kolabryaMagicLink.routes');
const documentEnhance = require('./documentEnhance.routes');
const caseAssignees = require('./caseAssignees.routes');
const caseIntelligentMap = require('./caseIntelligentMap.routes');
const canadian_law_source = require('./canadian.routes');
const orderBooking = require('./orderBooking.routes');

module.exports = {
    userRoutes,
    usersTypeRoutes,
    roomsRoutes,
    paymentRoutes,
    packagesRoutes,
    userPackagesRoutes,
    forgotPasswordRoutes,
    agendaRoutes,
    reportRoutes,
    chatGptRoutes,
    interviewObjectivesRoutes,
    caseFileRoutes,
    sampleFileRoutes,
    writeReportRoutes,
    adminRoutes,
    activityLogs,
    otpRoutes,
    speechToText,
    redLine,
    usersGroup,
    textFormatter,
    healthCheck,
    realTimeVoice,
    caseDashboard,
    caseReportGenerator,
    kolabryaAnalysis,
    kolabryaVisuals,
    caseInterview,
    jsonAssistant,
    caseDocAssistant,
    kolabryaGrok,
    incCaseFile,
    kolabryaMagicLink,
    documentEnhance,
    caseAssignees,
    caseIntelligentMap,
    canadian_law_source,
    orderBooking
}
