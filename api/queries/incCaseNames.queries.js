const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const { Encryption } = require('../../utils')
const db = dbModel.incCaseNames;
const dbFiles = dbModel.incCaseFiles;
const dbReports = dbModel.incCaseReports;
const dbTypes = dbModel.incCaseTypes;
const dbTypeABMatter = dbModel.incCaseTypeABMatter;
const dbTypeTortMatter = dbModel.incCaseTypeTortMatter;
const dbUsers = dbModel.users;
const dbCaseReportsMapping = dbModel.incCaseFilesReportMapping;
const dbCaseMediationReport = dbModel.incCaseMediationReport;
const dbCaseSummaryReport = dbModel.incCaseSummaryReport;
const dbCaseSettlementReport = dbModel.incCaseSettlementReport;
const dbCaseInjuryTracking = dbModel.incCaseInjuryTracking;
const dbCaseReportSummary = dbModel.incCaseReportSummary;
const dbCaseReportSummaryDownloadManager = dbModel.incCaseReportSummaryDownloadManager;
const dbCaseResponses = dbModel.incCaseResponses;
const dbCaseReportSection = dbModel.incCaseReportSection;
const dbCaseSavedPrompt = dbModel.incCaseSavedPrompt;
const dbCaseSavedPromptTypes = dbModel.incCaseSavedPromptTypes;
const dbCaseShares = dbModel.incCaseShares;
const dbCaseMedicalInjuryReport = dbModel.incCaseMedicalInjuryReport;

const attributes_1 = ['id', 'caseName', 'caseUuid', 'isProcessed']
const attributes_2 = ['id', 'isProcessed']
const attributes_3 = ['caseName', 'caseUuid', 'primaryAttorneyEmail', 'additionalEmails', 'id', 'isProcessed', 'status', 'createdAt', 'caseTypeTitle']
const attributes_4 = ['caseName', 'caseUuid', 'plaintiffFirstName', 'plaintiffLastName', 'plaintiffDOB', 'dateOfLoss', 'insuredDefendant']
const attributes_5 = ['id']
const attributes_8 = ['id', 'userId']
const attributes_9 = ['caseName', 'isProcessed']
const attributes_10 = ['requestuuid', 'key', 'label']
const attributes_11 = ['id', 'key']
const attributes_12 = ['id', 'key', 'requestUuid']
const attributes_13 = ['requestUuid', 'summaryName', 'createdAt']
const attributes_14 = ['jobUuid', 'incCaseId', 'id', 'isProcessed']
const attributes_15 = ['requestUuid', 'status', 'response', 'userQuery', 'citations']
const attributes_16 = ['threadId']
const attributes_17 = ['id', 'requestUuid', 'userId']
const attributes_18 = ['requestUuid', 'summaryName', 'createdAt', 'jobUuid']
const attributes_19 = ['requestUuid', 'status', 'response']
const attributes_20 = ['id', 'userId', 'incCaseId']
const attributes_21 = ['requestUuid', 'status', 'response', 'userQuery', 'citations']
const attributes_22 = ['requestUuid', 'jobUuid', 'status', 'userId']
const attributes_23 = ['requestUuid', 'status', 'title', 'description', 'reportType']
const attributes_24 = ['requestUuid', 'status', 'title', 'description', 'userId']
const attributes_25 = ['userId', 'caseName', 'caseUuid', 'primaryAttorneyEmail', 'additionalEmails', 'id', 'isProcessed', 'status', 'createdAt', 'caseTypeTitle']
const attributes_26 = ['requestUuid', 'status', 'response', 'jobUuid', 'citations']
const attributes_27 = ['requestUuid', 'title']


Queries.addCase = async (obj) => {
    const result = await db.create(obj,
        {
            returning: true
        });
    return [result.caseUuid, result.id];
};

Queries.addCaseReportSummaryDownloadManager = async (obj) => {
    const result = await dbCaseReportSummaryDownloadManager.create(obj,
        {
            returning: true
        });
    return [result.requestUuid];
};

Queries.addReportsSummary = async (obj) => {
    return await dbCaseReportSummary.bulkCreate(obj)
};

Queries.addIncCaseResponse = async (obj) => {
    return await dbCaseResponses.create(obj)
};

Queries.addIncCaseReportSection = async (obj) => {
    return await dbCaseReportSection.create(obj)
};

Queries.addPrompt = async (obj) => {
    return await dbCaseSavedPrompt.create(obj)
};

Queries.addCaseShares = async (obj) => {
    return await dbCaseShares.create(obj)
};

Queries.addInjury = async (obj) => {
    const result = await dbCaseInjuryTracking.create(obj,
        {
            returning: true
        });
    return [result.requestUuid];
};

Queries.createMediationSettlement = async (obj) => {
    const result = await dbCaseSettlementReport.create(obj,
        {
            returning: true
        });
    return [result.requestUuid, result.id];
};

Queries.addTort = async (obj) => {
    return await dbTypeTortMatter.create(obj)
};

Queries.addAbMatter = async (obj) => {
    return await dbTypeABMatter.create(obj)
};

Queries.addMedicalInjuryReport = async (obj) => {
    const result = await dbCaseMedicalInjuryReport.create(obj,
        {
            returning: true
        });
    return [result.requestUuid];
};

