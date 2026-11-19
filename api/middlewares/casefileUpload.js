const multer = require('multer');
const { sendStatus, Strings } = require('../../utils');
const storage = multer.memoryStorage();

const FILE_SIZE_LIMITS = {
  caseFiles: Number(process.env.CASE_FILE_SIZE) * 1024 * 1024,
  caseAudio: Number(process.env.CASE_AUD_FILE_SIZE) * 1024 * 1024,
};

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedFileTypes = {
      caseFiles: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'message/rfc822',
        'application/msword'
      ],
      caseAudio: [
        'video/mp4',
        'video/webm',
        'audio/wav',
        'audio/mpeg',
        'audio/mpeg',
        'audio/mp4',
        'audio/mpeg',
      ]
    };
    if (allowedFileTypes[file.fieldname]?.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
  }
}).fields([
  { name: 'caseFiles', maxCount: Number(process.env.CASE_FILE_LIMIT) + 1 },  // Limit to 20 files: it must be plus 1 of actual limit also update //caseFiles.length > 10 //CASE_DOC_LIMIT // also update the .env CASE_FILE_LIMIT=10
  { name: 'caseAudio', maxCount: Number(process.env.CASE_AUD_FILE_LIMIT) + 1 }    // Limit to 2 files: it must be plus 1 of actual limit also update //caseAudio.length > 2 //CASE_AUD_LIMIT // also update the .env CASE_AUD_FILE_LIMIT=2
]);


const uploadFiles = (req, res, next) => {
  upload(req, res, (err) => {
    const fileCount = preValidateFiles(req, res)
    if (fileCount == true) {
      if (err) {
        let errorMessage;
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_COUNT':
              errorMessage = err.field === 'caseFiles'
                ? Strings.FILE.CASE_DOC_LIMIT
                : Strings.FILE.CASE_AUD_LIMIT;
              break;
            case 'LIMIT_UNEXPECTED_FILE':
              errorMessage = err.field === 'caseFiles'
                ? Strings.FILE.ACCEPT_FILE_TYPE_ASSISTANT
                : Strings.FILE.ACCEPT_AUDIO_FILE_TYPE;
              break;
            case 'LIMIT_FILE_SIZE':
              errorMessage = err.field === 'caseFiles'
                ? Strings.FILE.CASE_DOC_SIZE_LIMIT
                : Strings.FILE.CASE_AUD_SIZE_LIMIT;
              break;
            default:
              errorMessage = err.message;
          }
          return sendStatus.data.sortStatus(res, req, {}, errorMessage, "File-Upload-Middleware", 400);
        }
        return sendStatus.data.sortStatus(res, req, {}, err.message, "File-Upload-Middleware", err.statusCode);
      }
      next();
    } else {
      return fileCount;
    }
  });
};

const preValidateFiles = (req, res) => {
  const caseFiles = req.files?.caseFiles || [];
  const caseAudio = req.files?.caseAudio || [];

  for (const file of caseFiles) {
    if (file.size > FILE_SIZE_LIMITS.caseFiles) {
      return sendStatus.data.sortStatus(
        res, req, {}, Strings.FILE.CASE_DOC_SIZE_LIMIT, "File-Upload-Middleware", 400
      );
    }
  }

  for (const file of caseAudio) {
    if (file.size > FILE_SIZE_LIMITS.caseAudio) {
      return sendStatus.data.sortStatus(
        res, req, {}, Strings.FILE.CASE_AUD_SIZE_LIMIT, "File-Upload-Middleware", 400
      );
    }
  }

  if (caseFiles.length > Number(process.env.CASE_FILE_LIMIT)) {
    return sendStatus.data.sortStatus(
      res, req, {}, Strings.FILE.CASE_DOC_LIMIT, "File-Upload-Middleware", 400
    );
  }

  if (caseAudio.length > Number(process.env.CASE_AUD_FILE_LIMIT)) {
    return sendStatus.data.sortStatus(
      res, req, {}, Strings.FILE.CASE_AUD_LIMIT, "File-Upload-Middleware", 400
    );
  }
  return true
}

module.exports = uploadFiles;