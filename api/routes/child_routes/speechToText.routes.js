const router = require('express').Router();
const {
    speechToText
} = require('../../controller');
const middleware = require('../../middlewares'); 
const uploadAudio  = require('../../middlewares/audioUpload'); 
const audioUploadRev  = require('../../middlewares/audioUploadRev'); 

// voice/convert   
router.post('/voice/g7h8i9', uploadAudio, [middleware.authValidation], speechToText.convert);

// rev.ai
router.post('/voice/upload-file', audioUploadRev, [middleware.authValidation], speechToText.uploadFile);
router.post('/voice/send-file', [middleware.openApi], speechToText.sendFile);
router.post('/voice/get-file', [middleware.openApi], speechToText.getFile);
router.post('/voice/get-transcript', [middleware.openApi], speechToText.getTranscript);
router.get('/voice/get-all', [middleware.authValidation], speechToText.getAll);
router.get('/voice/get/:requestUuid', [middleware.authValidation], speechToText.getByRequestUuid);
router.get('/voice/delete/:requestUuid', [middleware.authValidation], speechToText.deleteByRequestUuid);
router.post('/voice/edit', [middleware.authValidation], speechToText.editByRequestUuid);
router.get('/voice/download-transcript/:requestUuid', [middleware.authValidation], speechToText.downloadTranscript);

module.exports = router;
 