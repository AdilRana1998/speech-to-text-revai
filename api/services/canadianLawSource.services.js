const CanadianLawServices = {};
const {
    CanadianLawQueries
} = require('../queries');
const { Strings, Logger } = require('../../utils')
const {
    createResponse
} = require('../external/ChatGPT')
const { slack } = require('../../utils/Webhook');
const retryLimit = process.env.API_CALL_LIMITS;

CanadianLawServices.getPendingData = async () => {
    const data = await CanadianLawQueries.getPendingData();
    try {
        if (data.length > 0) {
            console.log("*********************************************************");
            console.log("Job Started For Kolabrya Canadian Law Source Map from A2A");
            console.log("*********************************************************");
            const request = data[0].request;
            await CanadianLawQueries.update({ status: 'in_progress' }, data[0].id);
            const response = await createResponse(JSON.parse(request));
            console.log({ response });
            if (response.error) {
                throw new Error(response.error.message);
            }
            const actualTextIndex = response.output.findIndex(item => item.type === 'message');
            const actualText = response.output[actualTextIndex].content.find(part => part.type === 'output_text').text;
            await CanadianLawQueries.update({ status: 'completed', responseId: response.id, response: actualText }, data[0].id);
            console.log("***********************************************************");
            console.log("Job Completed For Kolabrya Canadian Law Source Map from A2A");
            console.log("***********************************************************");
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {}
            };
        } else {
            console.log("*************************************************************");
            console.log("No Record Found For Kolabrya Canadian Law Source Map from A2A");
            console.log("*************************************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error in findRecord for canadian law source", error);
        await CanadianLawQueries.update({ status: 'pending', retryCount: data[0].retryCount + 1 }, data[0].id);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CanadianLawServices.getChatHistory = async (userId) => {
    const data = await CanadianLawQueries.chatHistory(userId);
    data.forEach(element => {
        element.userMessage = JSON.parse(element.request).input;
        delete element.request
    });
    try {
        return {
            message: "Success",
            statusCode: 200,
            obj: data
        }
    } catch (error) {
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CanadianLawServices.getRequestStatus = async (userId) => {

    const data = await CanadianLawQueries.requestStatus(userId);
    try {
        return {
            message: "Success",
            statusCode: 200,
            obj: data
        }
    } catch (error) {
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CanadianLawServices.createRequest = async (userId, obj = {}) => {
    const gptRequest = {
        model: "gpt-5",
        input: obj.userQuery,
        tools: [
            {
                type: "mcp",
                server_label: "a2aj",
                server_url: "https://api.a2aj.ca/mcp",
                require_approval: "never",
            }
        ],
        previous_response_id: null
    }
    const pastRecord = await CanadianLawQueries.getLastMessageChatHistory(userId);
    console.log({ pastRecord });
    if (pastRecord.length > 0) {
        gptRequest.previous_response_id = pastRecord[0].responseId;
    }
    const requestObject = {
        userId: userId,
        status: 'pending',
        retryCount: 0,
        request: JSON.stringify(gptRequest),
        response: null,
        responseId: null,
    }
    const data = await CanadianLawQueries.createPrompt(requestObject);
    try {
        return {
            message: "Success",
            statusCode: 200,
            obj: data
        }
    } catch (error) {
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

CanadianLawServices.clearOut = async (userId) => {
    try {
        await CanadianLawQueries.updateByUserId({ isDeleted: true }, userId);
        return {
            message: "Chat cleared successfully",
            statusCode: 200,
            obj: {}
        }
    } catch (error) {
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = CanadianLawServices;