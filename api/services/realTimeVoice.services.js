const realTimeVoiceServices = {};
const { Strings, Logger } = require('../../utils');
const fs = require('fs');
const wav = require('wav-encoder');
const WebSocket = require('ws');
const {
    UserQueries
} = require('../queries');

realTimeVoiceServices.postData = async (record, userId) => {
    try {
        const collectedAudioChunks = [];
        const storeBase64 = [];
        let transcriptContent;
        // console.log("record", record);
        // console.log("Record (first 15 chars):", record.data.data.substring(0, 15));
        // console.log("User ID:", userId);
        const url = process.env.OPENAI_REALTIME_URL;
        const audioProcessingPromise = new Promise((resolve, reject) => {
            const ws = new WebSocket(url, {
                headers: {
                    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
                    "OpenAI-Beta": "realtime=v1",
                },
            });

            ws.on("open", async () => {
                console.log("Connected to server open ai.");
                Logger.data.OpenAI({ response: record.data.data.toString("base64"), userId: userId }, "Received-Base64-Of-Audio-From-Front-End");
                await realTimeVoiceServices.handleOpen(ws, record.data.data.toString("base64"));
            });

            ws.on("message", async (message) => {
                // realTimeVoiceServices.handleMessage(message)
                const messageStr = JSON.parse(message);
                if (messageStr?.type === "response.audio.delta") {
                    const base64AudioChunk = messageStr.delta;
                    const chunkBuffer = Buffer.from(base64AudioChunk, "base64");
                    collectedAudioChunks.push(chunkBuffer);
                    // Logger.data.OpenAI({ response: collectedAudioChunks }, "Combined-Chunks-Of-Audio");
                }

                if (messageStr?.response?.output?.[0]?.status) {
                    // console.log("***************** OpenAI Web Socket Status ***************");
                    // console.log(messageStr?.response?.output?.[0]?.status);
                    // console.log("***************** OpenAI Web Socket Status ***************");
                }

                // Once the final chunk is received
                if (messageStr?.response?.output?.[0]?.status === "completed") {
                    const transcript = messageStr.response.output[0]?.content[0]?.transcript
                    transcriptContent = await realTimeVoiceServices.clearTranscript(transcript, userId)
                    // console.log("*************** Output transcript below ****************");
                    // console.log(transcript);
                    // console.log("transcriptContent", transcriptContent);
                    Logger.data.OpenAI({ response: transcript, transcriptContent: transcriptContent, userId: userId }, "Received-Text-Of-Audio-From-OpenAI");
                    // console.log("*************** Output transcript below ****************");

                    // Concatenate all collected chunks into one buffer
                    const combinedBuffer = Buffer.concat(collectedAudioChunks);

                    // Convert PCM raw data into 16-bit signed integers (if necessary)
                    const pcmData = new Int16Array(combinedBuffer.buffer);

                    // Convert PCM data into Float32Array (range -1.0 to 1.0)
                    const audioDataMono = new Float32Array(pcmData.length);
                    for (let i = 0; i < pcmData.length; i++) {
                        audioDataMono[i] = pcmData[i] / 32768;
                    }

                    const audioData = {
                        sampleRate: 24000, // You can change the frequency to change the voice type
                        channelData: [audioDataMono]
                    };

                    wav.encode(audioData).then((arrayBuffer) => {
                        const coreBase64 = Buffer.from(arrayBuffer).toString("base64")
                        storeBase64.push(coreBase64)
                        Logger.data.OpenAI({ response: coreBase64, userId: userId }, "Received-Base64-Of-Audio-From-OpenAI");
                        ws.close();
                        // const buffer = Buffer.from(arrayBuffer);
                        // const outputPath = "../log/open-ai/output-audio.wav";
                        // fs.writeFileSync(outputPath, buffer); // Save the WAV file
                        // console.log(`Audio file saved at ${outputPath}`);

                    }).catch((error) => {
                        console.error("Error encoding WAV file:", error);
                        ws.close();
                    });
                    resolve(storeBase64)
                } 
                else if (messageStr?.response?.output?.[0]?.status === 'failed' || messageStr?.error) {
                    console.log("Mesaage status other than complete", messageStr.error);
                    reject(messageStr.error)
                }
                else {
                // console.log("messageStr?.type", messageStr.type); 
                  if (messageStr.type === 'session.created') {
                    // console.log("IN CREATED");                    
                        const getOpenAIPrompt = await UserQueries.getPromptByType(27);
                        const event = JSON.parse(getOpenAIPrompt[0].prompt)                        
                        ws.send(JSON.stringify(event));
                    }
                    else if(messageStr.type == 'session.updated'){
                        // console.log("IN UPDATE");
                        // console.log("Session Updated", messageStr);    
                    }
                }
            });

            ws.on("error", (err) => {
                console.error("WebSocket error:", err);
                ws.close();
                reject(err);
            });

            ws.on("close", () => {
                console.log("WebSocket connection closed.");
            });

        });
        const audioChunks = await audioProcessingPromise;

        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                transcript: transcriptContent,
                base64: audioChunks[0]
            },
        };
    } catch (error) {
        console.error("Error while posting data in real-time:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: { error: error.message },
        };
    }
};

