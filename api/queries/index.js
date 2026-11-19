const UserQueries = require('./User.queries');
const UserTypeQueries = require('./UserType.queries');
const RoomQueries = require('./Rooms.queries');
const PaymentQueries = require('./Payments.queries');
const PackagesQueries = require('./packages.queries');
const UserPackagesQueries = require('./UserPackages.queries');
const WebhookQueries = require('./webhook.queries');
const forgotQueries = require('./forgot.queries')
const RoomKeywordQueries = require('./roomKeywords.queries')
const RoomImagesQueries = require('./roomImages.queries')
const CalendarQueries = require('./calendar.queries')
const MeetingScheduleQueries = require('./meetingSchedule.queries')
const AssistantThreadsQueries = require('./assistantThreads.queries')
const AssistantFilesQueries = require('./assistantFiles.queries')
const InterViewObjectives = require('./interviewObjective.queries')
const CaseNamesQueries = require('./caseNames.queries')
const CaseFilesQueries = require('./caseFiles.queries')
const CaseTypesQueries = require('./caseTypes.queries')
const CaseResponsesQueries = require('./caseResponses.queries')
const SamplePromptsQueries = require('./samplePrompts.queries')
const SampleAttachmentsQueries = require('./sampleAttachments.queries')
const WriteReportQueries = require('./writeReport.queries')
const WriteReportAssistant = require('./writeReportAssistant.queries')
const UserGroupQueries = require('./UserGroup.queries')
const ActivityLogs = require('./activityLogs.queries')
const OTPQueries = require('./otp.queries')
const CaseDashboardQueries = require('./caseDashboard.queries')
const CaseReportGeneratorQueries = require('./caseReportGenerator.queries')
const VectorStoreManagerQueries = require('./vectorStoreManager.queries')
const KolabryaAssistantsQueries = require('./kolabryaAssistants.queries')
const KolabryaVisualsQueries = require('./kolabryaVisuals.queries')
const CaseInterviewQueries = require('./caseInterview.queries')
const JsonAssistantQueries = require('./jsonAssistant.queries')
const SpeechToTextQueries = require('./speechToText.queries')
const CaseDocAssistantQueries = require('./caseDocAssistant.queries')
const KolabryaGrokQueries = require('./kolabryaGrok.queries')
const IncCaseNamesQueries = require('./incCaseNames.queries')
const IncCaseFilesQueries = require('./incCaseFiles.queries')
const KolabryaMagicLinkQueries = require('./kolabryaMagicLink.queries')
const DocumentEnhanceQueries = require('./documentEnhance.queries')
const CaseAssigneesQueries = require('./caseAssignees.queries')
const CaseIntelligentMapQueries = require('./caseIntelligentMap.queries');
const CanadianLawQueries = require('./canadianLawSource.queries');
const OrderBookingQueries = require('./orderBooking.queries');

module.exports = {
    UserQueries,
    UserTypeQueries,
    RoomQueries,
    PaymentQueries,
    PackagesQueries,
    UserPackagesQueries,
    WebhookQueries,
    forgotQueries,
    RoomKeywordQueries,
    RoomImagesQueries,
    CalendarQueries,
    MeetingScheduleQueries,
    AssistantThreadsQueries,
    AssistantFilesQueries,
    InterViewObjectives,
    CaseNamesQueries,
    CaseFilesQueries,
    CaseTypesQueries,
    SamplePromptsQueries,
    SampleAttachmentsQueries,
    CaseResponsesQueries,
    WriteReportQueries,
    WriteReportAssistant,
    ActivityLogs,
    OTPQueries,
    UserGroupQueries,
    CaseDashboardQueries,
    CaseReportGeneratorQueries,
    VectorStoreManagerQueries,
    KolabryaAssistantsQueries,
    KolabryaVisualsQueries,
    CaseInterviewQueries,
    JsonAssistantQueries,
    SpeechToTextQueries,
    CaseDocAssistantQueries,
    KolabryaGrokQueries,
    IncCaseNamesQueries,
    IncCaseFilesQueries,
    KolabryaMagicLinkQueries,
    DocumentEnhanceQueries,
    CaseAssigneesQueries,
    CaseIntelligentMapQueries,
    CanadianLawQueries,
    OrderBookingQueries
}