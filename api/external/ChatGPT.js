const fetch = require('node-fetch');
const { postMethod, getMethod, postFormDataMethod, postMethodChatGPT, deleteMethod, getMethodForPlainText, patchMethod, getStreamMethod} = require('../../utils/Methods');
const { urls, keys } = require('../../config');
const FormData = require('form-data');
const fs = require('fs');

exports.getSummary = async (obj) => {
    const url = process.env.OPENAI_API_URL + "engines/text-davinci-003/generate";
    const header = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY
    }
    return await postMethod(url, obj, header);
}

exports.chatgpt35turbo = async (obj) => {
    const url = process.env.OPENAI_API_URL + "chat/completions";
    const header = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY
    }
    return await postMethod(url, obj, header);
}

exports.embedded = async (obj) => {
    const url = process.env.OPENAI_API_URL + "embeddings";
    const header = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY
    }
    return await postMethod(url, obj, header);
}

exports.getRecall = async (query = '') => {
    const url = `${urls.recall}${query}`
    const options = {
        accept: 'application/json',
        Authorization: keys.recallHeader
    };
    return await getMethod(url, options)
}

exports.postRecall = async (body, query = '') => {
    try {
        const url = `${urls.recall}/${query}`
        const options = {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: keys.recallHeader
        };
        return await postMethod(url, body, options)
    } catch (err) {
        console.log("Error in postcall = ", err)
        return null
    }
}

exports.updateBotRecall = async (botId, data) => {
    try {
        const url = process.env.RECALL_V1+botId
        const header = {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: keys.recallHeader,
        };
        return await patchMethod(url, data, header)
    } catch (err) {
        console.log("Error in updateBotRecall", err)
        return null
    }
}

exports.summaryUpload = async (files) => {
    const promises = files.map(async (file) => {
        const buffer = file.buffer;
        const mimetype = file.mimetype;
        const filename = file.originalname;
        const formData = new FormData();
        formData.append('purpose', 'assistants');
        formData.append('file', buffer, {
            filename: filename,
            contentType: mimetype
        });
        
        const url = process.env.OPENAI_API_URL + "files";
        const header = {
            Authorization: "Bearer " + process.env.OPENAI_API_KEY
        }
        try {
            return await postFormDataMethod(url, header, formData);
        } catch (error) {
            console.error("Error while uploading file to OpenAI", error);
            return error;
        }
    });
    const fileIds = await Promise.all(promises);
    return fileIds;
}

exports.makeThreads = async (obj) => {
    const url = process.env.OPENAI_API_URL + "threads";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await postMethodChatGPT(url, obj, headers);
}

exports.makeThreadsForReport = async (obj) => {
    const url = process.env.OPENAI_API_URL + "threads";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await postMethodChatGPT(url, obj, headers);
}

exports.runThreads = async (id, assistantId) => {
    const obj = { "assistant_id" :  assistantId }
    const url = process.env.OPENAI_API_URL + "threads/"+`${id}`+"/runs";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await postMethod(url, obj, headers);
}

exports.getThreadStatus = async (threadId, runId) => {
    const url = process.env.OPENAI_API_URL + "threads/"+`${threadId}`+"/runs/"+`${runId}`+"/steps";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await getMethod(url, headers);
}

exports.validateThreadStatus = async (threadId, runId) => {
    const url = process.env.OPENAI_API_URL + "threads/"+`${threadId}`+"/runs/"+`${runId}`;
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await getMethod(url, headers);
}

exports.getAssistantResponse = async (threadId) => {
    const url = process.env.OPENAI_API_URL + "threads/"+`${threadId}`+"/messages";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await getMethod(url, headers);
}

exports.retrieveThread = async (threadId) => {
    const url = process.env.OPENAI_API_URL + "threads/"+`${threadId}`
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await getMethod(url, headers);
}

exports.getVideoUrl = async (botId) => {
    try {
        const url = process.env.RECALL_V1+botId
        const options = {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: keys.recallHeader,
        };
        return await getMethod(url, options)
    } catch (err) {
        console.log("Error in getVideoUrl", err)
        return err
    }
}

