const { Sequelize, DataTypes, QueryTypes, Op } = require('sequelize');
const { Jsons } = require('../../utils')
const {
    database
} = require('../../config');
const sequelize = new Sequelize(database.name, database.user, database.password, {
    host: database.host,
    dialect: database.driver,
    pool: {
        max: 100,
        min: 10,
        idle: 10000
    },
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    define: {
        freezeTableName: true
    },
    //timezone: '-04:00',
    logging: false,
    // logging: (sql, { bind }) => {
    //     console.log(`SQL: ${sql}`); 
    //     console.log('Parameters:', bind);
    // },
});
const forceVal = false
//sequelizer tutorial : https://www.youtube.com/watch?v=9D28zQVh7Uk&list=PLolI8AY2AS9YO1kf0i_ui5_sKtxZg-yiR&index=19

//init queryInterface;
const queryInterface = sequelize.getQueryInterface();

const queryInterfaceFunc = async () => {
    // await queryInterface.addColumn('users', 'groupId', {
    //     type: DataTypes.INTEGER,
    //     allowNull: true,
    // });
}

const createView = () => {
    // const cardView = db.sequelize.query(`CREATE OR REPLACE VIEW cards AS
    //     select * from vehicles where user_id = 1;
    // ;`);
}

sequelize.authenticate().then(() => {
    console.log("Connected");
}).catch(e => {
    console.log("Error ", e.message);
})

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.op = Op;
db.queryType = QueryTypes;

const setAssociation = async () => {
    try {
        var res_usersTypes = await db.users_types.findAll({});
        if (res_usersTypes.length === 0) {
            await db.users_types.bulkCreate((await Jsons.database()).userType);
        }
        await db.users.bulkCreate((await Jsons.database()).users)
        await db.packages.bulkCreate(((await Jsons.database()).products));
    } catch (e) {
        console.log(e.message)
    }

}

db.sequelize.sync({ force: forceVal })
    .then(() => {
        if (forceVal) {
            console.log('yes re-sync');
            setAssociation();
        }

    })
    .catch(e => {
        console.log("syncError", e.message);
    })

