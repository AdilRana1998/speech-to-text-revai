# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Node.js/Express backend (CommonJS, plain JavaScript) that accepts audio/video uploads, transcribes them with **Rev.ai**, and serves speaker-labelled transcripts that users can view, edit, download as `.docx`, or soft-delete. `README.md` holds the full design rationale and trade-offs. Read it before you make architectural changes.

## Commands

```bash
npm install
npm start        # nodemon amazing.server.js (the entry point; there is no build step)
```

- There is no test suite (`npm test` is a placeholder that exits 1) and no linter is configured.
- `npm run swagger-autogen` points at `swagger.js`, which is not in the repo.
- All configuration comes from `.env` (loaded by `dotenv` in `amazing.server.js` and mapped in `config/index.js`). Key variables: `REV_URL`, `REV_KEY`, `BP_MEETING_SCHEDULE`, `INVESTIGATION_EXTERNAL_DOC_AZURE_ENABLE`, `INVESTIGATION_EXTERNAL_DOC_CONTAINER`, `CASE_FILE_SIZE`, `CASE_FILE_LIMIT`, `AUDIO_TRANSCRIPTION_FILE_SIZE`, `DATA_ENCRYPTION_ENABLED`, `SENSITIVE_DATA_KEY`, `ENCRYPTION_IV`, `REV_FILE_PATH`, `REV_DIRECTORY_PATH`, plus `DB_*` (the Sequelize dialect is set by `DB_DRIVER`).
- To run a pipeline stage by hand without waiting for the cron, call the open endpoints `POST /api/voice/send-file`, `/api/voice/get-file` and `/api/voice/get-transcript`.

## Architecture

**Layering:** `route → middleware → controller → service → query/model`. The Rev.ai HTTP calls live in `api/external/` (inside `ChatGPT.js`, despite its name: `submitFileRev`, `getSubmittedFileRev`, `fetchTranscriptRev`).
- Controllers only read inputs and format the response.
- Services return a uniform `{ statusCode, message, obj }`, which `utils/SendStatus.js` (`sendStatus`) turns into the HTTP response. Keep to this shape.
- All speech-to-text routes are under `/api/voice/*` (`api/routes/child_routes/speechToText.routes.js`). User-facing routes use the `authValidation` JWT middleware; every query is also scoped by `userId`.

**Async transcription pipeline (polling, not webhooks):**
1. The client gets a SAS upload URL (`/voice/presigned-urls`, create+write, 15 min) and uploads straight to Azure Blob under `uuid/fileName`. Then it registers the upload with `/voice/add-file`, which inserts a `speech_to_text` row.
2. `api/background/index.js` runs `room.background.js#revTranscript()` every 15 s via `node-cron`, **only when `BP_MEETING_SCHEDULE=true`**. An in-memory flag stops runs from overlapping, so only one process should have that flag enabled.
3. Each run executes three stages in order: `sendFile` (submits a read-only SAS URL as Rev.ai `source_config.url` and stores `transcriptId`), then `getFile` (polls job status), then `getTranscript` (fetches `text/plain`, regex-formats the `Speaker N  hh:mm:ss` headers into HTML, stores it).

**State lives in the DB, not the process.** The `speech_to_text` row flags `isSent`, `fileStatus`, `transcriptStatus` and `status` (0 in progress, 1 completed, 2 failed) say which stage a row has reached. `isActivated` is the soft-delete flag and `jsonResponse` keeps the last raw Rev.ai response. The stage queries in `api/queries/speechToText.queries.js` (`getPendingData`, `getPendingUploadedFiles`, `getTranscript`) are raw SQL using `MIN(id) … GROUP BY userId LIMIT 10`, i.e. one oldest file per user, at most 10 users per run. Keep this fairness rule when you change these queries.

**Encryption:** `fileName`, `filePath` and `transcript` are AES-encrypted through Sequelize getters/setters in `api/model/speechToText.model.js` (`utils/Encryptions.js`). Raw SQL bypasses the getters, so code using raw queries must decrypt results explicitly. These columns can't be searched in SQL.

**Database bootstrap:** `api/model/index.js` creates the Sequelize instance (SSL required) and calls `sequelize.sync({ force: false })` on startup. There are no migrations. Schema changes go through the model definitions or the `queryInterfaceFunc` hook.

**Observability:** Rev.ai requests and responses are logged through `Logger.data.RevAI` with `requestUuid` and `userId`. Pipeline failures send alerts through `utils/Webhook/slack.js`.

## Notes

- Much of `utils/` (Stripe, Recall, SendGrid, Google, Outlook, OpenAI) and many middlewares were inherited from a larger "amazing-ai" app and aren't part of the transcription flow. Don't assume they're wired up or configured.
- `process.env.TZ` is forced to `Canada/Eastern` in `amazing.server.js`.
- Rev.ai requests assume English (`language: 'en'`).
