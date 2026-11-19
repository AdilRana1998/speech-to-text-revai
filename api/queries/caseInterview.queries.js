const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const db = dbModel.caseInterviewForm;
const dbcaseInterviewTypes = dbModel.caseInterviewTypes;
const dbcaseInterviewDetails = dbModel.caseInterviewDetails;
const dbcaseInterviewInc = dbModel.caseInterviewInc;
const dbcaseInterviewFileMeetingInc = dbModel.caseInterviewFileMeetingInc;
const dbrooms = dbModel.rooms;
const retryLimit = process.env.API_CALL_LIMITS;
const { Encryption } = require('../../utils')

const attributes_1 = ['requestUuid', 'title', 'key', 'type', 'required', 'placeholder']
const attributes_2 = ['id']
const attributes_3 = ['requestUuid', 'interviewRole', 'interviewName', 'interviewGoal', 'interviewQuestion', 'interviewDate', 'interviewLink', 'fileDetails'];
const attributes_4 = ['id', 'requestUuid', 'interviewRole', 'interviewName', 'fileDetails', 'userId', 'caseId'];
const attributes_5 = ['threadId', 'runId', 'requestUuid', 'userId']
const attributes_6 = ['response']
const attributes_7 = ['requestUuid', 'request', 'response', 'roomId', 'userId', 'interviewIncId']
const attributes_8 = ['id', 'threadId', 'runId', 'requestUuid', 'userId', 'roomId']
const attributes_9 = ['requestUuid', 'response', 'roomId']
const attributes_10 = ['requestUuid', 'request', 'response', 'interviewId', 'userId']
const attributes_11 = ['id', 'requestUuid', 'userId' , 'runId', 'messageId', 'request', 'response', 'status']
const attributes_12 = ['requestUuid']

Queries.addcaseInterviewFileMeetingInc = async (obj) => {
    return await dbcaseInterviewFileMeetingInc.create(obj) 
};

Queries.addInterview = async (obj) => {
    const result =  await dbcaseInterviewDetails.create(obj, 
        { 
            returning: true 
        });
    return [result.requestUuid];
};

Queries.addFormFields = async (obj) => {
    return await db.create(obj) 
};

Queries.addInterviewTypes = async (obj) => {
    return await dbcaseInterviewTypes.create(obj) 
};

Queries.addFileInc = async (obj) => {
    return await dbcaseInterviewInc.create(obj) 
};

Queries.getInterviewForm= async () => {
    return await db.findAll({
        attributes: attributes_1,
        include: [{ 
            model: dbcaseInterviewTypes,
            as: "interviewTypeDetails", 
            required: false,
            where: {
                status: true,
            },
            attributes: ['requestUuid', 'title']
        }],
        where: {
            status: true
        },
        // logging: console.log,
        raw: true
    });
};

Queries.findinterviewTypeByUuid = async (interviewType) => {
    return await dbcaseInterviewTypes.findAll({
        attributes: attributes_2,
        where: {
            requestUuid: interviewType,
            status: true
        },
        raw: true
    });
} 

Queries.checkDuplicate = async (interviewName, caseId, userId) => {
    return await dbcaseInterviewDetails.findOne({
        attributes: attributes_2,
        where: {
            interviewName: interviewName,
            caseId: caseId,
            userId: userId,
            status: true
        },
        raw: true
    });
} 

