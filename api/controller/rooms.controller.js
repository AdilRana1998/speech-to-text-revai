const Controller = {}
const { sendStatus, Logger } = require('../../utils')
const {
    RoomServices
} = require('../services')

Controller.webhook = async (req, res, next) => {
    try {
        var result = await RoomServices.webhook(req.url, req.body);
        sendStatus.data.sortStatus(res, req, {}, result.message, "RecallWebhook", result.statusCode);
        if (result.obj.sentence) {
            if (result.obj.type === "end") {
                RoomServices.endTranscriptProcessAsync(result.obj.sentence, result.obj.room)
                    .catch(e => {
                        Logger.data.chatGPT({ errorMessage: e.message, botId: result.obj.room.botId }, "endTranscriptProcessAsync")
                    })
            } else {
                RoomServices.transcriptProcessAsync(result.obj.sentence, result.obj.room).catch(e => {
                    Logger.data.chatGPT({ errorMessage: e.message, botId: result.obj.room.botId }, "transcriptProcessAsync")
                })
            }

        }
    } catch (e) {
        next(e);
    }
}

Controller.transcriptProcessAsync = async (req, res, next) => {
    try {
        await RoomServices.transcriptProcessAsync(req.jsonObject.sentence, req.jsonObject.room);
        sendStatus.data.sortStatus(res, req, {}, "message", "transcriptProcessAsync", 200);
    } catch (e) {
        next(e);
    }
}

Controller.getFinalSummaryBP = async (req, res, next) => {
    try {
        await RoomServices.getFinalSummaryBP();
        sendStatus.data.sortStatus(res, req, {}, "message", "getFinalSummaryBP", 200);
    } catch (e) {
        next(e);
    }
}

Controller.getShellScript = async (req, res, next) => {
    try {
        const botId = req.params.botId
        const result = await RoomServices.getScriptLogs(botId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getShellScript", result.statusCode);
    } catch (e) {
        next(e);
    }
}

Controller.endTranscriptProcessAsync = async (req, res, next) => {
    try {
        await RoomServices.endTranscriptProcessAsync(req.jsonObject.sentence, req.jsonObject.room);
        sendStatus.data.sortStatus(res, req, {}, "message", "endTranscriptProcessAsync", 200);
    } catch (e) {
        next(e);
    }
}

Controller.keywordsProcessTest = async (req, res, next) => {
    try {
        console.log("******** testing keywords **********", req.jsonObject);
        await RoomServices.keywordsProcessTest(req.jsonObject.summary, req.jsonObject.botId, req.jsonObject.roomId, req.jsonObject.userId);
        sendStatus.data.sortStatus(res, req, {}, "message", "keywordsProcessTest", 200);
    } catch (e) {
        next(e);
    }
}
 
Controller.createRooms = async (req, res, next) => {
    try {
        var result = await RoomServices.createBot(req.jsonObject, req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "createRooms", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.createByEmail = async (req, res, next) => {
    try {
        var result = await RoomServices.createEmailBot(req.jsonObject, req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "createByEmail", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.runQueryLog = async (req, res, next) => {
    try {
        var result = await RoomServices.runQueryLog(req.jsonObject, req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "runQueryLog", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.retrieveBot = async (req, res, next) => {
    try {
        var result = await RoomServices.getRoomByBot(req.params.botId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "retrieveBot", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.removeBotMeeting = async (req, res, next) => {
    try {
        var result = await RoomServices.removeBotfromMeeting(req.jsonObject.botId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "removeBotMeeting", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.retrieveAllBot = async (req, res, next) => {
    try {
        var result = await RoomServices.retrieveAllBot();
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "retrieveAllBot", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getRooms = async (req, res, next) => {
    try {
        var result = await RoomServices.getRooms(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getRooms", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getRoomsWithDates = async (req, res, next) => {
    try {
        var result = await RoomServices.getRoomsWithDates(req.userId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getRoomsWithDates", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getRoomUser = async (req, res, next) => {
    try {
        var result = await RoomServices.getRoomUser(req.jsonObject.botId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getRoomUser", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getRoom = async (req, res, next) => {
    try {
        const roomId = req.params.roomId
        var result = await RoomServices.getRoom(roomId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getRoom", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}


Controller.updateRooms = async (req, res, next) => {
    try {
        var result = await RoomServices.updateRoom(req.jsonObject.obj, req.jsonObject.roomId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "updateRooms", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.botChatMessage = async (req, res, next) => {
    try {
        var result = await RoomServices.botChatMessage(req.jsonObject);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "botChatMessage", result.statusCode);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.updateRoomByBot = async (req, res, next) => {
    try {
        //console.log(req.body,req.jsonObject);
        var result = await RoomServices.updateRoomByBot(req.body.obj, req.body.botId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "updateRooms", 200);
    } catch (e) {
        req.logger.exception.message = e.message;
        next();
    }
}

Controller.deleteRoomByBot = async (req, res, next) => {
    try {
        var result = await RoomServices.deleteRoomByBot(req.body.botId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "deleteRooms", 200);
    } catch (e) {
        req.logger.exception.message = e.message;
        next();
    }
}

Controller.updateRoomWhiteBoardByBot = async (req, res, next) => {
    try {
        //console.log(req.body,req.jsonObject);
        var result = await RoomServices.updateWhiteBoardByBot(req.body.obj.whiteboard, req.body.botId);
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "updateRooms", 200);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}
Controller.uploadRoomImages = async (req, res, next) => {
    try {
        var result = await RoomServices.uploadRoomImages(req.files, req.body.botId)
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "uploadRoomImages", 200);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.updateRoomImages = async (req, res, next) => {
    try {
        var result = await RoomServices.updateRoomImages(req.files, req.params.botId)
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "updateRoomImages", 200);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.getRoomImages = async (req, res, next) => {
    try {
        var result = await RoomServices.getImagesByBot(req.params.botId)
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "getRoomImages", 200);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.testObjective = async (req, res, next) => {
    try {
        var result = await RoomServices.generateMeetingProductivityScores(req.jsonObject.transcript, req.jsonObject.botId, req.userId)
        sendStatus.data.sortStatus(res, req, result.obj, result.message, "generateMeetingProductivityScores", 200);
    } catch (e) {
        req.logger.exception.message = e.message;
        next(e);
    }
}

Controller.enhanceTrasncript = async (req, res, next) => {
    const botId = req.params.botId;
    var result = await RoomServices.enhanceTrasncript(botId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Enhance-Transcript", result.statusCode);
}


Controller.postEnhanceTrasncript = async (req, res, next) => {
    const transcript = req.body.transcript;
    const status = req.body.status;
    const botId = req.body.bot_id;
    var result = await RoomServices.postEnhanceTrasncript(transcript, status, botId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Post-Enhance-Trasncript", result.statusCode);
}

Controller.updateTranscript = async (req, res, next) => {
    const botId = req.body.botId;
    const transcript = req.body.transcript;
    const userId = req.userId;
    var result = await RoomServices.updateTranscript(transcript, botId, userId)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Update-Transcript", result.statusCode);
}

Controller.blobStorage = async (req, res, next) => {
    const limit = req.body.limit;
    var result = await RoomServices.blobStorage(limit)
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Blob-Storage", result.statusCode);
}

module.exports = Controller;