db.users = require('./users.model')(sequelize, DataTypes);
db.users_types = require('./usersType.model')(sequelize, DataTypes);
db.forgotPassword = require('./forgotPassword.model')(sequelize, DataTypes);
db.payments = require('./payments.model')(sequelize, DataTypes);
db.rooms = require('./rooms.model')(sequelize, DataTypes);
db.packages = require('./packages.model')(sequelize, DataTypes);
db.userPackages = require('./userPackages')(sequelize, DataTypes);
db.webhook = require('./webhook.model')(sequelize, DataTypes);
db.prompts = require('./prompts.model')(sequelize, DataTypes);
db.roomKeywords = require('./roomKeywords.model')(sequelize, DataTypes);
db.roomImages = require('./roomImages.model')(sequelize, DataTypes);
db.calendarEvents = require('./calendarEvents.model')(sequelize, DataTypes);
db.meetingSchedule = require('./meetingSchedule.model')(sequelize, DataTypes);
db.assistantThreads = require('./AssistantThreads.model')(sequelize, DataTypes);
db.assistantFiles = require('./AssistantFiles.model')(sequelize, DataTypes);
db.interViewObjective = require('./interViewObjective.model')(sequelize, DataTypes);
db.caseNames = require('./caseNames.model')(sequelize, DataTypes); 
db.caseFiles = require('./caseFiles.model')(sequelize, DataTypes);
db.caseFileTypes = require('./caseFileTypes.model')(sequelize, DataTypes);
db.caseResponses = require('./caseResponses.model')(sequelize, DataTypes);
db.caseTypes = require('./caseTypes.model')(sequelize, DataTypes);
db.samplePrompts = require('./samplePrompts.model')(sequelize, DataTypes);
db.sampleAttachments = require('./sampleAttachments.model')(sequelize, DataTypes);
db.activityLogs = require('./activityLogs.model')(sequelize, DataTypes); 
db.activityTypes = require('./activityTypes.model')(sequelize, DataTypes); 
db.otp = require('./otp.model')(sequelize, DataTypes);
db.writeReport = require('./writeReport.model')(sequelize, DataTypes); 
db.writeReportAssistant = require('./writeReportAssistant.model')(sequelize, DataTypes); 
db.caseIntakeQueries = require('./caseIntakeQueries.model')(sequelize, DataTypes); 
db.caseIntakeQueriesTitles = require('./caseIntakeQueriesTitles.model')(sequelize, DataTypes); 
db.caseIntakeAnswers = require('./caseIntakeAnswers.model')(sequelize, DataTypes); 
db.caseDashboard = require('./caseDashboard.model')(sequelize, DataTypes); 
db.caseDashboardMap = require('./caseDashboardMap.model')(sequelize, DataTypes); 
db.userGroup = require('./userGroup.model')(sequelize, DataTypes); 
db.caseReportTimeline = require('./caseReportTimeline.model')(sequelize, DataTypes); 
db.caseReportGenerator = require('./caseReportGenerator.model')(sequelize, DataTypes); 
db.vectorStoreManager = require('./vectorStoreManager.model')(sequelize, DataTypes);
db.kolabryaAssistants = require('./kolabryaAssistants.model')(sequelize, DataTypes); 
db.kolabryaFeatures = require('./kolabryaFeatures.model')(sequelize, DataTypes);
db.caseInterviewForm = require('./caseInterviewForm.model')(sequelize, DataTypes); 
db.caseInterviewTypes = require('./caseInterviewTypes.model')(sequelize, DataTypes); 
db.caseInterviewDetails = require('./caseInterviewDetails.model')(sequelize, DataTypes); 
db.caseInterviewInc = require('./caseInterviewInc.model')(sequelize, DataTypes); 
db.caseInterviewFileMeetingInc = require('./caseInterviewFileMeetingInc.model')(sequelize, DataTypes); 
db.jsonAssistant = require('./jsonAssistant.model')(sequelize, DataTypes);
db.company = require('./company.model')(sequelize, DataTypes);
db.companyOwner = require('./companyOwners.model')(sequelize, DataTypes);
db.speechToText = require('./speechToText.model.js')(sequelize, DataTypes);
db.caseDocAssistant = require('./caseDocAssistant.model.js')(sequelize, DataTypes);
db.grokThreads = require('./grokThreads.model')(sequelize, DataTypes);
db.grokFiles = require('./grokFiles.model')(sequelize, DataTypes);
db.grokThreadsHistory = require('./grokThreadsHistory.model')(sequelize, DataTypes);
db.incCaseTypes = require('./IncCaseTypes.model.js')(sequelize, DataTypes);
db.incCaseNames = require('./IncCaseNames.model.js')(sequelize, DataTypes);
db.incCaseTypeTortMatter = require('./IncCaseTypeTortMatter.model.js')(sequelize, DataTypes);
db.incCaseTypeABMatter = require('./IncCaseTypeABMatter.model.js')(sequelize, DataTypes);
db.incCaseFiles = require('./incCaseFiles.model.js')(sequelize, DataTypes);
db.incCaseReports = require('./incCaseReports.model.js')(sequelize, DataTypes);
db.incCaseFilesReportMapping = require('./incCaseFilesReportMapping.model.js')(sequelize, DataTypes);
db.incCaseMediationReport = require('./IncCaseMediationReport.model.js')(sequelize, DataTypes);
db.incCaseSummaryReport = require('./IncCaseSummaryReport.model.js')(sequelize, DataTypes);
db.incCaseVectorStoreManager = require('./IncCaseVectorStoreManager.model.js')(sequelize, DataTypes);
db.magicLink = require('./magicLink.model.js')(sequelize, DataTypes);
db.documentEnhance = require('./documentEnhance.model.js')(sequelize, DataTypes);
db.firmAssistant = require('./firmAssistant.model.js')(sequelize, DataTypes);
db.caseAssignees = require('./caseAssignees.model')(sequelize, DataTypes);
db.incCaseSettlementReport = require('./IncCaseSettlementReport.model.js')(sequelize, DataTypes);
db.incCaseInjuryTracking = require('./IncCaseInjuryTracking.model.js')(sequelize, DataTypes);
db.openAIPrompts = require('./openAIPrompts.model.js')(sequelize, DataTypes);
db.intelligentMap = require('./intelligentMap.model.js')(sequelize, DataTypes);
db.canadianLawSource = require('./canadianLawSource.model.js')(sequelize, DataTypes);
db.incCaseReportSummary = require('./incCaseReportSummary.model.js')(sequelize, DataTypes);
db.incCaseReportSummaryDownloadManager = require('./IncCaseReportSummaryDownloadManger.model.js')(sequelize, DataTypes);
db.incCaseReportSection = require('./IncCaseReportSection.model.js')(sequelize, DataTypes);
db.incCaseResponses = require('./IncCaseResponses.model.js')(sequelize, DataTypes);
db.incCaseSavedPrompt = require('./IncCaseSavedPrompt.model.js')(sequelize, DataTypes);
db.incCaseShares = require('./IncCaseShares.model.js')(sequelize, DataTypes);
db.incCaseMedicalInjuryReport = require('./IncCaseMedicalInjuryReport.model.js')(sequelize, DataTypes);
db.externalDocBatches = require('./externalDocBatches.model.js')(sequelize, DataTypes);
db.externalDocFiles = require('./externalDocFiles.model.js')(sequelize, DataTypes);
db.externalDocQueries = require('./externalDocQueries.model.js')(sequelize, DataTypes);
db.externalDocVectorStoreManager = require('./externalDocVectorStoreManager.model.js')(sequelize, DataTypes);
db.incCaseSavedPromptTypes = require('./IncCaseSavedPromptTypes.model.js')(sequelize, DataTypes);
db.orderBooking = require('./orderBooking.model.js')(sequelize, DataTypes);
db.orderBookingItems = require('./orderBookingItems.model.js')(sequelize, DataTypes);