Queries.findCaseByUserIdAndName = async (caseName, caseType, userId) => {
    return await db.findOne({
        include: [{
            model: dbTypes,
            as: "incCaseTypesInfo",
            where: {
                requestUuid: caseType,
                isActivated: true,
            },
            attributes: [],
        }],
        where: {
            caseName: caseName,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    });
};

Queries.findCaseByUserId = async (requestUuid, userId) => {
    return await db.findAll({
        attribute: attributes_2,
        where: {
            caseUuid: requestUuid,
            userId: userId,
            status: true
        }
    });
};

Queries.getFileStatus = async (userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_25,
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.isProcessed'), 'isProcessed'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incCaseIdDetails.isCombined'), 'isCombined'],
            [Sequelize.col('incCaseIdDetails.reviewers'), 'reviewers'],
            [Sequelize.col('incCaseIdDetails.caseFileTypes'), 'caseFileTypes'],

            //fields for the tort
            [Sequelize.col('incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseIdTortDetails.dateOfLoss'), 'dateOfLossTort'],
            [Sequelize.col('incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseIdTortDetails.liabilityDispute'), 'liabilityDispute'],
            [Sequelize.col('incCaseIdTortDetails.incomeLoss'), 'incomeLoss'],
            [Sequelize.col('incCaseIdTortDetails.housekeepingRequired'), 'housekeepingRequired'],
            [Sequelize.col('incCaseIdTortDetails.futureCareNeeded'), 'futureCareNeeded'],
            [Sequelize.col('incCaseIdTortDetails.outOfPocketExpenses'), 'outOfPocketExpenses'],
            [Sequelize.col('incCaseIdTortDetails.previousAccident'), 'previousAccident'],
            [Sequelize.col('incCaseIdTortDetails.previousAccidentDate'), 'previousAccidentDate'],
            [Sequelize.col('incCaseIdTortDetails.subsequentAccident'), 'subsequentAccident'],
            [Sequelize.col('incCaseIdTortDetails.subsequentAccidentDate'), 'subsequentAccidentDate'],

            //fields for the caseTypes
            [Sequelize.col('incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseTypesInfo.key'), 'caseKey'],
            [Sequelize.col('incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseTypesInfo.id'), 'caseTypeId'],

            //fields for the AB MATTER
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffInMIG'), 'applicantiffInMIG'],
            [Sequelize.col('incCaseIdABMatterDetails.disputingCAT'), 'disputingCAT'],
            [Sequelize.col('incCaseIdABMatterDetails.summaryOfOCF18'), 'summaryOfOCF18'],
            [Sequelize.col('incCaseIdABMatterDetails.summaryOfOCF6'), 'summaryOfOCF6'],
            [Sequelize.col('incCaseIdABMatterDetails.attendantCareDispute'), 'attendantCareDispute'],
            [Sequelize.col('incCaseIdABMatterDetails.specifiedBenefitsDispute'), 'specifiedBenefitsDispute'],
            [Sequelize.col('incCaseSharesDetails.incSharedWithInfo.groupId'), 'groupId'],
            [Sequelize.col('incCaseSharesDetails.requestUuid'), 'sharedRequestUuid'],
            [Sequelize.col('incUserInfo.groupId'), 'groupedUser'],
        ],
        include: [
            {
                model: dbCaseShares,
                as: "incCaseSharesDetails",
                where: {
                    sharedWithUserId: userId,
                    isActivated: true
                },
                attributes: [],
                required: false,
                include: [
                    {
                        model: dbUsers,
                        as: "incSharedWithInfo",
                        where: {
                            isRemoved: false,
                        },
                        attributes: [],
                    }
                ],
            },
            {
                model: dbUsers,
                as: "incUserInfo",
                where: {
                    isRemoved: false,
                },
                attributes: [],
            },
            {
                model: dbFiles,
                as: "incCaseIdDetails",
                where: {
                    // userId: userId,
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypeTortMatter,
                as: "incCaseIdTortDetails",
                where: {
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypeABMatter,
                as: "incCaseIdABMatterDetails",
                where: {
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypes,
                as: "incCaseTypesInfo",
                where: {
                    isActivated: true,
                },
                attributes: []
            },
        ],
        where: {
            status: true,
            isActivated: true,
            ...getCaseAccessCondition(userId)
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getFileStatusWithCaseId = async (id, userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_4,
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName']
        ],
        include: [{
            model: dbFiles,
            as: "incCaseIdDetails",
            where: {
                incCaseId: id,
                userId: userId,
                isProcessed: {
                    [Op.ne]: 2,
                },
                status: true,
                isActivated: true,
            },
            attributes: [],
        }],
        where: {
            id: id,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getFileStatusByCaseUuid = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_3,
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.isProcessed'), 'fileIsProcessed'],
            [Sequelize.col('incCaseIdDetails.filePath'), 'filePath'],
            [Sequelize.col('incCaseIdDetails.folderPath'), 'folderPath'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incCaseIdDetails.isCombined'), 'isCombined'],
            [Sequelize.col('incCaseIdDetails.reviewers'), 'reviewers'],
            [Sequelize.col('incCaseIdDetails.caseFileTypes'), 'caseFileTypes'],
            [Sequelize.col('incCaseIdDetails.fileSize'), 'fileSize'],
            [Sequelize.col('incCaseIdDetails.pageCount'), 'pageCount'],
            [Sequelize.col('incCaseIdDetails.createdAt'), 'createdAt'],

            //fields for the tort
            [Sequelize.col('incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseIdTortDetails.dateOfLoss'), 'dateOfLossTort'],
            [Sequelize.col('incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseIdTortDetails.liabilityDispute'), 'liabilityDispute'],
            [Sequelize.col('incCaseIdTortDetails.incomeLoss'), 'incomeLoss'],
            [Sequelize.col('incCaseIdTortDetails.housekeepingRequired'), 'housekeepingRequired'],
            [Sequelize.col('incCaseIdTortDetails.futureCareNeeded'), 'futureCareNeeded'],
            [Sequelize.col('incCaseIdTortDetails.outOfPocketExpenses'), 'outOfPocketExpenses'],
            [Sequelize.col('incCaseIdTortDetails.previousAccident'), 'previousAccident'],
            [Sequelize.col('incCaseIdTortDetails.previousAccidentDate'), 'previousAccidentDate'],
            [Sequelize.col('incCaseIdTortDetails.subsequentAccident'), 'subsequentAccident'],
            [Sequelize.col('incCaseIdTortDetails.subsequentAccidentDate'), 'subsequentAccidentDate'],

            //fields for the caseTypes
            [Sequelize.col('incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseTypesInfo.key'), 'caseKey'],
            [Sequelize.col('incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseTypesInfo.id'), 'caseTypeId'],

            //fields for the AB MATTER
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffInMIG'), 'applicantiffInMIG'],
            [Sequelize.col('incCaseIdABMatterDetails.disputingCAT'), 'disputingCAT'],
            [Sequelize.col('incCaseIdABMatterDetails.summaryOfOCF18'), 'summaryOfOCF18'],
            [Sequelize.col('incCaseIdABMatterDetails.summaryOfOCF6'), 'summaryOfOCF6'],
            [Sequelize.col('incCaseIdABMatterDetails.attendantCareDispute'), 'attendantCareDispute'],
            [Sequelize.col('incCaseIdABMatterDetails.specifiedBenefitsDispute'), 'specifiedBenefitsDispute'],
            [Sequelize.col('incCaseSharesDetails.incSharedWithInfo.groupId'), 'groupId'],
            [Sequelize.col('incCaseSharesDetails.requestUuid'), 'sharedRequestUuid'],
        ],
        include: [
            {
                model: dbCaseShares,
                as: "incCaseSharesDetails",
                where: {
                    sharedWithUserId: userId,
                    isActivated: true
                },
                attributes: [],
                required: false,
                include: [
                    {
                        model: dbUsers,
                        as: "incSharedWithInfo",
                        where: {
                            isRemoved: false,
                        },
                        attributes: [],
                    }
                ],
            },
            {
                model: dbFiles,
                as: "incCaseIdDetails",
                where: {
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypeTortMatter,
                as: "incCaseIdTortDetails",
                where: {
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypeABMatter,
                as: "incCaseIdABMatterDetails",
                where: {
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypes,
                as: "incCaseTypesInfo",
                where: {
                    isActivated: true,
                },
                attributes: []
            }
        ],
        where: {
            ...getCaseAccessCondition(userId),
            caseUuid: caseUuid,
            status: true,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getFileStatusByCaseUuidReport = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: [...attributes_9,
        [Sequelize.col('incCaseReportsDetails.isProcessed'), 'reportStatus'],
        [Sequelize.col('incCaseReportsDetails.jobUuid'), 'jobUuid'],
        [Sequelize.col('incCaseReportsDetails.summaryName'), 'summaryName'],
        [Sequelize.col('incCaseReportsDetails.requestUuid'), 'requestUuid'],
        [Sequelize.col('incCaseReportsDetails.createdAt'), 'createdAt']
        ],
        include: [
            {
                model: dbReports,
                as: "incCaseReportsDetails",
                where: {
                    // ...getCaseFilesReports(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            }],
        where: {
            // ...getCaseFilesReports(userId),
            caseUuid: caseUuid,
            status: true,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}


Queries.getFileStatusSendReport = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_3,
            [Sequelize.col('incCaseIdDetails.id'), 'fileId'],
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incCaseIdDetails.pageCount'), 'pageCount'],
            [Sequelize.col('incCaseIdDetails.isCombined'), 'isCombined'],
            [Sequelize.col('incCaseIdDetails.reviewers'), 'reviewers'],
            [Sequelize.col('incCaseIdDetails.caseFileTypes'), 'caseFileTypes'],

            //fields for the tort
            [Sequelize.col('incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseIdTortDetails.dateOfLoss'), 'dateOfLossTort'],
            [Sequelize.col('incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseIdTortDetails.liabilityDispute'), 'liabilityDispute'],
            [Sequelize.col('incCaseIdTortDetails.incomeLoss'), 'incomeLoss'],
            [Sequelize.col('incCaseIdTortDetails.housekeepingRequired'), 'housekeepingRequired'],
            [Sequelize.col('incCaseIdTortDetails.futureCareNeeded'), 'futureCareNeeded'],
            [Sequelize.col('incCaseIdTortDetails.outOfPocketExpenses'), 'outOfPocketExpenses'],
            [Sequelize.col('incCaseIdTortDetails.previousAccident'), 'previousAccident'],
            [Sequelize.col('incCaseIdTortDetails.previousAccidentDate'), 'previousAccidentDate'],
            [Sequelize.col('incCaseIdTortDetails.subsequentAccident'), 'subsequentAccident'],
            [Sequelize.col('incCaseIdTortDetails.subsequentAccidentDate'), 'subsequentAccidentDate'],

            //fields for the caseTypes
            [Sequelize.col('incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseTypesInfo.key'), 'caseKey'],
            [Sequelize.col('incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseTypesInfo.id'), 'caseTypeId'],

            //fields for the AB MATTER
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffInMIG'), 'applicantiffInMIG'],
            [Sequelize.col('incCaseIdABMatterDetails.disputingCAT'), 'disputingCAT'],
            [Sequelize.col('incCaseIdABMatterDetails.summaryOfOCF18'), 'summaryOfOCF18'],
            [Sequelize.col('incCaseIdABMatterDetails.summaryOfOCF6'), 'summaryOfOCF6'],
            [Sequelize.col('incCaseIdABMatterDetails.attendantCareDispute'), 'attendantCareDispute'],
            [Sequelize.col('incCaseIdABMatterDetails.specifiedBenefitsDispute'), 'specifiedBenefitsDispute'],
        ],
        include: [
            {
                model: dbFiles,
                as: "incCaseIdDetails",
                where: {
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
            },
            {
                model: dbTypeTortMatter,
                as: "incCaseIdTortDetails",
                where: {
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypeABMatter,
                as: "incCaseIdABMatterDetails",
                where: {
                    ...getCaseAccessCondition(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypes,
                as: "incCaseTypesInfo",
                where: {
                    isActivated: true,
                },
                attributes: []
            },
        ],
        where: {
            ...getCaseAccessCondition(userId),
            caseUuid: caseUuid,
            status: true,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getCaseByUuid = async (caseType, requestUuid, userId) => {
    return await db.findAll({
        attributes: [
            ...attributes_5,
            [Sequelize.col('incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseTypesInfo.key'), 'caseKey'],
            [Sequelize.col('incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseTypesInfo.id'), 'caseTypeId'],
        ],
        include: [{
            model: dbTypes,
            as: "incCaseTypesInfo",
            where: {
                requestUuid: caseType,
                isActivated: true,
            },
            attributes: [],
        }],
        where: {
            caseUuid: requestUuid,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    });
}

Queries.updateCase = async (obj, caseId, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            caseUuid: caseId,
            status: true,
            isActivated: true
        }
    });
}


Queries.saveInjury = async (obj, requestUuid) => {
    return await dbCaseMedicalInjuryReport.update(obj, {
        where: {
            requestUuid: requestUuid,
            status: true,
            isActivated: true
        }
    });
}



Queries.updateReport = async (obj, record_uuid) => {
    return await dbCaseReportSummary.update(obj, {
        where: {
            record_uuid: record_uuid,
            isActivated: true
        }
    });
}

Queries.updateABMatterCase = async (obj, incCaseTypeId, caseId, userId) => {
    return await dbTypeABMatter.update(obj, {
        where: {
            incCaseTypeId: incCaseTypeId,
            incCaseId: caseId,
            userId: userId,
            status: true,
            isActivated: true
        }
    });
}

Queries.updateTortCase = async (obj, incCaseTypeId, caseId, userId) => {
    return await dbTypeTortMatter.update(obj, {
        where: {
            incCaseTypeId: incCaseTypeId,
            incCaseId: caseId,
            userId: userId,
            status: true,
            isActivated: true
        }
    });
}

Queries.getCasesId = async (caseId, userId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseId,
            userId: userId,
            status: true,
            isActivated: true,
        },
        raw: true
    });
}

Queries.findCase = async (caseUuid) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseUuid,
            status: true,
            isActivated: true,
        },
        raw: true
    });
}

Queries.getPromptType = async (requestUuid) => {
    return await dbCaseSavedPromptTypes.findAll({
        attributes: ['id'],
        where: {
            requestUuid: requestUuid,
            status: true,
        },
        raw: true
    });
}

Queries.getCasesForShared = async (caseId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            caseUuid: caseId,
            status: true,
            isActivated: true,
        },
        raw: true
    });
}

Queries.deActivateCase = async (obj, caseId, userId) => {
    return await db.update(obj, {
        where: {
            userId: userId,
            caseUuid: caseId,
            status: true,
            isActivated: true
        }
    });
}

Queries.getCaseId = async (caseUuid, fileUuid, userId) => {
    return await db.findAll({
        attributes: [
            ...attributes_1,
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incCaseIdDetails.isProcessed'), 'fileProcessed']
        ],
        include: [{
            model: dbFiles,
            as: "incCaseIdDetails",
            where: {
                fileUuid: fileUuid,
                userId: userId,
                status: true,
                isActivated: true
            },
            attributes: []
        }],
        where: {
            caseUuid: caseUuid,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    });
}

Queries.findFileRelatedToCase = async (caseUuid, userId) => {
    return await db.findAll({
        attributes: [
            ...attributes_1,
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incCaseIdDetails.isProcessed'), 'isProcessed']
        ],
        include: [{
            model: dbFiles,
            as: "incCaseIdDetails",
            where: {
                userId: userId,
                status: true,
                isActivated: true
            },
            attributes: []
        }],
        where: {
            caseUuid: caseUuid,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    });
}

Queries.findFileRelatedToCaseForDelete = async (caseUuid, fileUuid, userId) => {
    return await db.findAll({
        attributes: [
            ...attributes_1,
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incCaseIdDetails.isProcessed'), 'isProcessed']
        ],
        include: [{
            model: dbFiles,
            as: "incCaseIdDetails",
            where: {
                fileUuid: fileUuid,
                userId: userId,
                status: true,
                isActivated: true
            },
            attributes: []
        }],
        where: {
            caseUuid: caseUuid,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    });
}

Queries.getCaseIdForReviewer = async (caseUuid, fileUuid, userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_1,
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incCaseIdDetails.isProcessed'), 'fileIsProcessed'],
            [Sequelize.col('incCaseIdDetails.isCombined'), 'isCombined'],
            [Sequelize.col('incCaseIdDetails.reviewers'), 'reviewers']
        ],
        include: [{
            model: dbFiles,
            as: "incCaseIdDetails",
            where: {
                fileUuid: fileUuid,
                userId: userId,
                status: true,
                isActivated: true,
            },
            attributes: []
        }],
        where: {
            caseUuid: caseUuid,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getPendingData = async () => {
    const sql = `      
   SELECT
    t1.id,t1.caseUuid,t1.userId,t1.isProcessed
           FROM
               inc_case_names t1
           INNER JOIN (
               SELECT
                   userId,
                   MIN(id) AS min_id
               FROM
                   inc_case_names
               WHERE isProcessed IS NULL
               AND isActivated = 1
               AND STATUS = 1
               GROUP BY
                   userId
           ) t2
           ON
           t1.userId = t2.userId AND t1.id = t2.min_id;
               `;
    let data = await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getCaseDetails = async (caseUuid, jobUuid) => {
    const sql = `      
    SELECT 
    t1.id,
    t1.userId,
    t1.caseName,
    t1.caseUuid,
    t1.primaryAttorneyEmail,
    t1.additionalEmails,
    t2.fileUuid AS fileUuid,
    t2.fileName AS fileName,
    t3.requestUuid AS requestUuid,
    t3.id AS reportId,
    t3.jobUuid AS jobUuid,
    t3.isProcessed AS isProcessed 
    FROM
    inc_case_names t1 
    INNER JOIN inc_case_files t2 
        ON t1.id = t2.incCaseId 
        AND t2.status = 1 
        AND t2.isActivated = 1
    INNER JOIN inc_case_reports t3 
        ON t1.id = t3.incCaseId 
        AND t3.status = 1 
        AND t3.isActivated = 1 
        AND t3.isProcessed = 0 
        AND t3.jobUuid = '${jobUuid}'
    WHERE t1.caseUuid = '${caseUuid}'
    AND t1.status = 1 
    AND t1.isActivated = 1 
    AND t1.isProcessed = 0 
    ORDER BY t2.id ASC;
    `;
    let data = await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.findCaseByUuidForMagicLink = async (userUuid, caseUuid) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_8,
            [Sequelize.col('incUserInfo.userId'), 'userId'],
            [Sequelize.col('incUserInfo.email'), 'email']
        ],
        include: [{
            model: dbUsers,
            as: "incUserInfo",
            where: {
                subscriptionType: 3,
                isRemoved: false,
                subscription: false,
                userUuid: userUuid
            },
            attributes: []
        }],
        where: {
            caseUuid: caseUuid,
            status: true,
            isActivated: true,
        },
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

const decryptionArray = (array = []) => {
    const arr = [];
    array.forEach(resp => {
        resp = decryptionObject(resp);
        arr.push(resp);
    })
    return arr;
}

const decryptionObject = (obj) => {
    if (obj.caseTypeTitle) {
        obj.caseTypeTitle = Encryption.decryptSensitiveData(obj.caseTypeTitle);
    }
    if (obj.title) {
        obj.title = Encryption.decryptSensitiveData(obj.title);
    }
    if (obj.description) {
        obj.description = Encryption.decryptSensitiveData(obj.description);
    }
    if (obj.response) {
        obj.response = Encryption.decryptSensitiveData(obj.response);
    }
    if (obj.userQuery) {
        obj.userQuery = Encryption.decryptSensitiveData(obj.userQuery);
    }
    if (obj.filePath) {
        obj.filePath = Encryption.decryptSensitiveData(obj.filePath);
    }
    if (obj.insuredDefendantAB) {
        obj.insuredDefendantAB = Encryption.decryptSensitiveData(obj.insuredDefendantAB);
    }
    if (obj.summaryName) {
        obj.summaryName = Encryption.decryptSensitiveData(obj.summaryName)
    }
    if (obj.applicantiffFirstName) {
        obj.applicantiffFirstName = Encryption.decryptSensitiveData(obj.applicantiffFirstName)
    }
    if (obj.applicantiffLastName) {
        obj.applicantiffLastName = Encryption.decryptSensitiveData(obj.applicantiffLastName)
    }
    if (obj.caseName) {
        obj.caseName = Encryption.decryptSensitiveData(obj.caseName)
    }
    if (obj.fileName) {
        obj.fileName = Encryption.decryptSensitiveData(obj.fileName)
    }
    if (obj.plaintiffFirstName) {
        obj.plaintiffFirstName = Encryption.decryptSensitiveData(obj.plaintiffFirstName);
    }
    if (obj.plaintiffLastName) {
        obj.plaintiffLastName = Encryption.decryptSensitiveData(obj.plaintiffLastName);
    }
    if (obj.insuredDefendant) {
        obj.insuredDefendant = Encryption.decryptSensitiveData(obj.insuredDefendant);
    }
    if (obj.primaryAttorneyEmail) {
        obj.primaryAttorneyEmail = Encryption.decryptSensitiveData(obj.primaryAttorneyEmail);
    }
    if (obj.additionalEmails) {
        obj.additionalEmails = Encryption.decryptSensitiveData(obj.additionalEmails);
    }
    if (obj.reviewers) {
        obj.reviewers = Encryption.decryptSensitiveData(obj.reviewers);
    }
    if (obj.folderPath) {
        obj.folderPath = Encryption.decryptSensitiveData(obj.folderPath);
    }
    if (obj.email) {
        obj.email = Encryption.decryptSensitiveData(obj.email);
    }
    return obj;
}

Queries.getIncCaseTypes = async () => {
    return await dbTypes.findAll({
        attributes: attributes_10,
        where: {
            isActivated: true
        },
        order: [
            ['id', 'ASC'],
        ],
        raw: true
    });
}

Queries.getIncCaseTypesByUuid = async (requestUuid) => {
    return await dbTypes.findAll({
        attributes: attributes_11,
        where: {
            isActivated: true,
            requestUuid: requestUuid
        },
        raw: true
    });
}

Queries.getIncCaseTypesAll = async () => {
    return await dbTypes.findAll({
        attributes: attributes_12,
        where: {
            isActivated: true
        },
        raw: true
    });
}

Queries.getReportByRequestUuid = async (requestUuid, userId) => {
    return await dbReports.findAll({
        attributes: attributes_2,
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: true,
            isActivated: true,
        },
        raw: true
    });
}

Queries.deActivateReport = async (obj, requestUuid, userId) => {
    return await dbReports.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: true,
            isActivated: true
        }
    });
}

Queries.renameFolderByFileUuid = async (obj, fileUuid, userId) => {
    return await dbFiles.update(obj, {
        where: {
            fileUuid: fileUuid,
            userId: userId,
            status: true,
        }
    });
}

Queries.getReportByUserId = async (caseUuid, userId) => {
    let data = await dbReports.findAll({
        attributes: attributes_18,
        include: [
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    caseUuid: caseUuid,
                    ...getCaseAccessConditionReport(userId),
                    status: true,
                    isActivated: true,
                },
                attributes: [],
            }
        ],
        where: {
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        order: [['createdAt', 'DESC']],
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.findReportSummary = async (requestUuid, userId, range, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    let data = await dbReports.findAndCountAll({
        subQuery: false,
        attributes: [
            ...attributes_13,
            [Sequelize.col('incCaseSummaryReportsMapping.record_uuid'), 'record_uuid'],
            [Sequelize.col('incCaseSummaryReportsMapping.date'), 'date'],
            [Sequelize.col('incCaseSummaryReportsMapping.summary'), 'summary'],
            [Sequelize.col('incCaseSummaryReportsMapping.reference'), 'reference'],
            [Sequelize.col('incCaseSummaryReportsMapping.section'), 'section'],
            [Sequelize.col('incCaseSummaryReportsMapping.fileType'), 'fileType'],
            [Sequelize.col('incCaseSummaryReportsMapping.pages'), 'pages'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_flag'), 'duplicate_flag'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_info'), 'duplicate_info'],
            [Sequelize.col('incCaseSummaryReportsMapping.insurer_decision'), 'insurer_decision'],

            //fields for the Case
            [Sequelize.col('incCaseReportsInfo.caseName'), 'caseName'],
            [Sequelize.col('incCaseReportsInfo.caseUuid'), 'caseUuid'],

            //fields for the tort
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.dateOfLoss'), 'dateOfLoss'],


            //fields for the AB
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],

            //fields for the caseTypes
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.id'), 'caseTypeId']
        ],
        include: [
            {
                model: dbCaseReportSummary,
                as: "incCaseSummaryReportsMapping",
                where: {
                    isActivated: true,
                    fileType: range,
                    [Op.and]: [
                        ...(date ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')) = '${date}'
            `)
                        ] : []),

                        ...(startDate && endDate ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s'))
                BETWEEN '${startDate}' AND '${endDate}'
            `)
                        ] : []),

                        ...(preDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') < '${preDOL}'
            `)
                        ] : []),

                        ...(postDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') >= '${postDOL}'
            `)
                        ] : []),

                        ...(fileName ? [
                            Sequelize.where(
                                Sequelize.literal(`
                                    TRIM(
                                        CASE
                                            WHEN incCaseSummaryReportsMapping.reference LIKE '%,%'
                                            THEN LEFT(
                                                incCaseSummaryReportsMapping.reference,
                                                LENGTH(incCaseSummaryReportsMapping.reference)
                                                - LENGTH(SUBSTRING_INDEX(REVERSE(incCaseSummaryReportsMapping.reference), ',', 1)) - 1
                                            )
                                            ELSE incCaseSummaryReportsMapping.reference
                                        END
                                    )
                                `),
                                fileName
                            )
                        ] : []),

                        ...(fileType && fileType.length > 0 ? [
                            Sequelize.where(
                                Sequelize.col('incCaseSummaryReportsMapping.section'),
                                { [Op.in]: fileType }
                            )
                        ] : []),

                        ...(duplicate === 'true' ? [
                            Sequelize.literal(`
                                incCaseSummaryReportsMapping.duplicate_flag = 'duplicate'
                                AND CAST(
                                    JSON_UNQUOTE(JSON_EXTRACT(incCaseSummaryReportsMapping.duplicate_info, '$.similarity'))
                                    AS DECIMAL(10,5)
                                ) >= 0.8
                                `)
                        ] : []),

                        ...(duplicate === 'false' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'unique'`)
                        ] : []),

                        ...(insurerDecision ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.insurer_decision = '${insurerDecision}'`)
                        ] : []),
                    ]
                },

                attributes: []
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        order: [
            [
                Sequelize.literal(`
                    CASE 
                        WHEN incCaseSummaryReportsMapping.date = 'Unknown' OR incCaseSummaryReportsMapping.date IS NULL 
                        THEN 1 
                        ELSE 0 
                    END
                `),
                'ASC'
            ],
            [
                Sequelize.literal(`STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')`),
                'ASC'
            ]
        ],
        limit,
        offset,
        // logging: console.log,
        raw: true
    });
    const count = data.count;
    data = decryptionArray(data.rows);
    return [data, count];
};

Queries.findReportSummaryOCF = async (requestUuid, userId, range, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    let data = await dbReports.findAndCountAll({
        subQuery: false,
        attributes: [
            ...attributes_13,
            [Sequelize.col('incCaseSummaryReportsMapping.record_uuid'), 'record_uuid'],
            [Sequelize.col('incCaseSummaryReportsMapping.date'), 'date'],
            [Sequelize.col('incCaseSummaryReportsMapping.summary'), 'summary'],
            [Sequelize.col('incCaseSummaryReportsMapping.reference'), 'reference'],
            [Sequelize.col('incCaseSummaryReportsMapping.section'), 'section'],
            [Sequelize.col('incCaseSummaryReportsMapping.fileType'), 'fileType'],
            [Sequelize.col('incCaseSummaryReportsMapping.pages'), 'pages'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_flag'), 'duplicate_flag'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_info'), 'duplicate_info'],
            [Sequelize.col('incCaseSummaryReportsMapping.insurer_decision'), 'insurer_decision'],

            //fields for the Case
            [Sequelize.col('incCaseReportsInfo.caseName'), 'caseName'],
            [Sequelize.col('incCaseReportsInfo.caseUuid'), 'caseUuid'],

            //fields for the tort
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.dateOfLoss'), 'dateOfLoss'],


            //fields for the AB
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],

            //fields for the caseTypes
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.id'), 'caseTypeId']
        ],
        include: [
            {
                model: dbCaseReportSummary,
                as: "incCaseSummaryReportsMapping",
                where: {
                    isActivated: true,
                    fileType: range,
                    [Op.and]: [
                        ...(date ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')) = '${date}'
            `)
                        ] : []),

                        ...(startDate && endDate ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s'))
                BETWEEN '${startDate}' AND '${endDate}'
            `)
                        ] : []),

                        ...(preDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') < '${preDOL}'
            `)
                        ] : []),

                        ...(postDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') >= '${postDOL}'
            `)
                        ] : []),

                        ...(fileName ? [
                            Sequelize.where(
                                Sequelize.literal(`
                                    TRIM(
                                        CASE
                                            WHEN incCaseSummaryReportsMapping.reference LIKE '%,%'
                                            THEN LEFT(
                                                incCaseSummaryReportsMapping.reference,
                                                LENGTH(incCaseSummaryReportsMapping.reference)
                                                - LENGTH(SUBSTRING_INDEX(REVERSE(incCaseSummaryReportsMapping.reference), ',', 1)) - 1
                                            )
                                            ELSE incCaseSummaryReportsMapping.reference
                                        END
                                    )
                                `),
                                fileName
                            )
                        ] : []),

                        ...(fileType ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.section = '${fileType}'`)
                        ] : []),

                        ...(duplicate === 'true' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'duplicate'`)
                        ] : []),

                        ...(duplicate === 'false' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'unique'`)
                        ] : []),

                        ...(insurerDecision ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.insurer_decision = '${insurerDecision}'`)
                        ] : []),
                    ]
                },

                attributes: []
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        order: [
            [
                Sequelize.literal(`
                    CASE 
                        WHEN incCaseSummaryReportsMapping.date = 'Unknown' OR incCaseSummaryReportsMapping.date IS NULL 
                        THEN 1 
                        ELSE 0 
                    END
                `),
                'ASC'
            ],
            [
                Sequelize.literal(`STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')`),
                'ASC'
            ]
        ],
        limit,
        offset,
        raw: true
    });
    const count = data.count;
    data = decryptionArray(data.rows);
    return [data, count];
};

