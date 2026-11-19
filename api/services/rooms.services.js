const RoomsServices = {};
const { Logger, Strings, Functions, Emails, Features } = require('../../utils')
const Storage = require('../../utils/Storage')
const ScriptShell = require('../../utils/ShellScripts')
const { RECALL } = Strings;
const { updateFrontend, updateTranscription, getChatHistory } = require('../external/index')
const { createBot, retreiveBot, retreiveAllBot, event_BotStatus, event_BotTranscript, removeBotFromCall, botChatMessage, calendarEvent, createBotEvent, calendarEventList, getCalendarEventsV2 } = require('../../utils/Recall')
const { getSummary, getActionItemsMap, generateProductivityScores, generateConceptMap, getFinalSummary, getTokensCount,
    getActionItemsMapForProjectMeeting, getMeetingTitle, getParticipationLevel, getKeywords, objectiveProductivityScores, getMeetingInconsistencies, getSuggestedQuestions,
} = require('../../utils/ChatGPT')
const {
    InterViewObjectives,
    RoomQueries,
    WebhookQueries,
    RoomImagesQueries,
    UserPackagesQueries, 
    UserQueries, 
    RoomKeywordQueries, 
    CalendarQueries, 
    MeetingScheduleQueries,
    CaseInterviewQueries
} = require('../queries');
const { v4: uuidv4 } = require('uuid');
const { urls } = require('../../config')
const { slack } = require('../../utils/Webhook');
const { blobServiceClient, containerClient, azureRecallHealth, generateBlobSASQueryParameters, CONTAINER_NAME, BlobSASPermissions } = require("../../utils/Azure");   
const videoPath = process.env.RECALL_VIDEO_PATH
const {
    postTranscript
} = require('../../api/external/ChatGPT')
const fs = require('fs');
let conditionTrueCount = 0;  
const THROTTLE_TIME = process.env.THROTTLE_TIME;
let lastCalledTime = 0;