exports.getCoreTranscript = async (botId) => {
    try {
        const url = process.env.RECALL_V1+botId+'/transcript/'
        const options = {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: keys.recallHeader,
        };
        return await getMethod(url, options)
    } catch (err) {
        console.log("Error in getCoreTranscript ", err)
        return null
    }
}

exports.downloadFile = async (url) => {
    try {
        return await fetch(url);
    } catch (err) {
        console.log("Error in downloading file from recall = ", err)
        return null;
    }
}

exports.deletFileOpenAI = async (fileId) => {
    const url = process.env.OPENAI_API_URL + "files/"+`${fileId}`;
    const headers = {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await deleteMethod(url, headers);
}

exports.deletVectorOpenAI = async (vectorId) => {
    const url = process.env.OPENAI_API_URL + "vector_stores/"+`${vectorId}`;
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await deleteMethod(url, headers);
}

exports.makeMessage = async (obj, threadId) => {
    const url = process.env.OPENAI_API_URL + "threads/"+`${threadId}`+"/messages";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await postMethod(url,obj, headers);
}

exports.getAllFileOpenAI = async () => {
    const url = process.env.OPENAI_API_URL + "files";
    const headers = {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await getMethod(url, headers);
}

exports.getAllVectorOpenAI = async (id) => {
    let url    
    if (id != null) {
        url = `${process.env.OPENAI_API_URL}vector_stores?order=desc&limit=20&after=${id}`;
    }
    else {
        url = `${process.env.OPENAI_API_URL}vector_stores?order=desc&limit=20`;
    }    
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await getMethod(url, headers);
}

exports.makeVector = async (vectorName) => {
    const obj = {
        name: vectorName,
        chunking_strategy: {
            type: "static",
            static: {
              max_chunk_size_tokens: 1000,
              chunk_overlap_tokens: 400
            }
        }
    }
    const url = process.env.OPENAI_API_URL + "vector_stores";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await postMethod(url, obj, headers);
}

exports.retriveVectorStore = async (vectorId) => {
    const url = process.env.OPENAI_API_URL + "vector_stores/"+`${vectorId}`;
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await getMethod(url, headers);
}

exports.addFileIdToVector = async (vectorId, fileIds) => {
    const obj = {
        file_ids: fileIds
    }     
    const url = process.env.OPENAI_API_URL + "vector_stores/"+`${vectorId}`+ "/file_batches";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    try {
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while mapping files's to vector store", error);
        return error;
    }
}

exports.deleteFileFromVector = async (vectorId, fileIds) => {
    const url = process.env.OPENAI_API_URL + "vector_stores/"+`${vectorId}`+ "/files/"+`${fileIds}`;
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    try {
        return await deleteMethod(url, headers);
    } catch (error) {
        console.error("Error while mapping files's to vector store", error);
        return error;
    }
}

exports.getVectorStoreFileDetails = async (vectorId) => {
    const url = process.env.OPENAI_API_URL + "vector_stores/"+`${vectorId}`+"/files?limit20";
    const headers = {
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await getMethod(url, headers);
}

exports.convertAudioToText = async (data) => {
    const promises = data.map(async (file) => {
        const buffer = file.buffer;
        const mimetype = file.mimetype;
        const filename = file.originalname;
        const formData = new FormData();
        formData.append('model', 'whisper-1');
        formData.append('file', buffer, {
            filename: filename,
            contentType: mimetype
        });
        const url = process.env.OPENAI_API_URL + "audio/transcriptions";
        const header = {
            Authorization: "Bearer " + process.env.OPENAI_API_KEY
        }
        try {
            return await postFormDataMethod(url, header, formData);
        } catch (error) {
            console.error("Error while uploading audi file to OpenAI", error);
            return error;
        }
    });
    return await Promise.all(promises);
}

exports.convertAudioToTextDeepGram = async (data) => { 
    const promises = data.map(async (file) => {
        const buffer = file.buffer;
        const mimetype = file.mimetype;
        const filename = file.originalname;
        const url = process.env.DEEPGRAM_URL +'?model=nova-2&smart_format=true';
        const myHeaders = new Headers();
        myHeaders.append("Authorization", "Token "+process.env.DEEPGRAM_KEY);
        myHeaders.append("Content-Type", mimetype);
        try {
            return await postFormDataMethod(url, myHeaders, buffer);
        } catch (error) {
            console.error("Error while uploading audio file to DeepGram", error);
            return error;
        }
    });
    return await Promise.all(promises);
}

exports.uploadCiteDocuments = async (data) => {
    try {
        const url = process.env.CITE_URL + "citation/documents";
        const headers = {
            "Content-Type": "application/json"
        };
        return await postMethod(url, data, headers);
    } catch (error) {
        console.error("Error while uploading files to cite backend:", error);
        return error;
    }
}

exports.getCiteResponse = async (obj) => {
    try {
        const url = process.env.CITE_URL + "citation/query";
        const headers = {
            "Content-Type": "application/json"
        };
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while getting citation response", error);
        return error;
    }
}

exports.postTranscript = async (transcript, botId) => {
    try {
        const formData = new FormData();
        formData.append('transcript', transcript);
        formData.append('bot_id', botId);
        const url = process.env.ENHANCE_TRANSCRIPT_URL + "transcription/process-transcript";
        const header = ''
        return await postFormDataMethod(url, header, formData);
    } catch (error) {
        console.error("Error while post transcript", error);
        return error;
    }
}

exports.postDocxPython = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.CASE_REPORT_DOCX + "report-generator/generate-report";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while make Docx Python", error);
        return error;
    }
}

exports.submitFileRev = async (obj) => {
    try {
        const headers = {
            "Authorization": process.env.REV_KEY,
            "Content-Type": "application/json",
        }
        const url = process.env.REV_URL + "speechtotext/v1/jobs";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while submit File Rev", error);
        return error;
    }
}

exports.getSubmittedFileRev = async (id) => {
    try {
        const url = process.env.REV_URL + "speechtotext/v1/jobs/"+id;
        console.log(url);
        const headers = {
            "Authorization": process.env.REV_KEY,
        }
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while get Submitted File Rev", error);
        return error;
    }
}

exports.fetchTranscriptRev = async (id) => {
    try {
        const url = process.env.REV_URL + "speechtotext/v1/jobs/"+id+"/transcript?group_channels_threshold_ms=100&group_channels_by=sentence";
        const myHeaders = new Headers();
        myHeaders.append("Authorization", process.env.REV_KEY);
        myHeaders.append("Accept", "text/plain");
        return await getMethodForPlainText(url, myHeaders);
    } catch (error) {
        console.error("Error while fetch Transcript Rev", error);
        return error;
    }
}

exports.uploadFileGrok = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.GROK_URL + "pinecone/documents-upload";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while upload File Grok", error);
        return error;
    }
}

