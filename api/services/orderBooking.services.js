const OrderBookingServices = {}
const { OrderBookingQueries } = require('../queries');
const { Strings } = require('../../utils');

// DECIMAL(10,2) upper bound, in cents
const MAX_AMOUNT_CENTS = 9999999999;

const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (cents) => (cents / 100).toFixed(2);

const errorResponse = (error, label) => {
    console.log(`Error in ${label}`, error);
    return {
        message: Strings.ERROR.SOME_THING_WENT_WRONG,
        statusCode: 400,
        obj: {
            error: error.message
        }
    }
}

/**
 * Create an order booking and its items in one transaction. The total amount is computed
 * server-side from the items (sum of qty * price) rather than trusted from the client.
 * @param {number} customerId - customer the booking is for
 * @param {Array<{productId: number, qty: number, price: (number|string)}>} items - booking items (already validated)
 * @param {number} userId - authenticated user creating the booking
 * @returns {Promise<{obj: object, message: string, statusCode: number}>} the created booking with items
 */
OrderBookingServices.createOrderBooking = async (customerId, items, userId) => {
    try {
        const itemRows = items.map((item) => ({
            productId: Number(item.productId),
            qty: Number(item.qty),
            priceCents: toCents(item.price)
        }));
        const totalCents = itemRows.reduce((sum, item) => sum + (item.qty * item.priceCents), 0);
        if (totalCents > MAX_AMOUNT_CENTS || itemRows.some((item) => item.priceCents > MAX_AMOUNT_CENTS)) {
            return {
                message: Strings.ORDER_BOOKING.TOTAL_LIMIT_EXCEEDED,
                statusCode: 400,
                obj: {}
            }
        }

        const requestUuid = await OrderBookingQueries.runInTransaction(async (transaction) => {
            const booking = await OrderBookingQueries.createOrderBooking({
                customerId: Number(customerId),
                createdByUserId: userId,
                status: 'pending',
                totalAmount: fromCents(totalCents)
            }, transaction);
            await OrderBookingQueries.createOrderBookingItems(itemRows.map((item) => ({
                orderBookingId: booking.id,
                productId: item.productId,
                qty: item.qty,
                price: fromCents(item.priceCents)
            })), transaction);
            return booking.requestUuid;
        });

        const created = await OrderBookingQueries.findOrderBookingByUuid(requestUuid, userId);
        return {
            message: Strings.ORDER_BOOKING.CREATED,
            statusCode: 200,
            obj: created
        }
    } catch (error) {
        return errorResponse(error, "createOrderBooking");
    }
}

/**
 * List a customer's order bookings created by the authenticated user, paginated.
 * @param {number} customerId - customer to list bookings for
 * @param {number} page - 1-based page number
 * @param {number} limit - page size
 * @param {number} userId - authenticated user id
 * @returns {Promise<{obj: {rows: object[], pagination: object}, message: string, statusCode: number}>} page of bookings
 */
OrderBookingServices.listOrderBookingsByCustomer = async (customerId, page, limit, userId) => {
    try {
        const offset = (page - 1) * limit;
        const { count, rows } = await OrderBookingQueries.findOrderBookingsByCustomer(Number(customerId), userId, limit, offset);
        return {
            message: rows.length > 0 ? Strings.SUCCESS : Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {
                rows: rows,
                pagination: {
                    page: page,
                    limit: limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            }
        }
    } catch (error) {
        return errorResponse(error, "listOrderBookingsByCustomer");
    }
}

/**
 * Get one order booking with its items.
 * @param {string} requestUuid - booking uuid
 * @param {number} userId - authenticated user id
 * @returns {Promise<{obj: object, message: string, statusCode: number}>} the booking, or a 400 when not found
 */
OrderBookingServices.getOrderBooking = async (requestUuid, userId) => {
    try {
        const booking = await OrderBookingQueries.findOrderBookingByUuid(requestUuid, userId);
        if (!booking) {
            return {
                message: Strings.ORDER_BOOKING.NOT_FOUND,
                statusCode: 400,
                obj: {}
            }
        }
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: booking
        }
    } catch (error) {
        return errorResponse(error, "getOrderBooking");
    }
}

/**
 * Cancel an order booking that is pending or confirmed.
 * @param {string} requestUuid - booking uuid
 * @param {number} userId - authenticated user id
 * @returns {Promise<{obj: object, message: string, statusCode: number}>} the cancelled booking, or a 400 when not found / already cancelled
 */
OrderBookingServices.cancelOrderBooking = async (requestUuid, userId) => {
    try {
        const affectedRows = await OrderBookingQueries.cancelOrderBooking(requestUuid, userId);
        const booking = await OrderBookingQueries.findOrderBookingByUuid(requestUuid, userId);
        if (!booking) {
            return {
                message: Strings.ORDER_BOOKING.NOT_FOUND,
                statusCode: 400,
                obj: {}
            }
        }
        if (affectedRows === 0) {
            return {
                message: Strings.ORDER_BOOKING.ALREADY_CANCELLED,
                statusCode: 400,
                obj: {
                    requestUuid: booking.requestUuid,
                    status: booking.status
                }
            }
        }
        return {
            message: Strings.ORDER_BOOKING.CANCELLED,
            statusCode: 200,
            obj: booking
        }
    } catch (error) {
        return errorResponse(error, "cancelOrderBooking");
    }
}

module.exports = OrderBookingServices;
