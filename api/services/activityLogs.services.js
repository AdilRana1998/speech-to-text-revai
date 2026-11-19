const ActivityLogServices = {};
const { Strings } = require('../../utils')
const {
    ActivityLogs, 
} = require('../queries');

ActivityLogServices.createActivity = async (activityType, status, userId) => {
    try {
        const data = { 
            activityType: activityType, 
            status: status,
            userId: userId
        }
        const result = await ActivityLogs.create(data);
        return {
            statusCode: 200,
            message: Strings.SUCCESS,
            obj: result
        }

    } catch (error) {
        console.log("error in adding activity log", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

ActivityLogServices.createActivityType = async (route, title, description) => {
    try {
        const data = { 
            route: route, 
            title: title,
            description: description,
        }
        const result = await ActivityLogs.createTypes(data);
        return {
            statusCode: 200,
            message: Strings.SUCCESS,
            obj: result
        }

    } catch (error) {
        console.log("error in adding activity types", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

ActivityLogServices.getAllActivityTypes = async () => {
    try {
        const data = await ActivityLogs.getAllTypes();
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

ActivityLogServices.getActivityTypeId = async (route) => {
    try {
        const data = await ActivityLogs.getTypeByRoute(route)
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

ActivityLogServices.getUserScreen = async (userId) => {
    try {
        const data = await ActivityLogs.findUserScreen(userId)
        if (data.length > 0) {
            const result = await ActivityLogs.getActivityTitleById(data[0].activityType)
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: {
                    screen_name: result[0].title ? result[0].title : 'no title found'
                }                
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting user current screen name", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

ActivityLogServices.getUserLoginCount = async (userId) => {
    try {
        const data = await ActivityLogs.CountUserLogin(userId)
        return {
            statusCode: 200,
            message: Strings.SUCCESS,
            obj: {
                login_count: data
            }                
        }
    } catch (error) {
        console.log("error in getting user login count", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = ActivityLogServices
