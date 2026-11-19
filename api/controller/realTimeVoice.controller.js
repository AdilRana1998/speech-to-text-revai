const Controller = {}
const { sendStatus } = require('../../utils')
const {
    postData,
} = require('../services/realTimeVoice.services');

Controller.postData = async (req, res, next) => {    
    const result =  await postData(req.jsonObject, req.userId);
    sendStatus.data.sortStatus(res, req, result.obj, result.message, "Post-Data-For-RealTime-Audio-Text", result.statusCode);
}

module.exports = Controller;
