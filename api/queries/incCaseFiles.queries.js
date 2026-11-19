const Queries = {};
const dbModel = require('../model');
const db = dbModel.incCaseFiles;
const dbCaseNames = dbModel.incCaseNames;
const dbCaseReports = dbModel.incCaseReports;
const dbCaseReportsMapping = dbModel.incCaseFilesReportMapping;
const { Sequelize, Op } = require("sequelize");
const { Encryption } = require('../../utils');
const attributes_1 = ['id']
const attributes_2 = ['fileUuid', 'fileName', 'pageCount'];

Queries.createFile = async (obj) => {
    return await db.create(obj);
}

Queries.createReport = async (obj) => {
    const result = await dbCaseReports.create(obj,
        {
            returning: true
        });
    return [result.id];
}

Queries.createReportMapping = async (obj) => {
    return await dbCaseReportsMapping.create(obj);
}

Queries.countFiles = async (caseId, userId) => {
    return await db.count({
        where: {
            incCaseId: caseId,
            userId: userId,
            status: true,
            isActivated: true,
        }
    });
}

Queries.deActivateFileByCaseId = async (obj, caseId, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            incCaseId: caseId,
            status: true,
            isActivated: true
        }
    });
}

Queries.deActivateFile = async (obj, caseId, fileId, userId) => {
    return  await db.update(obj, {
        where: {
            userId: userId,
            incCaseId: caseId,
            fileUuid: fileId,
            status: true,
            isActivated: true
        }
    });
}

Queries.updateByFileUuid = async (obj, fileUuid) => {
    return await db.update(obj, {
        where: {
            fileUuid: fileUuid,
        }
    });
}

Queries.updateByReportByJobUuid = async (obj, jobUuid) => {
    return await dbCaseReports.update(obj, {
        where: {
            jobUuid: jobUuid,
        }
    });
}

Queries.findByFileUuid = async (fileUuid, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            userId: userId,
            fileUuid: fileUuid,
            status: true,
            isActivated: true,
            // isProcessed: {
            //     [Op.ne]: 2,
            // },
        }
    });
}

Queries.findByFileUuidForError = async (fileUuid, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            // userId: userId,
            fileUuid: fileUuid,
            // status: false,
            // isActivated: false,
            // isProcessed: {
            //     [Op.eq]: 2,
            // },
        }
    });
}

Queries.updateByReportMappingByFileId = async (obj, fileId, reportId) => {
    return await dbCaseReportsMapping.update(obj, {
        where: {
            fileId: fileId,
            reportId: reportId
        }
    });
}

// Queries.getIncInvoiceToday = async (startDate, endDate, userId, incCaseId) => {
//     const start = new Date(startDate + " 00:00:00");
//     const end = new Date(endDate + " 23:59:59");
//     const filterQuery = {};
//     if(incCaseId){
//         filterQuery.caseUuid = incCaseId;
//     }
//     let data = await db.findAll({
//         attributes: [
//             ...attributes_2,
//             [Sequelize.col('incCaseFileReportsMappingDetails.createdAt'), 'createdAt']
//         ],
//         include: [ 
//             {
//                 model: dbCaseReportsMapping,
//                 as: "incCaseFileReportsMappingDetails",
//                 attributes: [],
//                 where: {
//                     status: true,
//                     isActivated: true
//                 },
//             },
//             {
//                 model: dbCaseNames,
//                 as: "incCaseIdInfo",
//                 attributes: [],
//             }
//         ],
//         where: {
//             userId,
//             createdAt: {
//                 [Op.between]: [start, end]
//             }
//         },
//         // logger:true,
//         raw: true
//     });

//     data = decryptionArray(data);
//     return data;
// }

Queries.getIncInvoiceToday = async (startDate, endDate, userId, incCaseId) => {
    const start = new Date(startDate + " 00:00:00");
    const end = new Date(endDate + " 23:59:59");
    let include = [
        {
            model: dbCaseReportsMapping,
            as: "incCaseFileReportsMappingDetails",
            attributes: [],
            where: {
                status: true,
                isActivated: true
            },
        }
    ];
    if (incCaseId) {
        include.push({
            model: dbCaseNames,
            as: "incCaseIdInfo",
            attributes: [],
            where: {
                caseUuid: incCaseId
            }
        });
    }
    let data = await db.findAll({
        attributes: [
            ...attributes_2,
            [Sequelize.col('incCaseFileReportsMappingDetails.createdAt'), 'createdAt']
        ],
        include: include,
        where: {
            userId,
            createdAt: {
                [Op.between]: [start, end]
            }
        },
        raw: true
    });

    data = decryptionArray(data);
    return data;
};

const decryptionArray = (array = []) => {
    const arr = [];
    array.forEach(resp => {
        resp = decryptionObject(resp);
        arr.push(resp);
    })
    return arr;
}

const decryptionObject = (obj) => {
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    return obj;
}


Queries.findDuplicateFile = async (fileName, incCaseId, userId) => {
    return await db.findAll({
        attributes: attributes_1,
        where: {
            userId: userId,
            incCaseId: incCaseId,
            fileName: Encryption.encryptSensitiveData(fileName),
            status: true,
            isActivated: true
        },
        raw: true
    });
}

module.exports = Queries;