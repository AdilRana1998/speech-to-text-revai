# Speech-to-Text with Rev.ai

A Node.js/Express backend that takes audio and video files from users, sends them to **Rev.ai** for transcription, and returns a speaker-labelled transcript. Users can then view, edit, download (as `.docx`) or delete it.

This document covers the approach, the main design decisions, how the code is laid out, and the trade-offs I made.

---

## 1. Overall approach

Transcription is **asynchronous**. Rev.ai does not return a transcript in the same request that submits the media. It creates a *job*, and the job finishes some time later. There are two ways to find out when a job is done:

1. **Webhooks**: Rev.ai calls a URL of ours when the job finishes.
2. **Polling**: we ask Rev.ai for the job status on a schedule.

**This solution uses polling, not webhooks.** I don't have access to the Rev.ai dashboard for this account, so I couldn't register, verify or manage a webhook endpoint for it. Polling only needs the API key and works without any dashboard setup.

The whole flow is built around a **state machine stored in the database** and a **background job** that moves each request through these stages:

```
 Client                        Backend                         Azure Blob            Rev.ai
   │  1. POST /voice/presigned-urls ──►  validate type/size,
   │  ◄── SAS upload URL(s)             create SAS (create+write, 15 min)
   │  2. PUT file ─────────────────────────────────────────────►  stored
   │  3. POST /voice/add-file ───────►  insert row (status = 0, isSent = 0)
   │
   │                         ┌──── cron every 15 s ────┐
   │                         │ a) sendFile()           │── read SAS URL ──► POST /jobs  (source_config.url)
   │                         │    isSent = 1, save transcriptId
   │                         │ b) getFile()            │──────────────────► GET /jobs/{id}
   │                         │    "transcribed" → fileStatus = 1
   │                         │ c) getTranscript()      │──────────────────► GET /jobs/{id}/transcript
   │                         │    format + store, status = 1
   │                         └─────────────────────────┘
   │  4. GET /voice/get-all | /voice/get/:requestUuid  ◄── status: In Progress / Completed / Failed
   │  5. POST /voice/edit, GET /voice/download-transcript/:id, GET /voice/delete/:id
```

---

## 2. Key design and technical decisions

### 2.1 Polling with a cron job instead of webhooks
- **Why:** I couldn't configure webhooks without dashboard access, so polling was the only option that works end to end. It also avoids exposing a public callback endpoint and having to verify where inbound calls come from.
- **How:** `node-cron` runs `background.revTranscript()` every **15 seconds** (`api/background/index.js`). Each run executes three steps in a fixed order: **submit → check status → fetch transcript**.
- **Overlap guard:** an in-memory flag (`flags.revTranscript`) stops a new run from starting while the previous one is still going, so a job isn't submitted twice.
- **Feature flag:** the scheduler starts only when `BP_MEETING_SCHEDULE=true`. That lets several API instances run while only one of them does the polling.
- **Manual triggers:** each stage also has its own endpoint (`/voice/send-file`, `/voice/get-file`, `/voice/get-transcript`), which is handy for testing and for running a stage by hand.

### 2.2 Database flags as the pipeline state
Each record in `speech_to_text` carries a set of flags that say which stage it has reached:

| Column             | Meaning                                                        |
|--------------------|----------------------------------------------------------------|
| `isSent`           | File has been submitted to Rev.ai (a `transcriptId` exists)   |
| `fileStatus`       | Rev.ai reports the job as `transcribed` (2 = failed)          |
| `transcriptStatus` | Transcript text has been fetched and stored (2 = failed)      |
| `status`           | Overall: `0` In Progress, `1` Completed, `2` Failed           |
| `jsonResponse`     | Last raw Rev.ai response, kept for debugging                  |
| `isActivated`      | Soft-delete flag                                               |

Each stage's query (`getPendingData`, `getPendingUploadedFiles`, `getTranscript`) picks only the rows that are ready for that stage. **Why:** the process holds no state between runs. If the server restarts, the next cron run continues from where the last one stopped, and the database shows exactly where each request is.

