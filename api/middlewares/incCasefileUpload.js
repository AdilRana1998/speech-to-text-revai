const multer = require('multer');
const { sendStatus, Strings } = require('../../utils');
const storage = multer.memoryStorage();
const FILE_SIZE_LIMITS = {
  caseFiles: Number(process.env.INS_CASE_FILE_SIZE) * 1024 * 1024, // 20 MB for caseFiles
};

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedFileTypes = {
      caseFiles: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ]
    };
    const fileSizeLimit = FILE_SIZE_LIMITS[file.fieldname];
    if (file.size > fileSizeLimit) {
      const error = new multer.MulterError('LIMIT_FILE_SIZE', file.fieldname);
      error.message = file.fieldname === 'caseFiles'
        ? Strings.FILE.INS_CASE_DOC_LIMIT
        : Strings.FILE.CASE_AUD_SIZE_LIMIT;
      return cb(error);
    }

    if (allowedFileTypes[file.fieldname]?.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
  }
}).fields([
  { name: 'caseFiles', maxCount: Number(process.env.INS_CASE_FILE_LIMIT) + 1 },  // Limit to 20 files: it must be plus 1 of actual limit also update //caseFiles.length > 10 //CASE_DOC_LIMIT // also update the .env CASE_FILE_LIMIT=10
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
                ? Strings.FILE.ACCEPT_FILE_TYPE
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
  if (caseFiles.length > Number(process.env.INS_CASE_FILE_LIMIT)) {
    return sendStatus.data.sortStatus(
      res, req, {}, Strings.FILE.CASE_DOC_LIMIT, "File-Upload-Middleware", 400
    );
  }

  for (const file of caseFiles) {
    if (file.size > FILE_SIZE_LIMITS.caseFiles) {
      return sendStatus.data.sortStatus(
        res, req, {}, Strings.INSURANCE_CASE.INSURANCE_CASE_DOC_SIZE_LIMIT, "File-Upload-Middleware", 400
      );
    }
  }

  return true
}

module.exports = uploadFiles;