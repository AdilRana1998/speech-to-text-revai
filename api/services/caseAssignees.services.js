const CaseAssignessServices = {}
const { CaseNamesQueries, UserQueries, CaseAssigneesQueries, UserGroupQueries } = require('../queries');
const { Strings } = require('../../utils');
const CaseServices = require('../services/caseFile.services')

CaseAssignessServices.assign = async (caseUuid, userEmails, firmId, isFirm, userId) => {
	try {
		const caseRows = await CaseNamesQueries.findCaseIdForFirm(caseUuid, userId);
		if (caseRows.length > 0 && userEmails.length > 0 && isFirm === true && firmId) {
			const assigneeUserId = []
			const duplicateRecord = []
			for (const element of userEmails) {
				if (element) {
					const findUser = await UserGroupQueries.getFirmUsersByFirmIdAndEmail(element, firmId);
					if (findUser.length > 0) {
						assigneeUserId.push(findUser[0].userId)
					}
				}
			}
			if (assigneeUserId.length === userEmails.length) {
				for (const element of assigneeUserId) {
					const duplicateCheck = await CaseAssigneesQueries.duplicateCheck(caseRows[0].id, element, userId, firmId)
					if (duplicateCheck.length === 0) {
						const assignmnetData = {
							caseId: caseRows[0].id,
							assigneeUserId: element,
							assignedByUserId: userId,
							firmId: firmId
						}
						await CaseAssigneesQueries.assignUsers(assignmnetData);
					} else {
						duplicateRecord.push(duplicateCheck[0].email)
					}
				}
				if (duplicateRecord.length === 0) {
					return {
						message: Strings.SUCCESS,
						statusCode: 200,
						obj: {
							message: Strings.RECORD_UPDATE_SUCCESS,
							caseUuid: caseUuid,
						}
					}
				} else {
					return {
                		message: Strings.ERROR.RECORD_ALREADY_EXSIST,
						statusCode: 400,
						obj: {
							caseUuid: caseUuid,
							message: `${Strings.ERROR.RECORD_ALREADY_EXSIST} for ${duplicateRecord.join(", ")}`
						}
					}
				}
			} else {
				return {
					message: Strings.ROOM.EMPTY,
					statusCode: 200,
					obj: {}
				}
			}
		}
		else {
			return {
				message: Strings.ROOM.EMPTY,
				statusCode: 200,
				obj: {}
			}
		}
	} catch (error) {
		console.log("Error in assign", error);
		return {
			message: Strings.ERROR.SOME_THING_WENT_WRONG,
			statusCode: 400,
			obj: {
				error: error.message
			}
		}
	}
}

CaseAssignessServices.listFirmCasesGrouped = async (isFirm, firmUsers = [], firmAssistant, userId) => {
	try {
		if (isFirm === true && Array.isArray(firmUsers) && firmUsers.length > 0) {
			const rows = await CaseAssigneesQueries.getFirmCasesWithAssignees(userId);
			if (rows.length > 0) {
				const grouped = [];
				for (const row of rows) {
					let existing = grouped.find(c => c.caseUuid === row.caseUuid);
					if (!existing) {
						const caseData = await CaseServices.fetchOnlyCaseForAssistant('', '', '', row.caseUuid, userId);
						if (!caseData || !Array.isArray(caseData.obj) || caseData.obj.length === 0 || caseData.statusCode == '400') {
							continue;
						}
						existing = {
							caseUuid: row.caseUuid,
							caseName: row.caseName,
							assignees: [],
							caseData: caseData.obj
						};
						grouped.push(existing);
					}
					if (row.assigneeUserId) {
						existing.assignees.push({
							email: row.email,
							requestUuid: row.requestUuid,
						});
					}
				}
				if (grouped.length > 0) {
					return {
						message: Strings.SUCCESS,
						statusCode: 200,
						obj: grouped
					};
				} else {
					return {
						message: Strings.ROOM.EMPTY,
						statusCode: 200,
						obj: {}
					};
				}
			} else {
				return {
					message: Strings.ROOM.EMPTY,
					statusCode: 200,
					obj: {}
				};
			}
		} else {
			return {
				message: Strings.ROOM.EMPTY,
				statusCode: 200,
				obj: {}
			};
		}
	} catch (error) {
		console.log("Error while list Firm Cases Grouped", error);
		return {
			message: Strings.ERROR.SOME_THING_WENT_WRONG,
			statusCode: 400,
			obj: { error: error.message }
		};
	}
};

