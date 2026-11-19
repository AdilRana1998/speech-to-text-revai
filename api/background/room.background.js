const background = {};
const {    
    speechToText
 } = require('../services')
 
background.revTranscript = async () => {
    await speechToText.sendFile();
    await speechToText.getFile();
    return await speechToText.getTranscript();
}

module.exports = background