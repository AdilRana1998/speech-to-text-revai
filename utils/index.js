const Functions = require('./Functions');
const Encryption = require('./Encryptions')
const sendStatus = require('./SendStatus');
const Logger = require('./Logger');
const JWT = require('./jwt');
const ErrorHandling = require('./ErrorHandling');
const Strings = require('./Strings');
const Features = require('./Features');
const Jsons = require('./Jsons');
const Payments = require('./Payments')
const Emails = require('./SendGrid')
const OTP = require('./OTP')

module.exports = { Functions, Encryption, sendStatus, Logger, JWT, ErrorHandling, Strings, Jsons, Payments, Emails, Features, OTP };