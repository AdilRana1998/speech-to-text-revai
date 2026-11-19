const UserServices = require('./users.services')
const UserTypeServices = require('./userTypes.services')
const RoomServices = require('./rooms.services')
const PaymentServices = require('./payments.services');
const PackagesServices = require('./packages.services');
const UserPackagesServices = require('./userPackages.services');
const ForgotPasswordServices = require('./forgot.services');
const CalendarServices = require('./calendar.services');
const ChatGptServices = require('./chatGpt.services');
const CaseFileServices = require('./caseFile.services');
const SampleFileServices = require('./sampleFile.services');
const WriteReportServices = require('./writeReport.services');
const AdminServices = require('./admin.services');
const ActivityLogServices = require('./activityLogs.services');
const OTPServices = require('./otp.services');
const RedLineServices = require('./redLine.services');
const UsersGroupServices = require('./usersGroup.services');
const speechToText = require('./speechToText.services');
const TextFormatterService = require('./textFormatter.services');
const healthCheckService = require('./healthCheck.services');
const realTimeVoiceService = require('./realTimeVoice.services');
const CaseDashboardServices = require('./caseDashboard.services');
const CaseReportGeneratorServices = require('./caseReportGenerator.services');
const KolabryaAnalysisServices = require('./kolabryaAnalysis.services');
const KolabryaVisualsServices = require('./kolabryaVisuals.services');
const CaseInterviewServices = require('./caseInterview.services');
const JsonAssistantServices = require('./jsonAssistant.services');
const CaseDocAssistantServices = require('./caseDocAssistant.services');
const KolabryaGrokServices = require('./kolabryaGrok.services');
const IncCaseFileServices = require('./incCaseFile.services');
const KolabryaMagicLinkServices = require('./kolabryaMagicLink.services');
const DocumentEnhanceServices = require('./documentEnhance.services');
const CaseAssigneeServices = require('./caseAssignees.services');
const CaseIntelligentMapServices = require('./caseIntelligentMap.services');
const CanadianLawServices = require('./canadianLawSource.services');
const OrderBookingServices = require('./orderBooking.services');

module.exports = {
    UserServices,
    UserTypeServices,
    RoomServices,
    PaymentServices,
    PackagesServices,
    UserPackagesServices,
    ForgotPasswordServices,
    CalendarServices,
    ChatGptServices,
    CaseFileServices,
    SampleFileServices,
    WriteReportServices,
    AdminServices,
    ActivityLogServices,
    OTPServices,
    speechToText,
    RedLineServices,
    UsersGroupServices,
    TextFormatterService,
    healthCheckService,
    realTimeVoiceService,
    CaseDashboardServices,
    CaseReportGeneratorServices,
    KolabryaAnalysisServices,
    KolabryaVisualsServices,
    CaseInterviewServices,
    JsonAssistantServices,
    CaseDocAssistantServices,
    KolabryaGrokServices,
    IncCaseFileServices,
    KolabryaMagicLinkServices,
    DocumentEnhanceServices,
    CaseAssigneeServices,
    CaseIntelligentMapServices,
    CanadianLawServices,
    OrderBookingServices
}