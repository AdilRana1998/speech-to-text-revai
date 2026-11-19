const Controller = {}
const { sendStatus } = require('../../utils')
const {
	createOrderBooking,
	listOrderBookingsByCustomer,
	getOrderBooking,
	cancelOrderBooking
} = require('../services/orderBooking.services');

Controller.create = async (req, res, next) => {
	const customerId = req.body?.customerId;
	const items = req.body?.items;
	const userId = req.userId;
	const result = await createOrderBooking(customerId, items, userId);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Create-Order-Booking", result.statusCode);
}

Controller.listByCustomer = async (req, res, next) => {
	const customerId = req.params.customerId;
	const page = req.pagination.page;
	const limit = req.pagination.limit;
	const userId = req.userId;
	const result = await listOrderBookingsByCustomer(customerId, page, limit, userId);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "List-Order-Bookings-By-Customer", result.statusCode);
}

Controller.getById = async (req, res, next) => {
	const orderBookingUuid = req.params.orderBookingUuid;
	const userId = req.userId;
	const result = await getOrderBooking(orderBookingUuid, userId);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Order-Booking", result.statusCode);
}

Controller.cancel = async (req, res, next) => {
	const orderBookingUuid = req.params.orderBookingUuid;
	const userId = req.userId;
	const result = await cancelOrderBooking(orderBookingUuid, userId);
	sendStatus.data.sortStatus(res, req, result.obj, result.message, "Cancel-Order-Booking", result.statusCode);
}

module.exports = Controller;