Queries.findReportSummaryOCFSix = async (requestUuid, userId) => {
    let data = await dbReports.findAll({
        attributes: [
            ...attributes_13,
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.fileName'), 'fileName'],
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.filePath'), 'filePath'],
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.fileSummary'), 'fileSummary'],

            //fields for the Case
            [Sequelize.col('incCaseReportsInfo.caseName'), 'caseName'],

            //fields for the tort
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.dateOfLoss'), 'dateOfLoss'],


            //fields for the AB
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],

            //fields for the caseTypes
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.id'), 'caseTypeId']
        ],
        include: [
            {
                model: dbCaseReportsMapping,
                as: "incCaseSummaryReportsMappingDetails",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbFiles,
                        as: "incCaseFileReportsMappingInfo",
                        where: {
                            caseFileTypes: {
                                [Op.eq]: 8
                            },
                        },
                        attributes: [],
                    }
                ]
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                    // isProcessed: {
                    //     [Op.ne]: 2,
                    // },
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            userId: userId,
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            userId: userId,
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: true,
            isActivated: true,
            isProcessed: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
};

Queries.findReportSummaryIncome = async (requestUuid, userId, range, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    let data = await dbReports.findAndCountAll({
        subQuery: false,
        attributes: [
            ...attributes_13,
            [Sequelize.col('incCaseSummaryReportsMapping.record_uuid'), 'record_uuid'],
            [Sequelize.col('incCaseSummaryReportsMapping.date'), 'date'],
            [Sequelize.col('incCaseSummaryReportsMapping.summary'), 'summary'],
            [Sequelize.col('incCaseSummaryReportsMapping.reference'), 'reference'],
            [Sequelize.col('incCaseSummaryReportsMapping.section'), 'section'],
            [Sequelize.col('incCaseSummaryReportsMapping.fileType'), 'fileType'],
            [Sequelize.col('incCaseSummaryReportsMapping.pages'), 'pages'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_flag'), 'duplicate_flag'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_info'), 'duplicate_info'],
            [Sequelize.col('incCaseSummaryReportsMapping.insurer_decision'), 'insurer_decision'],

            //fields for the Case
            [Sequelize.col('incCaseReportsInfo.caseName'), 'caseName'],
            [Sequelize.col('incCaseReportsInfo.caseUuid'), 'caseUuid'],

            //fields for the tort
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.dateOfLoss'), 'dateOfLoss'],


            //fields for the AB
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],

            //fields for the caseTypes
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.id'), 'caseTypeId']
        ],
        include: [
            {
                model: dbCaseReportSummary,
                as: "incCaseSummaryReportsMapping",
                where: {
                    isActivated: true,
                    fileType: range,
                    [Op.and]: [
                        ...(date ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')) = '${date}'
            `)
                        ] : []),

                        ...(startDate && endDate ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s'))
                BETWEEN '${startDate}' AND '${endDate}'
            `)
                        ] : []),

                        ...(preDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') < '${preDOL}'
            `)
                        ] : []),

                        ...(postDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') >= '${postDOL}'
            `)
                        ] : []),

                        ...(fileName ? [
                            Sequelize.where(
                                Sequelize.literal(`
                                    TRIM(
                                        CASE
                                            WHEN incCaseSummaryReportsMapping.reference LIKE '%,%'
                                            THEN LEFT(
                                                incCaseSummaryReportsMapping.reference,
                                                LENGTH(incCaseSummaryReportsMapping.reference)
                                                - LENGTH(SUBSTRING_INDEX(REVERSE(incCaseSummaryReportsMapping.reference), ',', 1)) - 1
                                            )
                                            ELSE incCaseSummaryReportsMapping.reference
                                        END
                                    )
                                `),
                                fileName
                            )
                        ] : []),

                        ...(fileType ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.section = '${fileType}'`)
                        ] : []),

                        ...(duplicate === 'true' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'duplicate'`)
                        ] : []),

                        ...(duplicate === 'false' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'unique'`)
                        ] : []),

                        ...(insurerDecision ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.insurer_decision = '${insurerDecision}'`)
                        ] : []),
                    ]
                },

                attributes: []
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        order: [
            [
                Sequelize.literal(`
                    CASE 
                        WHEN incCaseSummaryReportsMapping.date = 'Unknown' OR incCaseSummaryReportsMapping.date IS NULL 
                        THEN 1 
                        ELSE 0 
                    END
                `),
                'ASC'
            ],
            [
                Sequelize.literal(`STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')`),
                'ASC'
            ]
        ],
        limit,
        offset,
        raw: true
    });
    const count = data.count;
    data = decryptionArray(data.rows);
    return [data, count];
};

