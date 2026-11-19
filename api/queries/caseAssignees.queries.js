const Queries = {};
const dbModel = require('../model');
const { Sequelize, Op } = require("sequelize");
const db = dbModel.caseAssignees;
const dbCaseNames = dbModel.caseNames;
const dbCaseAssignees = dbModel.caseAssignees;
const dbUser = dbModel.users;
const dbFiles = dbModel.caseFiles;
const dbCaseFileTypes = dbModel.caseFileTypes;
const dbfirmAssistant = dbModel.firmAssistant;
const attributes_1 = ['requestUuid', 'assigneeUserId', 'assignedByUserId']
const attributes_2 = ['id']
const attributes_3 = ['id', 'caseUuid', 'caseName', 'createdByUserId']
const attributes_4 = ['requestUuid', 'assigneeUserId', 'assignedByUserId', 'caseId', 'firmId']
const { Encryption } = require('../../utils')

Queries.assignUsers = async (data) => {
	return await db.create(data);
}

Queries.duplicateCheck = async (caseId, assigneeUserId, assignedByUserId, firmId) => {
	let data = await db.findAll({
		attributes: [
			...attributes_1,
			[Sequelize.col('assigneeUserIdInfo.email'), 'email'],
		],
		include:[
			{
				model: dbUser,
				as: "assigneeUserIdInfo",
				where: {
					isRemoved: false,
					isVerified: true,
					userTypeId: 4,
					groupId: {
						[Op.eq]: null
					},
					createdBy: {
						[Op.eq]: null
					},
					firmId: firmId
				},
				attributes: []
			}
		],
		where: {
			caseId: caseId,
			assigneeUserId: assigneeUserId,
			assignedByUserId: assignedByUserId,
			firmId: firmId,
			status: true 
		},
		raw: true
	});
	data = decryptionArray(data);
    return data;
}

Queries.getAssignedCasesForUser = async (firmId, userId) => {
	let data = await dbfirmAssistant.findAll({
		attributes: [
			...attributes_2,
			[Sequelize.col('firmAssigneesDetails.requestUuid'), 'requestUuid'],
			[Sequelize.col('firmAssigneesDetails.caseId'), 'caseId'],
			[Sequelize.col('firmAssigneesDetails.caseInfo.caseUuid'), 'caseUuid'],
			[Sequelize.col('firmAssigneesDetails.caseInfo.caseName'), 'caseName'],
			[Sequelize.col('firmAssigneesDetails.caseInfo.userId'), 'userId'],
			[Sequelize.col('firmAssigneesDetails.caseInfo.createdByUserId'), 'createdByUserId'],
			[Sequelize.col('firmAssigneesDetails.assigneeUserIdInfo.email'), 'email'],
		],
		include:[
			{
				model: db,
				as: "firmAssigneesDetails",
				where: {
					status: true,
				},
				attributes: [],
				include: [
					{
						model: dbCaseNames,
						as: "caseInfo",
						attributes: [],
						status: true
					},
					{
						model: dbUser,
						as: "assigneeUserIdInfo",
						where: {
							isRemoved: false,
							isVerified: true,
							userTypeId: 2,
							groupId: {
								[Op.eq]: null
							},
							createdBy: {
								[Op.eq]: null
							},
							firmId: firmId
						},
						attributes: [],
						required: false
					}
				]
			}
		],
		where: {
			id: firmId,
			userId: userId,
			status: true
		},
		raw: true
	});
	data = decryptionArray(data);
    return data;
}

const decryptionArray = (array = []) => {    
    const arr = [];
    array.forEach(thread => {
        thread = decryptionObject(thread);
        arr.push(thread);
    })
    return arr; 
}

const decryptionObject = (obj) => {
	if (obj.email) {
		obj.email = Encryption.decryptSensitiveData(obj.email)
	}
	if (obj.caseName) {
		obj.caseName = Encryption.decryptSensitiveData(obj.caseName)
	}
	return obj;
}

Queries.unassignUsers = async (obj, requestUuid) => {
	return await db.update(obj, {
		where: {
			requestUuid: requestUuid,
			status: true
		}
	});
}

Queries.getAssignees = async (caseId) => {
	return await db.findAll({
		attributes: ['assigneeUserId', 'role', 'createdAt'],
		where: { caseId: caseId, status: true },
		raw: true
	});
}

Queries.getFirmCasesWithAssignees = async (userId) => {
	let data = await dbCaseNames.findAll({
		attributes: [
			...attributes_3,
			[Sequelize.col('caseAssigneesDetails.assigneeUserId'), 'assigneeUserId'],
			[Sequelize.col('caseAssigneesDetails.assigneeUserIdInfo.email'), 'email'],
			[Sequelize.col('caseAssigneesDetails.assigneeUserIdInfo.userUuid'), 'requestUuid'],
		],
		include: [
			{
				model: dbCaseAssignees,
				as: 'caseAssigneesDetails',
				required: false,
				attributes: [],
				where: {
					status: true
				},
				include: [
					{
						model: dbUser,
						as: 'assigneeUserIdInfo',
						attributes: []
					}
				]
			}
		],
		where: {
			userId: userId,
			status: true
		},
		raw: true
	});
	data = decryptionArray(data);
	return data;
}

Queries.verifyAssistantCaseAssigness = async (firmAssistant, userId) => {
    return await dbCaseAssignees.findAll({
        attributes: attributes_4,
        where: {
			assignedByUserId: firmAssistant,
            assigneeUserId: userId,
            status: true
        },
		raw: true
    });
}

Queries.verifyAssistantCaseAssignessByCaseUuid = async (caseUuid, firmAssistant, userId) => {
	return await dbCaseNames.findAll({
        attributes: attributes_3,
        include: [
			{
				model: dbCaseAssignees,
				as: 'caseAssigneesDetails',
				attributes: [],
				where: {
					status: true,
					assigneeUserId: userId,
					assignedByUserId: {
						[Op.or]: firmAssistant
					}
				}
			}
		],
        where: {
            caseUuid: caseUuid,
            status: true
        },
		raw: true,
		// logging: console.log
    });
}

Queries.verifyBeforeUnAssign = async (caseUuid, assigneeUserId, userId) => {
	return await dbCaseNames.findAll({
        attributes: [
			...attributes_3,
			[Sequelize.col('caseAssigneesDetails.requestUuid'), 'assignedRequestUuid'],
		],
        include: [
			{
				model: dbCaseAssignees,
				as: 'caseAssigneesDetails',
				attributes: [],
				where: {
					status: true,
					assigneeUserId: assigneeUserId,
					assignedByUserId: {
						[Op.or]: userId
					}
				}
			}
		],
        where: {
            caseUuid: caseUuid,
            status: true
        },
		raw: true
    });
}

module.exports = Queries;