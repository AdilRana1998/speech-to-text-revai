const router = require('express').Router();
const {
    rooms_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.get('/rooms', [middleware.authValidation], rooms_controller.getRooms);
router.get('/roomsWithDates', [middleware.authValidation], rooms_controller.getRoomsWithDates);
router.get('/rooms/:roomId', [middleware.authValidation], rooms_controller.getRoom);
router.post('/rooms/create', [middleware.authValidation], rooms_controller.createRooms);
router.post('/rooms/create-by-email', [middleware.authValidation], rooms_controller.createByEmail);
router.post('/rooms/runQueryLog', [middleware.authValidation], rooms_controller.runQueryLog);
router.post('/rooms/removeBot', [middleware.authValidation], rooms_controller.removeBotMeeting);
router.post('/rooms/update', rooms_controller.updateRooms);
router.post('/rooms/updateByBotId', [middleware.authValidation], rooms_controller.updateRoomByBot);
router.post('/rooms/deleteByBotId', [middleware.authValidation], rooms_controller.deleteRoomByBot);
router.post('/rooms/updateWhiteBoardByBot', rooms_controller.updateRoomWhiteBoardByBot);
router.post('/rooms/userInfo', [middleware.authValidation], rooms_controller.getRoomUser);
router.get('/rooms/logs/:botId', rooms_controller.getShellScript);
router.post('/rooms/botChatMessage', [middleware.openApi], rooms_controller.botChatMessage);

//bots
router.get('/rooms/bot/:botId', [middleware.authValidation], rooms_controller.retrieveBot);

//webhooks
router.post('/webhook/bot', rooms_controller.webhook);
router.post('/webhook/transcription', rooms_controller.webhook);

router.post('/transcriptProcess/test', [middleware.authValidation], rooms_controller.transcriptProcessAsync);
router.post('/endTranscriptProcess/test', [middleware.authValidation], rooms_controller.endTranscriptProcessAsync);
router.post('/getFinalSummaryBP/test', rooms_controller.getFinalSummaryBP);
router.post('/keywordsProcess/test', [middleware.openApi],rooms_controller.keywordsProcessTest);
router.post('/objective/test', [middleware.authValidation], rooms_controller.testObjective);
router.post('/rooms/enhance-transcript/:botId', [middleware.authValidation], rooms_controller.enhanceTrasncript);
router.post('/rooms/post-enhanced-transcript', [middleware.openApi], rooms_controller.postEnhanceTrasncript);
router.post('/rooms/update/transcript', [middleware.authValidation], rooms_controller.updateTranscript);

//job
// router.post('/rooms/blob-storage', [middleware.openApi], rooms_controller.blobStorage);


module.exports = router;