### 2.3 Fair scheduling: one file per user per run
The pending-work queries use `MIN(id) … GROUP BY userId LIMIT 10`. Each run therefore handles **the oldest pending file for each user, for up to 10 users**. **Why:** one user uploading many files can't hold up everyone else, and the number of Rev.ai calls per run stays bounded, which helps with rate limits and cost.

### 2.4 Direct-to-Azure uploads with SAS URLs
- The client asks for a **pre-signed SAS URL** (`create+write`, 15-minute expiry) and uploads straight to Azure Blob Storage. The API server never handles the media bytes.
- **Why:** audio and video files are large. Sending them through Express would use memory and bandwidth and run into request timeouts.
- The file type (`video/mp4`), size (`CASE_FILE_SIZE`) and number of files (`CASE_FILE_LIMIT`) are checked **before** a URL is issued.
- Each blob is stored under its own `uuid/fileName` path, so two uploads with the same file name don't overwrite each other.

### 2.5 Rev.ai reads the media by URL
When the job is submitted, the backend creates a **read-only SAS URL** for the blob and passes it as `source_config.url`. **Why:** we don't upload the file a second time. Rev.ai downloads it directly from Azure, and the URL expires on its own.

### 2.6 Transcript format
- The transcript is fetched as `text/plain` with `group_channels_by=sentence`, so the text is grouped by sentence.
- A regex rewrites `Speaker N  00:00:00` headers into HTML (`<strong>Speaker N</strong> | timestamp`). The frontend can show this as a readable, speaker-separated transcript and the user can edit it.
- The stored HTML is also what gets exported to **`.docx`** for download.

### 2.7 Security and privacy
- **Encryption at rest:** `fileName`, `filePath` and `transcript` are encrypted with AES (crypto-js) through Sequelize getters and setters. Raw SQL queries decrypt their results explicitly.
- **Authentication:** every user-facing endpoint goes through `authValidation`, which checks the JWT. Every query is also filtered by `userId`, so users can only see their own transcripts.
- **Short-lived access:** SAS tokens expire (15 minutes for upload, about 1 hour for Rev.ai to read).
- **Soft delete:** deleting sets `isActivated = false` instead of removing the row. That keeps an audit trail and prevents accidental data loss.

