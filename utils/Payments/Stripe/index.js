const { urls, keys } = require('../../../config')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async (customerID, price, type = "payment") => {
    const session = await stripe.checkout.sessions.create({
        mode: type,//payment | setup | subscription
        payment_method_types: ['card'],
        customer: customerID,
        line_items: [
            {
                price,
                quantity: 1
            }
        ],
        success_url: `${urls.success}`,//?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${urls.cancel}`
    })

    return session
}

const addNewCustomer = async (email) => {
    const customer = await stripe.customers.create({
        email,
        description: email
    })
    return customer
}

const setupIntent = async (customerId) => {
    // Create SetupIntent to get a client_secret
    const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
    });
    return setupIntent
}

const listPaymentMethods = async (customerId) => {
    // Create SetupIntent to get a client_secret
    const list = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
    });
    return list
}

const getCustomerByID = async (id) => {
    const customer = await stripe.customers.retrieve(id)
    return customer
}

const createWebhook = (rawBody, sig) => {
    const event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        keys.stripeSig
    )
    return event
}

const createBillingSession = async (customer) => {
    const session = await stripe.billingPortal.sessions.create({
        customer,
        return_url: urls.redirectSession
    })
    return session
}

module.exports = {
    createCheckoutSession, listPaymentMethods, addNewCustomer, getCustomerByID, createWebhook, createBillingSession, setupIntent
}