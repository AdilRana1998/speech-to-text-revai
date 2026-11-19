const { Logger, Encryption, sendStatus, Validations, Strings } = require('../../utils')
const JWT = require('../../utils/jwt')
const multer = require('multer');
const {
    ActivityLogs,
    KolabryaGrokQueries
} = require('../queries');
const { createActivity } = require('../services/users.services');

const {
    UserQueries,
    UserGroupQueries
} = require('../queries');
const { slack } = require('../../utils/Webhook');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
exports.upload = multer({ storage: storage });
exports.uploadAny = multer({ storage: storage })




exports.openApi = async (req, res, next) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        // console.log("IP 1", ip);
        // console.log("IP 2", req.headers['x-forwarded-for']);
        // console.log("IP 3", req.ip);
        const body = Encryption.responseDecryption(req.body)
        // need to write own code;
        req.jsonObject = body;
        req.logger = {};
        req.logger.url = req.url
        req.logger.request = body ? body : {};
        req.clientIp = ip;
        req.logger.exception = {
            message: ""
        };
        next();
    } catch (e) {
        var response = {
            code: 440,
            message: "Something went wrong in authorization"
        }
        sendStatus.data.sessionExpiredStatus(res, req, response)
    }
} 


exports.authValidation = async (req, res, next) => {
    try {
        const body = Encryption.responseDecryption(req.body || {})
        //need to write own code;
        req.jsonObject = body;
        req.logger = {};
        req.logger.url = req.url
        req.logger.request = body;
        req.logger.exception = {
            message: ""
        };
        if (req.headers.authorization) {
            var userInfo = await JWT.data.getIdFromToken(req.headers.authorization)
            if (userInfo.status) {
                const getEmailAddress = await UserQueries.getUser(userInfo.id)
                req.subscription = getEmailAddress.subscription == 1 ? true : false
                req.userId = userInfo.id
                req.email = getEmailAddress?.email ? getEmailAddress?.email : ''
                if (getEmailAddress.groupId && getEmailAddress.subscriptionType === 1) {
                    const groupUsers = [];
                    req.isGroup = true
                    const getGroupDetails = await UserQueries.findUserIdsFromGroupId(getEmailAddress.groupId);                    
                    const getGroupName = await UserGroupQueries.getGroupById(getEmailAddress.groupId);                    
                    for (let index = 0; index < getGroupDetails.length; index++) {
                        const element = getGroupDetails[index];
                        groupUsers.push(element.userId);
                    }
                    req.groupUsers = groupUsers;
                    req.groupName = getGroupName.groupName;
                    req.groupId = getEmailAddress.groupId;
                    // console.log("======= Group Details Investigation =======");
                    // console.log("Group Users:", groupUsers);
                    // console.log("Group Name :", req.groupName);
                    // console.log("Group Id   :", req.groupId);
                    // console.log("======= Group Details Investigation =======");
                }
                if (getEmailAddress?.companyId) {
                    const companyUsers = [];
                    req.isCompany = true
                    const getCompanyDetails = await UserQueries.findUserIdFromCompanyId(getEmailAddress.companyId);
                    for (let index = 0; index < getCompanyDetails.length; index++) {
                        const element = getCompanyDetails[index];
                        companyUsers.push(element.userId);
                    }
                    req.companyUsers = companyUsers;
                    req.companyName = getCompanyDetails[0].companyName;
                    req.companyId = getCompanyDetails[0].companyId;
                    // console.log("======= Company Details =======");
                    // console.log("Company Users :", companyUsers);
                    // console.log("Company Name  :", req.companyName);
                    // console.log("Company Id    :", req.companyId);
                    // console.log("======= Company Details =======");
                }
                if (getEmailAddress?.firmId) {
                    const firmUsers = [];
                    const firmAssistant = [];
                    req.isFirm = true
                    const getFirmDetails = await UserGroupQueries.getAllFirmRecordsById(getEmailAddress?.firmId);
                    for (let index = 0; index < getFirmDetails.length; index++) {
                        const element = getFirmDetails[index];
                        if (element.userTypeId == 4) {
                            firmUsers.push(element.userId);
                        } else if (element.userTypeId == 3){
                            firmAssistant.push(element.userId);
                        }
                    }
                    req.firmUsers = firmUsers;
                    req.firmAssistant = firmAssistant;
                    req.firmName = getFirmDetails[0].firmName;
                    req.firmId = getEmailAddress?.firmId;
                    // console.log("======= Firm Details =======");
                    // console.log("Firm Assist:", firmAssistant);
                    // console.log("Firm Users :", firmUsers);
                    // console.log("Firm Name  :", req.firmName);
                    // console.log("Firm Id    :", req.firmId);
                    // console.log("======= Firm Details =======");
                }
                if (getEmailAddress.groupId && getEmailAddress.subscriptionType === 3) {
                    const groupUsers = [];
                    req.isInsGroup = true
                    const getGroupDetails = await UserQueries.findUserIdsFromGroupId(getEmailAddress.groupId);                    
                    const getGroupName = await UserGroupQueries.getGroupById(getEmailAddress.groupId);                    
                    for (let index = 0; index < getGroupDetails.length; index++) {
                        const element = getGroupDetails[index];
                        groupUsers.push(element.userId);
                    }
                    req.groupUsers = groupUsers;
                    req.groupName = getGroupName.groupName;
                    req.groupId = getEmailAddress.groupId;
                    // console.log("======= Group Details Insurance =======");
                    // console.log("Group Users:", groupUsers);
                    // console.log("Group Name :", req.groupName);
                    // console.log("Group Id   :", req.groupId);
                    // console.log("======= Group Details Insurance =======");
                }
                if (getEmailAddress.userTypeId == 1) {
                    req.userType = 'admin';
                } 
                else if (getEmailAddress.userTypeId == 2) {
                    req.userType = 'user';
                } 
                else if (getEmailAddress.userTypeId == 3) {
                    req.userType = 'assistant';
                } 
                else if (getEmailAddress.userTypeId == 4) {
                    req.userType = 'assistant-user';
                }
                else{
                    req.userType = 'user';
                }
                req.logger.userId = req.userId
                req.logger.email = req.email
                next();
            }
            else {
                var response = {
                    code: 401,
                    message: "We signed you out to protect your account, please Sign In again!",
                    obj: userInfo,
                    // req: req?.headers?.authorization
                }
                sendStatus.data.sessionExpiredStatus(req, res, response)
            }
        } 
        else if(req.headers['session-id']) {
            req.userId = req.headers['session-id']
            req.subscription = false
            req.logger.userId = req.userId
            const findUser = await KolabryaGrokQueries.findUser(req.userId)
            if (findUser == null) {
                slack.webhook(JSON.stringify({ action: "Session User", timestamp: new Date(), 'Session-Id': req.userId }));
            }
            next();
        }
        else {
            var response = {
                code: 401,
                message: "No Token found"
            }
            sendStatus.data.sessionExpiredStatus(req, res, response)
        }
    } catch (e) {        
        var response = {
            code: 440,
            message: "Something went wrong in authorization",
            codeMessage: e.message
        }
        sendStatus.data.sessionExpiredStatus(req, res, response)
    }
}

