const ForgotPasswordServices = {};
const {
    forgotQueries,
    UserQueries
} = require('../queries')
const moment = require('moment');

const { Emails, Strings, JWT} = require('../../utils') 

ForgotPasswordServices.post = async (obj) => { 
    obj.email = obj.email.toLowerCase()
    var response = await UserQueries.getUsersByEmail(obj.email);
    if (response.length > 0) {
        const forgotResponse = await forgotQueries.create(obj);
        Emails.forgotPassword(obj.email, forgotResponse.forgotUuid);
        return {
            message: Strings.SUCCESS_MESSAGES.EMAIL_SENT,
            statusCode: 200,
            obj: {}
        };

    } else {
        return {
            message: Strings.SUCCESS_MESSAGES.EMAIL_SENT,
            statusCode: 200,
            obj: {}
        };
    }
}

ForgotPasswordServices.verify = async (obj) => { 
    var response = await forgotQueries.getEntry(obj, false);
    await forgotQueries.update({ isUsed: true }, obj.id);
    const email = response[0]?.email;
    var data = await UserQueries.getUsersByEmail(email);
    if (response.length > 0 && data.length > 0) {
        const tokenDetails = JWT.data.generate(data[0].userId)
        const refreshTokenDetails = JWT.data.refreshToken(data[0].userId)
        const updateToken = {
            token: tokenDetails.token,
            tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
            refreshToken: refreshTokenDetails.token,
            refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
        }
        await UserQueries.updateUserByEmail(updateToken, email);
        const results = {
            email: email,
            token: updateToken.token,
            tokenExpiry: updateToken.tokenExpiry,
            refreshToken: updateToken.refreshToken,
            refreshTokenExpiry: updateToken.refreshTokenExpiry
        }
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: results
        };
    } else {
        return {
            message:  Strings.ERROR.EMAIL_NOT_EXISTS,
            statusCode: 400,
            obj: {}
        };
    }
}

module.exports = ForgotPasswordServices