// User x userType Relationship
db.users_types.hasMany(db.users, { foreignKey: 'userTypeId', as: 'users' });
db.users.belongsTo(db.users_types, { foreignKey: 'userTypeId', as: 'userTypeInfo' });

// User x payment Relationship
db.users.hasMany(db.payments, { foreignKey: 'userId', as: 'userPayments' });
db.payments.belongsTo(db.users, { foreignKey: 'userId', as: 'userInfo' });

// User x Rooms Relationship
db.users.hasMany(db.rooms, { foreignKey: 'userId', as: 'userRooms' });
db.rooms.belongsTo(db.users, { foreignKey: 'userId', as: 'userInfo' });

// Room x keywords Relationship
db.rooms.hasMany(db.roomKeywords, { foreignKey: 'roomId', as: 'roomKeywords' });
db.roomKeywords.belongsTo(db.rooms, { foreignKey: 'roomId', as: 'roomInfo' });

// User x UserPackages Relationship
db.users.hasMany(db.userPackages, { foreignKey: 'userId', as: 'userPackages' });
db.userPackages.belongsTo(db.users, { foreignKey: 'userId', as: 'userInfo' });

// Package x UserPackages Relationship
db.packages.hasMany(db.userPackages, { foreignKey: 'packageId', as: 'userPackages' });
db.userPackages.belongsTo(db.packages, { foreignKey: 'packageId', as: 'packageInfo' });

db.caseNames.hasMany(db.caseFiles, { foreignKey: 'caseId', as: 'caseDetails' });
db.caseFiles.belongsTo(db.caseNames, { foreignKey: 'caseId', as: 'filesInfo' });

db.caseFileTypes.hasMany(db.caseFiles, { foreignKey: 'fileTypeId', as: 'fileTypeDetails' });
db.caseFiles.belongsTo(db.caseFileTypes, { foreignKey: 'fileTypeId', as: 'filesTypeInfo' });

db.caseNames.hasMany(db.caseResponses, { foreignKey: 'caseId', as: 'caseResponses' });
db.caseResponses.belongsTo(db.caseNames, { foreignKey: 'caseId', as: 'caseResponsesInfo' });

db.samplePrompts.hasMany(db.sampleAttachments, { foreignKey: 'sampleId', as: 'promptDetails' });
db.sampleAttachments.belongsTo(db.samplePrompts, { foreignKey: 'sampleId', as: 'attachmentsInfo' });

db.activityTypes.hasMany(db.activityLogs, { foreignKey: 'activityType', as: 'activityDetails' });
db.activityLogs.belongsTo(db.activityTypes, { foreignKey: 'activityType', as: 'activityInfo' });

db.userGroup.hasMany(db.users, { foreignKey: 'groupId', as: 'groupDetails' });
db.users.belongsTo(db.userGroup, { foreignKey: 'groupId', as: 'groupInfo' });

