const usersGroupServices = {};
const {
    UserGroupQueries,
    UserQueries
} = require('../queries');
const { Strings } = require('../../utils')

usersGroupServices.generateGroup = async (groupName, groupEmails, userId) => {
    try {
        if (groupName && groupEmails.length > 0) {
            const allData = [];
            const verifiedEmails = [];
            const obj = {
                groupName: groupName
            }
            //here we are checking input emails are eligible to be in a group
            for (const element of groupEmails) {
                const checkUsers = await UserQueries.verifyGroupUsers(element);    
                checkUsers?.email == element.toLowerCase() ? verifiedEmails.push(element) : ""
            }            
            //only one account is not eligible to be in a group while creating a group
            if (verifiedEmails.length > 1) {
                // have to check group name already exisit or not
                const data = await UserGroupQueries.add(obj);
                for (const element of verifiedEmails) {
                    const getId = {
                        groupId: data.id
                    }
                    const updateUser = await UserQueries.connectingGroupsWithTheirUsers(getId, element)
                    updateUser == 1 ? allData.push({ email: element, status: Strings.RECORD_UPDATE_SUCCESS, groupId: data.id }) : allData.push({ email: element, status: Strings.ERROR.RECORD_UPDATE_ERROR });
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200, //also return the userId
                    obj: allData
                }
            } else {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ROOM.EMPTY,
                    }
                }
            }
        }
        else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error in creating a group:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

