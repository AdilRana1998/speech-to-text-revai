const multer = require('multer');
const { sendStatus, Strings } = require('../../utils');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mp4', 'audio/mp3'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      err = {
        message: Strings.FILE.ACCEPT_AUDIO_FILE_TYPE,
        statusCode: 400,
        obj: {}
      }
      cb(err);

    }
  }
}).array('audioFile', 1);

const uploadFile = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          // Error for more than one file uploaded
          const errorMessage = 'Only 1 file are allowed to upload';
          return sendStatus.data.sortStatus(res, req, {}, errorMessage, "File-Upload-Middleware", 400);
        } else {
          return sendStatus.data.sortStatus(res, req, {}, err.message, "File-Upload-Middleware", 400);
        }
      } else {
        return sendStatus.data.sortStatus(res, req, {}, err.message, "File-Upload-Middleware", err.statusCode);
      }
    }
    next();
  });
};

module.exports = uploadFile;
