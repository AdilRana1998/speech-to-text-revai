const Queries = {};
const dbModel = require('../model');
const { Op } = require("sequelize");
const db = dbModel.orderBooking;
const dbItems = dbModel.orderBookingItems;
const bookingAttributes = ['requestUuid', 'customerId', 'status', 'totalAmount', 'createdAt', 'updatedAt'];
const itemAttributes = ['id', 'productId', 'qty', 'price'];

/**
 * Run a callback inside a managed Sequelize transaction. The transaction commits when the
 * callback resolves and rolls back when it throws.
 * @param {function(import('sequelize').Transaction): Promise<*>} callback - work to run; receives the transaction
 * @returns {Promise<*>} whatever the callback resolves with
 */
Queries.runInTransaction = async (callback) => {
    return await dbModel.sequelize.transaction(callback);
}

/**
 * Insert an order booking row.
 * @param {{customerId: number, createdByUserId: number, totalAmount: string, status?: string}} data - booking columns
 * @param {import('sequelize').Transaction} transaction - active transaction
 * @returns {Promise<object>} the created booking model instance
 */
Queries.createOrderBooking = async (data, transaction) => {
    return await db.create(data, { transaction });
}

/**
 * Bulk insert the items of an order booking.
 * @param {Array<{orderBookingId: number, productId: number, qty: number, price: string}>} items - item rows
 * @param {import('sequelize').Transaction} transaction - active transaction
 * @returns {Promise<object[]>} the created item model instances
 */
Queries.createOrderBookingItems = async (items, transaction) => {
    return await dbItems.bulkCreate(items, { transaction, validate: true });
}

/**
 * Fetch one booking with its items by public uuid, scoped to the creating user.
 * @param {string} requestUuid - booking uuid
 * @param {number} userId - authenticated user id
 * @param {import('sequelize').Transaction} [transaction] - optional active transaction
 * @returns {Promise<object|null>} plain booking object with `items`, or null when not found
 */
Queries.findOrderBookingByUuid = async (requestUuid, userId, transaction) => {
    const data = await db.findOne({
        attributes: bookingAttributes,
        include: [
            {
                model: dbItems,
                as: 'orderBookingItemsDetails',
                attributes: itemAttributes,
                required: false
            }
        ],
        where: {
            requestUuid: requestUuid,
            createdByUserId: userId
        },
        order: [[{ model: dbItems, as: 'orderBookingItemsDetails' }, 'id', 'ASC']],
        transaction
    });
    if (!data) {
        return null;
    }
    const booking = data.get({ plain: true });
    booking.items = booking.orderBookingItemsDetails || [];
    delete booking.orderBookingItemsDetails;
    return booking;
}

/**
 * Paginated list of bookings for a customer, scoped to the creating user, newest first.
 * Items are not loaded here; use findOrderBookingByUuid for the full booking.
 * @param {number} customerId - customer id to filter by
 * @param {number} userId - authenticated user id
 * @param {number} limit - page size
 * @param {number} offset - number of rows to skip
 * @returns {Promise<{count: number, rows: object[]}>} total count and plain rows for the page
 */
Queries.findOrderBookingsByCustomer = async (customerId, userId, limit, offset) => {
    return await db.findAndCountAll({
        attributes: bookingAttributes,
        where: {
            customerId: customerId,
            createdByUserId: userId
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        raw: true
    });
}

/**
 * Set a booking's status to cancelled when it is not already cancelled. The status check
 * is part of the UPDATE so concurrent cancels cannot both succeed.
 * @param {string} requestUuid - booking uuid
 * @param {number} userId - authenticated user id
 * @returns {Promise<number>} number of rows updated (0 or 1)
 */
Queries.cancelOrderBooking = async (requestUuid, userId) => {
    const [affectedRows] = await db.update(
        { status: 'cancelled' },
        {
            where: {
                requestUuid: requestUuid,
                createdByUserId: userId,
                status: {
                    [Op.in]: ['pending', 'confirmed']
                }
            }
        }
    );
    return affectedRows;
}

module.exports = Queries;
