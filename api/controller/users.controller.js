const Controller = {}
const { sendStatus, Strings} = require('../../utils')
const db = require('../model');
const Users = db.users;
const { urls, filePath } = require('../../config')
const { JWT, Functions, ErrorHandling, Encryption } = require('../../utils')
const {
    UserServices
} = require('../services')
const { chat } = require('../external/index');

Controller.getAll = async (req, res, next) => {
    try {
        var result = await UserServices.getUsers();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getAll", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.chatwithpython = async (req, res, next) => {
    try {
        let res2= await chat(req.jsonObject);
        res.status(200).json(JSON.parse(res2));
        // sendStatus.data.sortStatus(res, req, result.obj, result.message, "getAll", result.statusCode);

    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.authValidation = async (req, res, next) => {
    try {
        const result = {
            obj: {},
            message: "Validated",
            statusCode: 200,
        };
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "authValidation", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getUserInfo = async (req, res, next) => {
    try {
        const result = await UserServices.getUser(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getUserInfo", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        var handledErrorMessage = ErrorHandling.sequelError(e.errors);
        e.message = handledErrorMessage ? handledErrorMessage : e.message;
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.verifyUser = async (req, res, next) => {
    try {
        const result = await UserServices.verifyUser(req.params.id);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "verifyUser", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.postUser = async (req, res, next) => {
    try {
        const result = await UserServices.postUser(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "postUser", result.statusCode);

    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getStripeIntent = async (req, res, next) => {
    try {
        const result = await UserServices.getStripeIntent(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getStripeIntent", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.listPaymentMethods = async (req, res, next) => {
    try {
        const result = await UserServices.listPaymentMethods(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "list-payment-methods", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.postUserWithImage = async (req, res, next) => {
    try {
        const hardcodedDateTime = new Date(2024, 2, 29, 12, 0, 0); 
        hardcodedDateTime.setHours(19, 59, 59, 999);
        const file = req.file;
        const obj = req.jsonObject;
        obj.profilePic = file.filename;
        obj.userTypeId = 2;
        obj.expiryToken = Functions.getTokenExpiry();
        obj.refreshTokenExpiry = Functions.getTokenExpiry();
        // const sevenDaysLater = new Date(new Date().setDate(new Date().getDate() + 7));
        // obj.paymentExpiry = sevenDaysLater.toISOString().split('T')[0];
        obj.paymentExpiry = hardcodedDateTime.toISOString();
        var response = await Users.findAll({
            where: {
                email: obj.email,
                // usersTypeId: 3
            },
            attributes: ['userId'],
        });
        if (response.length === 0) {
            obj.password = await Encryption.sha256(obj.password);

            //adding customer to stripe dashboard
            var result = await Users.create(obj);
            //create balance entry as well;
            await Balances.create({
                userId: result.userId
            })
            const user_id = result.userId;
            const updateToken = {
                token: JWT.data.generate(user_id),
                refreshToken: JWT.data.refreshToken(user_id),
            }
            // Emails.emailVerification(obj.email, result.userUuid);
            //token will update here
            await Users.update(updateToken, {
                where: {
                    userId: user_id
                }
            });
            //token updated
            result = {
                userName: obj.userName,
                email: result.email,
                token: updateToken.token,
                refreshToken: updateToken.refreshToken,
                profilePic: urls.backend + filePath + file.filename
            }
            sendStatus.data.successStatus(res, req, result, "Successful signed up", 'postUser');
        } else {
            sendStatus.data.badRequestStatus2(res, req, {}, "Email address already exists", 'postUser');
        }

    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.uploadUserImage = async (req, res, next) => {
    try {
        //#swagger.tags = ['User']
        const result = await UserServices.uploadImage(req.userId, req.file)
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "uploadUserImage", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        var handledErrorMessage = ErrorHandling.sequelError(e.errors);
        e.message = handledErrorMessage ? handledErrorMessage : e.message;
        req.logger.exception.message = e.message;
        next(e);
    }
}
Controller.uploadStandAloneImage = async (req, res, next) => {
    try {
        //#swagger.tags = ['User']
        const result = await UserServices.uploadStandAloneImage(req.file)
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "uploadStandAloneImage", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.updateInformation = async (req, res, next) => {
    try {
        const result = await UserServices.updateUser(req.jsonObject, req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'updateInformation', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.deActivateUser = async (req, res, next) => {
    const result = await UserServices.deActivateUser(req.jsonObject);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, 'deActivateUser', result.statusCode);
}

Controller.subscription = async (req, res, next) => {
    const result = await UserServices.subscription(req.jsonObject);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, 'subscription', result.statusCode);
}

Controller.updatedOpenPassword = async (req, res, next) => {
    try {
        const obj = req.jsonObject;
        if(obj.password !== obj.confirm_password){
            sendStatus.data.sortStatus(res, req,{}, "Password and Confirm password must be same.", 'updatedOpenPassword', 400);
        }
        const result = await UserServices.openPasswordUpdated(obj, req.email);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'updatedOpenPassword', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.passwordUpdated = async (req, res, next) => {
    try {
        const result = await UserServices.passwordUpdated(req.jsonObject, req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'passwordUpdated', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.userLogin = async (req, res, next) => {
    try {
        const result = await UserServices.login(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'userLogin', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}
Controller.resendVerificationEmail = async (req, res, next) => {
    try {
        const email = req.jsonObject?.email;
        const result = await UserServices.ResendEmail(email);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'resendVerificationEmail', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.userInfoEncryption = async (req, res, next) => {
    try {
        const result = await UserServices.encryptInformation();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'userInfoEncryption', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.googleAuth = async (req, res, next) => {
    try {
        const result = await UserServices.googleAuth();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'googleAuth', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.googleAuthToken = async (req, res, next) => {
    try {
        const result = await UserServices.googleAuthToken(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'googleAuthToken', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.userInfoEncryption = async (req, res, next) => {
    try {
        const result = await UserServices.encryptInformation();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'userInfoEncryption', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}


Controller.userInfoEncryptionRooms = async (req, res, next) => {
    try {
        const result = await UserServices.encryptInformationRooms(req.body.start,req.body.end);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'userInfoEncryptionRooms', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.Encryption = async (req, res, next) => {
    try {
        const result = await UserServices.Encryption(req.body.data);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'userInfoEncryptionRooms', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.EncryptionCollective = async (req, res, next) => {
    try {
        const result = await UserServices.EncryptionCollective(req.body.data);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'userInfoEncryptionRooms', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.encryptModule = async (req, res, next) => {
    try {
        const result = await UserServices.encryptModule(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'encryptModule', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.socialLogin = async (req, res, next) => {
    try {
        const result = await UserServices.socialLogin(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'socialLogin', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.createPrompt = async (req, res, next) => {
    try {
        const result = await UserServices.createPrompt(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'createPrompt', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.createSinglePrompt = async (req, res, next) => {
    try {
        const result = await UserServices.createSinglePrompt(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'createSinglePrompt', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getPrompts = async (req, res, next) => {
    try {
        const result = await UserServices.getPrompts();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'getPrompts', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getPromptType = async (req, res, next) => {
    try {
        const result = await UserServices.getPromptType();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'getPromptType', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getPromptsRequest = async (req, res, next) => {
    try {
        const result = await UserServices.getPromptsRequest();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'getPromptsRequest', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.guestLogin = async (req, res, next) => {
    try {
        const jsonObject = {
            "email": "",
            "password": ""
        }
        // const jsonObject = {
        //     "email": "guest@mailinator.com",
        //     "password": "guest123@@!!"
        // }
        const result = await UserServices.guestLogin(jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'guestLogin', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.adminLogin = async (req, res, next) => {
    try {
        const result = await UserServices.adminLogin(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'adminLogin', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}


Controller.getpopupStatus = async (req, res, next) => {
    try {
        const result = await UserServices.getPopup(req.userId);
        result.obj.newUser === 1 ? result.obj.newUser = true : result.obj.newUser = false;
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Popup-Info", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
    }
}

Controller.setpopupStatus = async (req, res, next) => {
    try {
        const result = await UserServices.setPopup(req.userId, req.body.newUser);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "Set-Popup-Info", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
    }
}

Controller.setBotName = async (req, res, next) => {
    try {
        const result = await UserServices.botName(req.userId, req.body.botName);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Bot-Name", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
    }
}


Controller.getBotName = async (req, res, next) => {
    try {
        const result = await UserServices.retrivebotName(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Bot-Name", result.statusCode);
    } catch (e) {
        console.log("errorMessage", e.message);
        req.logger.exception.message = e.message;
    }
}

Controller.getAsstPrompt = async (req, res, next) => {
    const type = req.params.type
    const result = await UserServices.fetchPrompt(type)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-Prompt-By-Type", result.statusCode);
}

Controller.getLLMPrompt = async (req, res, next) => {
    const type = req.params.type
    const result = await UserServices.getLLMPrompt(type)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Get-LLM-Prompt-By-Type", result.statusCode);
}

Controller.postCitation = async (req, res, next) => {
    const result = await UserServices.postCitation(req.jsonObject, req.userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "postCitation", result.statusCode);
}

Controller.getCitation = async (req, res, next) => {
    const result = await UserServices.getCitation(req.userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "getCitation", result.statusCode);
}

Controller.refreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.jsonObject.refreshToken;
        const result = await UserServices.refreshToken(refreshToken);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, 'refreshToken', result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

module.exports = Controller;