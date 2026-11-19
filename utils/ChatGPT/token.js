const openaiTokenCounter = require('openai-gpt-token-counter');

const getTokensCount = (text) => {
    const model = "gpt-3.5-turbo-16k";
    var count = 0;
    if(text){
        count = openaiTokenCounter.text(text, model);
    }
    return count;
}

module.exports = {
    getTokensCount
};