usersGroupServices.getGroup = async () => {
    try {
        const data = await UserGroupQueries.getGroups();
        if (data.length > 0) {
            const groupedData = data.reduce((acc, curr) => {
                let group = acc.find(item => item.groupInfo.groupUuid === curr.groupUuid);
                if (!group) {
                    group = {
                        groupInfo: {
                            id: curr.id,
                            groupUuid: curr.groupUuid,
                            groupName: curr.groupName,
                            groupDetails: []
                        }
                    };
                    acc.push(group);
                }
                group.groupInfo.groupDetails.push({
                    email: curr["groupDetails.email"],
                    userUuid: curr["groupDetails.userUuid"]
                });

                return acc;
            }, []);

            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: groupedData
            };
        } else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY
                }
            };
        }
    } catch (error) {
        console.log("Error in getting a group:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

usersGroupServices.updateGroup = async (groupUuid, groupEmails) => {
    try {
        const allData = [];
        const verifiedEmails = [];
        const data = await UserGroupQueries.getGroupByUuid(groupUuid);
        if (data.length > 0) {
              //here we are checking input emails are eligible to be in a group
              for (const element of groupEmails) {
                const checkUsers = await UserQueries.verifyGroupUsers(element);
                checkUsers?.email == element.toLowerCase() ? verifiedEmails.push(element) : ""
            }

            if (verifiedEmails.length >= 1) {
                for (const element of verifiedEmails) {
                    const getId = {
                        groupId: data[0].id
                    }
                    const updateUser = await UserQueries.connectingGroupsWithTheirUsers(getId, element)
                    updateUser == 1 ? allData.push({ email: element, status: Strings.RECORD_UPDATE_SUCCESS, groupId: data[0].id }) : allData.push({ email: element, status: Strings.ERROR.RECORD_UPDATE_ERROR });
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allData
                }
            } else {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ROOM.EMPTY,
                    }
                }
            }
        }
        else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error in updating a group:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

usersGroupServices.generateCompany = async (companyName, ownerEmails, userEmails) => {
    try {
        if (ownerEmails.length > 0 && userEmails.length > 0) {
            const allData = [];
            const verifiedEmails = [];
            const ownerUserId = [];
            const allUserId = [];
            const verifieCompanyOwnerInsertion = [];
            //here we are checking input emails are eligible to be in a company owner and company user
            const allEmails = [...ownerEmails, ...userEmails]
            for (const element of allEmails) {
                const checkUsers = await UserQueries.verifyCompanyUsers(element);            
                checkUsers?.email == element.toLowerCase() ? verifiedEmails.push(element) && allUserId.push(checkUsers.userId) : ""
            }
            if (verifiedEmails.length === allEmails.length) {
                const memberCount = userEmails.length
                const company = {
                    companyName: companyName,
                    memberCount: memberCount
                }
                const duplicateCheck = await UserGroupQueries.duplicateCheck(companyName)
                if (duplicateCheck == null) {
                    const createCompany = await UserGroupQueries.createCompany(company)
                    if (createCompany) {
                        const companyId = createCompany.id
                        for (const element of ownerEmails) {
                            const checkUsers = await UserQueries.verifyCompanyUsers(element);
                            checkUsers?.email == element.toLowerCase() ? ownerUserId.push(checkUsers.userId) : ""
                        }
                        if (ownerUserId.length > 0) {
                            for (const element of ownerUserId) {
                                const companyOwner = {
                                    companyId: companyId,
                                    userId: element
                                }
                                const createCompanyOwner = await UserGroupQueries.createCompanyOwner(companyOwner)
                                verifieCompanyOwnerInsertion.push(createCompanyOwner.id)
                            }
                            if (verifieCompanyOwnerInsertion.length == ownerUserId.length) {
                                for (const element of allUserId) {
                                    const record = {
                                        companyId: companyId
                                    }
                                    await UserQueries.updateUsersForCompany(record, element)
                                }
                                return {
                                    message: Strings.SUCCESS,
                                    statusCode: 200,
                                    obj: {
                                        companyId: companyId,
                                        companyName: companyName,
                                        companyOwnerId: ownerUserId,
                                        companyEmployeeId: [...new Set(allUserId)].filter(id => !ownerUserId.includes(id)),
                                        companyAllUsersId: allUserId
                                    }
                                };
                            } else {
                                return {
                                    message: Strings.USER.COMPANY_CREATED_ERROR_IN_UPDATING_USER,
                                    statusCode: 400,
                                    obj: {}
                                }
                            }
                        } else {
                            return {
                                message: Strings.USER.OWNER_NOT_FOUND,
                                statusCode: 400,
                                obj: {}
                            }
                        }
                    } else {
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: {
                                createCompany
                            }
                        }
                    }
                } else {
                    return {
                        message: Strings.ERROR.RECORD_ALREADY_EXSIST,
                        statusCode: 400,
                        obj: {}
                    }
                }
            } else {
                return {
                    message: Strings.USER.CHECK_USERS_DETAILS,
                    statusCode: 400,
                    obj: {}
                }
            }
        }
        else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error in creating a company with users and owners:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

usersGroupServices.getCompany = async () => {
    try {
        const rawData = await UserGroupQueries.getAllCompanyRecords();
        const groupedData = rawData.reduce((acc, item) => {
            const companyId = item.id;
            if (!acc[companyId]) {
                acc[companyId] = {
                    id: item.id,
                    requestUuid: item.requestUuid,
                    companyName: item.companyName,
                    companyOwnerCount: item.memberCount,
                    companyOwners: new Map(),
                    companyUsers: new Map()
                };
            }
            if (!acc[companyId].companyOwners.has(item["companyOwnerDetails.userId"])) {
                acc[companyId].companyOwners.set(item["companyOwnerDetails.userId"], {
                    id: item["companyOwnerDetails.id"],
                    companyId: item["companyOwnerDetails.companyId"],
                    userId: item["companyOwnerDetails.userId"],
                    requestUuid: item["companyOwnerDetails.requestUuid"],
                });
            }
            const ownerIds = [...acc[companyId].companyOwners.keys()];
            if (!ownerIds.includes(item["companyUsersDetails.userId"]) && 
                !acc[companyId].companyUsers.has(item["companyUsersDetails.userId"])) {
                acc[companyId].companyUsers.set(item["companyUsersDetails.userId"], {
                    email: item["companyUsersDetails.email"],
                    userUuid: item["companyUsersDetails.userUuid"],
                    userId: item["companyUsersDetails.userId"]
                });
            }
            return acc;
        }, {});
        const finalData = Object.values(groupedData).map(company => ({
            ...company,
            companyOwners: [...company.companyOwners.values()],
            companyUsers: [...company.companyUsers.values()]
        }));
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: finalData
        };
    } catch (error) {
        console.error("Error in get Company:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

usersGroupServices.updateCompany = async (companyUuid, usersEmail) => {
    try {
        const allData = [];
        const verifiedEmails = [];
        const allUserId = [];
        const data = await UserGroupQueries.getCompanyByUuid(companyUuid);
        if (data.length > 0) {
            //here we are checking input emails are eligible to be in a group
            for (const element of usersEmail) {
                 const checkUsers = await UserQueries.verifyCompanyUsers(element);            
                checkUsers?.email == element.toLowerCase() ? verifiedEmails.push(element) && allUserId.push(checkUsers.userId) : ""
            }
            if (verifiedEmails.length === usersEmail.length) {
                for (const element of usersEmail) {
                    const getId = {
                        companyId: data[0].id
                    }
                    const updateUser = await UserQueries.addNewCompanyUser(getId, element)
                    updateUser == 1 ? allData.push({ email: element, status: Strings.RECORD_UPDATE_SUCCESS, companyId: data[0].id }) : allData.push({ email: element, status: Strings.ERROR.RECORD_UPDATE_ERROR });
                }
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allData
                }
            } else {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ROOM.EMPTY,
                    }
                }
            }
        }
        else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error in updating a company:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

usersGroupServices.generateFirm = async (firmName, assistantEmail, userEmails) => {
    try {
        if (assistantEmail?.length > 0 && userEmails.length > 0) {
            const verifiedEmails = [];
            const checkUserUpdate = [];
            const allAssistantUserIds = [];
            const allUserId = [];
            const allEmails = [...assistantEmail, ...userEmails]

            for (const element of allEmails) {
                const checkUsers = await UserQueries.verifyAssistantUsers(element);
                checkUsers?.email == element.toLowerCase() ? verifiedEmails.push(element) && allUserId.push(checkUsers.userId) : ""
            }

            if (verifiedEmails.length === allEmails.length) {
                const duplicateCheck = await UserGroupQueries.duplicateCheckAssistant(firmName)
                if (duplicateCheck == null) {
                    const memberCount = userEmails.length
                    const assistantCount = assistantEmail.length
                    const company = {
                        firmName: firmName,
                        memberCount: memberCount,
                        assistantCount: assistantCount,
                    }
                    const createCompany = await UserGroupQueries.createAssistant(company)
                    if (createCompany) {
                        const companyId = createCompany.id
                        for (const element of allUserId) {
                            const record = {
                                firmId: companyId,
                                subscription: true,
                                subscriptionType: 4
                            }
                            const findUpdate = await UserQueries.updateUser(record, element)
                            if (findUpdate[0] === 1) {
                                checkUserUpdate.push({ status: findUpdate[0], userId: element })
                            }
                        }
                    }
                    else {
                        return {
                            message: Strings.ERROR.SOME_THING_WENT_WRONG,
                            statusCode: 400,
                            obj: createCompany
                        }
                    }

                    if (checkUserUpdate.length === verifiedEmails.length) {
                        for (const allassistantEmail of assistantEmail) {
                            const findAssitantUserId = await UserQueries.verifyAssistantOnly(allassistantEmail);
                            if (findAssitantUserId?.userId) {
                                allAssistantUserIds.push(findAssitantUserId?.userId)
                            }
                        }

                        if (allAssistantUserIds.length == assistantEmail.length) {
                            const assistantUpdates = [];
                            const memberUpdates = [];
                            for (const getAllUserId of allUserId) {
                                const data = {};
                                if (allAssistantUserIds.includes(getAllUserId)) {
                                    data.userTypeId = 3;
                                } else {
                                    data.userTypeId = 4;
                                }
                                const findUpdate = await UserQueries.updateUser(data, getAllUserId);
                                if (findUpdate[0] === 1) {
                                    if (data.userTypeId === 3) {
                                        if (!assistantUpdates.includes(getAllUserId)) {
                                            assistantUpdates.push(getAllUserId);
                                        }
                                    } else {
                                        if (!memberUpdates.includes(getAllUserId)) {
                                            memberUpdates.push(getAllUserId);
                                        }
                                    }
                                }
                            }

                            if (assistantUpdates.length === allAssistantUserIds.length && memberUpdates.length === (allUserId.length - allAssistantUserIds.length)) {
                                return {
                                    message: Strings.SUCCESS,
                                    statusCode: 200,
                                    obj: {
                                        firmName: firmName,
                                        firmId: createCompany.id,
                                        assistants: assistantUpdates.map((id, idx) => ({
                                            userId: id,
                                            email: assistantEmail[idx] || null,
                                            userTypeId: 3
                                        })),
                                        members: memberUpdates.map((id, idx) => ({
                                            userId: id,
                                            email: userEmails[idx] || null,
                                            userTypeId: 4
                                        }))
                                    }
                                };
                            } else {
                                return {
                                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                                    statusCode: 400,
                                    obj: {
                                        assistantsUpdated: assistantUpdates,
                                        membersUpdated: memberUpdates
                                    }
                                };
                            }

                        } else {
                            return {
                                message: Strings.FIRM_ASSISTANT.FIRM_ASSISTANT_NOT_CREATED_USER_CREATED,
                                statusCode: 400,
                                obj: {
                                    allAssistantUserIds: allAssistantUserIds,
                                    assistantEmail: assistantEmail
                                }
                            }
                        }
                    } else {
                        return {
                            message: Strings.FIRM_ASSISTANT.FAILED_TO_CREATE_FIRM_USER,
                            statusCode: 400,
                            obj: {
                                verifiedEmails: verifiedEmails,
                                checkUserUpdate: checkUserUpdate
                            }
                        }
                    }

                } else {
                    return {
                        message: Strings.ERROR.RECORD_ALREADY_EXSIST,
                        statusCode: 400,
                        obj: {}
                    }
                }
            } else {
                return {
                    message: Strings.USER.CHECK_USERS_DETAILS,
                    statusCode: 400,
                    obj: {}
                }
            }
        }
        else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error in generating a firm Assistant -> User:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

usersGroupServices.getFirm = async () => {
    try {
        const rawData = await UserGroupQueries.getAllFirmRecords();
        if (rawData.length > 0) {
            const firmMap = {};
            rawData.forEach(item => {
                if (!firmMap[item.id]) {
                    firmMap[item.id] = {
                        id: item.id,
                        requestUuid: item.requestUuid,
                        firmName: item.firmName,
                        userCount: item.memberCount,
                        assistantCount: item.assistantCount,
                        assistantEmail: [],
                        assistantUsers: []
                    };
                }
                if (item.userTypeId === 3) {
                    firmMap[item.id].assistantEmail.push({ email: item.email, userUuid: item.userUuid, userId: item.userId })
                } else if (item.userTypeId === 4) {
                    firmMap[item.id].assistantUsers.push({
                        email: item.email,
                        userUuid: item.userUuid,
                        userId: item.userId
                    });
                }
            });
            const finalData = Object.values(firmMap);
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: finalData
            };
        } else {
             return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.error("Error in get firm:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
};

usersGroupServices.updateFirm = async (requestUuid, usersEmail, assistantEmail) => {
    try {
        const allData = [];
        const verifiedEmails = [];
        const verifiedAssistantEmails = [];
        const allUserId = [];
        const data = await UserGroupQueries.getFirmByUuid(requestUuid);
        if (data.length > 0 && (usersEmail?.length > 0 || assistantEmail?.length > 0)) {
            if (usersEmail?.length > 0) {
                //here we are checking input emails are eligible to be in a firm
                for (const element of usersEmail) {
                    const checkUsers = await UserQueries.verifyAssistantUsers(element);
                    checkUsers?.email == element.toLowerCase() ? verifiedEmails.push(element) && allUserId.push(checkUsers.userId) : allData.push({ userEmail: element, status: Strings.ROOM.EMPTY });
                }
                if (verifiedEmails.length === usersEmail.length) {
                    for (const element of usersEmail) {
                        const getId = {
                            firmId: data[0].id,
                            subscription: true,
                            subscriptionType: 4,
                            userTypeId: 4
                        }
                        const updateUser = await UserGroupQueries.addNewFirmUser(getId, element)
                        updateUser == 1 ? allData.push({ email: element, status: Strings.RECORD_UPDATE_SUCCESS, firmId: data[0].id }) : allData.push({ email: element, status: Strings.ERROR.RECORD_UPDATE_ERROR });
                        if (updateUser == 1) {
                            await UserGroupQueries.UpdateFirmUsers({ memberCount: usersEmail.length + data[0].memberCount }, data[0].requestUuid)
                        }
                    }

                }
            }
            if (assistantEmail?.length > 0) {
                //here we are checking input emails are eligible to be in a firm
                for (const element of assistantEmail) {
                    const checkUsers = await UserQueries.verifyAssistantUsers(element);
                    checkUsers?.email == element.toLowerCase() ? verifiedAssistantEmails.push(element) && allUserId.push(checkUsers.userId) : allData.push({ assistantEmail: element, status: Strings.ROOM.EMPTY });
                }
                if (verifiedAssistantEmails.length === assistantEmail.length) {
                    for (const element of assistantEmail) {
                        const getId = {
                            firmId: data[0].id,
                            subscription: true,
                            subscriptionType: 4,
                            userTypeId: 3
                        }
                        const updateUser = await UserGroupQueries.addNewFirmUser(getId, element)
                        updateUser == 1 ? allData.push({ email: element, status: Strings.RECORD_UPDATE_SUCCESS, firmId: data[0].id }) : allData.push({ email: element, status: Strings.ERROR.RECORD_UPDATE_ERROR });
                        if (updateUser == 1) {
                            await UserGroupQueries.UpdateFirmUsers({ assistantCount: assistantEmail.length + data[0].assistantCount }, data[0].requestUuid)
                        }
                    }
                }
            }
            if (allData.length > 0) {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: allData
                }
            } else {
                return {
                    message: Strings.SUCCESS,
                    statusCode: 200,
                    obj: {
                        message: Strings.ROOM.EMPTY,
                    }
                }
            }
        }
        else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: {
                    message: Strings.ROOM.EMPTY,
                }
            }
        }
    } catch (error) {
        console.log("Error in updating a firm users only:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

module.exports = usersGroupServices;