const Queries = {};
const { Sequelize, Op } = require('sequelize');
const dbModel = require('../model');
const db = dbModel.userGroup;
const dbUser = dbModel.users;
const dbCompany = dbModel.company;
const dbCompanyOwners = dbModel.companyOwner;
const dbfirmAssistant = dbModel.firmAssistant;
const attributes_1 = ['id', 'groupUuid', 'groupName']
const attributes_2 = ['email', 'userUuid', 'userId']
const attributes_3 = ['id', 'requestUuid', 'companyName', 'memberCount']
const attributes_4 = ['id', 'companyId', 'userId', 'requestUuid']
const attributes_5 = ['id', 'requestUuid', 'firmName', 'memberCount', 'assistantCount']

const { Encryption } = require('../../utils')

Queries.add = async (obj) => {
    return await db.create(obj);
}

Queries.getGroups = async () => {
    let data = await db.findAll({
        attributes: attributes_1,
        include: [{ 
            model: dbUser, 
            as: "groupDetails",
            where: {
                isRemoved: false,
                userTypeId: 2,
                groupId: {
                    [Op.not]: null
                },
                createdBy: {
                    [Op.eq]: null
                }
            },
            attributes: attributes_2
        }],
        where: {
            status: {
                [Sequelize.Op.eq]: true
            }
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getGroupByUuid = async (groupUuid) => {
    let data = await db.findAll({
        attributes: attributes_1,
        where: {
            groupUuid: groupUuid,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getGroupById = async (id) => {
    let data = await db.findOne({
        attributes: attributes_1,
        where: {
            id: id,
            status: true
        },
        raw: true
    });
    data = decryptionObject(data);
    return data;
}

Queries.getCompanyById = async (id) => {
    let data = await dbCompany.findOne({
        attributes: attributes_3,
        where: {
            id: id,
            status: true
        },
        raw: true
    });
    data = decryptionObject(data);
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
    if (obj.firmName) {
        obj.firmName = Encryption.decryptSensitiveData(obj.firmName)
    }
    if (obj.groupName) {
        obj.groupName = Encryption.decryptSensitiveData(obj.groupName)
    }
    if (obj.companyName) {
        obj.companyName = Encryption.decryptSensitiveData(obj.companyName)
    }
    if (obj.email) {
        obj.email = Encryption.decryptSensitiveData(obj.email)
    }
    if (obj['groupDetails.email']) {
        obj['groupDetails.email'] = Encryption.decryptSensitiveData(obj[ 'groupDetails.email'])
    }
    return obj;
}

Queries.createCompany = async (obj) => {
    return await dbCompany.create(obj);
}

Queries.createAssistant = async (obj) => {
    return await dbfirmAssistant.create(obj);
}


Queries.duplicateCheck = async (companyName) => {
    return await dbCompany.findOne({
        where: {
            companyName: Encryption.encryptSensitiveData(companyName.toLowerCase()),
            status: 1
        }
    });
}

Queries.duplicateCheckAssistant = async (companyName) => {
    return await dbfirmAssistant.findOne({
        where: {
            firmName: Encryption.encryptSensitiveData(companyName.toLowerCase()),
            status: 1
        }
    });
}

Queries.createCompanyOwner = async (obj) => {
    return await dbCompanyOwners.create(obj);
}

Queries.findOwner = async (companyId, userId) => {
    return await dbCompanyOwners.findOne({
        where: {
            companyId: companyId,
            userId: userId,
            status: 1
        }
    });
}


Queries.getAllCompanyRecords = async () => {
    let data = await dbCompany.findAll({
        // attributes: [...attributes_3, 
        //     [Sequelize.col('companyUsersDetails.email'), 'companyName']
        // ],
        attributes: attributes_3,
        include: [{
            model: dbCompanyOwners, 
            as: "companyOwnerDetails",
            where: {
                status: true
            },
            attributes: attributes_4
        },
        {
            model: dbUser, 
            as: "companyUsersDetails",
            where: {
                isRemoved: false,
                userTypeId: 2,
                groupId: {
                    [Op.eq]: null
                },
                createdBy: {
                    [Op.eq]: null
                },
                companyId: {
                    [Op.ne]: null
                }
            },
            attributes: attributes_2
        }],
        where: {
            status: true
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getCompanyByUuid = async (companyUuid) => {
    let data = await dbCompany.findAll({
        attributes: attributes_3,
        where: {
            requestUuid: companyUuid,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}

Queries.getAllFirmRecords = async () => {
    let data = await dbfirmAssistant.findAll({
        attributes: [
            ...attributes_5,
            [Sequelize.col('firmIdDetails.email'), 'email'],
            [Sequelize.col('firmIdDetails.userUuid'), 'userUuid'],
            [Sequelize.col('firmIdDetails.userId'), 'userId'],
            [Sequelize.col('firmIdDetails.userTypeId'), 'userTypeId']
        ],
        include: [
            {
                model: dbUser,
                as: "firmIdDetails",
                where: {
                    isRemoved: false,
                    isVerified: true,
                    [Op.or]: [
                        { userTypeId: 3 },
                        { userTypeId: 4 }
                    ],
                    groupId: {
                        [Op.eq]: null
                    },
                    createdBy: {
                        [Op.eq]: null
                    },
                    firmId: {
                        [Op.ne]: null
                    }
                },
                attributes: []
            }],
        where: {
            status: true
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getAllFirmRecordsById = async (firmId) => {
    let data = await dbfirmAssistant.findAll({
        attributes: [
            ...attributes_5,
            [Sequelize.col('firmIdDetails.email'), 'email'],
            [Sequelize.col('firmIdDetails.userUuid'), 'userUuid'],
            [Sequelize.col('firmIdDetails.userId'), 'userId'],
            [Sequelize.col('firmIdDetails.userTypeId'), 'userTypeId']
        ],
        include: [
            {
                model: dbUser,
                as: "firmIdDetails",
                where: {
                    isRemoved: false,
                    isVerified: true,
                    [Op.or]: [
                        { userTypeId: 3 },
                        { userTypeId: 4 }
                    ],
                    groupId: {
                        [Op.eq]: null
                    },
                    createdBy: {
                        [Op.eq]: null
                    },
                    firmId: {
                        [Op.ne]: null
                    }
                },
                attributes: []
            }],
        where: {
            status: true,
            id: firmId
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

Queries.getFirmByUuid = async (requestUuid) => {
    let data = await dbfirmAssistant.findAll({
        attributes: attributes_5,
        where: {
            requestUuid: requestUuid,
            status: true
        },
        raw: true
    });
    data = decryptionArray(data);
    return data;
}


Queries.addNewFirmUser = async (obj, data) => {    
    return await dbUser.update(obj, {
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: false,
            isVerified: true,
            userTypeId: 2,
            groupId: {
                [Op.eq]: null
            },
            createdBy: {
                [Op.eq]: null
            },
            companyId: {
                [Op.eq]: null
            },
            firmId: {
                [Op.eq]: null
            }
        }
    });
}

Queries.UpdateFirmUsers = async (obj, requestUuid) => {    
    return await dbfirmAssistant.update(obj, {
        where: {
            requestUuid: requestUuid,
            status: true
        }
    });
}

Queries.getFirmUsersByFirmIdAndEmail = async (email, firmId) => {
    let data = await dbfirmAssistant.findAll({
        attributes: [
            ...attributes_5,
            [Sequelize.col('firmIdDetails.email'), 'email'],
            [Sequelize.col('firmIdDetails.userUuid'), 'userUuid'],
            [Sequelize.col('firmIdDetails.userId'), 'userId'],
            [Sequelize.col('firmIdDetails.userTypeId'), 'userTypeId']
        ],
        include: [
            {
                model: dbUser,
                as: "firmIdDetails",
                where: {
                    email: Encryption.encryptSensitiveData(email.toLowerCase()),
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
            }],
        where: {
            status: true,
            id: firmId
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
    });
    data = decryptionArray(data);
    return data;
} 

module.exports = Queries;