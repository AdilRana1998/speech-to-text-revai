const AdminServices = {};
const { Strings } = require('../../utils')
const {
    UserQueries,
    CaseNamesQueries
} = require('../queries');
const {
    fetchCase
} = require('../services/caseFile.services');
const {
    viewResponse
} = require('../services/caseFile.services');

AdminServices.createAdmin = async (data, userId) => {
    try {
        if (data) {
            const result = await UserQueries.getActiveUser(data)
            if (result.length > 0 && result[0].userTypeId == '2') {
                const obj = {
                    userTypeId: 1
                }
                const admin = await UserQueries.makeAdminFromEmail(obj, data)
                if (admin[0] == '1') {
                    return {
                        statusCode: 200,
                        message: Strings.RECORD_UPDATE_SUCCESS,
                        obj: result
                    }
                } else {
                    return {
                        message: Strings.ERROR.RECORD_UPDATE_ERROR,
                        statusCode: 400,
                        obj: {
                            error: admin
                        }
                    }
                }
            }
            else if (result.length > 0 && result[0].userTypeId == '1') {
                return {
                    statusCode: 200,
                    message: Strings.USER.ADMIN.ALREADY_ADMIN,
                    obj: {}
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }

    } catch (error) {
        console.log("error in making admin user from email", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

AdminServices.editAdmin = async (adminEmail, userEmails, userId) => {
    try {
        if (adminEmail) {
            const result = await UserQueries.verifyAdminUserByEmail(adminEmail)
            if (result.length > 0 && result[0].userTypeId == '1') {
                const adminUserId = result[0].userId;
                const promises = userEmails.map(async (element) => {
                    const obj = {
                        createdBy: adminUserId
                    };
                    return await UserQueries.connectingAdminWithTheirUsers(obj, element);
                });
                const results = await Promise.all(promises);
                const responseDetails = userEmails.map((email, index) => {
                    return {
                        email: email,
                        status: results[index][0] === 1 ? Strings.RECORD_UPDATE_SUCCESS : Strings.ERROR.RECORD_UPDATE_ERROR
                    };
                });
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: responseDetails
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in adding users in admin account", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

AdminServices.getAdminAllUser = async (userType, userId) => {
    try {
        const result = await UserQueries.verifyAdminUserByUserId(userId);
        if (result.length > 0 && userType == 'admin') {
            const data = await UserQueries.getUserByCreatedBy(userId)
            if (data.length > 0) {
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: data
                }
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting all user's of admin", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

AdminServices.deletAdminUser = async (userUUid, userId) => {
    try {
        if (userUUid) {
            const result = await UserQueries.verifyAdminUserByUserId(userId)
            if (result.length > 0) {
                const data = await UserQueries.findUserWithUuid(userUUid)
                if (data.length > 0) {
                    const obj = {
                        isRemoved: 1
                    }
                    const find = await UserQueries.updateAdminUserByUUID(obj, userUUid, userId)
                    if (find[0] == '1') {
                        return {
                            statusCode: 200,
                            message: Strings.RECORD_DELETED_SUCCESS,
                            obj: {}
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
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in deleting user's of admin", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

AdminServices.verifyAdmin = async (email, password, userId) => {
    try {
        console.log(email, password, userId);
        if (password) {
            const result = await UserQueries.verifyAdminUserByEmail(email)
            if (result.length > 0 && result[0].userTypeId == '1') {
                const data = await UserQueries.verifyAdminLogin(email, password, userId)
                if (data.length > 0) {
                    return {
                        message: Strings.SUCCESS,
                        statusCode: 200,
                        obj: {
                            status: true
                        }
                    }
                } else {
                    return {
                        message: Strings.ERROR.INVALID_PASSWORD,
                        statusCode: 400,
                        obj: {}
                    }
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in verifing admin account", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

AdminServices.getAdminsWithUsers = async (userType) => {
    try {
        const adminData = [];
        const result = await UserQueries.getAllAdmins()
        if (result.length > 0) {
            const promises = result.map(async element => {
                const data = await UserQueries.getUserByCreatedBy(element.userId)
                const email = element.email;
                const userUuid = element.userUuid;
                adminData.push({
                    admin: { userUuid, email },
                    users: data
                })
            });
            const results = await Promise.all(promises);
            if (results.length > 0) {
                return {
                    statusCode: 200,
                    message: Strings.SUCCESS,
                    obj: adminData
                }
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                }
            }
        }
        else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting all user's of admin", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

AdminServices.AdminUsersCase = async (userType, userUUid, userId) => {
    try {
        if (userUUid) {
            const result = await UserQueries.verifyAdminUserByUserId(userId)
            if (result.length > 0 && userType == 'admin' ) {
                const data = await UserQueries.findUserWithUuid(userUUid);
                if (data.length > 0) {
                    return await fetchCase('', '', '', data[0].userId);
                }else{
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting case's of admin user's", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

AdminServices.AdminUsersResponses = async (userType, caseUUid, userId) => {
    try {
        if (caseUUid) {
            const result = await UserQueries.verifyAdminUserByUserId(userId)
            if (result.length > 0 && userType == 'admin' ) {
                const data = await CaseNamesQueries.findUserIdWithCaseUuid(caseUUid);
                if (data.length > 0) {
                    return await viewResponse(caseUUid, '', '', data[0].userId);
                }else{
                    return {
                        message: Strings.ROOM.EMPTY,
                        statusCode: 200,
                        obj: {}
                    }
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
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting case's of admin user's", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

module.exports = AdminServices
