const Rooms = {};
const dbModel = require('../model');
const db = dbModel.rooms;
const Users = dbModel.users;
const { Sequelize } = require("sequelize");
const MeetingSchedule = dbModel.meetingSchedule;
const { Encryption } = require('../../utils')
const Op = dbModel.op;
const querType = dbModel.queryType;
const attributes_1 = ['roomUuid', 'transcript', 'title', 'botId', 'createdAt', 'isEnhanced', 'enhancedTranscript', 'interviewId']
const attributes_2 = ['botId', 'userId', 'roomId', 'promptType', 'summary', 'unMappedLength', 'mappedLength', 'actionItem', 'transcript', 'mindMap', 'title', 'productivityScores', 'retryCount', "meetingType"];
const attributes_3 = ['roomUuid', 'title', 'botId', 'createdAt', 'finalSummary', 'startTime', 'endTime', 'recallVideoStatus']
const attributes_4 = ['roomId', 'userId', 'botId', 'botStatus', 'startTime', 'endTime'];
const attributes_5 = ['roomId', 'botId', 'finalSummary', 'title'];
const user_attributes_1 = ['userId', 'email'];
const attributes_6 = ['roomId', 'transcript', 'actionItem', 'summary', 'mindMap', 'finalSummary'];
const attributes_7 = ['meetingLink', 'startTime', 'endTime', 'userId', 'botId'];
const attributes_8 = ['botId'];
const attributes_9 = ['transcript'];
const attributes_10 = ['objectives'];


Rooms.createRoomSchedule = async (obj) => {
    await MeetingSchedule.create(obj);
}

Rooms.updateRoomSchedule = async (obj, id) => {
    return await MeetingSchedule.update(obj, {
        where: {
            id: id
        }
    });
}

Rooms.fetchEmail = async () => {
    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() - 0); // chnage to zero, as we receive all calender events in UTC
    const fiveMinutesAgo = new Date(currentDateTime - 5 * 60 * 1000);

    return await MeetingSchedule.findAll({
        attributes: ['id', 'from', 'meeting_link', 'subject', 'email_id', 'start_time'],
        where: {
            status: 1,
            start_time: {
                [Op.between]: [fiveMinutesAgo, currentDateTime],
            },
            add_agenda: null
        },
    })
}