Queries.findReportSummaryAB = async (requestUuid, userId, range, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    let data = await dbReports.findAndCountAll({
        subQuery: false,
        attributes: [
            ...attributes_13,
            [Sequelize.col('incCaseSummaryReportsMapping.record_uuid'), 'record_uuid'],
            [Sequelize.col('incCaseSummaryReportsMapping.date'), 'date'],
            [Sequelize.col('incCaseSummaryReportsMapping.summary'), 'summary'],
            [Sequelize.col('incCaseSummaryReportsMapping.reference'), 'reference'],
            [Sequelize.col('incCaseSummaryReportsMapping.section'), 'section'],
            [Sequelize.col('incCaseSummaryReportsMapping.fileType'), 'fileType'],
            [Sequelize.col('incCaseSummaryReportsMapping.pages'), 'pages'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_flag'), 'duplicate_flag'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_info'), 'duplicate_info'],
            [Sequelize.col('incCaseSummaryReportsMapping.insurer_decision'), 'insurer_decision'],

            //fields for the Case
            [Sequelize.col('incCaseReportsInfo.caseName'), 'caseName'],
            [Sequelize.col('incCaseReportsInfo.caseUuid'), 'caseUuid'],

            //fields for the tort
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.dateOfLoss'), 'dateOfLoss'],


            //fields for the AB
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],

            //fields for the caseTypes
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.id'), 'caseTypeId']
        ],
        include: [
            {
                model: dbCaseReportSummary,
                as: "incCaseSummaryReportsMapping",
                where: {
                    isActivated: true,
                    fileType: range,
                    [Op.and]: [
                        ...(date ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')) = '${date}'
            `)
                        ] : []),

                        ...(startDate && endDate ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s'))
                BETWEEN '${startDate}' AND '${endDate}'
            `)
                        ] : []),

                        ...(preDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') < '${preDOL}'
            `)
                        ] : []),

                        ...(postDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') >= '${postDOL}'
            `)
                        ] : []),

                        ...(fileName ? [
                            Sequelize.where(
                                Sequelize.literal(`
                                    TRIM(
                                        CASE
                                            WHEN incCaseSummaryReportsMapping.reference LIKE '%,%'
                                            THEN LEFT(
                                                incCaseSummaryReportsMapping.reference,
                                                LENGTH(incCaseSummaryReportsMapping.reference)
                                                - LENGTH(SUBSTRING_INDEX(REVERSE(incCaseSummaryReportsMapping.reference), ',', 1)) - 1
                                            )
                                            ELSE incCaseSummaryReportsMapping.reference
                                        END
                                    )
                                `),
                                fileName
                            )
                        ] : []),

                        ...(fileType ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.section = '${fileType}'`)
                        ] : []),

                        ...(duplicate === 'true' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'duplicate'`)
                        ] : []),

                        ...(duplicate === 'false' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'unique'`)
                        ] : []),

                        ...(insurerDecision ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.insurer_decision = '${insurerDecision}'`)
                        ] : []),
                    ]
                },

                attributes: []
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        order: [
            [
                Sequelize.literal(`
                    CASE 
                        WHEN incCaseSummaryReportsMapping.date = 'Unknown' OR incCaseSummaryReportsMapping.date IS NULL 
                        THEN 1 
                        ELSE 0 
                    END
                `),
                'ASC'
            ],
            [
                Sequelize.literal(`STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')`),
                'ASC'
            ]
        ],
        limit,
        offset,
        raw: true
    });
    const count = data.count;
    data = decryptionArray(data.rows);
    return [data, count];
};