exports.createThreadGrok = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.GROK_URL + "multichat/threads";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while create Thread Grok", error);
        return error;
    }
}

exports.createThreadGemini = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.GEMINI_THREAD_URL + "chat/threads";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while create Thread Gemini", error);
        return error;
    }
}

exports.addMessageGrok = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.GROK_URL + "multichat/messages";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while add Message Grok", error);
        return error;
    }
}

exports.addMessageGemini = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.GEMINI_THREAD_URL + "chat/messages";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while add Message Gemini", error);
        return error;
    }
}

exports.deleteFileGrok = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.GROK_URL + "pinecone/document-delete";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while delete File Grok", error);
        return error;
    }
}

exports.getAzureFilesStream = async (url) => {
    try {
        const headers = {}
        return await getStreamMethod(url, headers);
    } catch (error) {
        console.error("Error while streaming file from azure for investigation", JSON.stringify(error));
        return error;
    }
}

exports.deleteBotRecall = async (botId) => {
    try {
        const url = process.env.RECALL_V1+botId
        const header = {
            Authorization: keys.recallHeader,
        };
        return await deleteMethod(url, header)
    } catch (err) {
        console.log("Error in delete bot", err)
        return null
    }
}

exports.sendIncCaseReport = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "temporal-data-processing/create-files-processing-job";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while sending data to generate report", error);
        return error;
    }
}

exports.sendIncCaseReportCombine = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "temporal-data-processing/create-combine-file-job";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while sending data to generate report combine", error);
        return error;
    }
}

