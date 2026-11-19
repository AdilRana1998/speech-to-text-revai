const multer = require('multer');
const { sendStatus, Strings } = require('../../utils');

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Limit file size to 20 MB
  fileFilter: (req, file, cb) => {
    // Allow only 'docx' and 'txt' MIME types
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ) {
      cb(null, true); // Accept the file
    } else {
      err = {
        message: Strings.FILE.ACCEPT_FILE_TYPE,
        statusCode: 400,
        obj: {}
      }
      cb(err);

    }
  }
}).array('transcript', 5);

const uploadFile = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          // Error for more than one file uploaded
          const errorMessage = 'Only 5 files are allowed to upload';
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
