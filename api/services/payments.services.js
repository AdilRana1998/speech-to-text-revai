const PaymentsServices = {};
const {
    UserQueries,
    PaymentQueries,
    PackagesQueries
} = require('../queries');
const {
    create: createUserPackage
} = require('./userPackages.services')
const { Logger, Functions, Strings } = require('../../utils')
const { createCheckoutSession, createWebhook, createBillingSession } = require('../../utils/Payments')

PaymentsServices.checkout = async (userId, obj) => {
    const userResult = await UserQueries.getUserCustomerId(userId);
    console.log({ userResult })
    const result = await createCheckoutSession(userResult[0].customerStripeId, obj.priceId, obj.type)
    const responseObj = {
        url: result.url,
        id: result.id,
        cancel_url: result.cancel_url,
        currency: result.currency,
        status: result.status,
        amount: result.amount_total,
        createdAtStripe: result.created,
        success_url: result.success_url,
    }
    const paymentObject = {
        userId: userId,
        stripeCheckoutId: result.id,
        currency: result.currency,
        stripeStatus: result.status,
        amount: result.amount_total,
        stripeCheckoutResponse: JSON.stringify(result),
        stripeProductId: obj.priceId
    }
    await PaymentQueries.create(paymentObject)
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: responseObj
    };
}

PaymentsServices.getProducts = async () => {
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: await PackagesQueries.getAll()
    };
}

PaymentsServices.createBilling = async (userId) => {
    const userResult = await UserQueries.getUserCustomerId(userId);
    const session = await createBillingSession(userResult[0].customerStripeId)
    const responseObj = {
        url: session.url,
    }
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: responseObj
    };
}

PaymentsServices.webhook = async (res, req, next) => {
    const obj = {
        response: req.body
    }
    try { 
        let event
        obj.headers = req.headers['stripe-signature']
        try {
            event = createWebhook(req.body, req.headers['stripe-signature'])
        } catch (err) {
            console.log(err)
            obj.errorMessage = err.message;
            Logger.data.stripeWebhook(obj, "webhookEventError");
            return {
                message: Strings.ERROR.SOME_THING_WENT_WRONG,
                statusCode: 400,
                obj: {
                    error: err.message
                }
            }
        }

        const data = event.data.object

        obj.eventData = data
        obj.eventType = event.type
        // console.log(event.type, data)
        Logger.data.stripeWebhook(obj, "data");
        switch (event.type) {
            case 'checkout.session.completed':
                console.log(JSON.stringify(data));
                //update the stripe payment object
                const updateObj = {
                    stripeEventId: event.id,
                    stripeCheckoutCompleteResponse: JSON.stringify(data),
                    stripeStatus: data.status,
                    stripePaymentStatus: data.payment_status
                }
                console.log({ updateObj })
                obj.updateObj = updateObj;
                obj.checkoutId = data.id.split('');
                const resultPayment = await PaymentQueries.update(updateObj, data.id + "");
                //get Payment details such as paymentId
                const getPaymentDetails = await PaymentQueries.getPayment(data.id + "");
                //get specific plan
                const plan = await PackagesQueries.getProductById(getPaymentDetails[0].stripeProductId)

                //get User current wordCount
                const userInfo = await UserQueries.getUserByCustomerId(data.customer + "")

                obj.userInfo = userInfo
                console.log(JSON.stringify({ userInfo, plan, getPaymentDetails }))
                if (data.payment_status === 'paid') {
                    //if payment is plan is infinity

                    if (userInfo.length > 0) {
                        //send success Email payment
                        //Emails.paymentSuccess(userInfo[0].email, plan.price)
                        //update User plan/availableWordCount
                        const userUpdate = {
                            paymentPlan: plan[0].plan,
                            paymentId: plan[0].packageId,
                            paymentExpiry: Functions.getCurrentDateOfNextMonth(),
                        }
                        await UserQueries.updateUserByCustomerId(userUpdate, data.customer + "");
                        await createUserPackage({ packageId: plan[0].packageId }, userInfo[0].userId)
                        obj.resultPayment = JSON.stringify(resultPayment)
                    }
                } else {
                    //send Failure Email payment
                    //Emails.paymentFailure(userInfo[0].email, plan.price)
                }
                break;
            case 'checkout.session.async_payment_succeeded':
                console.log(JSON.stringify(data));
                break;
            case 'customer.created':
                console.log(JSON.stringify(data))
                break
            case 'invoice.paid':
                break
            case 'customer.subscription.created': {
                console.log(JSON.stringify(data))
                break
            }
            case 'customer.subscription.updated': {
                // started trial
                console.log(JSON.stringify(data))
                break;
            }
            default:
        }
        Logger.data.stripeWebhook(obj, "webhookEvent");
        res.sendStatus(200)
    } catch (e) {
        console.log(e.message);
        next(e);
    }
}

module.exports = PaymentsServices