Rooms.getAll = async () => {
    let rooms = await db.findAll({
        raw: true,
        attributes: attributes_1
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

Rooms.getAllAgenda = async () => {
    const currentDateTime = new Date();
    currentDateTime.setSeconds(0, 0);
    console.log("currentDateTime", currentDateTime);
    let rooms = await db.findAll({
        attributes: attributes_7,
        where: {
            add_agenda: 0,
            startTime: {
                [Op.and]: [
                    { [Op.gte]: currentDateTime },
                    { [Op.lt]: new Date(currentDateTime.getTime() + 60000) }, 
                ],
            },
        },
        raw: true,
        console: console.log
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

const decryptionObject = (obj) => {
    if (obj.transcript) {
        obj.transcript = Encryption.decryptSensitiveData(obj.transcript)
    }
    if (obj.enhancedTranscript) {
        obj.enhancedTranscript = Encryption.decryptSensitiveData(obj.enhancedTranscript)
    }
    if (obj.coreTranscript) {
        obj.coreTranscript = Encryption.decryptSensitiveData(obj.coreTranscript)
    }
    if (obj.actionItem) {
        obj.actionItem = Encryption.decryptSensitiveData(obj.actionItem)
    }
    if (obj.summary) {
        obj.summary = Encryption.decryptSensitiveData(obj.summary)
    }
    if (obj.mindMap) {
        obj.mindMap = Encryption.decryptSensitiveData(obj.mindMap)
    }
    if (obj.finalSummary) {
        obj.finalSummary = Encryption.decryptSensitiveData(obj.finalSummary)
    }
    return obj;
}

const decryptionArray = (array = []) => {
    const arr = [];
    array.forEach(room => {
        room = decryptionObject(room);
        arr.push(room);
    })
    return arr;

}

Rooms.getRoomUser = async (botId) => {
    return await db.findAll({
        // raw: true,
        where: {
            botId: botId
        },
        include: {
            model: Users,
            as: 'userInfo',
            attributes: user_attributes_1
        },
        attributes: attributes_5
    });
}

Rooms.getAllRooms = async () => {
    return await db.findAll({
        raw: true,
        attributes: attributes_6
    });
}

Rooms.getAllRoomsInRange = async (startRoomId, endRoomId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_6,
        where: {
            roomId: {
                [Op.between]: [startRoomId, endRoomId]
            }
        }
    });
}


Rooms.checkBot = async (botId) => {
    let rooms = await db.findAll({
        raw: true,
        where: {
            botId: botId
        },
        attributes: attributes_2
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

Rooms.forBackgroundProcess = async () => {
    const endTimeThreshold = new Date();
    endTimeThreshold.setMinutes(endTimeThreshold.getMinutes() + 3);
    let rooms = await db.findAll({
        raw: true,
        where: {
            endTime: {
                [Op.lt]: endTimeThreshold
            },
            finalSummary: " ",
            retryCount: {
                [Op.lt]: process.env.API_CALL_LIMITS
            }
        },
        attributes: attributes_2
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

Rooms.getFinalSummary = async (botId) => {
    let rooms = await db.findAll({
        raw: true,
        where: {
            botId: botId 
        },
        attributes: attributes_5
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

Rooms.getRoomTranscript = async (botId) => {
    let rooms = await db.findAll({
        raw: true,
        where: {
            botId: botId
        },
        attributes: attributes_9 
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

Rooms.getUserRooms = async (userId) => {
    let rooms = await db.findAll({
        raw: true,
        attributes: attributes_1,
        order: [
            ['createdAt', 'DESC'],
        ],
        where: {
            userId: userId
        }
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

//it will check does the room is created with same meeting url
//it will check the meeting url is already presend in room table so it will not create the bot and room for it fomr meeting scedual table
Rooms.validateRoom = async (meetingLink, start_time) => {
    const targetTimestamp = new Date(start_time);
    let rooms = await db.findAll({
        raw: true,
        attributes: attributes_7,
        where: {
            meetingLink: meetingLink,
            startTime: targetTimestamp,
            add_agenda:0
        },
    });
    rooms = decryptionArray(rooms);
    return rooms;
}


Rooms.validateRoomAgenda = async (meetingLink, start_time) => {
    const targetTimestamp = new Date(start_time);
    let rooms = await db.findAll({
        raw: true,
        attributes: attributes_7,
        where: {
            meetingLink: meetingLink,
            startTime: targetTimestamp
        },
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

Rooms.updateAgendaMeeting = async (updateMeeting, meetingLink, start_time) => {
    const targetTimestamp = new Date(start_time);
    return await MeetingSchedule.update(updateMeeting, {
        where: {
            meeting_link: meetingLink,
            start_time: targetTimestamp
        }
    });
}

Rooms.getRoomsForEngine = async () => {
    let rooms = await db.findAll({
        raw: true,
        attributes: attributes_4,
        order: [
            ['userId', 'DESC'],
        ],
        where: {
            startTime: {
                [Op.not]: null,
            },
            endTime: {
                [Op.not]: null,
            }
        }
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

Rooms.getRoomsWithDates = async (userId) => {
    let rooms = await db.findAll({
        raw: true,
        attributes: attributes_3,
        order: [
            ['createdAt', 'DESC'],
        ],
        where: {
            userId: userId,
            botStatus: 'done',
            interviewId: {
                [Op.eq]: null,
            },
        }
    });
    rooms = decryptionArray(rooms);
    return rooms;
}

Rooms.getRoom = async (roomId) => {
    let rooms = await db.findAll({
        raw: true,
        // attributes: attributes_1,
        where: {
            roomUuid: roomId
        }
    });
    if (rooms.length > 0) {
        rooms[0] = decryptionObject(rooms[0]);
    }
    return rooms;
}

Rooms.getBot = async (botId) => {
    let rooms = await db.findAll({
        raw: true,
        // attributes: attributes_2,
        attributes: { exclude: ['meetingLink'] },
        where: {
            botId: botId
        }
    });
    if (rooms.length > 0) {
        rooms[0] = decryptionObject(rooms[0]);
    }
    return rooms;
}

Rooms.getCurrentBotID = async (botId, userId) => {
    let rooms= await db.findAll({
        attributes: attributes_8,
        where: {
            botId: botId,
            add_agenda: 0,
            userId: userId,
            old_botId: null
        }
    });
    if (rooms.length > 0) {
        rooms[0] = decryptionObject(rooms[0]);
    }
    return rooms;
}

Rooms.getUpdatedBotID = async (botId, userId) => {
    let rooms= await db.findAll({
        attributes: attributes_8,
        where: {
            old_botId: botId,
            add_agenda: 1,
            userId: userId,
            botId: {
                [Op.not]: null 
            }
        }
    });
    if (rooms.length > 0) {
        rooms[0] = decryptionObject(rooms[0]);
    }
    return rooms;
}

Rooms.createRoom = async (obj) => {
    return await db.create(obj);
}

Rooms.updateRoom = async (obj, roomId) => {
    return await db.update(obj, {
        where: {
            roomId: roomId
        }
    });
}

Rooms.updateByBot = async (obj, id) => {
    return await db.update(obj, {
        where: {
            botId: id
        }
    });
}

Rooms.updateByAgendaBot = async (obj, meetingLink) => {
    return await db.update(obj, {
        where: {
            meetingLink: meetingLink
        },
        raw: true,
    });
}

//insert the old bot id that was genrated by UUID Generator
Rooms.updateOldBotID = async (obj, meetingLink) => {
    return await db.update(obj, {
        where: {
            meetingLink: meetingLink
        },
        raw: true,
    });
}


Rooms.deleteByBot = async (id) => {
    return await db.destroy({
        where: {
            botId: id
        }
    });
}

Rooms.updateWhiteBoardByBot = async (obj, id) => {
    return await db.update({ "whiteboard": JSON.stringify(obj) }, {
        where: {
            botId: id
        }
    });
}

Rooms.getDoneTranscript = async (userId, botId) => {
    let rooms = await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            userId: userId,
            botStatus: 'done',
            botId: botId,
            [Op.or]: [
                { isEnhanced: 0 }, //Specialized Summary 
                { isEnhanced: 1 }, //Specialized Summary 
                { isEnhanced: 2 }
            ]
        }
    });
    rooms = decryptionArray(rooms);
    return rooms;
} 

Rooms.getDoneTranscriptForEnhance = async () => {
    let rooms = await db.findOne({
        raw: true,
        attributes: attributes_1,
        where: {
            botStatus: 'done',
            isEnhanced: null,
            transcript: {
                [Op.not]: null,
            }
            // botId: botId
        } 
    });
    if (rooms == null) {
        return rooms;
    } else {
        rooms = decryptionObject3(rooms);
        return rooms;
    }   
}

const decryptionObject3 = (obj) => {
    if (obj.transcript) {
        obj.transcript = Encryption.decryptSensitiveData(obj.transcript)
    }
    return obj;
}


Rooms.getObjectives = async (botId) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_10,
        where: {
            botId: botId
        }
    });
}

Rooms.getStatusForEnhance = async (id) => {
    return await db.findAll({
        where: {
            botId: id,
            isEnhanced: false
        }
    });
}

Rooms.updateTranscriptAfterEnhance = async (id, userId) => {
    return await db.findAll({
        where: {
            botStatus: 'done',
            transcript: {
                [Op.not]: null,
            },
            botId: id,
            userId: userId,
            [Op.or]: [
                { isEnhanced: 1 },
                { isEnhanced: 2 }
            ]
        }
    });
}

Rooms.getBlobStorage = async (limit) => {
    return await db.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            botStatus: 'done',
            recallVideoStatus: {
                [Op.eq]: null,
            }
        },
        order: [
            ['createdAt', 'DESC'],
        ],
        limit: limit
    });
}

Rooms.findBotId = async (roomId) => {
    return await db.findOne({
        raw: true,
        attributes: attributes_8,
        where: {
            roomId: roomId
        }
    });
}


module.exports = Rooms;