db.caseNames.hasMany(db.caseIntakeAnswers, { foreignKey: 'caseId', as: 'caseIntakeAnswersDetails' });
db.caseIntakeAnswers.belongsTo(db.caseNames, { foreignKey: 'caseId', as: 'caseIntakeAnswersInfo' });

db.caseIntakeQueries.hasMany(db.caseIntakeAnswers, { foreignKey: 'queryId', as: 'caseIntakeQueriesDetails' });
db.caseIntakeAnswers.belongsTo(db.caseIntakeQueries, { foreignKey: 'queryId', as: 'caseIntakeQueriesInfo' });

db.caseIntakeQueriesTitles.hasMany(db.caseIntakeQueries, { foreignKey: 'titleId', as: 'caseIntakeQueriesTitlesDetails' });
db.caseIntakeQueries.belongsTo(db.caseIntakeQueriesTitles, { foreignKey: 'titleId', as: 'caseIntakeQueriesTitles' });

db.caseDashboardMap.hasMany(db.caseDashboard, { foreignKey: 'mapId', as: 'caseDashboardDetails' });
db.caseDashboard.belongsTo(db.caseDashboardMap, { foreignKey: 'mapId', as: 'caseDashboardInfo' });

db.caseNames.hasMany(db.caseDashboard, { foreignKey: 'caseId', as: 'caseMappingDetails' });
db.caseDashboard.belongsTo(db.caseNames, { foreignKey: 'caseId', as: 'caseMappingAnswersInfo' });

db.caseReportTimeline.hasMany(db.caseReportGenerator, { foreignKey: 'timeLineId', as: 'caseReportGeneratorDetails' });
db.caseReportGenerator.belongsTo(db.caseReportTimeline, { foreignKey: 'timeLineId', as: 'caseReportGeneratorInfo' });

db.vectorStoreManager.hasMany(db.caseFiles, { foreignKey: 'vectorId', as: 'vectorDetails' });
db.caseFiles.belongsTo(db.vectorStoreManager, { foreignKey: 'vectorId', as: 'vectorInfo' });

db.kolabryaFeatures.hasMany(db.kolabryaAssistants, { foreignKey: 'featureType', as: 'featureTypeDetails' });
db.kolabryaAssistants.belongsTo(db.kolabryaFeatures, { foreignKey: 'featureType', as: 'featureTypeInfo' });

db.caseInterviewForm.hasMany(db.caseInterviewTypes, { foreignKey: 'interviewType', as: 'interviewTypeDetails' });
db.caseInterviewTypes.belongsTo(db.caseInterviewForm, { foreignKey: 'interviewType', as: 'interviewTypeInfo' });

db.caseNames.hasMany(db.caseInterviewDetails, { foreignKey: 'caseId', as: 'caseInterviewDetails' });
db.caseInterviewDetails.belongsTo(db.caseNames, { foreignKey: 'caseId', as: 'caseInterviewInfo' });

db.caseInterviewTypes.hasMany(db.caseInterviewDetails, { foreignKey: 'interviewType', as: 'interviewTypeDetails' });
db.caseInterviewDetails.belongsTo(db.caseInterviewTypes, { foreignKey: 'interviewType', as: 'interviewTypeInfo' });

db.caseInterviewDetails.hasMany(db.caseInterviewInc, { foreignKey: 'interviewId', as: 'interviewIdDetails' });
db.caseInterviewInc.belongsTo(db.caseInterviewDetails, { foreignKey: 'interviewId', as: 'interviewIdInfo' });

db.caseInterviewInc.hasMany(db.caseInterviewFileMeetingInc, { foreignKey: 'interviewIncId', as: 'interviewIncIdDetails' });
db.caseInterviewFileMeetingInc.belongsTo(db.caseInterviewInc, { foreignKey: 'interviewIncId', as: 'interviewIncIdInfo' });

db.rooms.hasMany(db.caseInterviewFileMeetingInc, { foreignKey: 'roomId', as: 'roomIdDetails' });
db.caseInterviewFileMeetingInc.belongsTo(db.rooms, { foreignKey: 'roomId', as: 'roomIdInfo' });

db.caseInterviewDetails.hasMany(db.rooms, { foreignKey: 'interviewId', as: 'interviewroomDetails' });
db.rooms.belongsTo(db.caseInterviewDetails, { foreignKey: 'interviewId', as: 'interviewroomInfo' });