CaseAssignessServices.deleteAssignedCaseFile = async (caseUuid, fileUuid, isFirm, firmUsers, userType, firmAssistant, userId) => {
	try {
		if (caseUuid && fileUuid && isFirm === true && Array.isArray(firmUsers) && firmUsers.length > 0 && userType == 'assistant') {
			return await CaseServices.removeFile(caseUuid, fileUuid, userId);
		}
		else if (caseUuid && fileUuid && isFirm === true && Array.isArray(firmUsers) && firmUsers.length > 0 && userType == 'assistant-user' && firmAssistant.length > 0) {
			const record = await CaseAssigneesQueries.verifyBeforeUnAssign(caseUuid, userId, firmAssistant)
			if (record.length > 0) {
				userId = record[0].createdByUserId
				return await CaseServices.removeFile(caseUuid, fileUuid, userId);
			}
			else {
				return {
					message: Strings.ROOM.EMPTY,
					statusCode: 200,
					obj: {}
				}
			}
		}
		else {
			return {
				message: Strings.UNVALID_STATUS,
				statusCode: 400,
				obj: {}
			}
		}
	} catch (error) {
		console.log("Error while delete assigned case file", error);
		return {
			message: Strings.ERROR.SOME_THING_WENT_WRONG,
			statusCode: 400,
			obj: {
				error: error.message
			}
		};
	}
};

CaseAssignessServices.editAssignedCase = async (caseName, caseSummary, caseDoc, caseAudio, caseQueries, casefilesData, caseUuid, userId, assignees, firmId, isFirm, userType, firmUsers, firmAssistant) => {
	try {
		if (caseUuid && isFirm && Array.isArray(firmUsers) && firmUsers.length > 0 && userType == 'assistant') {
			return await CaseServices.alterCase(caseName, caseSummary, caseDoc, caseAudio, caseQueries, casefilesData, caseUuid, userId, assignees, firmId, isFirm);
		}
		else if (caseUuid && isFirm && Array.isArray(firmUsers) && firmUsers.length > 0 && userType == 'assistant-user' && firmAssistant.length > 0) {
			const record = await CaseAssigneesQueries.verifyBeforeUnAssign(caseUuid, userId, firmAssistant)
			if (record.length > 0) {
				userId = record[0].createdByUserId
				return await CaseServices.alterCase(caseName, caseSummary, caseDoc, caseAudio, caseQueries, casefilesData, caseUuid, userId, assignees, firmId, isFirm);
			}
			else {
				return {
					message: Strings.ROOM.EMPTY,
					statusCode: 200,
					obj: {}
				}
			}
		}
		else {
			return {
				message: Strings.UNVALID_STATUS,
				statusCode: 400,
				obj: {}
			}
		}
	} catch (error) {
		console.log("Error while delete assigned case file", error);
		return {
			message: Strings.ERROR.SOME_THING_WENT_WRONG,
			statusCode: 400,
			obj: {
				error: error.message
			}
		};
	}
};

CaseAssignessServices.fetchAssigneeCase = async (isFirm, firmAssistant, firmUsers, userId) => {
	try {
		if (isFirm && firmAssistant && firmUsers.length > 0 && userId) {
			const record = await CaseAssigneesQueries.verifyAssistantCaseAssigness(firmAssistant, userId) 
			const findUserCreatedCases = await CaseNamesQueries.findCaseByUserId(userId) 
			if (record.length > 0 || findUserCreatedCases.length > 0) {
				const getCasesId = []
        		for (const element of [...record, ...findUserCreatedCases]) {
					getCasesId.push(element.caseId)
				}
				return await CaseServices.fetchCaseAssigness(getCasesId, [...firmAssistant, userId]);
			} else {
				return {
					message: Strings.ROOM.EMPTY,
					statusCode: 200,
					obj: {}
				}
			}
		} else {
			return {
				message: Strings.UNVALID_STATUS,
				statusCode: 400,
				obj: {}
			}
		}
	} catch (error) {
		console.log("Error while fetch Assignee Case", error);
		return {
			message: Strings.ERROR.SOME_THING_WENT_WRONG,
			statusCode: 400,
			obj: {
				error: error.message
			}
		};
	}
};