Queries.findReportForEdit = async (requestUuid) => {
    return await dbCaseReportSummary.findAll({        
        attributes: ['requestUuid', 'summary', 'date'],
        include: [
            {
                model: db,
                as: "incCaseReportSummaryInfo",
                attributes: [],
            }
        ],
        where: {
            record_uuid: requestUuid,
            isActivated: true,
        },
        raw: true
    })
}

Queries.findReportSummaryIME = async (requestUuid, userId, range, limit, offset, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {
    let data = await dbReports.findAndCountAll({
        subQuery: false,
        attributes: [
            ...attributes_13,
            [Sequelize.col('incCaseSummaryReportsMapping.record_uuid'), 'record_uuid'],
            [Sequelize.col('incCaseSummaryReportsMapping.date'), 'date'],
            [Sequelize.col('incCaseSummaryReportsMapping.summary'), 'summary'],
            [Sequelize.col('incCaseSummaryReportsMapping.reference'), 'reference'],
            [Sequelize.col('incCaseSummaryReportsMapping.section'), 'section'],
            [Sequelize.col('incCaseSummaryReportsMapping.fileType'), 'fileType'],
            [Sequelize.col('incCaseSummaryReportsMapping.pages'), 'pages'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_flag'), 'duplicate_flag'],
            [Sequelize.col('incCaseSummaryReportsMapping.duplicate_info'), 'duplicate_info'],
            [Sequelize.col('incCaseSummaryReportsMapping.insurer_decision'), 'insurer_decision'],

            //fields for the Case
            [Sequelize.col('incCaseReportsInfo.caseName'), 'caseName'],
            [Sequelize.col('incCaseReportsInfo.caseUuid'), 'caseUuid'],

            //fields for the tort
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.dateOfLoss'), 'dateOfLoss'],


            //fields for the AB
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],

            //fields for the caseTypes
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.id'), 'caseTypeId']
        ],
        include: [
            {
                model: dbCaseReportSummary,
                as: "incCaseSummaryReportsMapping",
                where: {
                    isActivated: true,
                    fileType: range,
                    [Op.and]: [
                        ...(date ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')) = '${date}'
            `)
                        ] : []),

                        ...(startDate && endDate ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s'))
                BETWEEN '${startDate}' AND '${endDate}'
            `)
                        ] : []),

                        ...(preDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') < '${preDOL}'
            `)
                        ] : []),

                        ...(postDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') >= '${postDOL}'
            `)
                        ] : []),

                        ...(fileName ? [
                            Sequelize.where(
                                Sequelize.literal(`
                                    TRIM(
                                        CASE
                                            WHEN incCaseSummaryReportsMapping.reference LIKE '%,%'
                                            THEN LEFT(
                                                incCaseSummaryReportsMapping.reference,
                                                LENGTH(incCaseSummaryReportsMapping.reference)
                                                - LENGTH(SUBSTRING_INDEX(REVERSE(incCaseSummaryReportsMapping.reference), ',', 1)) - 1
                                            )
                                            ELSE incCaseSummaryReportsMapping.reference
                                        END
                                    )
                                `),
                                fileName
                            )
                        ] : []),

                        ...(fileType ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.section = '${fileType}'`)
                        ] : []),

                        ...(duplicate === 'true' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'duplicate'`)
                        ] : []),

                        ...(duplicate === 'false' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'unique'`)
                        ] : []),

                        ...(insurerDecision ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.insurer_decision = '${insurerDecision}'`)
                        ] : []),
                    ]
                },

                attributes: []
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        order: [
            [
                Sequelize.literal(`
                    CASE 
                        WHEN incCaseSummaryReportsMapping.date = 'Unknown' OR incCaseSummaryReportsMapping.date IS NULL 
                        THEN 1 
                        ELSE 0 
                    END
                `),
                'ASC'
            ],
            [
                Sequelize.literal(`STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')`),
                'ASC'
            ]
        ],
        limit,
        offset,
        raw: true
    });
    const count = data.count;
    data = decryptionArray(data.rows);
    return [data, count];
};


