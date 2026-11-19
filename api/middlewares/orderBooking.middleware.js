const { Validator } = require('jsonschema');
const { sendStatus, Strings } = require('../../utils');

const validator = new Validator();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_ITEMS = 100;

const PRICE_REGEX = /^\d{1,8}(\.\d{1,2})?$/;
const POSITIVE_INT_REGEX = /^[1-9]\d{0,9}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSchema = {
    type: 'object',
    required: ['customerId', 'items'],
    properties: {
        customerId: { type: 'integer', minimum: 1, maximum: 2147483647 },
        items: {
            type: 'array',
            minItems: 1,
            maxItems: MAX_ITEMS,
            items: {
                type: 'object',
                required: ['productId', 'qty', 'price'],
                properties: {
                    productId: { type: 'integer', minimum: 1, maximum: 2147483647 },
                    qty: { type: 'integer', minimum: 1, maximum: 100000 },
                    price: { type: ['number', 'string'] }
                }
            }
        }
    }
};

const rejectRequest = (res, req, errors) => {
    sendStatus.data.badRequestStatus2(res, req, { errors }, Strings.ORDER_BOOKING.VALIDATION_ERROR);
};

/**
 * authValidation also lets through guest requests that only send a `session-id` header.
 * Order bookings require a real signed-in account, so reject those here.
 */
exports.requireAccount = (req, res, next) => {
    if (!req.headers.authorization || !req.userId) {
        return sendStatus.data.unauthorizedStatus(res, req, {
            code: 401,
            message: Strings.ORDER_BOOKING.AUTH_REQUIRED
        });
    }
    next();
};

exports.validateCreate = (req, res, next) => {
    const body = req.body || {};
    const result = validator.validate(body, createSchema);
    const errors = result.errors.map((error) => `${error.property.replace('instance', 'body')} ${error.message}`);
    if (errors.length === 0) {
        body.items.forEach((item, index) => {
            if (!PRICE_REGEX.test(String(item.price))) {
                errors.push(`body.items[${index}].price must be a non-negative amount with at most 2 decimal places`);
            }
        });
    }
    if (errors.length > 0) {
        return rejectRequest(res, req, errors);
    }
    next();
};

exports.validateCustomerParam = (req, res, next) => {
    if (!POSITIVE_INT_REGEX.test(String(req.params.customerId))) {
        return rejectRequest(res, req, ['params.customerId must be a positive integer']);
    }
    next();
};

exports.validateUuidParam = (req, res, next) => {
    if (!UUID_REGEX.test(String(req.params.orderBookingUuid))) {
        return rejectRequest(res, req, ['params.orderBookingUuid must be a valid uuid']);
    }
    next();
};

/**
 * Validates ?page and ?limit and stores the parsed values on req.pagination.
 */
exports.validatePagination = (req, res, next) => {
    const errors = [];
    const { page, limit } = req.query;
    if (page !== undefined && !POSITIVE_INT_REGEX.test(String(page))) {
        errors.push('query.page must be a positive integer');
    }
    if (limit !== undefined && (!POSITIVE_INT_REGEX.test(String(limit)) || Number(limit) > MAX_LIMIT)) {
        errors.push(`query.limit must be an integer between 1 and ${MAX_LIMIT}`);
    }
    if (errors.length > 0) {
        return rejectRequest(res, req, errors);
    }
    req.pagination = {
        page: page !== undefined ? Number(page) : DEFAULT_PAGE,
        limit: limit !== undefined ? Number(limit) : DEFAULT_LIMIT
    };
    next();
};