### 2.8 Observability
- Every Rev.ai request and response is written to a dedicated **Rev.ai event log** (`Logger.data.RevAI`) along with `requestUuid` and `userId`.
- Failures (a SAS URL couldn't be created, Rev.ai rejected a submission, a job failed, a transcript fetch failed) send an alert to **Slack**. Since there's no webhook to report problems, this is how failures get noticed quickly.

---

## 3. Code structure

```
amazing.server.js               Express app: middleware, security headers, static routes, starts cron
config/                         Server / environment configuration
api/
 ├─ routes/child_routes/
 │   └─ speechToText.routes.js  All /api/voice/* endpoints
 ├─ controller/
 │   └─ speechToText.controller.js  Reads request params and calls the service
 ├─ services/
 │   └─ speechToText.services.js    Business logic: upload, submit, poll, fetch, CRUD, SAS URLs
 ├─ queries/
 │   └─ speechToText.queries.js     Sequelize and raw SQL for each pipeline stage
 ├─ model/
 │   └─ speechToText.model.js       Table definition and encrypted fields
 ├─ external/
 │   └─ ChatGPT.js                  Rev.ai HTTP client: submitFileRev, getSubmittedFileRev, fetchTranscriptRev
 ├─ background/
 │   ├─ index.js                    node-cron scheduler (15 s) with overlap guard
 │   └─ room.background.js          revTranscript(): sendFile → getFile → getTranscript
 └─ middlewares/
     ├─ index.js                    authValidation (JWT) / openApi
     └─ audioUploadRev.js           Multer filter for direct uploads (mp3/m4a/mp4, size limit)
utils/
 ├─ InvestigationExternalDocAzureBlob/  Azure Blob client and SAS helpers
 ├─ Encryptions.js                      AES encryption of sensitive fields
 ├─ Logger.js / LoggerHelper.js         Rev.ai event logging
 └─ Webhook/slack.js                    Slack failure alerts
```

**Layering:** `route → middleware → controller → service → query/model`, with the Rev.ai calls kept in `external/`.
- Controllers contain no logic. They read inputs and format the response.
- Every service returns the same `{ statusCode, message, obj }` shape, which `sendStatus` turns into the HTTP response.

### API endpoints (`/api/voice/...`)

| Method | Endpoint                               | Auth | Purpose                                     |
|--------|----------------------------------------|------|---------------------------------------------|
| POST   | `/presigned-urls`                      | JWT  | Get SAS upload URL(s) after validation      |
| POST   | `/add-file`                            | JWT  | Register uploaded blob(s) as a new request  |
| GET    | `/get-all`                             | JWT  | List the user's transcripts and status      |
| GET    | `/get/:requestUuid`                    | JWT  | Get one transcript                          |
| POST   | `/edit`                                | JWT  | Save an edited transcript                   |
| GET    | `/download-transcript/:requestUuid`    | JWT  | Download the transcript as `.docx`          |
| GET    | `/delete/:requestUuid`                 | JWT  | Soft-delete a transcript                    |
| POST   | `/upload-file`                         | JWT  | Legacy: upload through the server (Multer)  |
| POST   | `/send-file`, `/get-file`, `/get-transcript` | open | Manually trigger a pipeline stage    |

### Key environment variables
`REV_URL`, `REV_KEY`, `BP_MEETING_SCHEDULE`, `INVESTIGATION_EXTERNAL_DOC_AZURE_ENABLE`, `INVESTIGATION_EXTERNAL_DOC_CONTAINER`, `CASE_FILE_SIZE`, `CASE_FILE_LIMIT`, `AUDIO_TRANSCRIPTION_FILE_SIZE`, `DATA_ENCRYPTION_ENABLED`, `SENSITIVE_DATA_KEY`, `ENCRYPTION_IV`, `REV_FILE_PATH`, `REV_DIRECTORY_PATH`.

### Running
```bash
npm install
# create a .env with the variables above
npm start            # nodemon amazing.server.js
```

---

## 4. Assumptions, considerations and trade-offs

**Assumptions**
- Recordings are in **English** (`language: 'en'` is sent to Rev.ai).
- Each request is a single file. `requestUuid` identifies one transcription.
- Azure Blob Storage is available. Requests for upload URLs are rejected if the Azure health check fails.
- A transcript returned with a `Speaker N  hh:mm:ss` header is assumed to follow Rev.ai's plain-text format, which the regex depends on.

**Trade-offs**

| Decision | Benefit | Cost |
|----------|---------|------|
| **Polling instead of webhooks** (no dashboard access) | Works with only an API key, needs no public callback endpoint, survives restarts | Up to about 15 s extra delay per stage and some status calls that find nothing new. A webhook would be cheaper and react immediately. |
| **One file per user per run, at most 10 users** | Fair between users, Rev.ai usage stays bounded | A user with many files waits longer. Total throughput is capped per run. |
| **In-memory overlap flag** | Simple and needs no extra infrastructure | Only protects a single process. With several instances, only one should have `BP_MEETING_SCHEDULE=true`; a distributed lock would be needed to scale further. |
| **Stored HTML transcript** | Ready to display, edit and export to `.docx` | The raw JSON with word-level timestamps and confidence isn't kept. Re-processing it would mean fetching from Rev.ai again. |
| **Encrypted columns** | Sensitive data is protected at rest | Can't search transcript text in SQL. Encryption and decryption add some CPU cost. |
| **Soft delete** | Recoverable and auditable | Data stays in the database. A separate purge job would be needed for hard deletion. |
| **Direct-to-blob upload** | No load on the API from large files, no timeouts | The client has to make two calls (get URL, then register the file). |

**Possible improvements**
- Switch to **Rev.ai webhooks** (`notification_config.url`) once dashboard access is available, and keep polling as a fallback for missed callbacks.
- Add exponential backoff and a maximum number of retries for failed jobs, rather than marking them failed straight away.
- Use a proper job queue (such as BullMQ or Azure Queue) for horizontal scaling.
