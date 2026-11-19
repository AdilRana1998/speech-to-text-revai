const { eventLogs , debugMode } = require('../config');
const fileUtility = require('./fs.utility');
const fs = require('fs').promises;
const path = require('path');
const { Strings } = require("../utils");

Number.prototype.padStart = function (maxLength, fillString = " ") {
    return this.toString().padStart(maxLength, fillString);
}

module.exports.formatDate = formatDate = function (date) {
    date = date || new Date();
    return date.getFullYear() + "-" + (date.getMonth() + 1).padStart(2, "0") + "-" + date.getDate().padStart(2, "0");
}

module.exports.eventLogger = function (eventName, data = 'No data provided') {
    if (true) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${eventLogs}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerChatGPT = function (eventName, data = 'No data provided') {
    if (true) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/chat-gpt-transcript-process"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventChatGPT = function (eventName, data = 'No data provided') {
    if (true) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/chat-gpt-request-response"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventChatGPTException = function (eventName, data = 'No data provided') {
    if (true) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/chat-gpt-request-response"}/${formatDate()}-err.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerRecall = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/recall-api"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerStripeWebhook = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/stripe-webhook"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerOpenAI = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/open-ai"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerRevAI = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/rev-ai"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerHealthCheck = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/health-check"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerCitation = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/citation"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerGrok = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/grok"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerGemeni = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/gemini"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerIncCase = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/inc-case-log"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}

module.exports.eventLoggerDocEnhance = function (eventName, data = 'No data provided') {
    if (debugMode) {
        let log;
        let dateTime = new Date().toString();
        log = dateTime + "----" + eventName + "----" + data + "\r\n";
        let file_path = `../${"log/doc-enhance-log"}/${formatDate()}.txt`;
        fileUtility.appendText(file_path, log);
    }
}