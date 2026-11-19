module.exports = {
    SUCCESS: 'Success',
    NO_DATA_PROVIDED: 'No data provided',
    RECORD_DELETED_SUCCESS: 'Record deleted successfully',
    RECORD_UPDATE_SUCCESS: 'Record updated successfully',
    EMPTY_FILE_PROVIDED: 'File can not be empty',
    SUCCESS_CODE_MESSAGE: 'Request successful',
    BAD_CODE_MESSAGE: 'Bad Request',
    SESSION_EXPIRED_MESSAGE: 'We signed you out to protect your account, please Sign In again!',
    UNAUTH_MESSAGE: 'UnAuthorized Request',
    JSON_VALIDATED: 'Json Validated',
    JSON_UNVALIDATION: "Json is not what has been asked",
    UNVALID_STATUS: "Input parameter must be valid",
    NULL_ELEMENTS: "One or more objectives are null.",
    FAILED_TO_WRITE: "Error while writing in file",
    ASSISTANT: {
        ASSISTANT_FAILED_TO_CREATE_THREAD: "Unable to create thread",
        ASSISTANT_THREAD_SUCCESS: "Document uploaded successfully",
        ASSISTANT_PENDING_RESPONSE: "Kolabrya response is in progess",
        ASSISTANT_SUCCESS_RESPONSE: "Successfully got the response from kolabrya",
        ASSISTANT_FAILED_RESPONSE: "Request failed from kolabrya",
        ASSISTANT_EXPIRED_RESPONSE: "Request expired from kolabrya",
        ASSISTANT_NO_RESPONSE: "Write your message in different way",
        ASSISTANT_ERROR: "No runId Found",
        ASSISTANT_THREAD_RUN: "Unable to get run id",
        ASSISTANT_CLEAR_THREAD: "Thread clear successfully",
        ASSISTANT_FILE_UPLOAD_ERROR: "Unable to upload the file. Please try again",
        ASSISTANT_THREADS_ENCRYPTION: "Encrypted Successfully",
        ASSISTANT_IMPROVED_PROMPT_SUCCESS: "Prompt uploaded successfully",
        ASSISTANT_RESEARCH_SUCCESS: "Research query uploaded successfully",
        ASSISTANT_KOLABRYA_AGENT_SUCCESS: "Agent query uploaded successfully"
    },    
    ERROR: {
        VERIFICATION_EMAIL: "Email has not yet been verified, we have sent another email for verification.",
        EMAIL_EXIST: "Email address already exists",
        INVALID_CREDS: "Enter a valid email address and password",
        CURR_PASSWORD_WRONG: "Current Password is wrong",
        PACKAGE_EXPIRED: "You don't have any active package right now.",
        EMAIL_NOT_EXISTS: "Email address does not exists",
        SOME_THING_WENT_WRONG: "Something went wrong. Please try again",
        PRD_SERVICES_DOWN: "One or more services are currently unavailable.",
        REFRESH_ON_ERROR: "Refresh Kolabrya and browser and try again",
        RECORD_UPDATE_ERROR: "Unable to update the record",
        ERROR_RE_TRY: "Kolabrya is re-analyzing for higher accuracy",
        RECORD_ALREADY_EXSIST: "Record already exsist",
        ACCESS_NOT_GRANTED: "Access not granted. Please contact your administrator for permissions.",
        INVALID_PASSWORD: "Enter a valid password",
        ERROR_WAIT: "Please wait a moment and try your request again. If the problem persists, feel free to contact support for further assistance.",
        ERROR_LOGOUT: "Please refresh your browser, re-upload the files, and try running the analysis again.",
        ERROR_LOGOUT_LLM: "Something went wrong",
        ERROR_RE_TRY_FROM_BACKGROUND_JOB: "Kolabrya is working to get the ", //summary
        ERROR_RE_TRY_COUNT_FINISHED_v1: "Kolabrya encountered an error while processing page ",
        ERROR_RE_TRY_COUNT_FINISHED_v1_1: ", please try again",
        ERROR_RE_TRY_COUNT_FINISHED_v2: "Kolabrya encountered an error while processing, please try again",
    },
    SUCCESS_MESSAGES: {
        SIGNED_UP: "Successful signed up",
        LOGGED_IN: "Successful Login",
        INFORAMATION_UPDATED: "Information updated",
        VERIFIED: "User has been verified",
        PASSWORD_UPDATED: "Password updated",
        IMAGE_UPLOADED: "Image Uploaded",
        EMAIL_SENT: "Email sent",
        RECORD_INSERT_SUCCESS: "Record inserted successfully",
        ALL_RECORDS_PROCESS_SUCCESS: "You can refine and enhance the summary using the text box below. For instance, you could specify, 'Keep the summary in the third person but maintain the original length.’",
    },
    RECALL: {
        //code: ready, joining_call, in_waiting_room, in_call_not_recording, in_call_recording, call_ended, done
        BOT_NAME: 'Kolabrya Assistant',
        DONE: 'done',
        IN_CALL_RECORDING: 'in_call_recording',
        EVENTS: {
            BOT_STATUS_CHANGED: "bot.status_change",
            BOT_TRANSCRIPTION: "bot.transcription",
            CALENDAR_SYN_EVENTS: "calendar.sync_events",
            CALENDAR_UPDATE: "calendar.update"
        },
        FILE_DOWNLOAD_ERROR: "Unable to download file from recall"
    },
    ROOM: {
        ROOM_ALREADY_CREATED: "Room is already created on this meeting url",
        START_TIME: "To add agenda, meeting start time must be 2 minutes earlier",
        SUCCESS: 'Room created successfully',
        UPDATED: 'Updated room id',
        CURRENT: 'Bot id is not updated',
        EMPTY: 'No record found',
        TRANSCRIPT_IN_PROGRESS: 'Transcription is being generated please wait',
    },
    MEETING: {
        URL_NOT_FOUND: "Meeting url not found",
        TITLE: "Meeting title not found",
        TIME: "Meeting start time or end time not found",
    },
    FILE: {
        ACCEPT_FILE_PDF: "Invalid file type. Only accept pdf",
        ACCEPT_FILE_TYPE: "Invalid file type. Only accept pdf, docx, txt, pptx",
        ACCEPT_FILE_TYPE_ASSISTANT: "Invalid file type. Only accept pdf, docx, doc, txt, pptx, eml",
        ACCEPT_PDF_DOCX_FILE_TYPE: "Invalid file type. Only accept docx or pdf",
        ACCEPT_DOCX_FILE_TYPE: "Invalid file type. Only accept docx",
        ACCEPT_AUDIO_FILE_TYPE: "Invalid file type. Only accept MP4, WebM video files, and WAV, MPEG, MP4 audio files",
        ACCEPT_REV_AUDIO_FILE_TYPE: "Invalid file type. Only MP4 , M4A, MP3, and MPEG audio files are allowed.",
        FILE_DELETE: 'File deleted successfully',
        EMPTY_FILE: 'File can not be empty',
        FILE_CREATED: 'File created successfully',
        FILE_WRITTEN_SUCCESS: 'File written successfully',
        FILE_UPLOAD_LIMIT_EXCEEDS: 'File upload limit exceeded',
        FILE_UPLOAD_QUOTA: 'File upload limit exceeded, The remaining file upload quota is ',
        ALLOWED_FILES: 'File upload limit exceeded, You are only allowed to upload ',
        UN_COMPLETE_FILE: 'Missing or incomplete parsed data',
        CASE_DOC_LIMIT: 'Only 20 document files are allowed to upload',
        INS_CASE_DOC_LIMIT: 'Only 100 document files are allowed to upload',
        CASE_AUD_LIMIT: 'Only 2 audio files are allowed to upload',
        CASE_DOC_SIZE_LIMIT: 'The file size exceeds the maximum limit of 20 MB for case files. Please upload a smaller file',
        CASE_AUD_SIZE_LIMIT: 'The file size exceeds the maximum limit of 10 MB for audio files. Please upload a smaller file.',
        CASE_ATTACHMENT_MISMATCH: 'Count of files and catergory do not match',
        CANNOT_DELETE_FILES: 'Cannot delete case files. The case report is in progress.',
        CANNOT_UPDATE_FILES: 'Cannot update case files. The case report is in progress.',
        CANNOT_UPDATE_PROCESSED_FILES: 'Cannot update the tag. This file already has the correct tag',
        CASE_FILE_NOT_FOUND: 'Case file not found',
        CASE_FILES_NOT_FOUND: ' Case files not found ',
        EXTERNAL_DOC_BATCH_FILES_NOT_FOUND: ' Batch files not found ',
        FOR_CASE: 'For CaseUUid ',
        FOR_EXTERNAL_DOC_BATCH: 'For BatchUuid '
    },
    BOT: {
        BOT_NAME: "Bot name updated successfully"
    },
    OBJECTIVE: {
        OBJECTIVE_LENGTH: "Objectives are in range of 1 to 10"
    },
    SAMPLE: {
        SAMPLE_LIMIT: "More than 1 sample is not allowed",
        ALLOW_ONLY_ONE_FILE: "More than 1 File are not allowed",
        ALLOW_ONLY_ONE_RESPONSE: "More than 1 Response are not allowed"
    },
    USER: {
        ADMIN:{
            ALREADY_ADMIN: 'This user already has admin rights'
        },
        DEACTIVATION_SUCCESSFULLY: 'User deactivated successfully',
        ACTIVATION_SUCCESSFULLY: 'User activated successfully',
        CHECK_USERS_DETAILS: 'The provided user emails were either removed, already assigned to a group, or already associated with a company or an admin',
        OWNER_NOT_FOUND: 'Owner not found',
        COMPANY_CREATED_ERROR_IN_UPDATING_USER: 'Company is created, Error while updating companyId in users table',
        USER_TIER_CONVERTED_SUCCESSFULLY: 'This users is now converted to paying customer',
        USER_TIER_FREE: 'Successfully converted to free tier user',
    },
    OTP_TYPE: {
        SIGN_IN: 1,
        FORGOT_PASSWORD: 2,
        OTP_EXPIRED: "OTP verification failed. Please try again",
        OTP_SENT_SUCCESSFULLY: "OTP has been sent to your email",
        OTP_ALREADY_GENERATED: "You have already generated an OTP. Please wait 5 minutes before trying again"
    },
    PAGE: {
        PROCESS_FAILED: "Processing failed for page ",
        GATHERING_STATUS: "Kolabrya is gathering the status"
    },
    CASE_REPORT_GENERATOR: {
        TOC: {
            PREVIOUS_RECORD_INPROGRESS: "The previous table of contents is still in progress, please wait"
        },
        REPORT: {
            ERROR: {
                FORMAT_NOT_MATCH: "No matching transcript format found. Please ensure the selected format matches the transcript structure."
            }
        }
    },
    PROMPT: {
        NO_PROMPT_FOUND: "No prompt Found"
    },
    GROK: {
        FILE_UUID_NOT_MATCHING: "File Uuids are not matching",
        PUBLIC_PROMPT_ONE_USAGE_EXCEDDED: "Sign up for free to continue.",
        NON_PUBLIC_PROMPT_FIVE_USAGE_EXCEDDED: "Multiple prompts detected. Only 20 prompt is allowed."
    },
    JWT: {
        INVALID_JWT_TOKEN: "Invalid refresh token",
    },
    INSURANCE_CASE: {
        REPORT_IN_PROGRESS: "Report is in progress",
        MEDIATION_REPORT_IN_PROGRESS: "Please wait a moment while we process your summary",
        MEDIATION_REPORT_NOT_FOUND: "Please generate a summary to use reports and mediation",
        SUMMARY_IN_PROGRESS: "Your summary is in progress",
        REPORT_FAILED: "Failed to generate report",
        INSURANCE_CASE_DOC_SIZE_LIMIT: 'The file size exceeds the maximum limit of 300 MB for case files. Please upload a smaller file',
        INSURANCE_CASE_REPORT_NOT_FOUND: 'Your report can not be generated because the required files are not available',
        INSURANCE_CASE_SUMMARY_NOT_FOUND: 'Please Generate a summary to use these features',
        INSURANCE_CASE_CUSTOM_REPORT: 'Request sent succssefully for the custom report',
        INSURANCE_CASE_SHARE_SUCCESS: 'Case invite sent',
        INSURANCE_CASE_SHARE_SELF: 'User cannot share case with themselves',
        INSURANCE_CASE_ALREADY_SHARED: 'Case is already shared with this user'
    },
    MAGIC_LINK: {
        MAGIC_LINK_SEND_SUCCESS: "Magic link send successfully, Check your inbox",
        MAGIC_LINK_ALREADY_SENT: "Please check your inbox for the magic link. You can request a new link after 5 minutes",
        MAGIC_LINK_ALREADY_VERIFIED: "Magic link is already verified",
        MAGIC_LINK_EXPIRED: "Magic link is expired"
    },
    FIRM_ASSISTANT: {
        FIRM_ASSISTANT_NOT_CREATED_USER_CREATED: "Unable to create assistant. Firm users created",
        FAILED_TO_CREATE_FIRM_USER: "The mentioned users are not found as the requirement"
    },
    ORDER_BOOKING: {
        CREATED: "Order booking created successfully",
        CANCELLED: "Order booking cancelled successfully",
        NOT_FOUND: "Order booking not found",
        ALREADY_CANCELLED: "Order booking is already cancelled",
        TOTAL_LIMIT_EXCEEDED: "Order total exceeds the maximum allowed amount",
        VALIDATION_ERROR: "Invalid order booking request",
        AUTH_REQUIRED: "A signed-in account is required for order bookings"
    }
}