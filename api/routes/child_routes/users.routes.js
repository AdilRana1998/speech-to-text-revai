const router = require('express').Router();
const {
    user_controller,
    calendar_controller
} = require('../../controller');
const middleware = require('../../middlewares');
const throttle = require('../../middlewares/throttle');
const { UserServices } = require('../../services');
const RoomsServices = require('../../services/rooms.services');

router.get('/users', [middleware.authValidation], user_controller.getAll);
router.post('/chat', [middleware.authValidation], user_controller.chatwithpython);
router.post('/users', [middleware.openApi], user_controller.postUser);
router.get('/users/get-stripe-intent', [middleware.authValidation], user_controller.getStripeIntent);
router.get('/users/list-payment-methods', [middleware.authValidation], user_controller.listPaymentMethods);

router.get('/users/info', [middleware.authValidation], user_controller.getUserInfo);
router.get('/users/verifyUser/:id', [middleware.openApi], user_controller.verifyUser);
router.post('/users/resendVerificationEmail', [middleware.openApi], user_controller.resendVerificationEmail);
router.post('/users/login', [throttle, middleware.openApi], user_controller.userLogin);
router.post('/users/social-login', [middleware.openApi], user_controller.socialLogin);
router.post('/users/refresh-token', [middleware.openApi], user_controller.refreshToken);
router.get('/users/guest-login', [middleware.openApi], user_controller.guestLogin);
router.post('/users/adminLogin', [middleware.openApi], user_controller.adminLogin);
router.post('/users/post', [middleware.openApi], user_controller.postUser);

router.post('/users/postWithImage', [middleware.upload.single('image'), middleware.openApi], user_controller.postUserWithImage);
router.post('/users/uploadUserImage', [middleware.authValidation, middleware.upload.single('image')], user_controller.uploadUserImage);
router.post('/users/uploadStandAloneImage', [middleware.authValidation, middleware.upload.single('image')], user_controller.uploadStandAloneImage);

// router.get('/users/getAdminUsers', [middleware.authValidation], user_controller.getAll);
router.get('/users/authValidation', [middleware.authValidation], user_controller.authValidation);
// router.post('/users/update', [middleware.authValidation], user_controller.updateInformation);
router.post('/users/ecglop', [middleware.openApi], user_controller.deActivateUser);
router.post('/users/qzs3lo', [middleware.openApi], user_controller.subscription);


router.post('/users/updateOpenPassword', [middleware.authValidation], user_controller.updatedOpenPassword);
router.post('/users/updatePassword', [middleware.authValidation], user_controller.passwordUpdated);

router.post('/users/createPrompts', [middleware.authValidation], user_controller.createPrompt);
router.post('/users/createSinglePrompts', [middleware.authValidation], user_controller.createSinglePrompt);
router.get('/users/getPrompts', [middleware.authValidation], user_controller.getPrompts);
router.get('/users/getPromptType', [middleware.authValidation], user_controller.getPromptType);
router.get('/users/getPromptsRequest', [middleware.authValidation], user_controller.getPromptsRequest);
router.get('/users/getPromptByType/:type', [middleware.authValidation], user_controller.getAsstPrompt)
router.get('/users/getLLMPrompt/:type', [middleware.openApi], user_controller.getLLMPrompt)


router.post('/users/encryptionInformation', [middleware.openApi], user_controller.userInfoEncryption);
// router.post('/users/encryptionInformationRoom', [middleware.openApi], user_controller.userInfoEncryptionRooms);
router.post('/users/encryption', [middleware.openApi], user_controller.Encryption);
router.post('/users/encryption-collective', [middleware.openApi], user_controller.EncryptionCollective);
router.post('/users/encryptModule', [middleware.openApi], user_controller.encryptModule);

// calendar;
router.get('/users/googleAuth', [middleware.openApi], calendar_controller.getGoogleURL)
router.get('/users/getAuthURL', [middleware.openApi], calendar_controller.getAuthURL)
router.post('/users/calendar/set', [middleware.authValidation], calendar_controller.createCalendar);
router.post('/users/calendar/set-calendar-events', [middleware.authValidation], calendar_controller.setCalendarEvents);
router.post('/users/calendar/delete', [middleware.authValidation], calendar_controller.deleteCalendar);
router.get('/users/calendar/get', [middleware.authValidation], calendar_controller.getCalendarEvents);
router.post('/users/calendar/test-webhook', [middleware.authValidation], calendar_controller.webhooktest);

//pop-up
router.get('/users/pop-up', [middleware.authValidation], user_controller.getpopupStatus);
router.post('/users/set-pop-up', [middleware.authValidation], user_controller.setpopupStatus);
router.post('/users/updateBotName', [middleware.authValidation], user_controller.setBotName);
router.get('/users/getBotName', [middleware.authValidation], user_controller.getBotName);

//Citation
router.post('/users/citation', [middleware.authValidation], user_controller.postCitation);
router.get('/users/citation', [middleware.authValidation], user_controller.getCitation);

module.exports = router;