realTimeVoiceServices.handleOpen = async (ws, audio) => {
    const getOpenAIPrompt = await UserQueries.getPromptByType(26);
    const createConversationEvent = {
        type: "conversation.item.create",
        item: {
            type: "message",
            role: "user",
            content: [
                {
                    type: "input_audio",
                    audio: audio,
                },
            ],
        },
    };

    ws.send(JSON.stringify(createConversationEvent));

    const createResponseEvent = {
        type: "response.create",
        response: {
            modalities: ["text", "audio"],
            instructions: getOpenAIPrompt[0].prompt,
        },
    };

    ws.send(JSON.stringify(createResponseEvent));
};

realTimeVoiceServices.handleMessage = (messageStr, record) => {
    try {
        const message = JSON.parse(messageStr);
        switch (message.type) {
            case "response.text.delta":
                // process.stdout.write(message.delta);
                break;

            case "response.text.done":
                // process.stdout.write("\n");
                break;

            case "response.audio.delta":
                const base64AudioChunk = message.delta;
                // updateFrontend({ dnlnk: "base64AudioChunk", event: 'realtime-audio', socketId: record.data.socketId });            
                // updateFrontend({ dnlnk: "base64AudioChunk", botId: '1111', socketId: record.data.socketId, event: 'realtime-audio',});            
                // Logger.data.OpenAI({ response: base64AudioChunk }, "Base-64-To-Play-In-Speaker");
                break;

            case "response.done":
                if (message.response.output[0]?.status === "completed") {
                    console.log("*************** Output transcript below ****************");
                    console.log(message.response.output[0]?.content[0]?.transcript);
                    console.log("*************** Output transcript below ****************");
                }
                break;

            default:
                console.log("Unhandled message type:", message);
        }
    } catch (error) {
        console.error("Error in handleMessage:", error);
    }
};

realTimeVoiceServices.clearTranscript = async (data, userId) => {
    // console.log("***************** Before filter Prompt ***************** ");
    // console.log(data);
    // console.log("***************** Before filter Prompt ***************** ");
    Logger.data.OpenAI({ response: data, userId: userId }, "Before-filter-Prompt");
    const promptText = data.match(/"Prompt"\s*:\s*"([^"]*)"/);
    if (promptText && promptText[1]) {
        Logger.data.OpenAI({ response: promptText[1], userId: userId }, "At-True-filter-Prompt");
        // console.log("***************** After filter Prompt IN TRUE********************");
        // console.log(promptText[1]);
        // console.log("***************** After filter Prompt ********************");
        // console.log("IN TRUE", promptText[1]);
        return promptText[1]
    } else {
        // console.log("IN FALSE", data);
        Logger.data.OpenAI({ response: data, userId: userId }, "At-False-filter-Prompt");
        return ""
    }
}


module.exports = realTimeVoiceServices;
