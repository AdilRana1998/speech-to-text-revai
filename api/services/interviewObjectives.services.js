const InterviewObjectivesServices = {};
const {
    InterViewObjectives
} = require('../queries');
const { createActivity } = require('../services/activityLogs.services');
const { Strings } = require('../../utils');

InterviewObjectivesServices.pushObjectives = async (all_objectives, userId) => {
    try {
        if (all_objectives.length >= 1 && all_objectives.length <= 10) {
            let data = {}
            let updateObjective;
            const nullElements = await InterviewObjectivesServices.checkNullElement(all_objectives);
            if (nullElements) {
                let insertionResults = [];
                let outputArray = [];
                if (all_objectives[0].id) {
                    for (const objective of all_objectives) {
                        const data = {
                            objective: objective.objective,
                            userId: userId
                        }
                        updateObjective = await InterViewObjectives.updateObjectiveById(data, userId, objective.id);
                    }
                    if (updateObjective == 1) {
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.RECORD_UPDATE_SUCCESS,
                            }
                        }
                    }
                    else {
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 400,
                            obj: {
                                message: Strings.ERROR.RECORD_UPDATE_ERROR,
                            }
                        }
                    }
                }
                else {
                    for (const objective of all_objectives) {
                        const data = {
                            objective: objective.objective,
                            userId: userId
                        }
                        const [insertedObjective, created] = await InterViewObjectives.addObjectives(data);
                        outputArray.push({ objective: insertedObjective.dataValues.objective, objectiveUuid: insertedObjective.dataValues.objectiveUuid });
                        insertionResults.push({ objective: insertedObjective.dataValues.objective, created: created });
                    }
                    const allInsertionsSuccessful = insertionResults.every(result => result.created);
                    if (allInsertionsSuccessful || !allInsertionsSuccessful) {
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 200,
                            obj: {
                                message: Strings.SUCCESS_MESSAGES.RECORD_INSERT_SUCCESS,
                                data: outputArray
                            }
                        };
                    } else {
                        return {
                            message: Strings.SUCCESS,
                            statusCode: 400,
                            obj: {
                                message: Strings.ERROR.RECORD_UPDATE_ERROR,
                                error: allInsertionsSuccessful
                            }
                        };
                    }
                }

            } else {
                return {
                    message: Strings.NULL_ELEMENTS,
                    statusCode: 400,
                    obj: {}
                };
            }
        } else {
            return {
                message: Strings.OBJECTIVE.OBJECTIVE_LENGTH,
                statusCode: 400,
                obj: {}
            };
        }
    } catch (error) {
        console.log("Error in adding objectives", error.message);
        return {
            message: Strings.SUCCESS,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

InterviewObjectivesServices.getRoomObjectives = async (botId, userId) => {
    try {
        const result = await InterViewObjectives.getObjectives(botId, userId);
        if (result.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in getting room objectives", error.message);
        return {
            message: Strings.SUCCESS,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

InterviewObjectivesServices.checkNullElement = async (all_objectives) => {
    if (all_objectives.some(obj => obj.objective === null || obj.objective === '')) {
        return false
    }
    else {
        return true;
    }
}

InterviewObjectivesServices.getRoomAllObjectives = async (userId) => {
    try {
        const result = await InterViewObjectives.getallObjectives(userId);
        if (result.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in getting room all objectives", error.message);
        return {
            message: Strings.SUCCESS,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

InterviewObjectivesServices.deleteObjective = async (userId, delete_objective) => {
    try {
        const data = {
            status: 0
        }
        const result = await InterViewObjectives.deleteByObjective(data, userId, delete_objective);
        if (result[0] == 1) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.RECORD_DELETED_SUCCESS
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
        console.log("Error in deleting objectives", error.message);
        return {
            message: Strings.SUCCESS,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

InterviewObjectivesServices.updateObjective = async (userId, objectiveId, objective) => {
    try {
        const data = {
            objective: objective
        }
        const result = await InterViewObjectives.updateObjectiveById(data, userId, objectiveId);
        if (result[0] == 1) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.RECORD_UPDATE_SUCCESS
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
        console.log("Error in updating objectives", error.message);
        return {
            message: Strings.SUCCESS,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

module.exports = InterviewObjectivesServices;