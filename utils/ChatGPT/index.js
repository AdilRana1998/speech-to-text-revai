const { OpenAIApi, Configuration  } = require('openai');
const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);
const {getTokensCount} = require('./token');
const { getSummary, getActionItemsMapForProjectMeeting, getActionItemsMap, generateProductivityScores, generateConceptMap, getFinalSummary, getMeetingTitle, getParticipationLevel, getKeywords, objectiveProductivityScores, getMeetingInconsistencies, getSuggestedQuestions, getTribunalSummary} = require('./chatCompletion')(openai);

module.exports = {
    getSummary, getActionItemsMapForProjectMeeting, getActionItemsMap, generateProductivityScores, generateConceptMap, getFinalSummary, getTokensCount, getMeetingTitle, getParticipationLevel, getKeywords, objectiveProductivityScores, getMeetingInconsistencies, getSuggestedQuestions,getTribunalSummary
}