RoomsServices.create = async (obj, userId) => {
    obj.userId = userId
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

RoomsServices.getScriptLogs = async (botId) => {
    const result = await ScriptShell.grepFileContent(botId)
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

RoomsServices.runQueryLog = async (obj) => {
    const result = await RoomKeywordQueries.create(obj);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

RoomsServices.hourlyRestrictions = async () => {
    let data = await RoomQueries.getRoomsForEngine();
    data = Functions.sorting(data);
    Object.keys(data).forEach(item => {
        const index = item;
        let hours = 0;
        let activeRoomsBot = [];
        let hourFlag = true;
        const userPackage = UserPackagesQueries.getUserActivePackage(item);
        const totalAvailableHours = userPackage[0].packageInfo.hours;
        data[index].forEach(room => {
            if (hourFlag) {
                if (room.endTime === null) {
                    //need to figure the timestamp: for now it is new Date().toString();
                    hours += Functions.calculateHoursBetweenDates(room.startTime, new Date().toString());
                    if (hours > totalAvailableHours) {
                        if (room.botStatus !== RECALL.DONE) {
                            activeRoomsBot.push(room.botId);
                        }
                    }
                } else {
                    hours += Functions.calculateHoursBetweenDates(room.startTime, room.endTime);
                }
                if (hours > totalAvailableHours) {
                    console.log("Meeting Quota full: ", { userId: index, hours });
                    //here we'll stop the user to create more meetings;
                    //make the userPackage inactive;
                    UserPackagesQueries.updateUserIsActiveToFalse({ isActive: false, userId: index })
                    hourFlag = false;
                }
            }
        })
        activeRoomsBot.forEach(async (botId) => {
            await removeBotFromCall(botId);
        })
    })
    return 1;
}

RoomsServices.getRooms = async (userId) => {
    const result = await RoomQueries.getUserRooms(userId)
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

RoomsServices.getRoomsWithDates = async (userId) => {
    let rooms = await RoomQueries.getRoomsWithDates(userId);
    if (rooms.length > 0) {
        for (const element of rooms) {
            const botId = element.botId
            const fileName = `${botId}.mp4`
            if (element.recallVideoStatus === 1 && azureRecallHealth) {
                const record = await RoomsServices.generateAzureRecallUrl(element.startTime, element.endTime, fileName)
                if (record.statusCode == 200 && record?.obj?.videoUrl) {
                    element.videoUrl = record?.obj?.videoUrl
                } else {
                    element.videoUrl = ""
                }
            } else {
                const baseUrl = process.env.URL_BACKEND.replace(/\/api\/?$/, "");
                element.videoUrl = `${baseUrl}/videos/${fileName}`
            }
        }
        rooms = Functions.organizeByDate(rooms);
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: rooms
        };
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
}

RoomsServices.generateAzureRecallUrl = async (start, end, fileName) => {
    try {
        const startsOn = new Date(); // current time
        const startTime = new Date(start);
        const endTime = new Date(end);
        const durationMs = endTime - startTime;
        const totalDurationWithBuffer = durationMs + (60 * 60 * 1000);
        const expiresOn = new Date(startsOn.getTime() + totalDurationWithBuffer);
        const blobClient = containerClient.getBlobClient(fileName);
        const sasToken = generateBlobSASQueryParameters({
            containerName: CONTAINER_NAME,
            blobName: fileName,
            permissions: BlobSASPermissions.parse("r"), // read-only
            startsOn,
            expiresOn,
        }, blobServiceClient.credential).toString();
        const videoUrl = `${blobClient.url}?${sasToken}`
        if (videoUrl) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    videoUrl: videoUrl
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
        console.log('An error occurred while generate Azure RecallUrl:', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

RoomsServices.getRoom = async (roomId) => {
    const result = await RoomQueries.getRoom(roomId)
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result[0]
    };
}

RoomsServices.getRoomUser = async (botId) => {
    const result = await RoomQueries.getRoomUser(botId)
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result[0]
    };
}

RoomsServices.updateRoom = async (obj, roomId) => {
    return await RoomQueries.updateRoom(obj, roomId);
}

RoomsServices.updateRoomByBot = async (obj, roomId) => {
    return await RoomQueries.updateByBot(obj, roomId);
}

RoomsServices.deleteRoomByBot = async (roomId) => {
    return await RoomQueries.deleteByBot(roomId);
}

RoomsServices.updateWhiteBoardByBot = async (obj, roomId) => {
    return await RoomQueries.updateWhiteBoardByBot(obj, roomId);
}

RoomsServices.CalendarUpdateByCalendarId = async (obj) => {

    try {
        const events = await getCalendarEventsV2(obj.calendar_id, obj.last_updated_ts)
        const user = await getUserByCalendarId(obj.calendar_id)
        console.log("Webhook EVENTS TO UPDATE", events)

        events?.results?.forEach(async elem => {
            const obj = {
                ...elem,
                event_id: elem.id,
                email: elem?.raw?.creator?.email ? elem?.raw?.creator?.email : elem?.raw?.organizer?.emailAddress?.address,
                user_id: user.obj[0]?.userId
            }

            const meetingObj = {
                start_time: elem.start_time, 
                end_time: elem.end_time,
                from: elem?.raw?.creator?.email ? elem?.raw?.creator?.email : elem?.raw?.organizer?.emailAddress?.address, 
                subject: elem?.raw?.summary ? elem?.raw?.summary: elem?.raw?.subject,
                meeting_link: elem.meeting_url,
                event_id: elem.id,
                calendar_id: obj.calendar_id,
                email_id: user.obj[0]?.userId,
                metadata: elem,
            }

            delete obj.id

            await CalendarQueries.upsert(obj, {
                event_id: elem.id
            })

            await MeetingScheduleQueries.upsert(meetingObj, {
                event_id: elem.id
            })
        })

        return {
            statusCode: 200,
            message: Strings.SUCCESS,
            obj: {}
        }

    } catch (err) {
        console.log("Error in CalendarUpdateByCalendarId = ", err)
        return ({
            message: err
        })
    }
}

const getUserByCalendarId = async (calendarId) => {
    const result = await UserQueries.getUserByCalendarId(calendarId);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}


RoomsServices.webhook = async (url, obj) => {
    //obj.data.bot_id
    var response = {}
    let botResult = {};
    if (obj.data.bot_id) {
        botResult = await RoomQueries.checkBot(obj.data.bot_id);
        if (botResult.length === 0) {
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: {}
            }
        }
    }
    //logging
    WebhookQueries.create({
        name: url,
        jsonData: JSON.stringify(obj)
    })
    var log = {
        webhookRequest: obj,
        botStatus: {},
        errorMessage: ""
    }
    try {
        let result;
        // console.log(" *** recall webhook RECALL.EVENTS.CALENDAR_SYN_EVENTS", obj);
        switch (obj.event) {
            case RECALL.EVENTS.BOT_STATUS_CHANGED:
                result = await event_BotStatus(obj);
                log.botStatus = result;
                if (result) {
                    await RoomQueries.updateByBot(result, obj.data.bot_id);
                    if (result.botStatus === RECALL.DONE) {
                        response.sentence = botResult[0].transcript;
                        response.room = botResult[0]
                        response.type = "end"
                    }
                }
                break;
            case RECALL.EVENTS.BOT_TRANSCRIPTION:
                const botId = obj.data.bot_id
                //get room's transcript
                const sentence = await event_BotTranscript(obj, botResult[0]);
                //db update;
                response.sentence = sentence;
                response.room = botResult[0]
                response.type = "notEnd"
                break;
            case RECALL.EVENTS.CALENDAR_UPDATE:
                // console.log(" *** recall webhook RECALL.EVENTS.CALENDAR_UPDATE:");
                // stoping the recall events due to error on production error too long for subject
                // await RoomsServices.CalendarUpdateByCalendarId(obj.data);
                //db update;
                response.sentence = sentence;
                response.room = cal_id
                response.type = "notEnd"
                break;
            case RECALL.EVENTS.CALENDAR_SYN_EVENTS:
                // console.log(" *** recall webhook RECALL.EVENTS.CALENDAR_SYN_EVENTS");
                // stoping the recall events due to error on production error too long for subject
                // await RoomsServices.CalendarUpdateByCalendarId(obj.data);
                //db update;
                response.sentence = sentence;
                response.room = cal_id2
                response.type = "notEnd"
                break
            default:
                break;
        }
    } catch (e) {
        log.errorMessage = e.message;
    }
    Logger.data.ReCall(log, "RecallWebhook");
    return {
        statusCode: 200,
        message: Strings.SUCCESS,
        obj: response
    }
}
RoomsServices.SendReportDaily = async () => {
    const result = await UserQueries.getUsageInfo(0);
    const tableHeader = '<tr><th>' + Object.keys(result[0]).join('</th><th>') + '</th></tr>';
    const tableRows = result.map(obj => '<tr><td>' + Object.values(obj).join('</td><td>') + '</td></tr>');
    const table = '<table border="1">' + tableHeader + tableRows.join('') + '</table>';
    const emails = process.env.BP_SEND_REPORT_DAILY_EMAILS.split(',');
    console.log(emails);
    emails.forEach(e => {
        Emails.ReportSummary(e, 'Daily Report', table);
    })
}
RoomsServices.getFinalSummaryBP = async () => {
    const data = await RoomQueries.forBackgroundProcess();
    const log = {};
    log.size = data.length;
    log.room = [];
    if (data.length > 0) {
        var roomLog = {}
        await data.forEach(async (room) => {
            roomLog.botId = room.botId;
            roomLog.logger = {}
            const roomObj = await endTranscriptProcess(
                room.transcript,
                room.botId,
                room.mappedLength,
                room.summary,
                room.roomId,
                roomLog.logger,
                room.unMappedLength,
                room.productivityScores,
                room.promptType,
                room.meetingType,
                room.title
            );
            await RoomQueries.updateByBot({
                suggestions: result.updatedRoom.suggestions,
                inconsistencies: result.updatedRoom.inconsistencies,
                objectives: result.updatedRoom.objectives,
                transcript: roomObj.updatedRoom.transcript,
                summary: roomObj.updatedRoom.summary,
                mappedLength: roomObj.updatedRoom.mappedLength,
                unMappedLength: roomObj.updatedRoom.unMappedLength,
                actionItem: roomObj.updatedRoom.actionItem,
                finalSummary: roomObj.updatedRoom.finalSummary,
                mindMap: roomObj.updatedRoom.mindMap,
                title: roomObj.updatedRoom.title
            }, room.botId);
            roomLog.logger = roomObj.logger;
            const retryCount = room.retryCount + 1;
            await RoomQueries.updateRoom({ retryCount }, room.roomId);
            log.room.push(roomLog);
        })
    }
    Logger.data.chatGPT(log, "getFinalSummaryBP");
}

RoomsServices.transcriptProcessAsync = async (sentence, room) => {
    let logger = {
        request: { roomId: room.roomId, botId: room.botId }
    };

    if (sentence) {
        if (!Storage.isStored(room.roomId)) {
            Storage.store(room.roomId);
            Storage.deleteRow(room.roomId);
            const result = await transcriptProcess(
                sentence,
                room.botId,
                room.mappedLength,
                room.summary,
                room.roomId,
                logger,
                room.promptType,
                room.meetingType, room.userId
            );
            result.updatedRoom.transcript = sentence
            if (result.flag) {
                await RoomQueries.updateByBot({
                    suggestions: result.updatedRoom.suggestions,
                    inconsistencies: result.updatedRoom.inconsistencies,
                    objectives: result.updatedRoom.objectives,
                    transcript: result.updatedRoom.transcript,
                    summary: result.updatedRoom.summary,
                    mappedLength: result.updatedRoom.mappedLength,
                    unMappedLength: result.updatedRoom.unMappedLength,
                    actionItem: result.updatedRoom.actionItem,
                    finalSummary: result.updatedRoom.finalSummary,
                    mindMap: result.updatedRoom.mindMap,
                    productivityScores: result.updatedRoom.productivityScores,
                    participationLevel: result.updatedRoom.participationLevel,
                    keywords: result.updatedRoom.keywords
                }, room.botId);
                await updateFrontend(result.updatedRoom);
                result.logger.response.updateFrontend = true;
                result.logger.endTime = new Date();
                Logger.data.chatGPT(result.logger, "transcriptProcessAsync");
            } else {
                await RoomQueries.updateByBot({
                    transcript: result.updatedRoom.transcript,
                }, room.botId)
            }
        } else {
            console.log(new Date().toString() + " - RoomId Not Stored in Storage : " + room.botId)
        }
    } else {
        console.log(new Date().toString() + " - Not Any Sentence : " + room.botId)
    }
}

RoomsServices.endTranscriptProcessAsync = async (sentence, room) => {
    console.log(new Date().toString() + " - Transcript Process Begin : " + room.botId)
    let logger = {
        request: { roomId: room.roomId, botId: room.botId }
    };
    if (sentence) {
        console.log(new Date().toString() + " - End Transcript Process If Sentence : " + room.botId)
        logger.storage = Storage.getList();
        logger.currentValue = room.roomId;
        const roomObj = await endTranscriptProcess(
            sentence,
            room.botId,
            room.mappedLength,
            room.summary,
            room.roomId,
            logger,
            room.unMappedLength,
            room.productivityScores,
            room.meetingType,
            room.title
        );
        if (roomObj.flag) {
            await RoomQueries.updateByBot({
                // suggestions: result.updatedRoom.suggestions,
                // inconsistencies: result.updatedRoom.inconsistencies,
                // objectives: result.updatedRoom.objectives,
                transcript: roomObj.updatedRoom.transcript,
                summary: roomObj.updatedRoom.summary,
                mappedLength: roomObj.updatedRoom.mappedLength,
                unMappedLength: roomObj.updatedRoom.unMappedLength,
                actionItem: roomObj.updatedRoom.actionItem,
                finalSummary: roomObj.updatedRoom.finalSummary,
                mindMap: roomObj.updatedRoom.mindMap,
                title: roomObj.updatedRoom.title
            }, room.botId);
            roomObj.logger.endTime = new Date();
            Logger.data.chatGPT(roomObj.logger, "endTranscriptProcessAsync");
        } else {
            console.log(new Date().toString() + " : 1 Skipping bot id : " + room.botId)
        }
    } else {
        console.log(new Date().toString() + " : 2 Skipping bot id : " + room.botId)
    }
}

const handleKeywordsResponse = async (r2, botId, roomId, userId) => {
    try {
        let keywords = [];

        try {
            // Attempt to parse the string as a JSON array
            keywords = JSON.parse(r2);
        } catch (jsonError) {
            // If parsing as JSON fails, split the string using newlines and remove empty strings
            keywords = r2.split('\n').map(item => item.trim()).filter(item => item.length > 0);
        }

        // If JSON parsing fails and the result is still undefined, handle it as a single-line string
        if (keywords === undefined) {
            // Split the string using commas and remove empty strings
            keywords = r2.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }

        // Assuming keywords2 is an array, not defined in the provided code
        // const cleanedKeywords = keywords.map(keyword => keyword.replace(/\s/g, ''));

        for (const keyword of keywords) {
            let trimmedKeyword = keyword.replace("keywords: ", "").trim();
            console.log(new Date().toString() + " - Trimmed Keyword : " + trimmedKeyword);
            // Assuming RoomKeywordQueries.create is an asynchronous function
            await RoomKeywordQueries.create({ botId: botId, roomId: roomId, keyword: trimmedKeyword });
        }


        let history = await RoomKeywordQueries.getRoomIds(keywords, userId, botId);
        if (history != null && history.length > 0) {
            let request = {};
            request.keywords = request.keywords || {};
            request.botID = botId;
            request.webhook_url = history[0].webhook_url;
            request.currnet_room = {};
            request.currnet_room[botId] = keywords;
            let xk = 0;
            for (const x of history) {
                if (x.botID == botId) {
                    console.log(new Date().toString() + " - Skipping Currnet Room");
                } else {
                    request.keywords[x.botID] = x.keywords;
                    xk++;
                }
                request.keywords[x.botID] = x.keywords;
            }
            if (xk > 0) {
                console.log(new Date().toString() + " - History Request : " + JSON.stringify(request).substring(1, 5));
                // await getChatHistory(request);
            }
        }
    } catch (e) {
        console.log(new Date().toString() + " - Keyword Exception : " + e.message);
    }
};

const getParticipants = (meeting_participants = []) => {
    const participantNames = meeting_participants.map(participant => participant.name);
    const commaSeparatedNames = participantNames.join(', ');
    return commaSeparatedNames;
}

RoomsServices.keywordsProcessTest = async (summary, botId, roomId, userId) => {
    const r2 = await getKeywordsCall(summary, botId);
    console.log(new Date().toString() + " - keywords response from chat gpt : " + r2);

    if (r2 !== null) {
        await handleKeywordsResponse(r2, botId, roomId, userId);
    } else {
        console.log(new Date().toString() + " - keywords response is null : " + botId)
    }
}

const transcriptProcess = async (transcript, botId, mappedLength, summary, roomId, logger, promptType, meetingType, userId) => {
    //check for 400 words;
    var updatedRoom = {}
    updatedRoom.botId = botId;
    updatedRoom.roomId = roomId;
    let flag = false;
    updatedRoom.finalSummary = " ";
    const unMappedLength = transcript.split(' ').length + 1;  //520
    const newtranscript = transcript.substring(mappedLength); // transcript (300)
    const newlength = newtranscript.split(' ').length; // 300
    const limitLength = parseInt(process.env.WORD_LIMIT_FOR_OPENAI); //200
    logger.response = {
        unMappedLength,
        newlength,
        limitLength
    }
    logger.botId = botId;
    logger.startTime = new Date();

    // Live Transcript
    if (transcript != null && transcript) {
        updatedRoom.transcript = transcript;
        updateFrontend({ transcript: transcript, botId: botId });
        // console.log("live transcript sending successfully");
    }
    if (unMappedLength > limitLength && newlength > limitLength) {
        const mappedLength = transcript.length;
        flag = true;
        var oldSummary = summary;
        updatedRoom.mappedLength = mappedLength; //220
        updatedRoom.unMappedLength = unMappedLength; //220
        let summaryResponse = await getSummaryCall(newtranscript, botId);
        logger.response.summaryResponse = summaryResponse ? true : false;
        if (summaryResponse !== null) {
            const _summary = summaryResponse;
            summary = (oldSummary ?? '') + " " + _summary;
            const tokenCount = getTokensCount(summary);
            console.log({ tokenCount, botId });
            logger.response.tokenCount = tokenCount;
            if (tokenCount > parseInt(process.env.TOKEN_LIMIT_FOR_OPENAI)) {
                //call getSummary Again with full text
                summary = await getSummaryCall(summary, botId);
                logger.response.summaryResponseSecondAttempt = summary ? true : false;

            }
            console.log(new Date().toString() + " - Calling Update Transcript : " + botId);
            const jsonData = {
                transcript: summary,
                roomID: botId
            };

            // stopping to hit the docker, fix for live trasnscript stopping during flow: adil-2024-03-20
            // await updateTranscription(jsonData);

            if (Features[4].participationLevel) {
                // ParticipationLevel Init
                console.log(new Date().toString() + " - Participation Init : " + botId);
                const retrieveBotInfo = await retreiveBot(botId);
                const commaSeperatedNames = getParticipants(retrieveBotInfo.data.meeting_participants);
                logger.response.participantNames = commaSeperatedNames
                const r = await getParticipationLevelCall(summary, botId, commaSeperatedNames);
                logger.response.ParticipationLevelResponse = r ? true : false;
                if (r !== null) {
                    console.log(new Date().toString() + " - ParticipationLevel Response : " + r);
                    updatedRoom.participationLevel = r;
                    updateFrontend({ participationLevel: r, botId: botId });
                } else {
                    console.log(new Date().toString() + " - ParticipationLevel Response is NULL : " + botId);
                }
            }

            // Meeting Objective and Productivity Score
            //firstly we are sending whole trasnctip in objective interview but due to yashar issue of token count now we are sendnig summary
            // const r4 = await generateMeetingProductivityScores(summary , botId, userId)
            // if (r4 !== null) {
            //     updatedRoom.objectives = r4;
            //     updateFrontend({ objectives: r4, botId: botId })
            // }

            // const r5 = await generateMeetingInconsistencies(summary , botId, userId)
            // if (r5 !== null) {
            //     updatedRoom.inconsistencies = r5;
            //     updateFrontend({ inconsistencies: r5, botId: botId })
            // }

            // const r6 = await generateSuggestedQuestions(summary , botId, userId)
            // if (r6 !== null) {
            //     updatedRoom.suggestions = r6;
            //     updateFrontend({ suggestions: r6, botId: botId })
            // }

             // Throttled Block
             const now = Date.now();
             if (now - lastCalledTime >= THROTTLE_TIME) {
                 lastCalledTime = now;
 
                 conditionTrueCount++;
                 console.log(".");
                 console.log(".");
                 console.log(".");
                 console.log(".");
                 console.log(".");
                 console.log(".");
                 console.log(`Condition met ${conditionTrueCount} times`);
                 console.log("unMappedLength",unMappedLength);
                 console.log("limitLength",limitLength);
                 console.log("newlength",newlength);
                 console.log(".");
                 console.log(".");
                 console.log(".");
                 console.log(".");
                 console.log(".");
                 console.log(".");


                 // Meeting Objective and Productivity Score
                 const r4 = await generateMeetingProductivityScores(summary, botId, userId);
                 if (r4 !== null) {
                     updatedRoom.objectives = r4;
                     updateFrontend({ objectives: r4, botId: botId });
                 }
 
                 const r5 = await generateMeetingInconsistencies(summary, botId, userId);
                 if (r5 !== null) {
                     updatedRoom.inconsistencies = r5;
                     updateFrontend({ inconsistencies: r5, botId: botId });
                 }
 
                 const r6 = await generateSuggestedQuestions(summary, botId, userId);
                 if (r6 !== null) {
                     updatedRoom.suggestions = r6;
                     updateFrontend({ suggestions: r6, botId: botId });
                 }
             } else {
                 console.log(new Date().toString() + " - Throttled : " + botId);
             }

            if (Features[0].keywords) {
                // Keyword Extraction  
                const r2 = await getKeywordsCall(summary, botId);
                logger.response.keywordsResponse = r2 ? true : false;
                // console.log(new Date().toString() + " - Extract Keywords Response from CHATGPT : " + r2);
                // console.log(new Date().toString() + " - Others : " + summary, botId, roomId, userId);
                if (r2 !== null) {
                    updatedRoom.keywords = "";
                    updateFrontend({ keywords: r2, botId: botId });
                    await handleKeywordsResponse(r2, botId, roomId, userId);
                } else {
                    console.log(new Date().toString() + " - Extract Keywords Response is NULL : " + botId);
                }
            }

            updatedRoom.summary = summary;
            updateFrontend({ summary: summary, mappedLength: mappedLength, unMappedLength: unMappedLength, botId: botId });

            if (Features[1].actionItem) {
                // ActionItem 
                const actionItemsResponse = await getActionItemsCall(summary, botId, meetingType);
                logger.response.actionItemsResponse = actionItemsResponse ? true : false;
                if (actionItemsResponse != null) {
                    updatedRoom.actionItem = actionItemsResponse;
                    updateFrontend({ actionItem: actionItemsResponse, botId: botId });
                }
            }

            if (Features[2].productivityScore) {
                //Productivity Score
                const ProductivityScoresResponse = await generateProductivityScoresCall(summary, botId);
                logger.response.ProductivityScoresResponse = ProductivityScoresResponse ? true : false;
                if (ProductivityScoresResponse != null) {
                    updatedRoom.productivityScores = ProductivityScoresResponse;
                    updateFrontend({ productivityScores: ProductivityScoresResponse, botId: botId });
                }
            }

            if (Features[3].conceptMap) {
                // ConceptMap
                const conceptMapResponse = await generateConceptMapCall(summary, botId);
                logger.response.conceptMapResponse = conceptMapResponse ? true : false;
                let mindMap;
                if (conceptMapResponse != null) {
                    mindMap = conceptMapResponse
                    try {
                        const parsedMindMap = JSON.parse(mindMap);
                        const nodeDataArray = parsedMindMap.nodeDataArray;
                        if (nodeDataArray.length === 1) {
                            const conceptMapResponse2 = await generateConceptMapCall(summary, botId);
                            logger.response.conceptMapResponse2 = conceptMapResponse2 ? true : false;
                            if (conceptMapResponse2 != null) {
                                mindMap = conceptMapResponse2;
                            }
                        }
                        updatedRoom.mindMap = mindMap;
                        updateFrontend({ mindMap: mindMap, botId: botId });
                    } catch (e) {
                        console.log(e.message);
                    }
                }
            }
        }
    }
    return { updatedRoom, logger, flag };
}

const endTranscriptProcess = async (transcript, botId, mappedLength, summary, roomId, logger, unMappedLength, productivityScores, meetingType, title) => {
    let updatedRoom = {}
    updatedRoom.botId = botId;
    updatedRoom.roomId = roomId;
    updatedRoom.mappedLength = mappedLength;
    updatedRoom.productivityScores = productivityScores;
    updatedRoom.unMappedLength = unMappedLength;
    updatedRoom.title = title;
    let flag = false;
    const newtranscript = transcript.substring(mappedLength);

    console.log("summary 1", summary);

    console.log(new Date().toString() + " - Final Calls Begins : " + botId, mappedLength, " : ", unMappedLength, " : ", transcript.length, " : ", newtranscript.length, " : ", newtranscript)

    var oldSummary = summary;
    logger.response = {
        oldSummary
    }
    logger.botId = botId;
    logger.startTime = new Date();
    const summaryResponse = await getSummaryCall(newtranscript, botId);
    logger.response.summaryResponse = summaryResponse ? true : false;
    // if (summaryResponse !== null) { commented by abdul waris and yahya // need to check // 2023-09-12
    if (true) {
        flag = true;
        const _summary = summaryResponse;
        summary = (oldSummary ?? '') + " " + (_summary ?? '');

        const tokenCount = getTokensCount(summary);
        logger.response.tokenCount = tokenCount;

        if (tokenCount > parseInt(process.env.TOKEN_LIMIT_FOR_OPENAI)) {

            console.log("summary 2", summary);

            //call getSummary Again with full text
            summary = await getSummaryCall(summary, botId); //getSummary(transcript);
            logger.response.summaryResponseSecondAttempt = summary ? true : false;
        }
        updatedRoom.summary = summary;
        updateFrontend({ summary: summary, botId: botId });

        if (Features[5].finalSummary) {
            const finalSummaryResponse = await getFinalSummaryCall(summary, botId);
            logger.response.finalSummaryResponse = finalSummaryResponse ? true : false;
            if (finalSummaryResponse !== null) {
                const userInfo = await RoomQueries.getRoomUser(botId);
                updateFrontend({ finalSummary: finalSummaryResponse, botId: botId });
                updatedRoom.finalSummary = finalSummaryResponse;
            } else {
                console.log(new Date().toString() + " - Final Summary Response is NULL : " + botId);
            }
        }

        console.log("summary 3", summary);

        // Title Extract
        const titleResponse = await getMeetingTitleCall(summary, botId);
        logger.response.titleResponse = titleResponse;
        console.log(new Date().toString() + " - Extract Title Response : " + titleResponse, botId);
        if (titleResponse !== null) {
            updatedRoom.title = titleResponse;
            const userInfo = await RoomQueries.getRoomUser(botId);
            //commenting final summary email
            //Emails.finalSummary(userInfo[0].userInfo.email, titleResponse, finalSummaryResponse);
        } else {
            console.log(new Date().toString() + " - Extract Title Response is NULL : " + botId);
        }

        if (Features[1].actionItem) {
            // Action Items
            const actionItemResponse = await getActionItemsCall(summary, botId, meetingType);
            logger.response.actionItemResponse = actionItemResponse ? true : false;
            if (actionItemResponse !== null) {
                updateFrontend({ actionItem: actionItemResponse, botId: botId });
                updatedRoom.actionItem = actionItemResponse;
            }
        }

        if (Features[3].conceptMap) {
            const conceptMapResponse = await generateConceptMapCall(summary, botId)
            logger.response.conceptMapResponse = conceptMapResponse ? true : false;
            if (conceptMapResponse !== null) {
                updateFrontend({ mindMap: conceptMapResponse, botId: botId });
                updatedRoom.mindMap = conceptMapResponse;
            }
        }
 
    } else {
        console.log(new Date().toString() + " - Empty Summary Response is NULL : " + botId);
    }
    return { updatedRoom, logger, flag };
}

const getFinalSummaryCall = async (previousSummary, botId = "") => {
    const finalsummaryResponse = await getFinalSummary(previousSummary, botId);
    if (finalsummaryResponse != null) {
        return finalsummaryResponse.trim();
    }
    return null;
}
const getMeetingTitleCall = async (previousSummary, botId = "") => {
    const Response = await getMeetingTitle(previousSummary, botId);
    Logger.data.chatGPT({ response: Response , previousSummary, botId }, 'getMeetingTitle-Gemini');
    if (Response != null) {
        console.log("Response Meeting title", Response);
        return Response.choices[0].message["content"].trim();
        // return Response.candidates[0].content.parts[0].text
    }
    return null;
}
const getParticipationLevelCall = async (previousSummary, botId = "", participantsNames) => {
    // getParticipationLevel, getKeywords
    const Response = await getParticipationLevel(previousSummary, botId, participantsNames);
    if (Response != null) {
        return Response.choices[0].message["content"].trim();
    }
    return null;
}
const getKeywordsCall = async (previousSummary, botId = "") => {
    // getParticipationLevel, getKeywords
    const Response = await getKeywords(previousSummary, botId);
    if (Response != null) {
        return Response.choices[0].message["content"].trim();
    }
    return null;
}

const getSummaryCall = async (transcript, botId = "") => {
    const summaryResponse = await getSummary(transcript, botId);
    if (summaryResponse != null) {
        return summaryResponse.choices[0].message["content"].trim();
    }
    return null;
}

const getActionItemsCall = async (summary, botId = "", meetingType = "General") => {
    try {
        console.log(new Date().toString() + " - Meeting Type : " + meetingType, botId);
        let actionItemsResponse = null;
        if (meetingType === "Project") {
            actionItemsResponse = await getActionItemsMapForProjectMeeting(summary, botId);
        } else {
            actionItemsResponse = await getActionItemsMap(summary, botId);
        }

        if (actionItemsResponse != null) {
            return actionItemsResponse.choices[0].message["content"].trim();
        }
        return null;
    } catch (error) {
        console.error(new Date().toString() + " - Error in getActionItemsCall : " + error, botId);
        return null;
    }
};

const generateProductivityScoresCall = async (summary, botId = "") => {
    const ProductivityScoresResponse = await generateProductivityScores(summary, botId);
    if (ProductivityScoresResponse != null) {
        return ProductivityScoresResponse.choices[0].message["content"].trim();
    }
    return null
}


const deStructure = async (result) => {
    const objectives = result.map(element => "objective: " + element.objective);
    const convertArray = objectives.join('\n');
    return convertArray;
}
 

// check either it is same as db
// then check in second iteration let suppose 2nd object is wrong from chatGPT so select it from db
// and concate it in current object before pusinh it to front end


// commented by adil open it when required

// const generateMeetingProductivityScores = async (transcript, botId = "", userId) => {
//     // RoomsServices.generateMeetingProductivityScores = async (transcript, botId = "", userId) => {
//     const result = await InterViewObjectives.getObjectives(botId, userId);
//     if (result.length > 0) {
//         const formatString = await deStructure(result)
//         const meetingobjectiveProductivityScore = await objectiveProductivityScores(transcript, botId, formatString);
//         Logger.data.chatGPT({ request: formatString, response: meetingobjectiveProductivityScore, botId: botId, userId: userId }, "get-Chat-GPT-JSON-Response")
        
//         const getJSON = meetingobjectiveProductivityScore.choices[0].message["content"].trim();
//         const method = "Generate Meeting Objectives";
        
//         if (meetingobjectiveProductivityScore != null && RoomsServices.isValidJSON(getJSON, botId, userId, method)) {
//             const dataOpenAI = JSON.parse(meetingobjectiveProductivityScore.choices[0].message["content"].trim());
//             Logger.data.chatGPT({ response: dataOpenAI, botId: botId, userId: userId }, "get-Chat-GPT-JSON-Response-Trim")
//             if (dataOpenAI?.objectives && dataOpenAI?.objectives?.length > 0) {
                
//                 // const formatString = JSON.stringify(dataOpenAI, null, 2)
//                 // console.log("================All Objectives================");
//                 // console.log(formatString);
//                 // console.log("================All Objectives================");

//                 // Logger.data.chatGPT({ response: formatString, botId: botId, userId: userId }, "get-Objective-Formatted-String")

//                 // return formatString;

                
//                 const getData = await makeJson(result, dataOpenAI, botId)
//                 if (getData.length > 0) {
//                     const sendObject = {
//                         "objectives": getData
//                     };
//                     const formatString = JSON.stringify(sendObject, null, 2)
//                     console.log("================All Objectives================");
//                     console.log(formatString);
//                     console.log("================All Objectives================");
//                     Logger.data.chatGPT({ response: formatString, botId: botId, userId: userId }, "get-Objective-Formatted-String")
//                     return formatString;
//                 } else {
//                     return null;
//                 }
//             }
//             else {
//                 return null;
//             }
//         }
//         return null
//     } else {
//         return null;
//     }
// }


const generateMeetingProductivityScores = async (transcript, botId = "", userId) => {
    // RoomsServices.generateMeetingProductivityScores = async (transcript, botId = "", userId) => {
    const result = await InterViewObjectives.getObjectives(botId, userId);
    if (result.length > 0) {
        const formatString = await deStructure(result)
        const meetingobjectiveProductivityScore = await objectiveProductivityScores(transcript, botId, formatString);
        Logger.data.chatGPT({ request: formatString, response: meetingobjectiveProductivityScore, botId: botId, userId: userId }, "get-Chat-GPT-JSON-Response")
        
        const getJSON = meetingobjectiveProductivityScore.choices[0].message["content"].trim();
        const method = "Generate Meeting Objectives";
        
        if (meetingobjectiveProductivityScore != null && await RoomsServices.isValidJSON(getJSON, botId, userId, method)) {
            const dataOpenAI = JSON.parse(meetingobjectiveProductivityScore.choices[0].message["content"].trim());
            Logger.data.chatGPT({ response: dataOpenAI, botId: botId, userId: userId }, "get-Chat-GPT-JSON-Response-Trim")
            if (dataOpenAI?.objectives && dataOpenAI?.objectives?.length > 0) {
                
                const formatString = JSON.stringify(dataOpenAI, null, 2)
                console.log("================All Objectives================");
                console.log(formatString);
                console.log("================All Objectives================");

                Logger.data.chatGPT({ response: formatString, botId: botId, userId: userId }, "get-Objective-Formatted-String")

                return formatString;

                
                // const getData = await makeJson(result, dataOpenAI, botId)
                // if (getData.length > 0) {
                //     const sendObject = {
                //         "objectives": getData
                //     };
                //     const formatString = JSON.stringify(sendObject, null, 2)
                //     console.log("================All Objectives================");
                //     console.log(formatString);
                //     console.log("================All Objectives================");
                //     Logger.data.chatGPT({ response: formatString, botId: botId, userId: userId }, "get-Objective-Formatted-String")
                //     return formatString;
                // } else {
                //     return null;
                // }
            }
            else {
                return null;
            }
        }
        return null
    } else {
        return null;
    }
}

const ifPercent = async (value = "") => {
    if (!value.includes("%")) {
        return value + "%";
    }
    return value;
}

// const matchingPercentage = async (string1, string2) => {
//     const normalizedSentence1 = string1.toLowerCase();
//     const normalizedSentence2 = string2.toLowerCase();
//     const cleanSentence1 = normalizedSentence1.replace(/[^\w\s]/g, '').trim();
//     const cleanSentence2 = normalizedSentence2.replace(/[^\w\s]/g, '').trim();
//     var s1Parts = cleanSentence1.split(' ');
//     var s2Parts = cleanSentence2.split(' ');
//     var matched = 0;
//     for (var i = 0; i < s1Parts.length; i++) {
//         for (var j = 0; j < s2Parts.length; j++) {
//             if (s1Parts[i] === s2Parts[j])
//                 matched++;
//         }
//     }
//     var percentage = (matched / Math.max(s1Parts.length, s2Parts.length)) * 100;
//     console.log({matched});
//     console.log({percentage});
//     if (percentage < 50) {
//         return false;
//     } 
//     return true
// }

// const makeJson = async (dbObject, openAIObject, botId) => {
//     const data = [];
//     await Promise.all(dbObject.map(async (item) => {
//         // var index = openAIObject.objectives.findIndex(ai => ai.objective === item.objective);

//         var index = -1;
//         for (let i = 0; i < openAIObject.objectives.length; i++) {
//             if (await matchingPercentage(openAIObject.objectives[i].objective, item.objective)) {
//                 index = i;
//                 break;
//             }
//             else{
//                 index = i;
//                 break;
//             }
//         }

//         console.log("=======");
//         console.log("index",index);
//         console.log("=======");

//         if (index !== -1) {
//             // All good
//             console.log("ALL good");
//             data.push({
//                 "objective": openAIObject.objectives[index].objective,
//                 "Productivity": {
//                     "Score": openAIObject.objectives[index].Productivity.Score ? await ifPercent(openAIObject.objectives[index].Productivity.Score) : await ifPercent(openAIObject.objectives[index].Productivity.score),
//                     "Rationale for the score": openAIObject.objectives[index].Productivity["Rationale for the score"] || '',
//                     "Questions to ask to further investigate and improve score": openAIObject.objectives[index].Productivity["Questions to ask to further investigate and improve score"] || '',
//                 }
//             });
//         } else {
//             // Item objective is not present in open AI response
//             console.log("Not responding well", item.objective);
//             const getData = await RoomQueries.getObjectives(botId);
//             if (getData.length > 0 && getData[0].objectives != null) {
//                 const parsedData = JSON.parse(getData[0].objectives);
//                 const matchedObjective = parsedData.objectives.find(obj => obj.objective === item.objective);
//                 if (matchedObjective) {
//                     console.log("matchedObjective", matchedObjective);
//                     console.log("============================================================");
//                     console.log("Displaying the data from db because we are not getting correct response from CHat GPT");
//                     console.log("============================================================");
//                     slack.webhook(JSON.stringify({ action: "Displaying the data from db because we are not getting correct response from Chat GPT", timestamp: new Date(), botId: botId, data: matchedObjective }));
//                     data.push({
//                         "objective": matchedObjective.objective,
//                         "Productivity": {
//                             "Score": matchedObjective.Productivity.Score || "0%",
//                             "Rationale for the score": matchedObjective.Productivity["Rationale for the score"] || "",
//                             "Questions to ask to further investigate and improve score": matchedObjective.Productivity["Questions to ask to further investigate and improve score"] || "",
//                         }
//                     });
//                 } else {
//                     console.log("============================================================");
//                     console.log("No data found in db for objective to display it in front end so we are not updating front end");
//                     console.log("============================================================");
//                     slack.webhook(JSON.stringify({ action: "No data found in db for objective to display it in front end so we are not updating front end", timestamp: new Date(), botId: botId }));
//                     return;
//                 }

//             } else {
//                 console.log("============================================================");
//                 console.log("No data found in db for objective to display it in front end so we are not updating front end");
//                 console.log("============================================================");
//                 slack.webhook(JSON.stringify({ action: "No data found in db for objective to display it in front end so we are not updating front end", timestamp: new Date(), botId: botId }));
//                 return;
//             }
//         }
//     }));
//     return data;
// }


const matchingPercentage = async (string1, string2) => {
    const normalizedSentence1 = string1.toLowerCase();
    const normalizedSentence2 = string2.toLowerCase();
    const cleanSentence1 = normalizedSentence1.replace(/[^\w\s]/g, '').trim();
    const cleanSentence2 = normalizedSentence2.replace(/[^\w\s]/g, '').trim();
    var s1Parts = cleanSentence1.split(' ');
    var s2Parts = cleanSentence2.split(' ');
    var matched = 0;
    for (var i = 0; i < s1Parts.length; i++) {
        for (var j = 0; j < s2Parts.length; j++) {
            if (s1Parts[i] === s2Parts[j])
                matched++;
        }
    }
    var percentage = (matched / Math.max(s1Parts.length, s2Parts.length)) * 100;
    // console.log({matched});
    console.log({percentage});
    return percentage >= 50;
}

const makeJson = async (dbObject, openAIObject, botId) => {
    const data = [];
    for (const item of dbObject) {
        let matched = false;
        for (let i = 0; i < openAIObject.objectives.length; i++) {
            if (await matchingPercentage(openAIObject.objectives[i].objective, item.objective)) {
                matched = true;
                data.push({
                    "objective": openAIObject.objectives[i].objective,
                    "Productivity": {
                        "Score": openAIObject.objectives[i].Productivity.Score ? await ifPercent(openAIObject.objectives[i].Productivity.Score) : await ifPercent(openAIObject.objectives[i].Productivity.score),
                        "Rationale for the score": openAIObject.objectives[i].Productivity["Rationale for the score"] || '',
                        "Questions to ask to further investigate and improve score": openAIObject.objectives[i].Productivity["Questions to ask to further investigate and improve score"] || '',
                    }
                });
                break;
            }
        }

        if (!matched) {
            console.log("Not responding well", item.objective);
            const getData = await RoomQueries.getObjectives(botId);
            if (getData.length > 0 && getData[0].objectives != null) {
                const parsedData = JSON.parse(getData[0].objectives);
                const matchedObjective = parsedData.objectives.find(obj => obj.objective === item.objective);
                if (matchedObjective) {
                    console.log("matchedObjective", matchedObjective);
                    slack.webhook(JSON.stringify({ action: "Displaying the data from db because we are not getting correct response from Chat GPT", timestamp: new Date(), botId: botId, data: matchedObjective }));
                    data.push({
                        "objective": matchedObjective.objective,
                        "Productivity": {
                            "Score": matchedObjective.Productivity.Score || "0%",
                            "Rationale for the score": matchedObjective.Productivity["Rationale for the score"] || "",
                            "Questions to ask to further investigate and improve score": matchedObjective.Productivity["Questions to ask to further investigate and improve score"] || "",
                        }
                    });
                } else {
                    console.log("No data found in db for objective to display it in front end so we are not updating front end");
                    slack.webhook(JSON.stringify({ action: "No data found in db for objective to display it in front end so we are not updating front end", timestamp: new Date(), botId: botId }));
                }
            } else {
                console.log("No data found in db for objective to display it in front end so we are not updating front end");
                slack.webhook(JSON.stringify({ action: "No data found in db for objective to display it in front end so we are not updating front end", timestamp: new Date(), botId: botId }));
            }
        }
    }
    return data;
}

const generateMeetingInconsistencies = async (transcript, botId = "", userId) => {
    const meetingInconsistencies = await getMeetingInconsistencies(transcript, botId);
    let method;
    Logger.data.chatGPT({ response: meetingInconsistencies, botId: botId, userId: userId }, "Get-Chat-GPT-JSON-Response-Meeting-Inconsistencies")
    if (meetingInconsistencies != null) {
        console.log("Meeting Inconsistencies from open ai");
        console.log(meetingInconsistencies.choices[0].message["content"]);
        console.log("Meeting Inconsistencies from open ai");
        console.log("====================================");
        const getObject = meetingInconsistencies.choices[0].message["content"];
        Logger.data.chatGPT({ response: getObject, botId: botId, userId: userId }, "Get-Chat-GPT-JSON-Response-Content-Meeting-Inconsistencies")
        
        method = "Generate Meeting Inconsistencies";

        if (getObject != '' && getObject && await RoomsServices.isValidJSON(getObject, botId, userId, method)) {
            method = 'inconsistencies';
            const jsonData = await RoomsServices.transformObject(getObject, method)
            if (jsonData.length > 0) {
                const result = JSON.stringify(jsonData, null, 2);
                console.log("Custom JSON for Meeting Inconsistencies");
                console.log(result);
                console.log("Custom JSON Meeting Inconsistencies");
                console.log("====================================");
                Logger.data.chatGPT({ response: result, botId: botId, userId: userId }, "Get-Chat-GPT-Custom-JSON-Response-Meeting-Inconsistencies")
                return result;
            } else {
                return null;
            }
            
        } else {
            return null;
        }
        // return meetingInconsistencies.choices[0].message["content"].trim();
    }
    return null;
}

// RoomsServices.generateMeetingProductivityScores = async (transcript, botId = "", userId) => {
const generateSuggestedQuestions = async (transcript, botId = "", userId) => {
    const meetingSuggestedQuestions = await getSuggestedQuestions(transcript, botId);
    let method;
    Logger.data.chatGPT({ response: meetingSuggestedQuestions, botId: botId, userId: userId }, "Get-Chat-GPT-JSON-Response-Meeting-Suggested-Questions")
    if (meetingSuggestedQuestions != null) {
        console.log("Meeting Suggestions from open ai");
        console.log(meetingSuggestedQuestions.choices[0].message["content"]);
        console.log("Meeting Suggestions from open ai");
        console.log("====================================");
        const getObject = meetingSuggestedQuestions.choices[0].message["content"];
        Logger.data.chatGPT({ response: getObject, botId: botId, userId: userId }, "Get-Chat-GPT-JSON-Response-Content-Meeting-Suggested-Questions")
        
        method = "Generate Meeting Suggestions";
        
        if (getObject != '' && getObject && await RoomsServices.isValidJSON(getObject, botId, userId, method)) {
            method = 'suggestions';
            const jsonData = await RoomsServices.transformObject(getObject, method)
            if (jsonData.length > 0) {
                const result = JSON.stringify(jsonData, null, 2);
                console.log("Custom JSON for Meeting Suggestions");
                console.log(result);
                console.log("Custom JSON Meeting Suggestions");
                console.log("====================================");
                Logger.data.chatGPT({ response: result, botId: botId, userId: userId }, "Get-Chat-GPT-Custom-JSON-Response-Meeting-Suggested-Questions")
                return result;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
    return null;
}

const generateConceptMapCall = async (transcript, botId = "") => {
    try {
        const conceptMapResponse = await generateConceptMap(transcript, botId);

        if (conceptMapResponse != null) {
            let mindMap = conceptMapResponse.choices[0].message['content'].trim();
            mindMap = mindMap
                .replace('mind map:', ' ')
                .trim()
                .replaceAll("'", '');
            return mindMap;
        }
        return null;
    } catch (error) {
        console.error(new Date().toString() + " - Error in generateConceptMapCall : " + error, botId);
        return null;
    }
};

RoomsServices.createBot = async (obj, userId) => {
    const defaultBotName = await RoomsServices.getBotNameByID(userId);
    const email = obj.fromEmail;
    let result;
    try {
        //check for active packages
        const usr = await UserQueries.getUser(userId);
        const currentDateTime = new Date();
        console.log(usr.paymentExpiry < currentDateTime, usr.paymentExpiry, currentDateTime);
        if (usr.paymentExpiry < currentDateTime) {
            return {
                statusCode: 400,
                message: Strings.ERROR.PACKAGE_EXPIRED,
                obj: {}
            }
        }
        const packages = await UserPackagesQueries.getUserActivePackage(userId);
        if (packages[0].isActive) {
            let interviewId = null;
            if (obj.requestUuid) {
                const getInterviewId = await CaseInterviewQueries.findInterviewId(obj.requestUuid, userId)
                interviewId = getInterviewId.id ? getInterviewId.id : null
            }
            const joinAt = interviewId != null && obj?.joinAt ? obj?.joinAt : null
            const getVideoType = await UserQueries.getVideoType(userId)
            result = await createBot(defaultBotName, obj.meetingLink, getVideoType[0]?.recallVideoType, joinAt);
            await RoomQueries.createRoom({
                roomId: obj.roomId,
                userId: userId,
                agenda: obj.agenda,
                otherContext: obj.otherContext,
                platform: result.data.meeting_url?.platform,
                recordingUrl: "",
                botName: defaultBotName,
                title: obj.title,
                meetingLink: obj.meetingLink,
                botId: result.data.id,
                interviewId: interviewId,
            });
            //objective
            const data = {
                botId: result.data.id,
                status: 0
            }
            await InterViewObjectives.connectRoomwithObjectives(data, userId)
            //security fix
            result.data.meeting_url = null;
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: result.data
            }
        } else {
            //stopping sending package expiry email 2024-04-03
            //Emails.packageExpired(email, usr.paymentExpiry)
            return {
                statusCode: 400,
                message: Strings.ERROR.PACKAGE_EXPIRED,
                obj: {}
            }
        }

    } catch (e) {
        console.log(e);
        return {
            statusCode: 400,
            message: e.message,
            obj: result?.data
        }
    }

}

RoomsServices.createEmailBot = async (obj) => {
    // const defaultBotName = await RoomsServices.getBotNameByID(userId);
    // it is running on background job that's why we are not getting userID
    const defaultBotName = Strings.RECALL.BOT_NAME;
    const email = obj.fromEmail;
    //check if email exists
    const ifExists = await UserQueries.getUserByEmail(email);
    if (ifExists.length === 0) {
        return {
            statusCode: 400,
            message: Strings.ERROR.EMAIL_NOT_EXISTS,
            obj: {}
        }
    }
    const userId = ifExists[0].userId
    //check if email exists
    let result;
    try {
        //check for active packages

        const usr = await UserQueries.getUser(userId);
        const currentDateTime = new Date();
        console.log(usr.paymentExpiry < currentDateTime, usr.paymentExpiry, currentDateTime);
        if (usr.paymentExpiry < currentDateTime) {
            //stopping sending package expiry email 2024-04-03
            //Emails.packageExpired(email, usr.paymentExpiry)
            return {
                statusCode: 400,
                message: Strings.ERROR.PACKAGE_EXPIRED,
                obj: {}
            }
        }
        const packages = await UserPackagesQueries.getUserActivePackage(userId);
        if (packages[0].isActive) {
            result = await createBot(defaultBotName, obj.meetingLink);
            const roomCreated = await RoomQueries.createRoom({
                roomId: obj.roomId,
                userId: userId,
                agenda: obj.agenda,
                otherContext: obj.otherContext,
                platform: result.data.meeting_url?.platform,
                recordingUrl: "",
                botName: defaultBotName,
                title: obj.title,
                meetingLink: obj.meetingLink,
                botId: result.data.id,
                startTime: obj.startTime,
            });
            console.log(new Date().toString() + " - Room Created : " + { roomCreated });
            Emails.roomEmail(email, roomCreated.botId)
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: result.data
            }
        } else {
            //stopping sending package expiry email 2024-04-03
            //Emails.packageExpired(email, usr.paymentExpiry)
            return {
                statusCode: 400,
                message: Strings.ERROR.PACKAGE_EXPIRED,
                obj: {}
            }
        }

    } catch (e) {
        console.log(e);
        return {
            statusCode: 400,
            message: e.message,
            obj: result?.data
        }
    }

}

RoomsServices.retrieveBot = async (roomId) => {
    const roomResult = await RoomQueries.getRoom(roomId)
    const result = await retreiveBot(roomResult[0].botId);
    return {
        statusCode: 200,
        message: Strings.SUCCESS,
        obj: result.data
    }
}

RoomsServices.getRoomByBot = async (botId) => {
    const result = await RoomQueries.getBot(botId)
    if (result.length > 0) {
        let videoUrl
        const fileName = `${botId}.mp4`
        if (result[0].recallVideoStatus === 1 && azureRecallHealth) {
            const record = await RoomsServices.generateAzureRecallUrl(result[0].startTime, result[0].endTime, fileName)
            if (record.statusCode == 200 && record?.obj?.videoUrl) {
                videoUrl = record?.obj?.videoUrl
            } else {
                videoUrl = ""
            }
        } else {
            const baseUrl = process.env.URL_BACKEND.replace(/\/api\/?$/, "");
            videoUrl = `${baseUrl}/videos/${fileName}`
        }

        let enableMedia = false
        if (result[0]?.userId) {
            const getVideoType = await UserQueries.getVideoType(result[0]?.userId)
            if (getVideoType[0]?.recallMediaEnable === 1) {
                enableMedia = true
            }
        }
        const processedResults = result.map(item => {
            let transcriptStatus;
            let transcript;
            if (item.isEnhanced === 0) {
                transcriptStatus = 0;
                transcript = ""; // hit the api on every 15 second
            } else if (item.isEnhanced === 1) {
                transcriptStatus = 1;
                transcript = item.transcript; // Show the transcript after enhancment
                enhancedTranscript = item.enhancedTranscript; // Show the transcript after enhancment
            } else if (item.isEnhanced === 2) {
                transcriptStatus = 1;
                transcript = item.transcript; // Show the transcript that was not enhanced
            } else if (item.isEnhanced == null) {
                transcriptStatus = 0;
                transcript = ""; // hit the api on every 15 second
            }
            if (item.coreTranscript != null) {
                item.coreTranscript = JSON.parse(item.coreTranscript);
            }
            return {
                ...item,
                transcriptStatus,
                transcript,
                enableMedia,
                videoUrl
            };
        });
        return {
            statusCode: 200,
            message: Strings.SUCCESS,
            obj: processedResults,
        };
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        };
    }
}

RoomsServices.removeBotfromMeeting = async (botId) => {
    let room = {}
    try {
        await removeBotFromCall(botId);
    } catch (e) {
        console.log(e.message);
        room = await RoomQueries.getFinalSummary(botId);
        await updateFrontend({ finalSummary: room[0].finalSummary, botId: botId });
    }
    return {
        statusCode: 200,
        message: Strings.SUCCESS,
        obj: room
    }
}

RoomsServices.botChatMessage = async (obj) => {
    const to = "everyone";
    const message = obj.message;
    const botId = obj.botId;
    await botChatMessage(to, message, botId);
    return {
        statusCode: 200,
        message: Strings.SUCCESS,
        obj: {}
    }
}

RoomsServices.retrieveAllBot = async () => {
    const result = await retreiveAllBot();
    return {
        statusCode: 200,
        message: Strings.SUCCESS,
        obj: result.data
    }
}

RoomsServices.uploadRoomImages = async (obj, botId) => {
    const result = await RoomImagesQueries.create({ images: obj, botId });

    return {
        message: Strings.SUCCESS_MESSAGES.IMAGE_UPLOADED,
        statusCode: 200,
        obj: result
    };
}

RoomsServices.updateRoomImages = async (obj, botId) => {
    await RoomImagesQueries.updateImages({ images: obj }, botId);
    return {
        message: Strings.SUCCESS_MESSAGES.IMAGE_UPLOADED,
        statusCode: 200,
        obj: {}
    };
}

RoomsServices.getImagesByBot = async (id) => {
    let result = await RoomImagesQueries.getImagesByBotId(id)

    if (result.length) {
        result = result[0]
        result.images = JSON.parse(result.images)
    } else {
        result = {}
    }
    return {
        statusCode: 200,
        message: Strings.SUCCESS,
        obj: result
    }
}

RoomsServices.createRoomAgenda = async (obj, userId) => {
    const generatedUuid = uuidv4();
    const defaultBotName = await RoomsServices.getBotNameByID(userId);
    const email = obj.fromEmail;
    var result;
    try {
        const validatorMeetUrl = obj.meetingLink == '' || obj.meetingLink === undefined || obj.meetingLink === null;
        const validatorStartTime = obj.startTime == '' || obj.startTime === undefined || obj.startTime === null;
        const validatorEndTime = obj.endTime == '' || obj.endTime === undefined || obj.endTime === null;
        const validatorTitle = obj.title == '' || obj.title === undefined || obj.title === null;
        if(validatorMeetUrl){
            return {
                statusCode: 200,
                message: Strings.MEETING.URL_NOT_FOUND,
                obj: {}
            }
        }
        if(validatorStartTime || validatorEndTime){
            return {
                statusCode: 200,
                message: Strings.MEETING.TIME,
                obj: {}
            }
        }
        if(validatorTitle){
            return {
                statusCode: 200,
                message: Strings.MEETING.TITLE,
                obj: {}
            }
        }
        const usr = await UserQueries.getUser(userId);
        const currentDateTime = new Date();
        // console.log(usr.paymentExpiry < currentDateTime, usr.paymentExpiry, currentDateTime);
        if (usr.paymentExpiry < currentDateTime) {
            return {
                statusCode: 400,
                message: Strings.ERROR.PACKAGE_EXPIRED,
                obj: {}
            }
        }
        const packages = await UserPackagesQueries.getUserActivePackage(userId);
        if (packages[0].isActive) {
            const data = await RoomQueries.validateRoomAgenda(obj.meetingLink, obj.startTime)
            if (data.length == 0) {
                const time = await isMeetingTimeValid(obj.startTime);
                if (time) {
                    result = await RoomQueries.createRoom({
                        roomId: obj.roomId,
                        userId: userId,
                        platform: null,
                        recordingUrl: "",
                        botName: defaultBotName,
                        title: obj.title,
                        meetingLink: obj.meetingLink,
                        botId: generatedUuid,
                        startTime: obj.startTime,
                        endTime: obj.endTime,
                        add_agenda: 0
                    });

                    const updateMeeting = {
                        add_agenda:1
                    }
                    await RoomQueries.updateAgendaMeeting(updateMeeting, obj.meetingLink, obj.startTime)
                    const roomUrl = urls.roomURL + generatedUuid;
                    return {
                        statusCode: 200,
                        message: Strings.ROOM.SUCCESS,
                        obj: { ...result.dataValues, roomUrl }
                    }
                }
                else {
                    return {
                        statusCode: 200,
                        message: Strings.ROOM.START_TIME,
                        obj: {}
                    }
                }
            } else {
                console.log("*******************************************");
                console.log(Strings.ROOM.ROOM_ALREADY_CREATED);
                console.log("*******************************************");
                const roomUrl = urls.roomURL + data[0].botId;
                return {
                    statusCode: 200,
                    message: Strings.ROOM.ROOM_ALREADY_CREATED,
                    obj: { roomUrl }
                }
            }
        } else {
            //stopping sending package expiry email 2024-04-03
            //Emails.packageExpired(email, usr.paymentExpiry)
            return {
                statusCode: 400,
                message: Strings.ERROR.PACKAGE_EXPIRED,
                obj: {}
            }
        }
    } catch (e) {
        console.log(e);
        return {
            statusCode: 400,
            message: e.message,
            obj: result?.data
        }
    }
}

RoomsServices.GetAgendaAutoJoin = async (obj, userId) => {
    // const defaultBotName = await RoomsServices.getBotNameByID(userId);
    // it is running on background job that's why we are not getting userID
    const defaultBotName = Strings.RECALL.BOT_NAME;
    const data = await RoomQueries.getAllAgenda();
    console.log("Get agneda records", data.length);
    if (data.length > 0) {
        for (let index = 0; index < data.length; index++) {
            const element = data[index];
            try {
                const user = await UserQueries.getUserById(element.userId);
                if (user.length > 0) {
                    if (user[0].auto_join == true) {
                        const response = await createBot(defaultBotName, element.meetingLink);
                        console.log("***** before response *****");
                        console.log("bot id for agenda >>>>", response.data.id)
                        console.log("***** before response response.status*****", response?.status);
                        if (response.status === 201) {
                            await RoomQueries.updateOldBotID({
                                old_botId: element.botId
                            }, element.meetingLink);
                            await RoomQueries.updateByAgendaBot({
                                json_response: JSON.stringify(response),
                                add_agenda: 1,
                                botId: response.data.id
                            }, element.meetingLink);

                            const roomUrl = urls.roomURL + response.data.id;
                            Emails.agendabotJoin(user[0].email, roomUrl);
                        } else {
                            console.log("Email user not found")
                        }
                    } else {
                        await RoomQueries.updateByBot({
                            json_response: JSON.stringify({ "auto_join": "false" }),
                            add_agenda: 1
                        }, element.botId);
                    }
                }
            } catch (error) {
                console.error("Create email bot error for agenda ", error);
            }
        }
    } else {
        console.log("");
        console.log("******************************")
        console.log(">>>>  No meeting data found for agenda >>>>");
        console.log("******************************")
        console.log("");
    }
}

RoomsServices.redirectService = async (obj, userId) => {
    try {
        const botId = obj.botId
        const validatorBotId = botId == '' || botId === undefined;
        if (validatorBotId) {
            return {
                statusCode: 200,
                message: Strings.ROOM.EMPTY,
                obj: {}
            }
        } 
        const data = await RoomQueries.getCurrentBotID(botId, userId)
        if (data.length > 0) {
            return {
                statusCode: 200,
                message: Strings.ROOM.CURRENT,
                obj: { botId: null }
            }
        } else if (data.length == 0) {
            const data = await RoomQueries.getUpdatedBotID(botId, userId);
            if (data.length == 0) {
                return {
                    statusCode: 200,
                    message: Strings.ROOM.EMPTY,
                    obj: {}
                }
            } else {
                const roomUrl = urls.roomURL + data[0]?.botId;
                return {
                    statusCode: 200,
                    message: Strings.ROOM.UPDATED,
                    obj: {
                        botId: data[0]?.botId,
                        roomUrl: roomUrl
                    }
                }
            }
        } else {
            return {
                statusCode: 200,
                message: Strings.ROOM.EMPTY,
                obj: {}
            }
        }
    } catch (e) {
        console.log(e);
        return {
            statusCode: 400,
            message: e.message,
            obj: data
        }
    }
}

RoomsServices.getBotNameByID = async (userId) => { 
    const result = await UserQueries.getBotName(userId)
    return result[0].botName;
}


async function isMeetingTimeValid(startTime) {
    const currentDateTime = new Date();
    const requestedDateTime = new Date(startTime);
    const twoMinutesLater = new Date(currentDateTime.getTime() + 2 * 60000);
    console.log("");
    console.log("currentDateTime***", currentDateTime);
    console.log("twoMinutesLater***", twoMinutesLater);
    console.log("requestedDateTime*", requestedDateTime);
    console.log("");
    return requestedDateTime >= twoMinutesLater;
}


RoomsServices.transformObject = async (data, method) => {
    const getData = JSON.parse(data)
    const result = [];
        for (const key in getData) {
            if (getData[key]) {
                result.push({ [method]: getData[key] });
            }
        }
    return result;
}

RoomsServices.isValidJSON = async (str, botId, userId, method) => {
    try {
        JSON.parse(str);
        console.log("================================================");
        console.log("Successfully getting valid JSON for", {botId: botId, userId: userId ,method: method});
        console.log("================================================");
        Logger.data.chatGPT({ response: str, botId: botId, userId: userId }, "Successfully getting valid JSON for "+method)
        return true;
    } catch (e) {
        console.log("================================================");
        console.log("Not getting valid JSON for", {botId: botId, userId: userId ,method: method});
        console.log("================================================");
        Logger.data.chatGPT({ response: str, botId: botId, userId: userId }, "Not getting valid JSON for "+method)
        return false;
    }
};

RoomsServices.removeHtmlTags = async (text) => {
    return text.replace(/<\/?[^>]+(>|$)/g, '');
}

RoomsServices.enhanceTrasncript = async () => {
    try {
        const result = await RoomQueries.getDoneTranscriptForEnhance();
        if (result && Object.keys(result).length > 0 && result.transcript) {
            console.log("*********************************");
            console.log("Job Started To Enhance Transcript");
            console.log("*********************************");
            const transcript = result.transcript;
            const cleanText = await RoomsServices.removeHtmlTags(transcript)
            const record = await postTranscript(cleanText, result.botId)
            console.log("*************** Enhance Transcript Result ***********************");
            console.log(record);
            console.log("*************** Enhance Transcript Result ***********************");
            if (record.statusCode == '200') {
                const obj = {
                    isEnhanced: 0
                }
                await RoomQueries.updateByBot(obj, result.botId);
            } else {
                const obj = {
                    isEnhanced: 2
                }
                const getStringTranscript = await RoomQueries.getRoomTranscript(result.botId);
                if (getStringTranscript.length > 0 && getStringTranscript[0]?.transcript) {
                    const record = getStringTranscript[0].transcript.replace(/<\/?p>/g, '');
                    // const formattedRecord = record.replace(/\[([^\]]+)\]:/g, '<br><strong>\n    [$1]:</strong>');
                    const formattedRecord = record.replace(/\[([^\]]+)\]:/g, '<p><br></p><p><strong>[$1]:</strong>');
                    obj.transcript = formattedRecord
                }
                await RoomQueries.updateByBot(obj, result.botId);
                slack.webhook(JSON.stringify({ action: "Error in the Enhanced Transcript Form on the Python side, Currently showing the recall transcript.", botId: result.botId }));
            }
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: record
            }
        } else {
            console.log("**************************************");
            console.log("No Record Found For Enhance Transcript");
            console.log("**************************************");
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log('An error occurred while enhance trasncript:', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

RoomsServices.postEnhanceTrasncript = async (transcript, status, botId) => { 
    try {
        const list = await RoomQueries.getStatusForEnhance(botId);
        if (list.length > 0) {
            if (status === true) {
                const obj = {
                    enhancedTranscript: transcript,
                    isEnhanced: 1
                }
                await RoomQueries.updateByBot(obj, botId);
                console.log("***********************************************************************");
                console.log("Successfully updated the transcript from the Python-enhanced transcript");
                console.log("***********************************************************************");
                return {
                    message: Strings.RECORD_UPDATE_SUCCESS, 
                    statusCode: 200,
                    obj: {}
                }
            } else {
                const obj = {
                    isEnhanced: 2
                }
                // add the lgger here + slack
                const getStringTranscript = await RoomQueries.getRoomTranscript(botId);
                if (getStringTranscript.length > 0 && getStringTranscript[0]?.transcript) {
                    const record = getStringTranscript[0].transcript.replace(/<\/?p>/g, '');
                    // const formattedRecord = record.replace(/\[([^\]]+)\]:/g, '<br><strong>\n    [$1]:</strong>');
                    const formattedRecord = record.replace(/\[([^\]]+)\]:/g, '<p><br></p><p><strong>[$1]:</strong>');
                    obj.transcript= formattedRecord                    
                }
                await RoomQueries.updateByBot(obj, botId);
                slack.webhook(JSON.stringify({ action: "Error in the Enhanced Transcript Form on the Python side, Currently showing the recall transcript.", botId: botId }));
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG, 
                    statusCode: 400,
                    obj: {}
                }
            }
        } else {
            // add the lgger here
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log('An error occurred while enhance trasncript:', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

RoomsServices.updateTranscript = async (transcript, botId, userId) => {
    try {
        const list = await RoomQueries.updateTranscriptAfterEnhance(botId, userId);
        if (list.length > 0) {
            const obj = {
                transcript: transcript,
            }
            const record = await RoomQueries.updateByBot(obj, botId);
            if (record[0] == '1') {
                return {
                    message: Strings.RECORD_UPDATE_SUCCESS,
                    statusCode: 200,
                    obj: {}
                }
            } else {
                return {
                    message: Strings.ERROR.RECORD_UPDATE_ERROR,
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
    } catch (error) {
        console.log('An error occurred while updating enhance trasncript:', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

RoomsServices.blobStorage = async (limit) => {
    try {
        const list = await RoomQueries.getBlobStorage(limit);
        if (list.length > 0) {
            const data = []
            for (const element of list) {
                const botId = element.botId
                const fileName = element.botId + '.mp4'
                const completePath = videoPath + fileName
                if (fs.existsSync(completePath)) {
                    await RoomQueries.updateByBot({ recallVideoStatus: 0 }, botId);
                    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
                    const fileStream = fs.createReadStream(completePath);
                    const writeAtAzure = await blockBlobClient.uploadStream(fileStream, 4 * 1024 * 1024, 20, {
                        blobHTTPHeaders: { blobContentType: "video/mp4" },
                    });
                    if (writeAtAzure?._response?.status === 201) {
                        await RoomQueries.updateByBot({ recallVideoStatus: 1 }, botId)
                        data.push({ fileName: fileName, response: writeAtAzure, status: "done" })
                    } else {
                        await RoomQueries.updateByBot({ recallVideoStatus: 2 }, botId)
                        data.push({ fileName: fileName, response: writeAtAzure, status: "failed" })
                    }
                } else {
                    await RoomQueries.updateByBot({ recallVideoStatus: 2 }, botId)
                    data.push({ fileName: fileName, response: "File-Not-Found", status: "failed" })
                }
            }
            if (data.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: data
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
    } catch (error) {
        console.log('An error occurred while moving files from vm to blob', error);
        return {
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = RoomsServices