const { keys } = require('../../config')
const sdk = require('api')('@recallai/v1.8#23yh7o26slkuspath');
sdk.auth(keys.recallHeader);
const { getBotsList, createBot, retreiveBot, retreiveAllBot,createBotEvent, removeBotFromCall, botChatMessage } = require('./bots')(sdk);
const { event_BotStatus, event_BotTranscript } = require('./webhook')(sdk);
const { createGoogleCalendar, calendarEventList, calendarEvent, deleteCalendar, getCalendarEventsV2, createOutlookCalendar, getCalendar } = require('./calendar')(sdk);

module.exports = {
    getBotsList, createBot, retreiveBot, retreiveAllBot, createBotEvent, event_BotStatus, event_BotTranscript, removeBotFromCall, botChatMessage,
    createGoogleCalendar, calendarEventList, calendarEvent, deleteCalendar, getCalendarEventsV2, createOutlookCalendar, getCalendar
}
