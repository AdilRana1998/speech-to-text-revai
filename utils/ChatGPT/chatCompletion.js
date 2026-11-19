const { UserQueries } = require('./../../api/queries');
const { Logger } = require("..");
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second (adjust as needed)
let promptId;
const { postMethodChatGPT } = require('../../utils/Methods');

module.exports = (openai) => {

    const getTribunalSummary = async (userQuery) => {
        try {
            const response = await openai.create({
                model: "gpt-5",
                input: userQuery,
                tools: [
                    {
                        type: "mcp",
                        server_label: "a2aj",
                        server_url: "https://api.a2aj.ca/mcp",
                        require_approval: "never",
                    }
                ]
            });
            console.log(response.output_text);
            return response.output_text;
            
        } catch (error) {
            console.error("Error fetching decision:", error);
        }
    }

    const makeRequest = async (request, method, botId) => {
        for (let retry = 0; retry < MAX_RETRIES; retry++) {
            try {
                const result = await openai.createChatCompletion(request);
                Logger.data.chatGPT({ request, response: result.data, botId }, method);
                return result.data;
            } catch (e) {
                if (e.response && e.response.status !== 200) {
                    // If not a 200 status code, retry after a delay
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
                } else {
                    Logger.data.chatGPTException({ request, exception: e.message, botId }, method);
                    return null;
                }
            }
        }
    }

    const getSummary = async (transcript, botId = "") => {
        const method = "getSummary";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                { "role": "system", "content": "Given a partial transcript from a meeting, create a shorter and more concise version under 200 tokens. Make it read like an actual transcript." },
                {
                    "role": "user", "content": `Transcript: ${transcript}`
                }
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const getKeywords = async (transcript, botId = "") => {
        const method = "getKeywords";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                { "role": "system", "content": "Use the best possible algorithm to extract keywords from the given text below, these keywords will be used to match conversations so make sure to extract the most important and limited keywords only. Do not extract common words. The output should be comma-separated text." },
                {
                    "role": "user", "content": `Text: ${transcript}`
                }
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const oldgetParticipationLevel = async (all_summaries, botId = "", participantsNames) => {
        const method = "getParticipationLevel";
        if (!all_summaries || !botId) {
            Logger.data.chatGPT({ exception: "null values found", all_summaries, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": "Act as a coach and from the given transcript, assess level of participation of each individual from scale 1 to 5 and provide 1-2 lines of coaching for each participant. and carefully Follow instruction below :\n" +
                        "Generate output in below format:\n" +
                        "['Name of participant' , level of participation],\n" +
                        "Coaching tips in HTML format:\n" +
                        "<dl><dt>Name of Participant</dt><dd> - Coaching tip</dd></dl>"
                },
                {
                    "role": "user", "content": `Text: ${all_summaries}`
                }
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const getParticipationLevel = async (all_summaries, botId = "", participantsNames) => {
        const method = "getParticipationLevel";
        if (!all_summaries || !botId) {
            Logger.data.chatGPT({ exception: "null values found", all_summaries, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": "From the given transcript assess level of participation of ONLY participant list  from scale 0 to 5 and provide 1-2 lines of coaching and feedback for each to improve collaboration.  If no one is speaking their level of participation is 0.\n" +

                        "Generate output in below HTML format: \n " +
                        "['Name of participant' , level of participation], \n" +
                        "['Name of participant' , level of participation]\n" +
                        "Coaching tips in HTML format:\n" +
                        "<dl>" +
                        "<dt>Name of participant</dt>" +
                        "<dd>Coaching tip and feedback</dd>" +
                        "<dt>Name of participant</dt>" +
                        "<dd>Coaching tip and feedback</dd>" +
                        "</dl>"
                },
                {
                    "role": "user", "content": `participant list: ${participantsNames} \n Transcript: ${all_summaries}`
                }
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const getMeetingTitle = async (all_summaries, botId = "") => {
        const method = "getMeetingTitle";
        if (!all_summaries || !botId) {
            Logger.data.chatGPT({ exception: "null values found", all_summaries, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": "Given the meeting summary, create a title for the meeting summary, under 5 words."
                },
                {
                    "role": "user", "content": `Transcript: ${all_summaries}`
                }
            ]
        }

        // let request = {
        //     "contents": [
        //         {
        //             "parts": [
        //                 {
        //                     "text": `Given the meeting summary, create a title for the meeting summary, under 5 words. Transcript: ${all_summaries}`
        //                 }
        //             ]
        //         }
        //     ]
        // }
        // const url = process.env.GEMINI_URL;
        // const headers = {
        //     "x-goog-api-key": process.env.GEMINI_KEY,
        //     "Content-Type": "application/json"
        // };
        // return await postMethodChatGPT(url, request, headers);
        return await makeRequest(request, method, botId);
    }

    const getFinalSummary = async (all_summaries, botId = "") => {
        const method = "getFinalSummary";
        if (!all_summaries || !botId) {
            Logger.data.chatGPT({ exception: "null values found", all_summaries, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": "Given the meeting transcript, create minutes with the following format:\n" +
                        "<h2>Executive Summary</h2> //This is a high-level executive summary of the meeting" +
                        "<h2>'Discussion Topic '</h2> // Replace this with topic of discussion" +
                        "<ul>" +
                        "<li>'Key points discussed for each topic'</li> // These are more details about each" +
                        "topic" +
                        "</ul>" +
                        "<h2>Tasks coming out of meeting</h2>" +
                        "<ul>" +
                        "<li>'Task owner' : 'Task'</li>" +
                        "</ul>" +
                        "<h2>Key Decisions</h2>" +
                        "<ul>" +
                        "<li>'Decision'</li>" +
                        "</ul>"
                },
                {
                    "role": "user", "content": `Transcript: ${all_summaries}`
                }
            ]
        }
        const finalSummary = await makeRequest(request, method, botId);
        const finalDetailList = await getFinalDetailList(all_summaries, botId);

        const response = finalSummary.choices[0].message["content"].trim() + finalDetailList.choices[0].message["content"].trim();
        return response;

    }

    const getFinalDetailList = async (all_summaries, botId = "") => {
        const method = "getDetailList";
        if (!all_summaries || !botId) {
            Logger.data.chatGPT({ exception: "null values found", all_summaries, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": "Given the meeting transcript, create a detailed list of  key points that were mentioned or brought up s and return output in the following format:\n" +
                        "<h2>Detailed List of  Key Points that were mentioned or brought up</h2>" +
                        "<ul><li></li><ul></ul>"
                },
                {
                    "role": "user", "content": `Transcript: ${all_summaries}`
                }
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const getSummaryForGeneralMeeting = async (all_summaries, botId = "") => {
        const method = "getSummaryForGeneralMeeting";
        if (!all_summaries || !botId) {
            Logger.data.chatGPT({ exception: "null values found", all_summaries, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": "Create a meeting minutes from the provided transcript in HTML format. Keep it under 8,000 tokens in total and include:\n" +
                        "Summary\n" +
                        "Key Discussions\n" +
                        "Action items\n" +
                        "Decisions\n" +
                        "Suggestions by Kolabrya (Imagine Kolabrya is you, provide some suggestions based on your understanding of the transcript)\n" +
                        "Example:\n" +
                        "<h2>Summary:</h2>\n" +
                        "<p>Singapore has successfully developed sustainably and positioned itself as a model for urban development.</p>\n" +
                        "<h2>Key Discussions:</h2>\n" +
                        "<ul>\n" +
                        "<li>The challenge of creating livable urban spaces in expanding cities</li>\n" +
                        "<li>The responsibility of the Singapore Development Board in creating living spaces for 80% of the city\'s residents</li>\n" +
                        "</ul>\n" +
                        "<h2>Action Items:</h2>\n" +
                        "<ul>\n" +
                        "<li>john made a decision regarding an unspecified matter</li>\n" +
                        "</ul>\n" +
                        "<h2>Key Decisions:</h2>\n" +
                        "<ul>\n" +
                        "<li>Amanda and Fareed will provide updates</li>\n" +
                        "</ul>" +
                        "<h2>Suggestions by Kolabrya:</h2>\n" +
                        "<ul>\n" +
                        "<li>should need to participate more, to get deisgn level thinking.</li>\n" +
                        "</ul>"
                },
                {
                    "role": "user", "content": `Transcript: ${all_summaries}`
                }
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const getSummaryForProjectMeeting = async (all_summaries, botId = "") => {
        const method = "getSummaryForProjectMeeting";
        if (!all_summaries || !botId) {
            Logger.data.chatGPT({ exception: "null values found", all_summaries, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": "Create summary from the provided transcript. ONLY include:\n" +
                        "Project Status\n" +
                        "Key Discussions\n" +
                        "Suggestions by Kolabrya (Imagine Kolabrya is you, provide some suggestions based on your understanding of the transcript)\n" +
                        "Risks\n" +
                        "Issues & Problems\n" +
                        "Timelines\n" +
                        "Finance/Budget\n" +
                        "Action Items"
                },
                {
                    "role": "user", "content": `Transcript: ${all_summaries}`
                }
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const getActionItemsMapForProjectMeeting = async (transcript, botId = "") => {
        const method = "getActionItemsMapForProjectMeeting";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        const finalSummary = await getSummaryForProjectMeeting(transcript, botId);

        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": `Act as a coach, put the given meeting minutes into the JSON format go.js library. Put one sentence in each key.
                    Keys are
                    Project Status\n
                    Key Discussions\n
                    Suggestions by Kolabrya\n
                    Risks\n
                    Issues & Problems\n
                    Timelines\n
                    Finance/Budget\n
                    Action Items\n
                    Use example below to learn how to create this JSON format:
                    {
                        "class": "go.GraphLinksModel",
                        "nodeDataArray": [
                          {"key":"Project Status", "text":"Project Status", "isGroup":true, "color":"5", "loc":"0 23.5"},
                          {"key":"Key Discussion", "text":"Key Discussion", "isGroup":true, "color":"4", "loc":"109 23.5"},
                          {"key":"Kolabrya Suggestions", "text":"Kolabrya Suggestions", "isGroup":true, "color":"0", "loc":"235 23.5"},
                          {"key":"Risks", "text":"Risks", "isGroup":true, "color":"1", "loc":"320 23.5"},
                          {"key":"Issues & Problems", "text":"Issues & Problems", "isGroup":true, "color":"2", "loc":"400 23.5"},
                          {"key":"Timelines", "text":"Timelines", "isGroup":true, "color":"6", "loc":"560 23.5"},
                          {"key":"Finance/Budget", "text":"Finance/Budget", "isGroup":true, "color":"7", "loc":"660 23.5"},
                          {"key":"Action Items", "text":"Action Items", "isGroup":true, "color":"8", "loc":"760 23.5"},
                          {"key":6, "text":"Project Status Update A", "group":"Project Status", "color":"5", "loc":"12 35.5"},
                          {"key":5, "text":"Key Discussion Point A", "group":"Key Discussion", "color":"4", "loc":"121 35.5"},
                          {"key":1, "text":"Suggestion A", "group":"Kolabrya Suggestions", "color":"0", "loc":"247 35.5"},
                          {"key":2, "text":"Risk A", "group":"Risks", "color":"1", "loc":"327 35.5"},
                          {"key":3, "text":"Issue A", "group":"Issues & Problems", "color":"2", "loc":"407 35.5"},
                          {"key":4, "text":"Problem A", "group":"Issues & Problems", "color":"3", "loc":"487 35.5"},
                          {"key":7, "text":"Timeline A", "group":"Timelines", "color":"6", "loc":"567 35.5"},
                          {"key":8, "text":"Budget Overview", "group":"Finance/Budget", "color":"7", "loc":"667 35.5"},
                          {"key":9, "text":"Financial Report", "group":"Finance/Budget", "color":"7", "loc":"667 55.5"},
                          {"key":10, "text":"Action Item A", "group":"Action Items", "color":"8", "loc":"767 35.5"},
                          {"key":11, "text":"Action Item B", "group":"Action Items", "color":"8", "loc":"767 55.5"}
                        ],
                        "linkDataArray": []
                      }`
                },
                {
                    "role": "user", "content": `Meeting Minutes : ${finalSummary.choices[0].message["content"].trim()}`
                },
            ]
        }
        let data;
        try {
            data = await makeRequest(request, method, botId);
            let response = data.choices[0].message["content"].trim().toLowerCase(); // Convert response to lowercase

            // Define search strings in lowercase
            const searchStrings = [
                "text for oneA",
                "text for oneB",
                "text for oneC",
                "text for oneD",
                "text for twoA",
                "text for twoB",
                "text for twoC",
                "text for twoD"
            ];

            // Check if response contains any of the search strings (case-insensitive)
            if (searchStrings.some(searchString => response.includes(searchString.toLowerCase()))) {
                // Do something when the conditions are met
                console.log("Response contains text for oneA, oneB, or oneC (case-insensitive)");
                return null;
            } else {
                // Handle the case when none of the conditions are met
                console.log("Response does not contain text for oneA, oneB, or oneC (case-insensitive)");
            }



            // Define search strings in lowercase
            const searchString1 = "Project Status";
            const searchString2 = "Key Discussions";
            const searchString3 = "Suggestions by Kolabrya";
            const searchString4 = "Risks";
            const searchString5 = "Issues & Problems";
            const searchString6 = "Timelines";
            const searchString7 = "Finance/Budget";

            // Check if response contains the search strings (case-insensitive)
            if (
                response.includes(searchString1.toLowerCase()) &&
                response.includes(searchString2.toLowerCase()) &&
                response.includes(searchString3.toLowerCase()) &&
                response.includes(searchString4.toLowerCase()) &&
                response.includes(searchString5.toLowerCase()) &&
                response.includes(searchString6.toLowerCase()) &&
                response.includes(searchString7.toLowerCase())
            ) {
                // Do something when the conditions are met
                console.log("Response contains text for " + searchString1 + ", " + searchString2 + ", " + searchString3 + ", " + searchString4 + ", and " + searchString5 + " (case-insensitive)");
            } else {
                // Handle the case when none of the conditions are met
                console.log("Response does not contain Summary, Key Discussions, Action items, Decisions, and Suggestions by Kolabrya (case-insensitive)");
                return null;
            }


            return data;
        } catch (e) {
            Logger.data.chatGPTException({ request, exception: e.message, botId }, method);
            return null
        }
    }

    const getActionItemsMap = async (transcript, botId = "") => {
        const method = "getActionItemsMap";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        const finalSummary = await getSummaryForGeneralMeeting(transcript, botId);
        //const FinalSummaryJson = await getFinalSummaryJson(finalSummary.choices[0].message["content"].trim(), botId);

        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": `Act as a coach, put the given meeting minutes into the JSON format go.js library. Put one sentence in each key.
                    Keys are
                    Summary
                    Key Discussions
                    Action items
                    Decisions
                    Suggestions by Kolabrya
                    Use example below to learn how to create this JSON format:
                    {

                        "class": "go.GraphLinksModel",
                        
                        "nodeDataArray": [
                            {"key":"Summary", "text":"Summary", "isGroup":true, "color":"0", "loc":"0 23.5"},
                            {"key":"Key Discussions", "text":"Key Discussions", "isGroup":true, "color":"1", "loc":"109 23.5"},
                            {"key":"Action items", "text":"Action Items", "isGroup":true, "color":"2", "loc":"235 23.5"},
                            {"key":"Decisions", "text":"Decisions", "isGroup":true, "color":"1", "loc":"343 23.5"},
                            {"key":"Suggestions by Kolabrya", "text":"Suggestions by Kolabrya", "isGroup":true, "color":"1", "loc":"451 23.5"},
                            {"key":1, "text":"Summary Text A", "group":"Summary", "color":"0", "loc":"12 35.5"},
                            {"key":2, "text":"Discussion A", "group":"Key Discussions", "color":"1", "loc":"121 35.5"},
                            {"key":3, "text":"Action A", "group":"Action items", "color":"2", "loc":"247 35.5"},
                            {"key":4, "text":"Decision A", "group":"Decisions", "color":"1", "loc":"355 35.5"},
                            {"key":5, "text":"Suggestion A", "group":"Suggestions by Kolabrya", "color":"1", "loc":"463 35.5"}
                        ],
                        "linkDataArray": []
                        }`
                },
                {
                    "role": "user", "content": `Meeting Minutes : ${finalSummary.choices[0].message["content"].trim()}`
                },
            ]
        }
        let data;
        try {
            data = await makeRequest(request, method, botId);
            let response = data.choices[0].message["content"].trim().toLowerCase(); // Convert response to lowercase

            // Define search strings in lowercase
            const searchStrings = [
                "text for oneA",
                "text for oneB",
                "text for oneC",
                "text for oneD",
                "text for twoA",
                "text for twoB",
                "text for twoC",
                "text for twoD"
            ];

            // Check if response contains any of the search strings (case-insensitive)
            if (searchStrings.some(searchString => response.includes(searchString.toLowerCase()))) {
                // Do something when the conditions are met
                console.log("Response contains text for oneA, oneB, or oneC (case-insensitive)");
                return null;
            } else {
                // Handle the case when none of the conditions are met
                console.log("Response does not contain text for oneA, oneB, or oneC (case-insensitive)");
            }



            // Define search strings in lowercase
            const searchString1 = "Summary";
            const searchString2 = "Key Discussions";
            const searchString3 = "Action items";
            const searchString4 = "Decisions";
            const searchString5 = "Suggestions by Kolabrya";

            // Check if response contains the search strings (case-insensitive)
            if (
                response.includes(searchString1.toLowerCase()) &&
                response.includes(searchString2.toLowerCase()) &&
                response.includes(searchString3.toLowerCase()) &&
                response.includes(searchString4.toLowerCase()) &&
                response.includes(searchString5.toLowerCase())
            ) {
                // Do something when the conditions are met
                console.log("Response contains text for Summary, Key Discussions, Action items, Decisions, and Suggestions by Kolabrya (case-insensitive)");
            } else {
                // Handle the case when none of the conditions are met
                console.log("Response does not contain Summary, Key Discussions, Action items, Decisions, and Suggestions by Kolabrya (case-insensitive)");
                return null;
            }


            return data;
        } catch (e) {
            Logger.data.chatGPTException({ request, exception: e.message, botId }, method);
            return null
        }
    }

    const xgenerateProductivityScores = async (transcript, botId = "") => {


        const method = "xgenerateProductivityScores";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": `act as a professional organizational coach and analyze the meeting transcript and produce 1) meeting productivity and  2)meeting collaboration  scores to the meeting transcription provided by user prompt.
Use the following scales:

    Needs Improvement
    High
    Medium`
                },
                {
                    "role": "user", "content": `Given the transcript below generate meeting productivity and collaboration scores using one of the following scales:
    Needs Improvement
    High
    Medium

    Your output should look like this: 
    Productivity Score is " "
    Rationale for the score " " less than 100 words
    Collaboration score is " "
    Rationale for the score " " less than 100 words

    Meeting:'${transcript}'`
                },
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const generateProductivityScores = async (transcript, botId = "") => {
        const method = "generateProductivityScores";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": `act as a professional organizational coach and analyze the meeting transcript and produce 1) meeting productivity and  2)meeting collaboration  scores to the meeting transcription provided by user prompt.
                  Use the following scales:
              
              % percentage 
              `
                },
                {
                    "role": "user", "content": `Given the transcript below generate meeting productivity and collaboration scores using one of the following scales:
                  %percentage 
              
                  Your output should be standard JSON format like:
                    {
                        "Productivity": {
                        "Score": " ",
                        "Rationale for the score": " ",
                        "Ways to improve": " "
                        },
                        "Collaboration": {
                        "Score": " ",
                        "Rationale for the score": " ",
                        "Ways to improve": " "
                        }
                    }
              
              Meeting: '${transcript}'`

                },
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const objectiveProductivityScores = async (transcript, botId = "", data) => {
        const method = "objectiveProductivityScores";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 1, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            //                     %percentage and also add the objective response json 

            messages: [
                {
                    "role": "system", "content": `Act as a neutral and unbiased workplace investigator and analyze the interview transcript and determine the extent to which the interview objectives are covered within these segments (call it productivity score). You are to quantify your assessment with a percentage (ranging from 0% to 100%) that  indicates how well each objectives/question is addressed by the transcript.

                    *** Further instructions:

                    1. Do not change the objectives, and do not provide more objectives. Stick with that you have been provided with.

                    2. Do not make any changes to objectives, do not fix any Gramme or punctuation issues.

                    3. Your responses must be in neutral and active voice, and unbiased.

                    4. Examples are for you to learn the format, do not repeat the examples in your outputs.`
                },
                {
                    "role": "user", "content": `
                    Your output should be standard JSON format like:
                    {
                    "objective": " ",
                    "Productivity": {
                        "Score": " ",
                        "Rationale for the score": " ",
                        "Questions to ask to further investigate and improve score": " "
                    }
                    }
                    Examples1:
                    {
                    "objective": "Did John talk about his manager?",
                    "Productivity": {
                        "Score": "10%",
                        "Rationale for the score": "There was a limited mention about John's manager...",
                        "Questions to ask to further investigate and improve score": "Can you talk about your manage and what was discussed on Jan 4 in his offer?"
                    }
                    }

                    Examples2:
                    {
                    "objective": "Did Sara ask her manage to go out for drinks on Feb 5?",
                    "Productivity":{
                        "Score": "90%",
                        "Rationale for the score": "Sarah discussed in detail about Feb 5 and that she asked his manager to go out ....",
                        "Questions to ask to further investigate and improve score": "Can you tell me how you asked your manager to go for drinks?"
                    }
                    }

                    '${data}' Meeting transcript: '${transcript}'`
                },
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const getMeetingInconsistencies = async (transcript, botId = "", data) => {
        const method = "getMeetingInconsistencies";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k-0613',
            temperature: 0.7, // Set the desired temperature
            top_p: 0.8, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            //                     %percentage and also add the objective response json 

            messages: [
                {
                    "role": "system", "content": `You are a neutral and unbiased workplace investigator interviewing witness regarding a workplace incident. Analyze the transcript and summarize the inconsistencies found in the transcript`
                },
                {
                    "role": "user", "content": `Given the meeting transcript
                    Your output should be standard JSON format like:
                    {
                        "Topic of inconsistency" : "Brief summary of inconsistency"
                        "Topic of inconsistency" : "Brief summary of inconsistency"
                        "Topic of inconsistency" : "Brief summary of inconsistency"
                        Or
                        "No discrepancies found" 
                    }
                    Transcript: '${transcript}'`
                },
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const getSuggestedQuestions = async (transcript, botId = "", data) => {
        const method = "getSuggestedQuestions";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k-0613',
            temperature: 0.7, // Set the desired temperature
            top_p: 0.8, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            //                     %percentage and also add the objective response json 

            messages: [
                {
                    "role": "system", "content": `You are a neutral and unbiased workplace investigator interviewing witness regarding a workplace incident. Analyze the transcript and develop 3 high value questions to ask in order to investigate the case more effectively and efficiently`
                },
                {
                    "role": "user", "content": `Given the meeting transcript
                    Your output should be standard JSON format like:
                    {
                        "Question"
                        "Question"
                        "Question"
                    }
                    Transcript: '${transcript}'`
                },
            ]
        }
        return await makeRequest(request, method, botId);
    }

    const generateConceptMap = async (transcript, botId = "") => {
        const method = "generateConceptMap";
        if (!transcript || !botId) {
            Logger.data.chatGPT({ exception: "null values found", transcript, botId }, method);
            return null;
        }
        let request = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.61, // Set the desired temperature
            top_p: 1, // Set the Top P value
            frequency_penalty: 0, // Set the Frequency penalty
            presence_penalty: 0, // Set the Presence penalty
            max_tokens: 8000, // Set the Maximum length
            messages: [
                {
                    "role": "system", "content": `Extract the key points and discussion items from the given transcript and put it into the JSON format go.js library and include details.  Replace the root node (\“Mind Map\“) with a title indicative of the meeting’s main subject or theme.
                    Construct the mind map with the following structure:
                    ONE central root node representing the meeting’s main theme.
                    Use the following example structure as a guide.       
                    
                    Example as guide:
                    {
                        "class": "go.TreeModel",                      
                        "nodeDataArray": [
                          {"key":0, "text":"", "loc":"0 0"},                      
                          {"key":1, "parent":0, "text":"", "brush":"skyblue", "dir":"right", "loc":"77 -22"},                      
                          {"key":11, "parent":1, "text":"", "brush":"skyblue", "dir":"right", "loc":"200 -48"},                      
                          {"key":12, "parent":1, "text":"", "brush":"skyblue", "dir":"right", "loc":"200 -22"},                      
                          {"key":13, "parent":1, "text":"", "brush":"skyblue", "dir":"right", "loc":"200 4"},                      
                          {"key":2, "parent":0, "text":"", "brush":"darkseagreen", "dir":"right", "loc":"77 43"},                      
                          {"key":21, "parent":2, "text":"", "brush":"darkseagreen", "dir":"right", "loc":"203 30"},                      
                          {"key":211, "parent":21, "text":"", "brush":"darkseagreen", "dir":"right", "loc":"274 17"},                      
                          {"key":212, "parent":21, "text":"", "brush":"darkseagreen", "dir":"right", "loc":"274 43"},                      
                          {"key":22, "parent":2, "text":"", "brush":"darkseagreen", "dir":"right", "loc":"203 56"},                      
                          {"key":3, "parent":0, "text":"", "brush":"palevioletred", "dir":"left", "loc":"-20 -31.75"},                      
                          {"key":31, "parent":3, "text":"", "brush":"palevioletred", "dir":"left", "loc":"-117 -64.25"},                      
                          {"key":32, "parent":3, "text":"", "brush":"palevioletred", "dir":"left", "loc":"-117 -25.25"},                     
                          {"key":33, "parent":3, "text":"", "brush":"palevioletred", "dir":"left", "loc":"-117 0.75"},
                          {"key":331, "parent":31, "text":"", "brush":"palevioletred", "dir":"left", "loc":"-251 -77.25"},
                          {"key":332, "parent":31, "text":"", "brush":"palevioletred", "dir":"left", "loc":"-251 -51.25"},
                          {"key":4, "parent":0, "text":"", "brush":"coral", "dir":"left", "loc":"-20 52.75"},
                          {"key":41, "parent":4, "text":"", "brush":"coral", "dir":"left", "loc":"-103 26.75"},
                          {"key":42, "parent":4, "text":"", "brush":"coral", "dir":"left", "loc":"-103 52.75"},
                          {"key":43, "parent":4, "text":"", "brush":"coral", "dir":"left", "loc":"-103 78.75"}                      
                        ]
                      }`
                },
                {
                    "role": "user", "content": `Transcript:'${transcript}'`
                },
            ]
        }
        return await makeRequest(request, method, botId);
    }

    return {
        getSummary,
        getActionItemsMap,
        getActionItemsMapForProjectMeeting,
        generateProductivityScores,
        generateConceptMap, getFinalSummary,
        getMeetingTitle,
        getParticipationLevel,
        getKeywords,
        objectiveProductivityScores,
        getMeetingInconsistencies,
        getSuggestedQuestions,
        getTribunalSummary
    };
}