Queries.getInterviewByUuid = async (caseId, userId) => {
    let data = await dbcaseInterviewDetails.findAll({
        attributes: [
            ...attributes_3,
            [Sequelize.col('interviewTypeInfo.title'), 'interviewType'],
            [Sequelize.col('interviewroomDetails.botId'), 'botId'],
            [Sequelize.col('interviewroomDetails.isEnhanced'), 'isEnhanced'],
            [Sequelize.col('interviewroomDetails.botStatus'), 'botStatus']
        ],
        include: [
            {
                model: dbcaseInterviewTypes,
                as: "interviewTypeInfo",
                where: {
                    status: true,
                },
                attributes: []
            },
            {
                model: dbrooms,
                as: "interviewroomDetails",
                required: false,
                where: {
                    [Op.or]: [
                        { botStatus: 'done' },
                        { botStatus: 'in_call_recording' },
                        { botStatus: null }
                    ]
                },
                attributes: []
            }
        ],
        where: {
            caseId: caseId,
            userId: userId,
            status: true
        },
        order: [['createdAt', 'DESC']],
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.interviewDetails = async (interviewUuid, userId) => {
    let data = await dbcaseInterviewDetails.findAll({
        attributes: [
            ...attributes_12,
            [Sequelize.col('interviewroomDetails.transcript'), 'transcript'],
            [Sequelize.col('interviewroomDetails.enhancedTranscript'), 'enhancedTranscript'],
            [Sequelize.col('interviewroomDetails.coreTranscript'), 'coreTranscript'],
            [Sequelize.col('interviewroomDetails.botId'), 'botId'],
            [Sequelize.col('interviewroomDetails.startTime'), 'startTime'],
            [Sequelize.col('interviewroomDetails.endTime'), 'endTime'],
            [Sequelize.col('interviewroomDetails.recallVideoStatus'), 'recallVideoStatus'],
            [Sequelize.col('interviewroomDetails.isEnhanced'), 'isEnhanced'],
            [Sequelize.col('interviewIdDetails.id'), 'id'],
        ],
        include: [
            {
                model: dbrooms,
                as: "interviewroomDetails",
                where: {
                    botStatus: 'done'
                },
                attributes: []
            },
            {
                model: dbcaseInterviewInc,
                as: "interviewIdDetails",
                where: {
                    status: true,
                },
                attributes: []
            },
        ],
        where: {
            requestUuid: interviewUuid,
            userId: userId,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 


Queries.getInterview = async (requestUuid, caseId, userId) => {
    let data = await dbcaseInterviewDetails.findAll({
        attributes: [
            ...attributes_3,
            [Sequelize.col('interviewTypeInfo.title'), 'interviewType'],
            [Sequelize.col('interviewroomDetails.botStatus'), 'botStatus'],
            [Sequelize.col('interviewroomDetails.botId'), 'botId']
        ],
        include: [
            {
                model: dbcaseInterviewTypes,
                as: "interviewTypeInfo",
                where: {
                    status: true,
                },
                attributes: []
            },
            {
                model: dbrooms,
                as: "interviewroomDetails",
                attributes: []
            }
        ],
        where: {
            requestUuid: requestUuid,
            caseId: caseId,
            userId: userId,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.deActivateInterview = async (obj, requestUuid, caseId, userId) => {
    return  await dbcaseInterviewDetails.update(obj, {
        where: {
            requestUuid: requestUuid,
            caseId: caseId,
            userId: userId,
            status: true
        }
    });
}

Queries.updateInterview = async (obj, requestUuid, caseId, userId) => {
    return  await dbcaseInterviewDetails.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            caseId: caseId,
            status: true
        }
    });
}

const decryptionObject = (obj) => {
    if (obj.interviewRole) {
        obj.interviewRole = Encryption.decryptSensitiveData(obj.interviewRole)
    }
    if (obj.interviewName) {
        obj.interviewName = Encryption.decryptSensitiveData(obj.interviewName)
    }
    if (obj.interviewGoal) {
        obj.interviewGoal = Encryption.decryptSensitiveData(obj.interviewGoal)
    }
    if (obj.interviewQuestion) {
        obj.interviewQuestion = Encryption.decryptSensitiveData(obj.interviewQuestion)
    } 
    if (obj.interviewLink) {
        obj.interviewLink = Encryption.decryptSensitiveData(obj.interviewLink)
    } 
    if (obj.fileDetails) {
        obj.fileDetails = Encryption.decryptSensitiveData(obj.fileDetails)
    } 
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    } 
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    } 
    if (obj.transcript) {
        obj.transcript = Encryption.decryptSensitiveData(obj.transcript)
    }
    if (obj.enhancedTranscript) {
        obj.enhancedTranscript = Encryption.decryptSensitiveData(obj.enhancedTranscript)
    }
    if (obj.coreTranscript) {
        obj.coreTranscript = Encryption.decryptSensitiveData(obj.coreTranscript)
    }
    return obj;
}

const decryptionObject3 = (obj) => {
    if (obj.request) {
        obj.request = Encryption.decryptSensitiveData(obj.request)
    }
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response)
    }
    return obj;
}

const decryptionArray = (array = []) => {
    const arr = [];
    array.forEach(resp => {
        resp = decryptionObject(resp);
        arr.push(resp);
    })
    return arr;
}

Queries.getPendingData = async () => {
    const sql = `      
    SELECT 
  t1.id,
  t1.requestUuid,
  t1.userId,
  t1.request,
  toc.caseId 
FROM
  case_interview_inc t1 
  INNER JOIN 
    (SELECT 
      userId,
      MIN(id) AS min_id 
    FROM
      case_interview_inc 
    WHERE STATUS = 0 
      AND assistantId IS NULL 
      AND isActivated = 1 
    GROUP BY userId) t2 
    ON t1.userId = t2.userId 
    AND t1.id = t2.min_id 
  LEFT JOIN case_interviews toc 
    ON t1.interviewId = toc.id ;
                `;
    let data = await dbcaseInterviewInc.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingReportsByUserId = async (userId) => {
    let data = await dbcaseInterviewInc.findOne({
        attributes: attributes_2,
        where: {
            userId: userId,
            status: false,
            isActivated: true,
            assistantId: {
                [Op.not]: null
            },
        },
        raw: true
    });
    if (data == null) {
        return data;
    } else {
        data = [decryptionObject3(data)];
        return data;
    }    
} 

Queries.getDetails = async () => {
    let data = await dbcaseInterviewDetails.findAll({
        attributes: attributes_4,
        include: [{ 
            model: dbcaseInterviewTypes,
            as: "interviewTypeInfo", 
            where: {
                status: true,
            },
            attributes: ['requestUuid', 'title']
        }],
        where: {
            isPromptProcessed: false,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.update = async (obj, requestUuid, userId) => {
    return await dbcaseInterviewInc.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: false
        }
    });
}

Queries.updateFileMeetingInc = async (obj, requestUuid, userId) => {
    return await dbcaseInterviewFileMeetingInc.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: false
        }
    });
}

Queries.startCaseInterviewFileIncs = async () => {
    let data = await dbcaseInterviewInc.findAll({
        attributes: attributes_5,
        where: {
            status: false,
            assistantId: {
                [Op.not]: null,
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.startCaseInterviewFileMeetingIncs = async () => {
    let data = await dbcaseInterviewFileMeetingInc.findAll({
        attributes: attributes_8,
        where: {
            status: false,
            assistantId: {
                [Op.not]: null,
            },
            response: {
                [Op.eq]: null
            }
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.updateThreadById = async (obj, runId) => {
    return await dbcaseInterviewInc.update(obj, {
        where: {
            runId: runId
        }
    });
}

Queries.updateThreadFileMeetingById = async (obj, runId) => {
    return await dbcaseInterviewFileMeetingInc.update(obj, {
        where: {
            runId: runId
        }
    });
}

Queries.updateById = async (obj, id) => {
    return await dbcaseInterviewFileMeetingInc.update(obj, {
        where: {
            id: id
        }
    });
}


Queries.getTranscript = async () => {
    const sql = `      
    SELECT 
  ci_inc.id AS interviewIncId,
  t1.roomId,
  t1.interviewId,
  t1.userId,
  t1.transcript 
FROM
  rooms t1 
  INNER JOIN 
    (SELECT 
      userId,
      MIN(roomId) AS min_id 
    FROM
      rooms 
    WHERE botStatus = 'in_call_recording' 
      AND transcript IS NOT NULL 
      AND interviewId IS NOT NULL
    GROUP BY userId) t2 
    ON t1.userId = t2.userId 
    AND t1.roomId = t2.min_id 
  LEFT JOIN case_interviews ci 
    ON t1.interviewId = ci.id 
    AND ci.status = 1 
  LEFT JOIN case_interview_inc ci_inc 
    ON t1.interviewId = ci_inc.interviewId 
    AND ci_inc.isActivated = 1 
    AND ci_inc.status = 1;
                `;
    let data = await dbrooms.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}


Queries.checkDuplicateTranscript = async (transcript, interviewIncId, roomId, userId) => {
    let data = await dbcaseInterviewFileMeetingInc.findOne({
        attributes: attributes_2,
        where: {
            transcriptHash: transcript,
            interviewIncId: interviewIncId,
            roomId: roomId,
            userId: userId,
        },
        raw: true
    });
    if (data == null) {
        return data;
    } else {
        data = [decryptionObject3(data)];
        return data;
    }    
} 

Queries.caseInterviewInc = async (interviewIncId, userId) => {
    let data = await dbcaseInterviewInc.findOne({
        attributes: attributes_6,
        where: {
            isActivated: true,
            status: true,
            id: interviewIncId,
            userId: userId,
        },
        raw: true
    });
    if (data == null) {
        return data;
    } else {
        data = [decryptionObject3(data)];
        return data;
    }    
} 

Queries.getPendingMeetingFileInc = async () => {
    const sql = `      
    SELECT 
  t1.id,
  t1.requestUuid,
  t1.userId,
  t1.request, 
  t1.interviewIncId,
  t1.roomId 
FROM
  case_interview_file_meeting_inc t1 
  INNER JOIN 
    (SELECT 
      userId,
      MIN(id) AS min_id 
    FROM
      case_interview_file_meeting_inc 
    WHERE STATUS = 0 
      AND assistantId IS NULL 
      AND response IS NULL 
      AND isActivated = 1 
    GROUP BY userId) t2 
    ON t1.userId = t2.userId 
    AND t1.id = t2.min_id
                `;
    let data = await dbcaseInterviewFileMeetingInc.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}


Queries.getQueueMeetingFileInc = async (userId) => {
    let data = await dbcaseInterviewFileMeetingInc.findOne({
        attributes: attributes_2,
        where: {
            userId: userId,
            status: false,
            isActivated: true,
            assistantId: {
                [Op.not]: null
            },
            response: {
                [Op.eq]: null
            }
        },
        raw: true
    });
    if (data == null) {
        return data;
    } else {
        data = [decryptionObject3(data)];
        return data;
    }    
}  

Queries.findThreadId = async (interviewIncId, roomId, userId) => { 
    return await dbcaseInterviewFileMeetingInc.findOne({
        attributes: attributes_5,
        where: {
            interviewIncId: interviewIncId,
            roomId: roomId,
            userId: userId,
            // status: true,
            isActivated: true,
            assistantId: {
                [Op.not]: null,
            },
        },
        order: [['createdAt', 'DESC']], 
        raw: true
    });
}


Queries.findInterviewId = async (requestUuid, userId) => { 
    return await dbcaseInterviewDetails.findOne({
        attributes: attributes_2,
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: true,
        },
        raw: true
    });
}

Queries.getAll = async () => { 
    let data =  await dbcaseInterviewFileMeetingInc.findAll({
        attributes: attributes_7,
        order: [['id', 'DESC']], 
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllIntInc = async () => { 
    let data =  await dbcaseInterviewInc.findAll({
        attributes: attributes_10,
        order: [['id', 'DESC']], 
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllByBotId = async (roomId) => { 
    let data =  await dbcaseInterviewFileMeetingInc.findAll({
        attributes: attributes_9,
        where: {
            roomId: roomId,
            status: true,
            isActivated: true
        },
        order: [['updatedAt', 'DESC']],
        raw: true,
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllIncById = async (interviewIncId) => { 
    let data =  await dbcaseInterviewFileMeetingInc.findAll({
        attributes: attributes_9,
        where: {
            interviewIncId: interviewIncId,
            status: true,
            isActivated: true
        },
        order: [['updatedAt', 'DESC']],
        raw: true,
    });
    data = decryptionArray(data);
    return data;
}

Queries.getFailedInterviewInc = async () => {
    const sql = `
    SELECT
    t1.id,
        t1.requestUuid,
        t1.userId,
        t1.request,
        t1.retryCount,
        toc.caseId
    FROM
    case_interview_inc t1 
    INNER JOIN
        (SELECT 
        userId,
            MIN(id) AS min_id 
      FROM
        case_interview_inc 
      WHERE 
      STATUS = 2 
    AND isActivated = 1
    AND retryCount < ${retryLimit}
      GROUP BY userId) t2 
      ON t1.userId = t2.userId 
      AND t1.id = t2.min_id 
    LEFT JOIN case_interviews toc 
      ON t1.interviewId = toc.id;
      `;
  let data = await dbcaseInterviewInc.sequelize.query(sql, {
      type: Sequelize.QueryTypes.SELECT,
      raw: true
  });
  data = decryptionArray(data);
  return data;
}

Queries.checkUsage = async (userId) => {
    return await dbcaseInterviewInc.count({
        where: {
            userId: userId,
            status: 0
        }
    });
}

Queries.updateFailed = async (obj, requestUuid, requestId, userId) => {
    return await dbcaseInterviewInc.update(obj, {
        where: {
            requestId: requestId,
            userId: userId,
            requestUuid: requestUuid,
            status: 2
        }
    });
}

Queries.getPendingInterviewIncUserId = async (userId) => {
    let data = await dbcaseInterviewInc.findOne({
        attributes: attributes_11,
        where: {
            userId: userId,
            status: false,
            isActivated: true,
            assistantId: {
                [Op.not]: null
            }
        },
        raw: true
    });
    if (data == null) {
        return data;
    } else {
        data = [decryptionObject3(data)];
        return data;
    }    
} 

module.exports = Queries;