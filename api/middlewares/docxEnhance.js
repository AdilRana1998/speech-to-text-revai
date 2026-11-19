const multer = require('multer');
const { sendStatus, Strings } = require('../../utils');
const allowedFile = Number(process.env.DOCUMENT_ENHANCE_FILE_LIMIT);
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 7 * 1024 * 1024 }, // Limit file size to 7 MB
  fileFilter: (req, file, cb) => {
    // Allow only 'docx'
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      err = {
        message: Strings.FILE.ACCEPT_DOCX_FILE_TYPE,
        statusCode: 400,
        obj: {}
      }
      cb(err);

    }
  }
}).array('document', allowedFile);

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