exports.jsonValidation = (req, res, next) => {
    try {
        var valid = Validations.JsonSchema.jsonValidator(req.jsonObject, req.url.toString());
        if (valid.status) {
            next();
        } else {
            const json_res = {
                code: 400,
                message: "Json Validation Error"
            }
            sendStatus.data.badRequestStatus(res, req, json_res, "Json Validation Error")
        }
    } catch (e) {
        console.log("errorMessage", e.message);
        var response = {
            code: 440,
            message: "Something went wrong in json Validation"
        }
        sendStatus.data.sessionExpiredStatus(res, req, response)
    }
}
 
exports.ActivityLog = async (req, res, next) => {
    try {
        const route = req.url;
        const userId = req.userId;
        // console.log("route");
        // console.log("route >>*", route);
        // console.log("route");
        if (route === '/access/b5c7d2e1' || route === '/access/improve-prompt' || route === '/access/research') {
            const originalSend = res.send;
            res.send = async function (data) {
                const responseData = JSON.parse(data);
                const statusCode = responseData.code
                if (statusCode == '200') {
                    const assistantType = responseData.body.kolabryaAssistant
                    await createActivity(assistantType, 1, userId);
                }
                originalSend.apply(res, arguments);
            }
        }
        else if(route === '/otp/verification'){
            const originalSend = res.send;
            res.send = async function (data) {
                const responseData = JSON.parse(data);
                const statusCode = responseData.code
                if (statusCode == '200') {
                    const data = await ActivityLogs.getTypeByRoute(route)
                    if (data.length > 0 ) {
                        const activityId = data[0].id;
                        const getUserId = responseData.body.userId;
                        await createActivity(activityId, 1, getUserId);
                    }
                }
                originalSend.apply(res, arguments);
            }
        }
        else{
            const data = await ActivityLogs.getTypeByRoute(route)
            if (data.length > 0 ) {
                const activityId = data[0].id
                await createActivity(activityId, 1, userId);
            }
        }
        next();
    } catch (error) {
        console.log("error in storing activity logs", error);
        var response = {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
        sendStatus.data.sessionExpiredStatus(res, req, response)
    }
}