db.company.hasMany(db.users, { foreignKey: 'companyId', as: 'companyUsersDetails' });
db.users.belongsTo(db.company, { foreignKey: 'companyId', as: 'companyUsersInfo' });

db.company.hasMany(db.companyOwner, { foreignKey: 'companyId', as: 'companyOwnerDetails' });
db.companyOwner.belongsTo(db.company, { foreignKey: 'companyId', as: 'companyOwnerInfo' });

db.companyOwner.hasMany(db.users, { foreignKey: 'userId', as: 'userOwnerDetails' });
db.users.belongsTo(db.companyOwner, { foreignKey: 'userId', as: 'userOwnerInfo' });

db.caseFiles.hasMany(db.caseDocAssistant, { foreignKey: 'fileId', as: 'fileIdDetails' });
db.caseDocAssistant.belongsTo(db.caseFiles, { foreignKey: 'fileId', as: 'fileIdInfo' });

db.grokThreads.hasMany(db.grokFiles, { foreignKey: 'grokThreadId', as: 'grokFilesDetails' });
db.grokFiles.belongsTo(db.grokThreads, { foreignKey: 'grokThreadId', as: 'grokFilesInfo' });

db.grokThreadsHistory.hasMany(db.grokThreads, { foreignKey: 'grokThreadHistoryId', as: 'grokThreadsHistoryDetails' });
db.grokThreads.belongsTo(db.grokThreadsHistory, { foreignKey: 'grokThreadHistoryId', as: 'grokThreadsHistoryInfo' });

db.writeReport.hasMany(db.writeReportAssistant, { foreignKey: 'summaryId', as: 'summaryDetails' });
db.writeReportAssistant.belongsTo(db.writeReport, { foreignKey: 'summaryId', as: 'summaryInfo' });

db.caseFiles.hasMany(db.writeReportAssistant, { foreignKey: 'fileId', as: 'summaryFileIdDetails' });
db.writeReportAssistant.belongsTo(db.caseFiles, { foreignKey: 'fileId', as: 'summaryFileIdInfo' });

db.incCaseNames.hasMany(db.incCaseTypeABMatter, { foreignKey: 'incCaseId', as: 'incCaseIdABMatterDetails' });
db.incCaseTypeABMatter.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseIdABMatterInfo' });

db.incCaseTypes.hasMany(db.incCaseTypeABMatter, { foreignKey: 'incCaseTypeId', as: 'incCaseTypeABMatterDetails' });
db.incCaseTypeABMatter.belongsTo(db.incCaseTypes, { foreignKey: 'incCaseTypeId', as: 'incCaseTypeABMatterInfo' });

db.incCaseNames.hasMany(db.incCaseTypeTortMatter, { foreignKey: 'incCaseId', as: 'incCaseIdTortDetails' });
db.incCaseTypeTortMatter.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseIdTortInfo' });

db.incCaseTypes.hasMany(db.incCaseTypeTortMatter, { foreignKey: 'incCaseTypeId', as: 'incCaseTypeTortDetails' });
db.incCaseTypeTortMatter.belongsTo(db.incCaseTypes, { foreignKey: 'incCaseTypeId', as: 'incCaseTypeTortInfo' });

db.incCaseTypes.hasMany(db.incCaseNames, { foreignKey: 'incCaseTypeId', as: 'incCaseTypesDetails' });
db.incCaseNames.belongsTo(db.incCaseTypes, { foreignKey: 'incCaseTypeId', as: 'incCaseTypesInfo' });

db.incCaseNames.hasMany(db.incCaseFiles, { foreignKey: 'incCaseId', as: 'incCaseIdDetails' });
db.incCaseFiles.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseIdInfo' });

db.incCaseVectorStoreManager.hasMany(db.incCaseFiles, { foreignKey: 'vectorId', as: 'incCaseVectorDetails' });
db.incCaseFiles.belongsTo(db.incCaseVectorStoreManager, { foreignKey: 'vectorId', as: 'incCaseVectorInfo' });

db.incCaseNames.hasMany(db.incCaseReports, { foreignKey: 'incCaseId', as: 'incCaseReportsDetails' });
db.incCaseReports.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseReportsInfo' });

db.incCaseNames.hasMany(db.incCaseFilesReportMapping, { foreignKey: 'incCaseId', as: 'incCaseReportsMappingDetails' });
db.incCaseFilesReportMapping.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseReportsMappingInfo' });

