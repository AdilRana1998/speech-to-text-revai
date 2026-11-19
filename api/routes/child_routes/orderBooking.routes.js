const router = require('express').Router();
const { orderBooking_controller } = require('../../controller');
const middleware = require('../../middlewares');
const orderBookingMiddleware = require('../../middlewares/orderBooking.middleware');


router.post('/order-bookings', [middleware.authValidation, orderBookingMiddleware.requireAccount, orderBookingMiddleware.validateCreate], orderBooking_controller.create);
router.get('/order-bookings/customer/:customerId', [middleware.authValidation, orderBookingMiddleware.requireAccount, orderBookingMiddleware.validateCustomerParam, orderBookingMiddleware.validatePagination], orderBooking_controller.listByCustomer);
router.get('/order-bookings/:orderBookingUuid', [middleware.authValidation, orderBookingMiddleware.requireAccount, orderBookingMiddleware.validateUuidParam], orderBooking_controller.getById);
router.post('/order-bookings/:orderBookingUuid/cancel', [middleware.authValidation, orderBookingMiddleware.requireAccount, orderBookingMiddleware.validateUuidParam], orderBooking_controller.cancel);


module.exports = router;
