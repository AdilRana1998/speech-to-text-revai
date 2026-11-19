const router = require('express').Router();
const {
    payment_controller
} = require('../../controller');
const middleware = require('../../middlewares');

router.post('/payments/checkout', [middleware.authValidation], payment_controller.checkout);
router.post('/payments/manageBilling', [middleware.authValidation], payment_controller.manageBilling);
router.get('/payments/getProducts', [middleware.openApi], payment_controller.getProducts);
router.post('/payments/stripe/webhook', payment_controller.webhook);

module.exports = router;