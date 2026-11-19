const { postRecall } = require('../../api/external/ChatGPT');
const { webhooks } = require('../../config')
const moment = require('moment');
module.exports = (sdk) => {
    const getBotsList = async () => {
        const list = await sdk.bot_list();
        return list;
    }

    const createBot = async (botName, meetingUrl, videoType, joinAt) => {
        const request = {
            meeting_url: meetingUrl,
            bot_name: `${botName}`,
            transcription_options: {
                provider: "rev",
                rev: {
                    language: "en",
                    transcriber: "machine_v2"
                }
            },
            real_time_transcription: {
                partial_results: false,
                destination_url: webhooks.transcript
            },
            zoom: {
                require_recording_permission: true,
                request_recording_permission_on_host_join: true
            }
        }
        if (videoType === 0) {
            request.recording_mode = 'audio_only'
        }
        if (joinAt != null) {
            const localTime = moment.parseZone(joinAt);
            request.join_at = localTime.toISOString(); // Output: time will be dynamic as the time zone
        }
        const list = await sdk.bot_create(request);
        return list;
    }
    const createBotEvent = async (calid) => {
        const request = {
            "deduplication_key": "789465123",
            "bot_config": {
                "bot_name": 'dasasdad',
                "transcription_options": {
                    "provider": "deepgram",
                    "deepgram": {
                        "language": "en-US",
                        "interim_results": false,
                        "model": "nova-2-ea"
                    }
                },
                "real_time_transcription": {
                    "partial_results": true,
                    "destination_url": "https://flow-digital.eastus.cloudapp.azure.com:3003/api/webhook/transcription"
                },
                "zoom": {
                    "require_recording_permission": true,
                    "request_recording_permission_on_host_join": true
                }

            }
        }

        const query = `calendar-events/${calid}/bot`

        const list = await postRecall(request, query);
        return list;
    }

    const retreiveBot = async (id) => {
        const bot = await sdk.bot_retrieve({ id: id });
        return bot;
    }

    const retreiveAllBot = async () => {
        const bot = await sdk.bot_list();
        return bot;
    }

    const removeBotFromCall = async (id) => {
        return await sdk.bot_leave_call_create({ id: id })
    }

    const botChatMessage = async (to, message, id) => {
        return await sdk.bot_send_chat_message_create({ to: to, message: message }, { id: id })
    }

    return {
        getBotsList, createBot, retreiveBot, retreiveAllBot, removeBotFromCall, botChatMessage, createBotEvent
    };
}
