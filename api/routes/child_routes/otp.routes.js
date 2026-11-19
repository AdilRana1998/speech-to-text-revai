const router = require('express').Router();
const {
    otp_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.post('/otp/post', [middleware.openApi], otp_controller.postOTP);
router.post('/otp/verification', [middleware.openApi], otp_controller.verifyOtp);
router.post('/otp/resend', [middleware.openApi], otp_controller.resendOTP);
router.post('/otp/expose', [middleware.openApi], otp_controller.exposeOTP);
router.post('/otp/expire', [middleware.openApi], otp_controller.expireOTP);

module.exports = router;