db.incCaseFiles.hasMany(db.incCaseFilesReportMapping, { foreignKey: 'fileId', as: 'incCaseFileReportsMappingDetails' });
db.incCaseFilesReportMapping.belongsTo(db.incCaseFiles, { foreignKey: 'fileId', as: 'incCaseFileReportsMappingInfo' });

db.incCaseReports.hasMany(db.incCaseFilesReportMapping, { foreignKey: 'reportId', as: 'incCaseSummaryReportsMappingDetails' });
db.incCaseFilesReportMapping.belongsTo(db.incCaseReports, { foreignKey: 'reportId', as: 'incCaseSummaryReportsMappingInfo' });

db.incCaseNames.hasMany(db.incCaseMediationReport, { foreignKey: 'incCaseId', as: 'incCaseMediationReportsDetails' });
db.incCaseMediationReport.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseMediationReportsInfo' });

db.incCaseReports.hasMany(db.incCaseMediationReport, { foreignKey: 'reportId', as: 'incCaseSummaryReportsDetails' });
db.incCaseMediationReport.belongsTo(db.incCaseReports, { foreignKey: 'reportId', as: 'incCaseSummaryReportsInfo' });

db.incCaseNames.hasMany(db.incCaseSummaryReport, { foreignKey: 'incCaseId', as: 'incCaseSummaryReportsDetails' });
db.incCaseSummaryReport.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseSummaryReportsInfo' });

db.incCaseReports.hasMany(db.incCaseSummaryReport, { foreignKey: 'reportId', as: 'incCaseSummaryDetails' });
db.incCaseSummaryReport.belongsTo(db.incCaseReports, { foreignKey: 'reportId', as: 'incCaseSummaryInfo' });

db.incCaseNames.hasMany(db.incCaseSettlementReport, { foreignKey: 'incCaseId', as: 'incCaseSettlementReportsDetails' });
db.incCaseSettlementReport.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseSettlementReportsInfo' });

db.incCaseReports.hasMany(db.incCaseSettlementReport, { foreignKey: 'reportId', as: 'incCaseAISettlementReportsDetails' });
db.incCaseSettlementReport.belongsTo(db.incCaseReports, { foreignKey: 'reportId', as: 'incCaseAISettlementReportsInfo' });

db.incCaseNames.hasMany(db.incCaseInjuryTracking, { foreignKey: 'incCaseId', as: 'incCaseIdInjuryTrackingDetails' });
db.incCaseInjuryTracking.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseIdInjuryTrackingInfo' });

db.caseNames.hasMany(db.writeReport, { foreignKey: 'caseId', as: 'writeSummaryDetails' });
db.writeReport.belongsTo(db.caseNames, { foreignKey: 'caseId', as: 'writeSummaryInfo' });

db.users.hasMany(db.magicLink, { foreignKey: 'userId', as: 'magicLinkDetails' });
db.magicLink.belongsTo(db.users, { foreignKey: 'userId', as: 'magicLinkInfo' });

db.users.hasMany(db.incCaseNames, { foreignKey: 'userId', as: 'incUserDetails' });
db.incCaseNames.belongsTo(db.users, { foreignKey: 'userId', as: 'incUserInfo' });

db.firmAssistant.hasMany(db.users, { foreignKey: 'firmId', as: 'firmIdDetails' });
db.users.belongsTo(db.firmAssistant, { foreignKey: 'firmId', as: 'firmIdInfo' });

db.caseNames.hasMany(db.caseAssignees, { foreignKey: 'caseId', as: 'caseAssigneesDetails' });
db.caseAssignees.belongsTo(db.caseNames, { foreignKey: 'caseId', as: 'caseInfo' });

db.firmAssistant.hasMany(db.caseAssignees, { foreignKey: 'firmId', as: 'firmAssigneesDetails' });
db.caseAssignees.belongsTo(db.firmAssistant, { foreignKey: 'firmId', as: 'firmAssigneesInfo' });

db.users.hasMany(db.caseAssignees, { foreignKey: 'assigneeUserId', as: 'assigneeUserIdDetails' });
db.caseAssignees.belongsTo(db.users, { foreignKey: 'assigneeUserId', as: 'assigneeUserIdInfo' });

