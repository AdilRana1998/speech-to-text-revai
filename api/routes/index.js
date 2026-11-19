const router = require('express').Router();
const {
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
} = require('./child_routes')

router.use('/api', userRoutes);
router.use('/api', usersTypeRoutes);
router.use('/api', roomsRoutes);
router.use('/api', paymentRoutes);
router.use('/api', packagesRoutes);
router.use('/api', userPackagesRoutes);
router.use('/api', forgotPasswordRoutes);
router.use('/api', agendaRoutes);
router.use('/api', chatGptRoutes);
router.use('/api', interviewObjectivesRoutes);
router.use('/api', caseFileRoutes);
router.use('/api', writeReportRoutes);
router.use('/api', sampleFileRoutes);
router.use('/api', adminRoutes);
router.use('/api', activityLogs);
router.use('/api', speechToText);
router.use('/api/report', reportRoutes);
router.use('/api', otpRoutes);
router.use('/api', redLine);
router.use('/api', usersGroup);
router.use('/api', textFormatter);
router.use('/api', healthCheck);
router.use('/api', realTimeVoice);
router.use('/api', caseDashboard);
router.use('/api', caseReportGenerator);
router.use('/api', kolabryaAnalysis);
router.use('/api', kolabryaVisuals);
router.use('/api', caseInterview);
router.use('/api', jsonAssistant);
router.use('/api', caseDocAssistant);
router.use('/api', kolabryaGrok);
router.use('/api', incCaseFile);
router.use('/api', kolabryaMagicLink);
router.use('/api', documentEnhance);
router.use('/api', caseAssignees);
router.use('/api', caseIntelligentMap);
router.use('/api', canadian_law_source)
router.use('/api', orderBooking);

module.exports = router;