Queries.findReportSummaryLTD = async (requestUuid, userId) => {
    let data = await dbReports.findAll({
        attributes: [
            ...attributes_13,
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.fileName'), 'fileName'],
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.filePath'), 'filePath'],
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.fileSummary'), 'fileSummary'],

            //fields for the Case
            [Sequelize.col('incCaseReportsInfo.caseName'), 'caseName'],

            //fields for the tort
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdTortDetails.dateOfLoss'), 'dateOfLoss'],


            //fields for the AB
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseReportsInfo.incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],

            //fields for the caseTypes
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseReportsInfo.incCaseTypesInfo.id'), 'caseTypeId']
        ],
        include: [
            {
                model: dbCaseReportsMapping,
                as: "incCaseSummaryReportsMappingDetails",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbFiles,
                        as: "incCaseFileReportsMappingInfo",
                        where: {
                            caseFileTypes: {
                                [Op.eq]: 24
                            },
                        },
                        attributes: [],
                    }
                ]
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            userId: userId,
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            userId: userId,
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            userId: userId,
            status: true,
            isActivated: true,
            isProcessed: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
};

Queries.createMediationReport = async (obj) => {
    const result = await dbCaseMediationReport.create(obj,
        {
            returning: true
        });
    return [result.requestUuid];
}

Queries.createSummaryReport = async (obj) => {
    const result = await dbCaseSummaryReport.create(obj,
        {
            returning: true
        });
    return [result.requestUuid];
}

Queries.findThreadId = async (caseId, reportId, userId) => {
    return await dbCaseMediationReport.findOne({
        attributes: attributes_16,
        where: {
            threadId: {
                [Op.not]: null,
            },
            status: true,
            isActivated: true,
            userId: userId,
            incCaseId: caseId,
            reportId: reportId,
        },
        order: [['createdAt', 'DESC']],
        raw: true
    });
}

Queries.findThreadIdSettlement = async (caseId, reportId, userId) => {
    return await dbCaseSettlementReport.findOne({
        attributes: attributes_16,
        where: {
            threadId: {
                [Op.not]: null,
            },
            status: true,
            isActivated: true,
            userId: userId,
            incCaseId: caseId,
            reportId: reportId,
        },
        order: [['createdAt', 'DESC']],
        raw: true
    });
}

Queries.findMediationReport = async (messageId, threadId) => {
    return await dbCaseMediationReport.findAll({
        attributes: attributes_5,
        where: {
            threadId: threadId,
            messageId: messageId,
            status: false,
            isActivated: true
        },
        raw: true
    });
}

Queries.findSettlementReport = async (messageId, threadId) => {
    return await dbCaseSettlementReport.findAll({
        attributes: attributes_5,
        where: {
            threadId: threadId,
            messageId: messageId,
            status: false,
            isActivated: true
        },
        raw: true
    });
}

Queries.findInjuryTrackingReport = async (jobUuid) => {
    return await dbCaseInjuryTracking.findAll({
        attributes: attributes_20,
        where: {
            status: false,
            isActivated: true,
            jobUuid: jobUuid,
        },
        raw: true
    });
}

Queries.updateByIdSummaryReport = async (obj, id) => {
    return await dbCaseSummaryReport.update(obj, {
        where: {
            id: id
        }
    });
}

Queries.updateByMessageId = async (obj, messageId, threadId) => {
    return await dbCaseMediationReport.update(obj, {
        where: {
            messageId: messageId,
            threadId: threadId
        }
    });
}

Queries.updateByMessageIdSettlement = async (obj, messageId, threadId) => {
    return await dbCaseSettlementReport.update(obj, {
        where: {
            messageId: messageId,
            threadId: threadId
        }
    });
}

Queries.updateByJobIdInjuryTracking = async (obj, jobUuid) => {
    return await dbCaseInjuryTracking.update(obj, {
        where: {
            jobUuid: jobUuid
        }
    });
}

Queries.deleteMediationReport = async (obj, userId) => {
    return await dbCaseMediationReport.update(obj, {
        where: {
            userId: userId,
            isActivated: true
        }
    });
}

Queries.deleteSummaryReport = async (obj, requestUuid, reportType, userId) => {
    return await dbCaseSummaryReport.update(obj, {
        where: {
            requestUuid: requestUuid,
            reportType: reportType,
            userId: userId,
            isActivated: true
        }
    });
}

Queries.deleteSettlemnetReport = async (obj, requestUuid, userId) => {
    return await dbCaseSettlementReport.update(obj, {
        where: {
            requestUuid: requestUuid,
            userId: userId,
            isActivated: true
        }
    });
}

Queries.getData = async (reportUuid, userId) => {
    return await dbCaseMediationReport.findAll({
        attributes: attributes_15,
        where: {
            requestUuid: reportUuid,
            userId: userId
        },
        raw: true
    })
}

Queries.getSettlementData = async (reportUuid, userId) => {
    return await dbCaseSettlementReport.findAll({
        attributes: attributes_15,
        where: {
            requestUuid: reportUuid,
            userId: userId
        },
        raw: true
    })
}

Queries.getInjuryTracking = async (reportUuid, userId) => {
    return await dbCaseInjuryTracking.findAll({
        attributes: attributes_19,
        where: {
            requestUuid: reportUuid,
            userId: userId
        },
        raw: true
    })
}

Queries.updateInjuryTrackingByCaseId = async (obj, incCaseId, userId) => {
    return await dbCaseInjuryTracking.update(obj, {
        where: {
            incCaseId: incCaseId,
            userId: userId,
            status: true,
            isActivated: true
        },
        raw: true
    })
}

Queries.getSummaryReportData = async (reportUuid, userId) => {
    return await dbCaseSummaryReport.findAll({
        attributes: attributes_15,
        where: {
            requestUuid: reportUuid,
            userId: userId
        },
        raw: true
    })
}

Queries.getDataOnComplete = async (caseUuid, userId) => {
    let data = await dbCaseMediationReport.findAll({
        attributes: attributes_21,
        include: [
            {
                model: db,
                as: "incCaseMediationReportsInfo",
                where: {
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            status: true,
            isActivated: true,
            userId: userId
        },
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getDataOnCompleteForGroup = async (caseUuid, userId, groupUsers) => {
    let data = await dbCaseMediationReport.findAll({
        attributes: attributes_21,
        include: [
            {
                model: db,
                as: "incCaseMediationReportsInfo",
                where: {
                    userId: groupUsers,
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            status: true,
            isActivated: true,
            userId: userId
        },
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getSummaryDataOnComplete = async (caseUuid, reportType, userId) => {
    let data = await dbCaseSummaryReport.findAll({
        attributes: attributes_15,
        include: [
            {
                model: db,
                as: "incCaseSummaryReportsInfo",
                where: {
                    // userId: userId,
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            reportType: reportType,
            status: true,
            isActivated: true,
            userId: userId
        },
        limit: 1,
        order: [['id', 'DESC']],
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getSummaryDataOnCompleteForGroup = async (caseUuid, reportType, userId, groupUsers) => {
    let data = await dbCaseSummaryReport.findAll({
        attributes: attributes_15,
        include: [
            {
                model: db,
                as: "incCaseSummaryReportsInfo",
                where: {
                    userId: groupUsers,
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            reportType: reportType,
            status: true,
            isActivated: true,
            userId: userId
        },
        limit: 1,
        order: [['id', 'DESC']],
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getSettlementDataOnComplete = async (caseUuid, userId) => {
    let data = await dbCaseSettlementReport.findAll({
        attributes: attributes_15,
        include: [
            {
                model: db,
                as: "incCaseSettlementReportsInfo",
                where: {
                    userId: userId,
                    caseUuid: caseUuid
                },
                attributes: [],
            }],
        where: {
            status: true,
            isActivated: true,
            userId: userId
        },
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getInjuryTrackingOnComplete = async (caseUuid, userId) => {
    return await dbCaseInjuryTracking.findAll({
        attributes: attributes_19,
        include: [
            {
                model: db,
                as: "incCaseIdInjuryTrackingInfo",
                where: {
                    userId: userId,
                    caseUuid: caseUuid
                },
                attributes: [],
            }],
        where: {
            status: true,
            isActivated: true,
            userId: userId
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    })
}

Queries.getInjuryTrackingOnCompleteForGroup = async (caseUuid, userId, groupUsers) => {
    return await dbCaseInjuryTracking.findAll({
        attributes: attributes_19,
        include: [
            {
                model: db,
                as: "incCaseIdInjuryTrackingInfo",
                where: {
                    userId: groupUsers,
                    caseUuid: caseUuid
                },
                attributes: [],
            }],
        where: {
            status: true,
            isActivated: true,
            userId: groupUsers
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    })
}

Queries.getSummaryDataOnCompleteAndPending = async (caseUuid, reportType, userId) => {
    let data = await dbCaseSummaryReport.findAll({
        attributes: attributes_15,
        include: [
            {
                model: db,
                as: "incCaseSummaryReportsInfo",
                where: {
                    // userId: userId,
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            reportType: reportType,
            isActivated: true,
            userId: userId
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getSummaryDataOnCompleteAndPendingForGroup = async (caseUuid, reportType, userId, groupUsers) => {
    let data = await dbCaseSummaryReport.findAll({
        attributes: attributes_15,
        include: [
            {
                model: db,
                as: "incCaseSummaryReportsInfo",
                where: {
                    userId: groupUsers,
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            reportType: reportType,
            isActivated: true,
            userId: userId
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getInjuryDataOnCompleteAndPending = async (caseUuid, userId) => {
    let data = await dbCaseInjuryTracking.findAll({
        attributes: attributes_19,
        include: [
            {
                model: db,
                as: "incCaseIdInjuryTrackingInfo",
                where: {
                    userId: userId,
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            isActivated: true,
            userId: userId
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getInjuryDataOnCompleteAndPendingForGroup = async (caseUuid, userId, groupUsers) => {
    let data = await dbCaseInjuryTracking.findAll({
        attributes: attributes_19,
        include: [
            {
                model: db,
                as: "incCaseIdInjuryTrackingInfo",
                where: {
                    userId: groupUsers,
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            isActivated: true,
            userId: groupUsers
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getReportLatestByUserId = async (userId) => {
    return await dbReports.findOne({
        attributes: attributes_14,
        where: {
            userId: userId,
            status: true,
            isActivated: true,
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
}

Queries.getReportLatestByCaseuuid = async (caseUuid, userId) => {
    return await dbReports.findOne({
        attributes: attributes_14,
        include: [
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    ...getCaseAccessConditionReport(userId),
                    caseUuid: caseUuid,
                },
                attributes: [],
            }
        ],
        where: {
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
}

Queries.getReportLatestSummaryByCaseuuid = async (caseUuid, reportType, userId) => {
    return await dbReports.findOne({
        attributes: attributes_14,
        include: [
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    ...getCaseAccessConditionReport(userId),
                    caseUuid: caseUuid,
                },
                attributes: [],
            },
            {
                model: dbCaseSummaryReport,
                as: "incCaseSummaryDetails",
                attributes: ['requestUuid', 'reportType'],
                required: false,
                where: {
                    status: false,
                    isActivated: true,
                    reportType: reportType
                },
            }
        ],
        where: {
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
}

Queries.getFileStatusSendReportById = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: [
            ...attributes_3,
            [Sequelize.col('incCaseIdDetails.id'), 'fileId'],
            [Sequelize.col('incCaseIdDetails.fileUuid'), 'fileUuid'],
            [Sequelize.col('incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incCaseIdDetails.isCombined'), 'isCombined'],
            [Sequelize.col('incCaseIdDetails.reviewers'), 'reviewers'],
            [Sequelize.col('incCaseIdDetails.caseFileTypes'), 'caseFileTypes'],

            //fields for the tort
            [Sequelize.col('incCaseIdTortDetails.plaintiffFirstName'), 'plaintiffFirstName'],
            [Sequelize.col('incCaseIdTortDetails.plaintiffLastName'), 'plaintiffLastName'],
            [Sequelize.col('incCaseIdTortDetails.plaintiffDOB'), 'plaintiffDOB'],
            [Sequelize.col('incCaseIdTortDetails.dateOfLoss'), 'dateOfLossTort'],
            [Sequelize.col('incCaseIdTortDetails.insuredDefendant'), 'insuredDefendant'],
            [Sequelize.col('incCaseIdTortDetails.liabilityDispute'), 'liabilityDispute'],
            [Sequelize.col('incCaseIdTortDetails.incomeLoss'), 'incomeLoss'],
            [Sequelize.col('incCaseIdTortDetails.housekeepingRequired'), 'housekeepingRequired'],
            [Sequelize.col('incCaseIdTortDetails.futureCareNeeded'), 'futureCareNeeded'],
            [Sequelize.col('incCaseIdTortDetails.outOfPocketExpenses'), 'outOfPocketExpenses'],
            [Sequelize.col('incCaseIdTortDetails.previousAccident'), 'previousAccident'],
            [Sequelize.col('incCaseIdTortDetails.previousAccidentDate'), 'previousAccidentDate'],
            [Sequelize.col('incCaseIdTortDetails.subsequentAccident'), 'subsequentAccident'],
            [Sequelize.col('incCaseIdTortDetails.subsequentAccidentDate'), 'subsequentAccidentDate'],

            //fields for the caseTypes
            [Sequelize.col('incCaseTypesInfo.label'), 'caseType'],
            [Sequelize.col('incCaseTypesInfo.key'), 'caseKey'],
            [Sequelize.col('incCaseTypesInfo.requestUuid'), 'caseTypeUuid'],
            [Sequelize.col('incCaseTypesInfo.id'), 'caseTypeId'],

            //fields for the AB MATTER
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffFirstName'), 'applicantiffFirstName'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffLastName'), 'applicantiffLastName'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffDOB'), 'applicantiffDOB'],
            [Sequelize.col('incCaseIdABMatterDetails.insuredDefendantAB'), 'insuredDefendantAB'],
            [Sequelize.col('incCaseIdABMatterDetails.dateOfLossAB'), 'dateOfLossAB'],
            [Sequelize.col('incCaseIdABMatterDetails.applicantiffInMIG'), 'applicantiffInMIG'],
            [Sequelize.col('incCaseIdABMatterDetails.disputingCAT'), 'disputingCAT'],
            [Sequelize.col('incCaseIdABMatterDetails.summaryOfOCF18'), 'summaryOfOCF18'],
            [Sequelize.col('incCaseIdABMatterDetails.summaryOfOCF6'), 'summaryOfOCF6'],
            [Sequelize.col('incCaseIdABMatterDetails.attendantCareDispute'), 'attendantCareDispute'],
            [Sequelize.col('incCaseIdABMatterDetails.specifiedBenefitsDispute'), 'specifiedBenefitsDispute'],
        ],
        include: [
            {
                model: dbFiles,
                as: "incCaseIdDetails",
                where: {
                    userId: userId,
                    // isProcessed: {
                    //     [Op.ne]: 2, // ask sharyar //done
                    // },
                    status: true,
                    isActivated: true,
                },
                attributes: [],
            },
            {
                model: dbTypeTortMatter,
                as: "incCaseIdTortDetails",
                where: {
                    userId: userId,
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypeABMatter,
                as: "incCaseIdABMatterDetails",
                where: {
                    userId: userId,
                    status: true,
                    isActivated: true,
                },
                attributes: [],
                required: false
            },
            {
                model: dbTypes,
                as: "incCaseTypesInfo",
                where: {
                    isActivated: true,
                },
                attributes: []
            },
        ],
        where: {
            userId: userId,
            id: caseUuid,
            status: true,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}


Queries.findFileRelatedToSummary = async (requestUuid, userId) => {
    let data = await dbReports.findAll({
        attributes: [
            // ...attributes_13,
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.fileName'), 'fileName'],
            [Sequelize.col('incCaseSummaryReportsMappingDetails.incCaseFileReportsMappingInfo.fileUuid'), 'fileUuid'],

        ],
        include: [
            {
                model: dbCaseReportsMapping,
                as: "incCaseSummaryReportsMappingDetails",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbFiles,
                        as: "incCaseFileReportsMappingInfo",
                        attributes: [],
                    }
                ]
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
            }
        ],
        where: {
            requestUuid: requestUuid,
            // userId: userId,
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
};

Queries.findSummaryReport = async (jobUuid) => {
    return await dbCaseSummaryReport.findAll({
        attributes: attributes_17,
        where: {
            jobUuid: jobUuid,
            status: false,
            isActivated: true
        },
        raw: true
    });
}

Queries.emailReport = async () => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    let data = await dbUsers.findAll({
        attributes: [
            'userId',
            'email',
            [Sequelize.col('incUserDetails.caseName'), 'caseName'],
            [Sequelize.col('incUserDetails.caseUuid'), 'caseUuid'],
            [Sequelize.col('incUserDetails.incCaseIdDetails.fileName'), 'fileName'],
            [Sequelize.col('incUserDetails.incCaseIdDetails.pageCount'), 'pageCount'],
            [Sequelize.col('incUserDetails.incCaseIdDetails.isProcessed'), 'isProcessed']
        ],
        where: {
            isRemoved: false,
            subscriptionType: 3
            //   ,
            // userId: 335
        },
        order: [
            ['createdAt', 'DESC'],
        ],
        include: [
            {
                model: db,
                as: 'incUserDetails',
                required: false,
                where: {
                    createdAt: {
                        [Op.between]: [startOfMonth, endOfMonth]
                    }
                },
                attributes: [],
                include: [
                    {
                        model: dbFiles,
                        required: false,
                        as: 'incCaseIdDetails',
                        attributes: []
                    }
                ]
            }
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
};

Queries.findDownloadManagerStatus = async (caseUuid, requestUuid, userId) => {
    let data = await dbCaseReportSummaryDownloadManager.findAll({
        attributes: [
            ...attributes_22,
            [Sequelize.col('incCaseReportSummaryDownloadInfo.caseName'), 'caseName'],
            [Sequelize.col('incCaseReportSummaryDownloadInfo.caseUuid'), 'caseUuid']
        ],
        include: [{
            model: db,
            as: "incCaseReportSummaryDownloadInfo",
            where: {
                caseUuid: caseUuid,
                status: true,
                isActivated: true
            },
            attributes: []
        }],
        where: {
            requestUuid: requestUuid,
            userId: userId,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getDownloadManagerStatus = async (caseUuid, jobUuid) => {
    let data = await dbCaseReportSummaryDownloadManager.findAll({
        attributes: [
            ...attributes_22,
            [Sequelize.col('incCaseReportSummaryDownloadInfo.caseName'), 'caseName'],
            [Sequelize.col('incCaseReportSummaryDownloadInfo.caseUuid'), 'caseUuid']
        ],
        include: [{
            model: db,
            as: "incCaseReportSummaryDownloadInfo",
            where: {
                caseUuid: caseUuid,
                status: true,
                isActivated: true
            },
            attributes: []
        }],
        where: {
            jobUuid: jobUuid,
            status: false,
            isActivated: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.updateDownloadManagerStatus = async (obj, jobUuid) => {
    return await dbCaseReportSummaryDownloadManager.update(obj, {
        where: {
            jobUuid: jobUuid,
            isActivated: true
        }
    });
}

Queries.getSaveResponses = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: [
            [Sequelize.col('incCaseSaveResponseDetails.requestUuid'), 'requestUuid'],
            [Sequelize.col('incCaseSaveResponseDetails.title'), 'title'],
            [Sequelize.col('incCaseSaveResponseDetails.description'), 'description']
        ],
        include: [
            {
                model: dbCaseResponses,
                as: "incCaseSaveResponseDetails",
                where: {
                    status: true,
                    userId: userId
                },
                attributes: [],
            }],
        where: {
            caseUuid: caseUuid,
            isActivated: true,
            status: true,
            // userId: userId
        },
        order: [['createdAt', 'DESC']],
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getCaseDetailsFlatter = async (caseUuid, jobUuid) => {
    const sql = `      
    SELECT 
    t1.id,
    t1.userId,
    t1.caseName,
    t1.caseUuid,
    t1.primaryAttorneyEmail,
    t1.additionalEmails,
    t2.fileUuid AS fileUuid,
    t2.fileName AS fileName,
    t3.requestUuid AS requestUuid,
    t3.id AS reportId,
    t3.jobUuid AS jobUuid,
    t3.isProcessed AS isProcessed 
    FROM
    inc_case_names t1 
    INNER JOIN inc_case_files t2 
        ON t1.id = t2.incCaseId 
    INNER JOIN inc_case_reports t3 
        ON t1.id = t3.incCaseId 
        AND t3.jobUuid = '${jobUuid}'
    WHERE t1.caseUuid = '${caseUuid}'
    AND t1.status = 1 
    AND t1.isActivated = 1 
    ORDER BY t2.id ASC;
    `;
    let data = await db.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getReportSections = async (caseUuid, reportType, userId) => {
    return await dbCaseReportSection.findAll({
        attributes: attributes_23,
        include: [
            {
                model: db,
                as: "incCaseSectionInfo",
                where: {
                    userId: userId,
                    // caseUuid: caseUuid,
                    status: true
                },
                attributes: [],
            }],
        where: {
            reportType: reportType,
            status: true,
            isActivated: true,
            userId: userId
        },
        order: [['id', 'DESC']],
        raw: true
    })
}

Queries.getSavePrompt = async (caseUuid, userId) => {
    let data = await dbCaseSavedPrompt.findAll({
        attributes: [
            ...attributes_24,
            [Sequelize.col('promptTypeInfo.title'), 'promptCategory']
        ],
        include: [
            {
                model: db,
                as: "incCaseSavePromptsInfo",
                where: {
                    userId: userId,
                    caseUuid: caseUuid,
                    status: true
                },
                attributes: [],
            },
            {
                model: dbCaseSavedPromptTypes,
                as: "promptTypeInfo",
                where: {
                    status: true
                },
                attributes: [],
            }
        ],
        where: {
            status: true,
            userId: userId
        },
        order: [['id', 'DESC']],
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getPromptTypes = async (isGroup) => {
    return await dbCaseSavedPromptTypes.findAll({
        attributes: attributes_27,
        where: {
            status: true,
              isGroup: {
                [Op.in]: isGroup == true ? ['1', '0'] : ['0']
            },
        },
        order: [['id', 'ASC']],
        raw: true
    })
}

Queries.getSavePromptForGroup = async (userId) => {
    let data = await dbCaseSavedPrompt.findAll({
        attributes: [
            ...attributes_24,
            [Sequelize.col('promptTypeInfo.title'), 'promptCategory'],
            [Sequelize.col('promptTypeInfo.id'), 'promptTypeId']
        ],
        include: [
            {
                model: db,
                as: "incCaseSavePromptsInfo",
                where: {
                    userId: userId,
                    status: true
                },
                attributes: [],
            },
            {
                model: dbCaseSavedPromptTypes,
                as: "promptTypeInfo",
                where: {
                    status: true
                },
                attributes: [],
            }
        ],
        where: {
            status: true,
            userId: userId
        },
        order: [['id', 'DESC']],
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.getIncSections = async (caseUuid, requestUuid, userId) => {
    return await dbCaseReportSection.findAll({
        attributes: attributes_23,
        include: [
            {
                model: db,
                as: "incCaseSectionInfo",
                where: {
                    userId: userId,
                    // caseUuid: caseUuid
                },
                attributes: [],
            }],
        where: {
            requestUuid: requestUuid,
            status: true,
            isActivated: true,
            userId: userId
        },
        raw: true
    })
}

Queries.findSavedPrompt = async (caseUuid, requestUuid, userId) => {
    return await dbCaseSavedPrompt.findAll({
        attributes: attributes_24,
        // include: [
        //     {
        //         model: db,
        //         as: "incCaseSavePromptsInfo",
        //         where: {
        //             userId: userId,
        //             caseUuid: caseUuid
        //         },
        //         attributes: [],
        //     }],
        where: {
            requestUuid: requestUuid,
            status: true,
            // userId: userId
        },
        raw: true
    })
}

Queries.deleteSection = async (obj, requestUuid) => {
    return await dbCaseReportSection.update(obj, {
        where: {
            requestUuid: requestUuid,
            isActivated: true
        }
    });
}

Queries.deletePrompt = async (obj, requestUuid) => {
    return await dbCaseSavedPrompt.update(obj, {
        where: {
            requestUuid: requestUuid,
            status: true
        }
    });
}

Queries.deleteSavedResponses = async (obj, requestUuid) => {
    return await dbCaseResponses.update(obj, {
        where: {
            requestUuid: requestUuid,
            status: true
        }
    });
}

Queries.updateSection = async (obj, requestUuid, userId) => {
    return await dbCaseReportSection.update(obj, {
        where: {
            requestUuid: requestUuid,
            // userId: userId,
            status: true,
            isActivated: true
        }
    });
}

Queries.updatePrompt = async (obj, requestUuid) => {
    return await dbCaseSavedPrompt.update(obj, {
        where: {
            requestUuid: requestUuid,
            status: true,
        }
    });
}

Queries.findRecordForSummary = async (caseUuid, recordUuid, userId) => {
    return await dbCaseReportSummary.findAll({
        attributes: ['requestUuid'],
        include: [
            {
                model: db,
                as: "incCaseReportSummaryInfo",
                where: {
                    userId: userId,
                    caseUuid: caseUuid,
                    isActivated: true,
                    status: true
                },
                attributes: [],
            }
        ],
        where: {
            record_uuid: recordUuid,
            isActivated: true,
            userId: userId
        },
        raw: true
    })
}

Queries.deleteRecordSummaryReport = async (obj, recordUuid) => {
    return await dbCaseReportSummary.update(obj, {
        where: {
            record_uuid: recordUuid,
            isActivated: true
        }
    });
}

Queries.recordSkipper = async (caseUuid, userId) => {
    return await dbCaseReportSummary.findAll({
        attributes: ['record_uuid'],
        include: [
            {
                model: db,
                as: "incCaseReportSummaryInfo",
                where: {
                    userId: userId,
                    caseUuid: caseUuid,
                    isActivated: true,
                    status: true
                },
                attributes: [],
            }
        ],
        where: {
            isActivated: false,
            userId: userId
        },
        raw: true
    })
}

Queries.getSection = async (caseUuid, selectedSections, reportType, userId) => {
    return await db.findAll({
        attributes: [
            [Sequelize.col('incCaseSectionDetails.requestUuid'), 'requestUuid'],
            [Sequelize.col('incCaseSectionDetails.title'), 'title'],
            [Sequelize.col('incCaseSectionDetails.description'), 'description']
        ],
        include: [
            {
                model: dbCaseReportSection,
                as: "incCaseSectionDetails",
                where: {
                    requestUuid: selectedSections,
                    status: true,
                    isActivated: true,
                    reportType: reportType
                },
                attributes: [],
            }],
        where: {
            // caseUuid: caseUuid,
            isActivated: true,
            status: true,
            ...getCaseMediationReports(userId)
        },
        raw: true
    })
}


Queries.findFilter = async (requestUuid, userId, range, groupType) => {
    return await dbReports.findAll({
        attributes: [
            ...(groupType.includes('section') ? [[Sequelize.col('incCaseSummaryReportsMapping.section'), 'section']] : []),
            ...(groupType.includes('reference') ? [[Sequelize.col('incCaseSummaryReportsMapping.reference'), 'reference']] : []),
        ],
        include: [
            {
                model: dbCaseReportSummary,
                as: "incCaseSummaryReportsMapping",
                where: {
                    isActivated: true,
                    fileType: range
                },
                attributes: []
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        group: [
            ...(groupType.includes('section')
                ? [Sequelize.col('incCaseSummaryReportsMapping.section')]
                : []),
            ...(groupType.includes('reference')
                ? [Sequelize.col('incCaseSummaryReportsMapping.reference')]
                : []),
        ],
        raw: true 
    });
};

Queries.findShare = async (userId) => {
    return await dbCaseShares.findAll({
        attributes: ['incCaseId', 'sharedByUserId'],
        include: [
            {
                model: db,
                as: "incCaseSharesInfo",
                where: {
                    isActivated: true,
                    status: true
                },
                attributes: [],
            }
        ],
        where: {
            isActivated: true,
            sharedWithuserId: userId
        },
        raw: true
    })
}

const getCaseAccessCondition = (userId) => {
    userId = Array.isArray(userId) ? userId : [userId];
    return {
        [Sequelize.Op.or]: [
            { userId },
            Sequelize.literal(`
            EXISTS (
                SELECT 1 
                FROM inc_case_shares s 
                WHERE s.incCaseId = inc_case_names.id
                AND inc_case_names.isActivated = true
                AND inc_case_names.status = true
                AND s.sharedWithUserId IN (${userId.join(',')})
                AND s.isActivated = true
            )
        `)
        ]
    }
};

const getCaseAccessConditionReport = (userId) => {
    userId = Array.isArray(userId) ? userId : [userId];
    return {
        [Sequelize.Op.or]: [
            { userId },
            Sequelize.literal(`
            EXISTS (
                SELECT 1 
                FROM inc_case_shares s 
                WHERE s.incCaseId = incCaseReportsInfo.id
                AND incCaseReportsInfo.isActivated = true
                AND incCaseReportsInfo.status = true
                AND s.sharedWithUserId IN (${userId.join(',')})
                AND s.isActivated = true
            )
        `)
        ]
    }
};

const getCaseMediationReports = (userId) => {
    userId = Array.isArray(userId) ? userId : [userId];
    return {
        [Sequelize.Op.or]: [
            { userId },
            Sequelize.literal(`
            EXISTS (
                SELECT 1 
                FROM inc_case_shares s 
                WHERE s.incCaseId = incCaseSectionDetails.id
                AND incCaseSectionDetails.isActivated = true
                AND incCaseSectionDetails.status = true
                AND s.sharedWithUserId IN (${userId.join(',')})
                AND s.isActivated = true
            )
        `)
        ]
    }
};

Queries.getShare = async (caseUuid, userId) => {
    let data = await db.findAll({
        attributes: ['caseUuid',
            [Sequelize.col('incCaseSharesDetails.requestUuid'), 'requestUuid'],
            [Sequelize.col('incCaseSharesDetails.incSharedWithInfo.email'), 'email'],
        ],
        include: [
            {
                model: dbCaseShares,
                as: "incCaseSharesDetails",
                where: {
                    isActivated: true,
                    sharedByUserId: userId
                },
                attributes: [],
                include: [
                    {
                        model: dbUsers,
                        as: "incSharedWithInfo",
                        where: {
                            isRemoved: false,
                        },
                        attributes: [],
                    }
                ],
            }
        ],
        where: {
            status: true,
            userId: userId,
            caseUuid: caseUuid
        },
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.shareCaseCount = async (incCaseId, userId) => {
    return await dbCaseShares.count({ 
        raw: true,
        where: {
            isActivated: true,
            sharedByUserId: userId,
            incCaseId: incCaseId
        }
    });
} 

Queries.getRevokeCase = async (caseUuid, requestUuid, userId) => {
    let data = await db.findAll({
        attributes: ['caseUuid',
            [Sequelize.col('incCaseSharesDetails.requestUuid'), 'requestUuid'],
            [Sequelize.col('incCaseSharesDetails.incSharedWithInfo.email'), 'email'],
        ],
        include: [
            {
                model: dbCaseShares,
                as: "incCaseSharesDetails",
                where: {
                    isActivated: true,
                    sharedByUserId: userId,
                    requestUuid: requestUuid
                },
                attributes: [],
                include: [
                    {
                        model: dbUsers,
                        as: "incSharedWithInfo",
                        where: {
                            isRemoved: false,
                        },
                        attributes: [],
                    }
                ],
            }
        ],
        where: {
            status: true,
            userId: userId,
            caseUuid: caseUuid
        },
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.updateShareCase = async (obj, requestUuid) => {
    return await dbCaseShares.update(obj, {
        where: {
            requestUuid: requestUuid,
        }
    });
}

Queries.getMedicalInjuryReportData = async (reportUuid, userId) => {
    return await dbCaseMedicalInjuryReport.findAll({
        attributes: attributes_26,
        where: {
            requestUuid: reportUuid,
            userId: userId
        },
        raw: true
    })
}

Queries.getMedicalInjuryReportOnComplete = async (caseUuid, userId) => {
    let data = await dbCaseMedicalInjuryReport.findAll({
        attributes: attributes_26,
        include: [
            {
                model: db,
                as: "incCaseMedicalInjuryReportsInfo",
                where: {
                    caseUuid: caseUuid,
                },
                attributes: [],
            }],
        where: {
            status: true,
            isActivated: true,
            // ...getCaseMedicalInjuryCondition(userId)
        },
        order: [['id', 'DESC']],
        // limit: 1,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

const getCaseMedicalInjuryCondition = (userId) => {
    userId = Array.isArray(userId) ? userId : [userId];
    return {
        [Sequelize.Op.or]: [
            { userId },
            Sequelize.literal(`
            EXISTS (
                SELECT 1 
                FROM inc_case_shares s 
                WHERE s.incCaseId = incCaseMedicalInjuryReportsInfo.id
                AND incCaseMedicalInjuryReportsInfo.isActivated = true
                AND incCaseMedicalInjuryReportsInfo.status = true
                AND s.sharedWithUserId IN (${userId.join(',')})
                AND s.isActivated = true
            )
        `)
        ]
    }
};

Queries.getMedicalInjuryReportOnCompleteAndPending = async (caseUuid, userId) => {
    let data = await dbCaseMedicalInjuryReport.findAll({
        attributes: attributes_26,
        include: [
            {
                model: db,
                as: "incCaseMedicalInjuryReportsInfo",
                where: {
                    caseUuid: caseUuid,
                },
                attributes: [],
            }
        ],
        where: {
            isActivated: true,
            ...getCaseMedicalInjuryCondition(userId)
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    })
    data = decryptionArray(data);
    return data;
}

Queries.deleteInjuryReport = async (obj, requestUuid, userId) => {
    return await dbCaseMedicalInjuryReport.update(obj, {
        where: {
            requestUuid: requestUuid,
            // userId: userId,
            isActivated: true
        }
    });
}

Queries.findInjuryReport = async (jobUuid) => {
    return await dbCaseMedicalInjuryReport.findAll({
        attributes: attributes_20,
        where: {
            status: false,
            isActivated: true,
            jobUuid: jobUuid,
        },
        raw: true
    });
}

Queries.updateByJobIdMedicalInjuryReport = async (obj, jobUuid) => {
    return await dbCaseMedicalInjuryReport.update(obj, {
        where: {
            jobUuid: jobUuid
        }
    });
}

Queries.findSharedChilds = async (incCaseId, userId) => {
    return await dbCaseShares.findAll({ 
        attributes: ['sharedWithUserId'],
        raw: true,
        where: {
            isActivated: true,
            sharedByUserId: userId,
            incCaseId: incCaseId
        }
    });
} 

//download the word file as the filter

Queries.findReportSummaryDownload = async (requestUuid, userId, range, date, startDate, endDate, preDOL, postDOL, fileName, fileType, duplicate, insurerDecision) => {    
    return await dbReports.findAll({
        subQuery: false,
        attributes: [
            [Sequelize.col('incCaseSummaryReportsMapping.record_uuid'), 'record_uuid']
        ],
        include: [
            {
                model: dbCaseReportSummary,
                as: "incCaseSummaryReportsMapping",
                where: {
                    isActivated: true,
                    fileType: range,
                    [Op.and]: [
                        ...(date ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')) = '${date}'
            `)
                        ] : []),

                        ...(startDate && endDate ? [
                            Sequelize.literal(`
                DATE(STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s'))
                BETWEEN '${startDate}' AND '${endDate}'
            `)
                        ] : []),

                        ...(preDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') < '${preDOL}'
            `)
                        ] : []),

                        ...(postDOL ? [
                            Sequelize.literal(`
                STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s') >= '${postDOL}'
            `)
                        ] : []),

                        ...(fileName ? [
                            Sequelize.where(
                                Sequelize.literal(`
                                    TRIM(
                                        CASE
                                            WHEN incCaseSummaryReportsMapping.reference LIKE '%,%'
                                            THEN LEFT(
                                                incCaseSummaryReportsMapping.reference,
                                                LENGTH(incCaseSummaryReportsMapping.reference)
                                                - LENGTH(SUBSTRING_INDEX(REVERSE(incCaseSummaryReportsMapping.reference), ',', 1)) - 1
                                            )
                                            ELSE incCaseSummaryReportsMapping.reference
                                        END
                                    )
                                `),
                                fileName
                            )
                        ] : []),

                        ...(fileType && fileType.length > 0 ? [
                            Sequelize.where(
                                Sequelize.col('incCaseSummaryReportsMapping.section'),
                                { [Op.in]: fileType }
                            )
                        ] : []),

                        ...(duplicate === 'true' ? [
                            Sequelize.literal(`
                                incCaseSummaryReportsMapping.duplicate_flag = 'duplicate'
                                AND CAST(
                                    JSON_UNQUOTE(JSON_EXTRACT(incCaseSummaryReportsMapping.duplicate_info, '$.similarity'))
                                    AS DECIMAL(10,5)
                                ) >= 0.8
                                `)
                        ] : []),

                        ...(duplicate === 'false' ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.duplicate_flag = 'unique'`)
                        ] : []),

                        ...(insurerDecision ? [
                            Sequelize.literal(`incCaseSummaryReportsMapping.insurer_decision = '${insurerDecision}'`)
                        ] : []),
                    ]
                },

                attributes: []
            },
            {
                model: db,
                as: "incCaseReportsInfo",
                where: {
                    isActivated: true,
                    status: true,
                },
                attributes: [],
                include: [
                    {
                        model: dbTypeTortMatter,
                        as: "incCaseIdTortDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypeABMatter,
                        as: "incCaseIdABMatterDetails",
                        where: {
                            ...getCaseAccessConditionReport(userId),
                            status: true,
                            isActivated: true,
                        },
                        attributes: [],
                        required: false
                    },
                    {
                        model: dbTypes,
                        as: "incCaseTypesInfo",
                        where: {
                            isActivated: true,
                        },
                        attributes: []
                    },
                ]
            }
        ],
        where: {
            requestUuid: requestUuid,
            ...getCaseAccessConditionReport(userId),
            status: true,
            isActivated: true,
            isProcessed: true
        },
        order: [
            [
                Sequelize.literal(`
                    CASE 
                        WHEN incCaseSummaryReportsMapping.date = 'Unknown' OR incCaseSummaryReportsMapping.date IS NULL 
                        THEN 1 
                        ELSE 0 
                    END
                `),
                'ASC'
            ],
            [
                Sequelize.literal(`STR_TO_DATE(incCaseSummaryReportsMapping.date, '%Y-%m-%dT%H:%i:%s')`),
                'ASC'
            ]
        ],
        // logging: console.log,
        raw: true
    });
};

module.exports = Queries;