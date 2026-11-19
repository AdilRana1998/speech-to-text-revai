const loggerHelper = require('./LoggerHelper');
const { slack } = require('./Webhook')
const logger = {}

logger.errorLog = (e = { message: "No Data Provided" }, event) => {
    loggerHelper.eventLogger(event, JSON.stringify(e))
}

logger.successLog = (data, event) => {
    loggerHelper.eventLogger(event, JSON.stringify(data))
}

logger.bodyLog = (data, event) => {
    loggerHelper.eventLogger(event, JSON.stringify(data))
}

logger.ReCall = (data, event) => {
    loggerHelper.eventLoggerRecall(event, JSON.stringify(data));
}

logger.OpenAI = (data, event) => {
    loggerHelper.eventLoggerOpenAI(event, JSON.stringify(data));
}

logger.RevAI = (data, event) => {
    loggerHelper.eventLoggerRevAI(event, JSON.stringify(data));
}

logger.Citation = (data, event) => {
    loggerHelper.eventLoggerCitation(event, JSON.stringify(data));
}

logger.HealthCheck = (data, event) => {
    loggerHelper.eventLoggerHealthCheck(event, JSON.stringify(data));
}

logger.stripeWebhook = (data, event) => {
    loggerHelper.eventLoggerStripeWebhook(event, JSON.stringify(data));
}

logger.chatGPT = (data, event) => {
    loggerHelper.eventChatGPT(event, JSON.stringify(data));
}

logger.chatGPTException = (data, event) => {
    slack.webhook(JSON.stringify(data));
    loggerHelper.eventChatGPTException(event, JSON.stringify(data));
}

logger.Grok = (data, event) => {
    loggerHelper.eventLoggerGrok(event, JSON.stringify(data));
}

logger.Gemini = (data, event) => {
    loggerHelper.eventLoggerGemeni(event, JSON.stringify(data));
}

logger.IncCase = (data, event) => {
    loggerHelper.eventLoggerIncCase(event, JSON.stringify(data));
}

logger.DocEnhance = (data, event) => {
    loggerHelper.eventLoggerDocEnhance(event, JSON.stringify(data));
}

exports.data = logger