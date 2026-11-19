const { Logger } = require('..');
const RECALL_STRINGS = require('../Strings').RECALL;
const { Strings } = require('../../utils')
const { 
    storeVideo,
    downloadCoreTranscript,
    roomTranscript,
    startThread,
    transcriptPayload,
} = require('../../api/services/chatGpt.services');

const get_bot_message = (guest_url) => {
    return `Hi! I'm Kolabrya, your Meeting Assistant. 👋

    Click link below to see your meeting’s visual minutes in real-time:
    
    🔗 ${guest_url}`
}

//bot.status | example: {"data":{"bot_id":"30b51386-506e-4677-8fda-98ba1c8515db","status":{"code":"done","created_at":"2023-08-09T15:35:00.483199689+00:00","message":null,"sub_code":null}},"event":"bot.status_change"}
//bot.transcription | example: { "event": "bot.transcription", "data": { "bot_id": "77610bbe-769c-4de6-b717-88d91f53e36b", "transcript": { "speaker": "Yahya M Zaki", "words": [ { "text": "you", "start_time": 54.019997, "end_time": 54.26 }, { "text": "are,", "start_time": 54.26, "end_time": 54.42 }, { "text": "go", "start_time": 55.299995, "end_time": 55.459995 }, { "text": "ahead", "start_time": 55.459995, "end_time": 55.699997 }, { "text": "and", "start_time": 55.699997, "end_time": 56.199997 } ], "is_final": true } } }
module.exports = (sdk) => {
    const event_BotStatus = async (request) => {
        let get_response;
        const status = request.data.status.code;
        const createdAt = request.data.status.created_at
        var obj = {
            botStatus: status
        };
        if (status === RECALL_STRINGS.DONE) { 
            obj.endTime = createdAt;
            try {
                const data = await sdk.bot_retrieve({ id: request.data.bot_id });
                obj.recording = data.data.video_url
                data.data.video_url = ""
                obj.jsonResponse = JSON.stringify(data.data);
                //downloading the video of meeting
                await storeVideo(request.data.bot_id);
                //downloading the core transcript of meeting
                await downloadCoreTranscript(request.data.bot_id);
            } catch (e) {
                Logger.data.ReCall({ exception: e.message, botId: request.data.bot_id }, "recall-api-exception")
            }

        } else if (status === RECALL_STRINGS.IN_CALL_RECORDING) {
            obj.startTime = createdAt;
            const botId = request.data.bot_id;
            const url = process.env.GUEST_URL + botId
            try {
                // disableing it so we will not get message of guest room 
                // await sdk.bot_send_chat_message_create({ to: "everyone", message: get_bot_message(url) }, { id: botId })
            } catch (e) {
                Logger.data.ReCall({ exception: e.message, botId }, "recall-api-exception")
            }
            //send bot message
        } else {
            obj = null
        }
        return obj;
    }

    const event_BotTranscript = async (request = {}, room) => {
        const transcript = request.data.transcript
        let sentence = null
        if (room.transcript) {
            if (transcript?.speaker) {
                const lastSpeaker = getLastSpeaker(room.transcript);
                if (lastSpeaker === transcript.speaker) {
                    sentence = room.transcript + " " + transcript.words.map(word => word.text).join(' ');
                } else {
                    sentence = room.transcript + ` \n [${transcript.speaker}]: ` + transcript.words.map(word => word.text).join(' ');
                }
            }
        } else {
            if (transcript?.speaker) {
                sentence = `[${transcript.speaker}]: ` + transcript.words.map(word => word.text).join(' ');
            }
        }
        return sentence;
    }

    function getLastSpeaker(inputString) {
        // Use a regular expression to match the speaker names
        const speakerPattern = /\[([^\]]+)\]/g;
        let lastSpeaker = null;
        // Find all matches in the input string
        let match = speakerPattern.exec(inputString);
        while (match !== null) {
            lastSpeaker = match[1];
            match = speakerPattern.exec(inputString);
        }
        return lastSpeaker;
    }

    return {
        event_BotStatus, event_BotTranscript
    };
}