exports.sendDocumentEnhance = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.DOCUMENT_ENHANCE_URL + "word-editor/process-editor-data";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while sending data to document enhance", error);
        return error;
    }
}

exports.getIncSummaryStatus = async (id) => {
    try {
        const url = process.env.INC_CASE_URL + "intelligent-analysis-chat/check-thread-create/"+id;
        const headers = {
            "accept": "application/json",
        }
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while get Inc Summary Status", error);
        return error;
    }
}

exports.getIncSettlementStatus = async (id) => {
    try {
        const url = process.env.INC_CASE_URL + "settlement-chat/check-thread-create/"+id;
        const headers = {
            "accept": "application/json",
        }
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while get Inc Summary Status", error);
        return error;
    }
}

exports.createIncSummaryThread = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "intelligent-analysis-chat/threads";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while create Inc Summary Thread", error);
        return error;
    }
}

exports.createIncSettlementThread = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "settlement-chat/threads";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while create Inc Settlement Thread", error);
        return error;
    }
}

exports.addMessageMediationReport = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "intelligent-analysis-chat/messages";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while add Message Mediation Report", error);
        return error;
    }
}

exports.addMessageMediationSettlement = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "settlement-chat/messages";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while add settlement report", error);
        return error;
    }
}

exports.generateSummaryReport = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "insurance-report/generate-report";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while generate Summary Report", error);
        return error;
    }
}

exports.generateSummaryReportStatus = async (jobUuid, reportType) => {
    try {
        const url = process.env.INC_CASE_URL + "insurance-report/check-report-creation-eligibility?caseUuid="+`${jobUuid}`+"&reportType="+`${reportType}`;
        const headers = ''
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while generate Summary Report Status", error);
        return error;
    }
}

exports.createResponse = async (obj) => {
    const url = process.env.OPENAI_API_URL + "responses";
    const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    };
    return await postMethod(url,obj, headers);
}

exports.getOpenAIResponse = async (id) => {
    try {
        const url = process.env.OPENAI_API_URL + "responses/"+id;
        const headers = {
            "accept": "application/json",
            Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        }
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while get OpenAI Response Status", error);
        return error;
    }
}

exports.getInjuryTrackingStatus = async (id) => {
    try {
        const url = process.env.INC_CASE_URL + "insurance-injury-tracking/check-injury-tracking-eligibility?caseUuid="+id;
        const headers = {
            "accept": "application/json",
        }
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while get Injury Tracking Status", error);
        return error;
    }
}

exports.createInjuryTrackingJob = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "insurance-injury-tracking/generate-injury-tracking";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while create Injury Tracking Job", error);
        return error;
    }
}

exports.getIncReportStatus = async (id) => {
    try {
        const url = process.env.INC_CASE_URL + "data-editing/check-enable-editing/"+id;
        const headers = {
            "accept": "application/json",
        }
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while get report status", error);
        return error;
    }
}

exports.SendIncReportAfterEdit = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "data-editing/edit-summary-record";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while Send Inc Report After Edit", error);
        return error;
    }
}

exports.IncReportDownload = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "data-editing/download-file";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while Inc Report Download", error);
        return error;
    }
}

exports.GetIncReportFlatData = async (id) => {
    try {
        const url = process.env.INC_CASE_URL + "data-editing/get-case-data/"+id;
        const headers = {
            "accept": "application/json",
        }
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while get Inc Report Flat Data", error);
        return error;
    }
}

exports.generateMedicalInjuryStatus = async (caseUuid) => {
    try {
        const url = process.env.INC_CASE_URL + "medical-chronology-report/check-medical-chronology-report-eligibility?caseUuid="+`${caseUuid}`;
        const headers = ''
        return await getMethod(url, headers);
    } catch (error) {
        console.error("Error while medical injury Report Status", error);
        return error;
    }
}

exports.generateMedicalInjuryReport = async (obj) => {
    try {
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        const url = process.env.INC_CASE_URL + "medical-chronology-report/generate-medical-chronology-report";
        return await postMethod(url, obj, headers);
    } catch (error) {
        console.error("Error while generate medical injury Report", error);
        return error;
    }
}