db.caseNames.hasMany(db.intelligentMap, { foreignKey: 'caseId', as: 'caseIntelligentDetails' });
db.intelligentMap.belongsTo(db.caseNames, { foreignKey: 'caseId', as: 'caseIntelligentInfo' });

db.incCaseNames.hasMany(db.incCaseReportSummary, { foreignKey: 'incCaseId', as: 'incCaseReportSummaryDetails' });
db.incCaseReportSummary.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseReportSummaryInfo' });

db.incCaseReports.hasMany(db.incCaseReportSummary, { foreignKey: 'reportId', as: 'incCaseSummaryReportsMapping' });
db.incCaseReportSummary.belongsTo(db.incCaseReports, { foreignKey: 'reportId', as: 'incCaseSummaryReportsMapping' });

db.incCaseNames.hasMany(db.incCaseReportSummaryDownloadManager, { foreignKey: 'incCaseId', as: 'incCaseReportSummaryDownloadDetails' });
db.incCaseReportSummaryDownloadManager.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseReportSummaryDownloadInfo' });

db.incCaseNames.hasMany(db.incCaseResponses, { foreignKey: 'incCaseId', as: 'incCaseSaveResponseDetails' });
db.incCaseResponses.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseSaveResponseInfo' });

db.incCaseNames.hasMany(db.incCaseReportSection, { foreignKey: 'incCaseId', as: 'incCaseSectionDetails' });
db.incCaseReportSection.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseSectionInfo' });

db.incCaseNames.hasMany(db.incCaseSavedPrompt, { foreignKey: 'incCaseId', as: 'incCaseSavePromptsDetails' });
db.incCaseSavedPrompt.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseSavePromptsInfo' });

db.incCaseNames.hasMany(db.incCaseShares, { foreignKey: 'incCaseId', as: 'incCaseSharesDetails' });
db.incCaseShares.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseSharesInfo' });

db.users.hasMany(db.incCaseShares, { foreignKey: 'sharedByUserId', as: 'incSharedByDetails' });
db.incCaseShares.belongsTo(db.users, { foreignKey: 'sharedByUserId', as: 'incSharedByInfo' });

db.users.hasMany(db.incCaseShares, { foreignKey: 'sharedWithUserId', as: 'incSharedWithDetails' });
db.incCaseShares.belongsTo(db.users, { foreignKey: 'sharedWithUserId', as: 'incSharedWithInfo' });

db.incCaseNames.hasMany(db.incCaseMedicalInjuryReport, { foreignKey: 'incCaseId', as: 'incCaseMedicalInjuryReportsDetails' });
db.incCaseMedicalInjuryReport.belongsTo(db.incCaseNames, { foreignKey: 'incCaseId', as: 'incCaseMedicalInjuryReportsInfo' });

db.externalDocBatches.hasMany(db.externalDocQueries, { foreignKey: 'batchId', as: 'externalDocDetails' });
db.externalDocQueries.belongsTo(db.externalDocBatches, { foreignKey: 'batchId', as: 'externalDocInfo' });

db.externalDocBatches.hasMany(db.externalDocFiles, { foreignKey: 'batchId', as: 'externalDocBatchDetails' });
db.externalDocFiles.belongsTo(db.externalDocBatches, { foreignKey: 'batchId', as: 'externalDocBatchInfo' });

db.externalDocVectorStoreManager.hasMany(db.externalDocFiles, { foreignKey: 'vectorId', as: 'externalVectorDetails' });
db.externalDocFiles.belongsTo(db.externalDocVectorStoreManager, { foreignKey: 'vectorId', as: 'externalVectorInfo' });

db.incCaseSavedPromptTypes.hasMany(db.incCaseSavedPrompt, { foreignKey: 'promptType', as: 'promptTypeDetails' });
db.incCaseSavedPrompt.belongsTo(db.incCaseSavedPromptTypes, { foreignKey: 'promptType', as: 'promptTypeInfo' });

// OrderBooking x OrderBookingItems Relationship
db.orderBooking.hasMany(db.orderBookingItems, { foreignKey: 'orderBookingId', as: 'orderBookingItemsDetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.orderBookingItems.belongsTo(db.orderBooking, { foreignKey: 'orderBookingId', as: 'orderBookingInfo', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

//Query Interface
queryInterfaceFunc();

//creating Views
createView();

module.exports = db;