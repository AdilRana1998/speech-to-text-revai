const KolabryaMagicLinkServices = {};
const {
    KolabryaMagicLinkQueries,
    UserQueries,
    IncCaseNamesQueries,
} = require('../queries');
const UserPackageServices = require('./userPackages.services');
const InsCaseServices = require('./incCaseFile.services');
const moment = require('moment');
const { Strings, Logger, Emails, Functions, Payments, JWT, Encryption } = require('../../utils')
const { slack } = require('../../utils/Webhook');
const { v4: uuidv4 } = require('uuid');
const currentDateTime = new Date();

KolabryaMagicLinkServices.sendMagicLink = async (email) => {
    try {
        const findType = await IncCaseNamesQueries.getIncCaseTypesAll()
        if (email && findType.length > 0) {
            const generatedUuid = uuidv4();
            const obj = {}
            obj.userTypeId = 2;
            obj.expiryToken = Functions.getTokenExpiry();
            obj.refreshTokenExpiry = Functions.getTokenExpiry();
            obj.email = email.toLowerCase()
            obj.subscriptionType = 3 //insurance user
            var response = await UserQueries.getUsersByEmail(obj.email);
            if (response.length === 0) {
                const stripeCustomer = await Payments.addNewCustomer(obj.email);
                obj.customerStripeId = stripeCustomer.id;
                try {
                    slack.webhook(JSON.stringify({ action: "Signed Up Insurance", timestamp: new Date(), email: obj.email }));
                } catch (e) {
                    console.log("slackPostError", e.message);
                }
                const hardcodedDateTime = new Date(2024, 11, 30); // December 31, 2024
                hardcodedDateTime.setHours(23, 59, 59, 999);
                obj.auto_join = 1;
                obj.password = await Encryption.sha256("1c4f99b6-8d3a-4465-9524-08f8321f2647");
                var result = await UserQueries.createUser(obj);
                const user_id = result.userId;
                const userUuid = result.userUuid;
                const tokenDetails = JWT.data.generate(user_id)
                const refreshTokenDetails = JWT.data.refreshToken(user_id)
                const updateToken = {
                    token: tokenDetails.token,
                    tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
                    refreshToken: refreshTokenDetails.token,
                    refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
                }
                await UserQueries.updateUser(updateToken, user_id);
                await UserPackageServices.create({
                    packageId: process.env.DEFAULT_PACKAGE_ID,
                }, user_id);
                const addCase = await InsCaseServices.addCase(generatedUuid, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [email], [], findType[0].requestUuid, user_id)
                if (addCase.statusCode == 200 && addCase.obj.requestUuid) {
                    const uuid = `${userUuid}/${addCase.obj.requestUuid}/`
                    const list = {
                        userId: user_id,
                        magicLink: `${process.env.INS_MAGIC_LINK}${uuid}`,
                        featureType: 0,
                        isSent: true
                    }
                    // console.log("uuid", uuid);
                    const createLink = await KolabryaMagicLinkQueries.add(list)
                    Emails.insuranceEmailVerification(email, uuid + createLink[0]);
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            message: Strings.MAGIC_LINK.MAGIC_LINK_SEND_SUCCESS,
                        }
                    };
                } else {
                    return addCase;
                }
            }
            else if (!response[0].isRemoved) {
                const check = await KolabryaMagicLinkQueries.findActiveLink(response[0].userId)
                console.log("check", check);
                if (check == null) {
                    const userId = response[0].userId
                    const addCase = await InsCaseServices.addCase(generatedUuid, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [email], [], findType[0].requestUuid, userId)
                    if (addCase.statusCode == 200 && addCase.obj.requestUuid) {
                        const uuid = `${response[0].userUuid}/${addCase.obj.requestUuid}/`
                        const list = {
                            userId: userId,
                            magicLink: `${process.env.INS_MAGIC_LINK}${uuid}`,
                            featureType: 0,
                            isSent: true
                        }
                        console.log("uuid", uuid);
                        const createLink = await KolabryaMagicLinkQueries.add(list)
                        Emails.insuranceEmailVerification(email, uuid + createLink[0]);

                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.MAGIC_LINK.MAGIC_LINK_SEND_SUCCESS,
                            }
                        };
                    } else {
                        return addCase;
                    }
                } else {
                    return {
                        message: Strings.MAGIC_LINK.MAGIC_LINK_ALREADY_SENT,
                        statusCode: 400,
                    };
                }
            }
            else {
                return {
                    message: Strings.ERROR.ACCESS_NOT_GRANTED,
                    statusCode: 400,
                    obj: {}
                };
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in send Magic Link ", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaMagicLinkServices.verifyLink = async (userUuid, caseUuid, linkUuid) => {
    try {
        if (userUuid && caseUuid && linkUuid) {
            const findUserId = await IncCaseNamesQueries.findCaseByUuidForMagicLink(userUuid, caseUuid)
            if (findUserId.length > 0) {
                const userId = findUserId[0].userId
                const email = findUserId[0].email
                const findLink = await KolabryaMagicLinkQueries.getDataByUuid(linkUuid, userId)
                if (findLink.length > 0 && findLink[0].isVerified == 0) {
                    await UserQueries.updateUser({ isVerified: true }, userId);
                    const tokenDetails = JWT.data.generate(userId)
                    const refreshTokenDetails = JWT.data.refreshToken(userId)
                    const updateToken = {
                        token: tokenDetails.token,
                        tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
                        refreshToken: refreshTokenDetails.token,
                        refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
                    }
                    await UserQueries.updateUser(updateToken, userId);
                    updateToken.email = email
                    updateToken.subscriptionType = 3
                    updateToken.subscription = false
                    await KolabryaMagicLinkQueries.update({ isVerified: true }, linkUuid, userId);
                    return {
                        message: Strings.SUCCESS_MESSAGES.LOGGED_IN,
                        statusCode: 200,
                        obj: updateToken
                    };
                } 
                else if(findLink.length > 0 && findLink[0].isVerified == 1){
                    return {
                        message: Strings.MAGIC_LINK.MAGIC_LINK_ALREADY_VERIFIED,
                        statusCode: 400,
                    }
                }
                else if(findLink.length > 0 && findLink[0].isExpired == 1){
                    return {
                        message: Strings.MAGIC_LINK.MAGIC_LINK_EXPIRED,
                        statusCode: 400,
                    }
                }
                else {
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
                }
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error while verify link", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

KolabryaMagicLinkServices.disAbleLink = async () => {
    try {
        const data = await KolabryaMagicLinkQueries.deActiveLink();
        if (data.length > 0) {
            console.log("*********************************");
            console.log("Job Started to Disable Magic Link");
            console.log("*********************************");
            for (const element of data) {
                await KolabryaMagicLinkQueries.update({ isExpired: true, updateAt: currentDateTime}, element.requestUuid, element.userId);
            }
            console.log("*******************************");
            console.log("Job Ended to Disable Magic Link");
            console.log("*******************************");
        } else {
            console.log("*************************************");
            console.log("No Record Found For Disable Magic Link");
            console.log("*************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    }
    catch (error) {
        console.log("Error while disable Link", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = KolabryaMagicLinkServices;