CaseAssignessServices.fetchOnlyCaseAssignee = async (caseUuid, isFirm, firmAssistant, firmUsers, userId) => {
	try {
		if (isFirm && firmAssistant && firmUsers.length > 0 && userId) {
			const record = await CaseAssigneesQueries.verifyAssistantCaseAssignessByCaseUuid(caseUuid, firmAssistant, userId)
			const findUserCreatedCases = await CaseNamesQueries.findCaseIdAssignee(caseUuid, userId) 
			if (record.length > 0 || findUserCreatedCases.length > 0) {
				const getCasesId = []
        		for (const element of [...record, ...findUserCreatedCases]) {
					getCasesId.push(element.id)
				}
				return await CaseServices.fetchCaseAssigness(getCasesId, [...firmAssistant, userId]);
			} else {
				return {
					message: Strings.ROOM.EMPTY,
					statusCode: 200,
					obj: {}
				}
			}
		} else {
			return {
				message: Strings.UNVALID_STATUS,
				statusCode: 400,
				obj: {}
			}
		}
	}
	catch (error) {
		console.log("Error while fetch Only Case Assignee", error);
		return {
			message: Strings.ERROR.SOME_THING_WENT_WRONG,
			statusCode: 400,
			obj: {
				error: error.message
			}
		};
	}
}

CaseAssignessServices.unassign = async (caseUuid, email, isFirm, firmAssistant, firmUsers, userId) => {
	try {
		if (caseUuid && email && isFirm == true && firmAssistant.length > 0 && firmUsers.length > 0 && userId) {
			const getData = await UserQueries.getActiveUser(email)
			if (getData.length > 0) {
				const record = await CaseAssigneesQueries.verifyBeforeUnAssign(caseUuid, getData[0]?.userId, firmAssistant)
				if (record.length > 0) {
					const list = await CaseAssigneesQueries.unassignUsers({ status: false }, record[0].assignedRequestUuid);
					if (list[0] == '1') {
						return {
							statusCode: 200,
							message: Strings.RECORD_DELETED_SUCCESS,
							obj: {}
						}
					} else {
						return {
							message: Strings.ROOM.EMPTY,
							statusCode: 200,
							obj: {}
						}
					}
				} else {
					return {
						message: Strings.ROOM.EMPTY,
						statusCode: 200,
						obj: {}
					}
				}
			} else {
				return {
					message: Strings.ROOM.EMPTY,
					statusCode: 200,
					obj: {}
				}
			}






		} else {
			return {
				message: Strings.UNVALID_STATUS,
				statusCode: 400,
				obj: {}
			}
		}
	} catch (error) {
		console.log("Error while unassign a case by assitatn", error);
		return {
			message: Strings.ERROR.SOME_THING_WENT_WRONG,
			statusCode: 400,
			obj: {
				error: error.message
			}
		};
	}
}

CaseAssignessServices.listAssignees = async (caseUuid) => {
	try {
		const caseRows = await CaseNamesQueries.getCasesId(caseUuid);
		if (caseRows.length === 0) {
			return { statusCode: 404, message: Strings.ERROR.RECORD_NOT_FOUND, obj: {} }
		}
		const caseId = caseRows[0].id;
		const rows = await CaseAssigneesQueries.getAssignees(caseId);
		return { statusCode: 200, message: Strings.SUCCESS, obj: rows }
	} catch (error) {
		return { statusCode: 400, message: Strings.ERROR.SOME_THING_WENT_WRONG, obj: { error: error.message } }
	}
}

module.exports = CaseAssignessServices;