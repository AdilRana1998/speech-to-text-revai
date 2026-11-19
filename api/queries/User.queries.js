const UserQueries = {};
const db = require('../model');
const { Encryption } = require('../../utils');
const { Sequelize, DataTypes } = require('sequelize');
const Users = db.users;
const usersType = db.users_types;
const Company = db.company;
const prompts = db.prompts;
const Op = db.op;

// const attributes_1 = ['userId', 'userTypeId', 'firstName', 'lastName', 'userUuid', 'email', 'phNumber', 'profilePic', 'createdAt'];
const attributes_1 = ['userId', 'userUuid', 'firstName', 'lastName', 'userTypeId', 'userUuid', 'email', 'createdAt', 'isVerified', 'paymentExpiry', "googleAuthCode", "auto_join", "isRemoved", "groupId", "companyId", "subscription", "subscriptionType", "firmId", "customerStripeId"];
const paymentAttributes = ['userId', 'customerStripeId'];
const attributes_2 = [['popup', 'newUser']];
const attributes_3 = ['request'];
const attributes_4 = ['botName', 'recallVideoType', 'recallMediaEnable'];
const attributes_5 = [ 'prompt']
const attributes_6 = ['userUuid', 'email'];
const attributes_7 = ['userUuid', 'email', 'userId'];
const attributes_8 = ['isCitation'];


const decryptionObject = (obj) => {
    if (obj.firstName) {
        obj.firstName = Encryption.decryptSensitiveData(obj.firstName)
    }
    if (obj.lastName) {
        obj.lastName = Encryption.decryptSensitiveData(obj.lastName)
    }
    if (obj.email) {
        obj.email = Encryption.decryptSensitiveData(obj.email)
    }
    return obj;
}
const decryptionObject2 = (obj) => {
    if (obj.email) {
        obj.email = Encryption.decryptSensitiveData(obj.email)
    }
    return obj;
}

const decryptionObject3 = (obj) => {
    if (obj.email) {
        obj.email = Encryption.decryptSensitiveData(obj.email)
    }
    if (obj.question) {
        obj.question = Encryption.decryptSensitiveData(obj.question)
    }
    return obj;
}

UserQueries.getUsersByEmail = async (email) => {
    const user = await Users.findAll({
        raw: true,
        where: {
            email: Encryption.encryptSensitiveData(email.toLowerCase()),
        },
        attributes: attributes_1,
    });
    return user;
}

UserQueries.createUser = async (obj) => {
    obj.email = obj.email.toLowerCase()
    return await Users.create(obj);
}

UserQueries.updateUser = async (obj, userId) => {
    return await Users.update(obj, {
        where: {
            userId: userId
        }
    });
}

UserQueries.updateUserByUUID = async (obj, uuid) => {
    return await Users.update(obj, {
        where: {
            userUuid: uuid
        }
    });
}

UserQueries.updateUserByEmail = async (obj, email) => {
    const e = await Encryption.encryptSensitiveData(email.toLowerCase());
    return await Users.update(obj, {
        where: {
            email: e
        }
    });
}

UserQueries.getUsers = async () => {
    return await Users.findAll({
        raw: true,
        attributes: attributes_1,
        where: {
            [Op.or]: [
                { userTypeId: 2 },
                { userTypeId: 3 }
            ]
        }
    });
}

UserQueries.getAllUsers = async () => {
    return await Users.findAll({
        raw: true,
        attributes: attributes_1,
    });
}

UserQueries.getUser = async (userId) => {
    let user = await Users.findOne({
        raw: true,
        attributes: attributes_1,
        where: {
            userId: userId,
        }
    });
    user = decryptionObject(user);
    return user;
}

UserQueries.getUserTypes = async (userId) => {
    let user = await Users.findAll({
        attributes: [
            ...attributes_1,
            [Sequelize.col('userTypeInfo.title'), 'usertypeTitle']
        ],
        include: [{ 
            model: usersType,
            as: "userTypeInfo",
            attributes: [],
        }],
        where: {
            userId: { [Op.in]: userId },
        },
        raw: true,
    });
    user.map(users => decryptionObject2(users));
    return user;
}

UserQueries.getUsageInfo = async (userId) => {
    // let user = await Users.sequelize.query("");
    let users = await Users.sequelize.query("select u.userId, email,paymentExpiry,datediff(paymentExpiry,current_date) 'remaining_days', count(r.roomId) 'no_of_meetings',ifnull(ceil(sum(timestampdiff(second ,r.startTime,r.endTime))/60),0) 'meeting_minutes' from users u left join rooms r on u.userId = r.userId group by u.userId;", {
        type: Sequelize.QueryTypes.SELECT, logging: console.log,
    });
    // users = decryptionObject(users);
    users.map(user => decryptionObject2(user));
    return users;
}


UserQueries.getAllPrompts = async () => {
    let users = await Users.sequelize.query("SELECT users.userId, users.email, assistant_threads.question, MAX(assistant_threads.createdAt) AS createdAt FROM assistant_threads LEFT JOIN users ON users.userId = assistant_threads.userId WHERE DATE(assistant_threads.createdAt) = CURDATE() GROUP BY users.userId, users.email, assistant_threads.question ORDER BY createdAt DESC;", {
        type: Sequelize.QueryTypes.SELECT
    });
    users.map(user => decryptionObject3(user));
    return users;
}


UserQueries.getUserByCustomerId = async (customerId) => {
    return await Users.findAll({
        where: {
            customerStripeId: customerId
        },
        raw: true,
        attributes: ['userId', 'email', 'paymentPlan']
    })
}

UserQueries.getUserByEmail = async (email) => {
    let user = await Users.findAll({
        where: {
            email: Encryption.encryptSensitiveData(email)
        },
        raw: true,
        attributes: ['userId', 'email','auto_join', 'userUuid'],
    })
    if (user.length > 0) {
        decryptionObject(user[0]);
    }
    return user;
}

UserQueries.getUserById = async (id) => {
    let user = await Users.findAll({
        where: {
            userid: id
        },
        raw: true,
        attributes: ['userId', 'email','auto_join']
    })
    if (user.length > 0) {
        decryptionObject(user[0]);
    }
    return user;
}

UserQueries.getUserCustomerId = async (userId) => {
    return await Users.findAll({
        raw: true,
        attributes: paymentAttributes,
        where: {
            userId: userId,
        }
    });
}

UserQueries.getUserByCalendarId = async (calendarId) => {
    return await Users.findAll({
        raw: true,
        attributes: paymentAttributes,
        where: {
            googleAuthCode: calendarId,
        }
    });
}

UserQueries.updateUserByCustomerId = async (userUpdate, customerId) => {
    return await Users.update(userUpdate, {
        where: {
            customerStripeId: customerId
        }
    });
}


UserQueries.checkUserIdAndPassword = async (userId, password) => {
    return await Users.findAll({
        raw: true,
        attributes: ['userId', 'email'],
        where: {
            userId: userId,
            password: password,
        },
    });
}
 
UserQueries.login = async (obj) => { 
    let users = await Users.findAll({
        raw: true,
        where: {
            email: Encryption.encryptSensitiveData(obj.email.toLowerCase()),
            password: await Encryption.sha256(obj.password),
            [Op.or]: [
                { userTypeId: 1 },
                { userTypeId: 2 },
                { userTypeId: 3 },
                { userTypeId: 4 },
            ],
            isRemoved: false
        },
        attributes: attributes_1
    });
    if (users.length > 0) {
        users[0] = decryptionObject(users[0]);
    }
    return users;
}

UserQueries.socialLogin = async (email, iss) => {
    return await Users.findAll({
        raw: true,
        where: {
            email: Encryption.encryptSensitiveData(email.toLowerCase()),
            // socialLogin: iss,
            userTypeId: 2
        },
        attributes: attributes_1
    });
}

UserQueries.adminLogin = async (obj) => {
    return await Users.findAll({
        raw: true,
        where: {
            email: Encryption.encryptSensitiveData(obj.email.toLowerCase()),
            password: await Encryption.sha256(obj.password),
            userTypeId: 1
        },
        attributes: attributes_1
    });
}

UserQueries.createPrompt = async (obj) => {
    return await prompts.bulkCreate(obj);
}

UserQueries.createSinglePrompt = async (obj) => {
    return await prompts.create(obj);
}

UserQueries.getPrompts = async () => {
    return await prompts.findAll({
        raw: true
    });
}

UserQueries.getPopup = async (userId) => {
    let user = await Users.findOne({
        raw: true,
        attributes: attributes_2,
        where: {
            userId: userId,
        }
    });
    user = decryptionObject(user);
    return user;
}

UserQueries.setPopup = async (userId, obj) => {
    return await Users.update(obj, {
        where: {
            userId: userId
        },
    });
}

UserQueries.getBotName = async (userId) => {
    return await Users.findAll({
        attributes: attributes_4,
        where: {
            userId: userId,
        },
        raw: true,
        // logging: console.log
    });
}

UserQueries.getVideoType = async (userId) => {
    return await Users.findAll({
        attributes: attributes_4,
        where: {
            userId: userId,
        },
        raw: true,
        // logging: console.log
    });
}

UserQueries.updateBotNameByID = async (obj, userId) => {
    return await Users.update(obj, {
        where: {
            userId: userId
        }
    });
}

//getting prompt from db for documnet assistant
UserQueries.getPromptByType = async (type) => {
    return await prompts.findAll({
        attributes: attributes_5,
        where: {
            type: type,
            isDeleted: 0
        },
        raw: true
    });
};

UserQueries.getActiveUser = async (email) => {
    let users = await Users.findAll({
        raw: true,
        where: {
            email: Encryption.encryptSensitiveData(email.toLowerCase()),
            isRemoved: 0
        },
        attributes: attributes_1
    });
    if (users.length > 0) {
        users[0] = decryptionObject(users[0]);
    }
    return users;
}

UserQueries.makeAdminFromEmail = async (obj, email) => {
    return await Users.update(obj, {
        where: {
            email: Encryption.encryptSensitiveData(email.toLowerCase()),
            isRemoved: 0,
            userTypeId: 2
        }
    });
}

UserQueries.verifyAdminUserByEmail = async (data) => {
    return await Users.findAll({
        raw: true,
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: 0,
            userTypeId: 1
        },
        attributes: attributes_1
    });
}

UserQueries.connectingAdminWithTheirUsers = async (obj, data) => {
    return await Users.update(obj, {
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: 0,
            userTypeId: 2,
            createdBy: {
                [Op.eq]: null
            }
        }
    });
}

UserQueries.connectingGroupsWithTheirUsers = async (obj, data) => {    
    return await Users.update(obj, {
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: false,
            userTypeId: 2,
            groupId: {
                [Op.eq]: null
            },
            createdBy: {
                [Op.eq]: null
            }
        }
    });
}

UserQueries.addNewCompanyUser = async (obj, data) => {    
    return await Users.update(obj, {
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: false,
            userTypeId: 2,
            groupId: {
                [Op.eq]: null
            },
            createdBy: {
                [Op.eq]: null
            },
            companyId: {
                [Op.eq]: null
            }
        }
    });
}


UserQueries.deActivateUser = async (obj, data) => {    
    return await Users.update(obj, {
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            // isRemoved: false
        }
    });
}

UserQueries.findUserIdsFromGroupId = async (groupId) => {    
    return await Users.findAll({
        attributes: attributes_1,
        where: {
            groupId: groupId,
            isRemoved: false,
            userTypeId: 2,
            createdBy: {
                [Op.eq]: null
            }
        },
    });
}

UserQueries.findUserIdFromCompanyId = async (companyId) => {    
    return await Users.findAll({
        attributes: [
                ...attributes_1, 
                [Sequelize.col('companyUsersInfo.companyName'), 'companyName'],
                [Sequelize.col('companyUsersInfo.id'), 'companyId']
            ],
        include: [{ 
            model: Company,
            as: "companyUsersInfo",
            attributes: [],
            where: {
                id: companyId,
                status: true,
            },
        }],
        where: {
            companyId: companyId,
            isRemoved: false,
            userTypeId: 2,
            createdBy: {
                [Op.eq]: null
            }
        },
        raw: true
    });
}

UserQueries.verifyGroupUsers = async (data) => {
    return await Users.findOne({
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: false,
            userTypeId: 2,
            groupId: {
                [Op.eq]: null
            },
            createdBy: {
                [Op.eq]: null
            }
        }
    });
}

UserQueries.verifyCompanyUsers = async (data) => {
    let user = await Users.findOne({
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: false,
            userTypeId: 2,
            groupId: {
                [Op.eq]: null
            },
            companyId: {
                [Op.eq]: null
            },
            createdBy: {
                [Op.eq]: null
            }
        },
        raw:true
    });
    if (user) {
        user = decryptionObject(user);
        return user;
    } else {
        return '';
    }
}

UserQueries.updateUsersForCompany = async (obj, userId) => {
    return await Users.update(obj, {
        where: {
            userId: userId,
        },
    });
}

UserQueries.verifyAdminUserByUserId = async (userId) => {
    return await Users.findAll({
        raw: true,
        where: {
            userId: userId,
            isRemoved: 0,
            userTypeId: 1
        },
        attributes: attributes_1
    });
}

UserQueries.getUserByCreatedBy = async (userId) => {
    let user =  await Users.findAll({
        where: {
            createdBy: userId,
            isRemoved: 0,
            userTypeId: 2
        },
        attributes: attributes_6, 
        raw: true
    });
    user.map(users => decryptionObject2(users));
    return user;
}

UserQueries.findUserWithUuid = async (userUuid) => {
    return await Users.findAll({
        where: {
            userUuid: userUuid,
            isRemoved: 0,
            userTypeId: 2
        },
        attributes: attributes_1,
        raw: true
    });
}

UserQueries.updateAdminUserByUUID = async (obj, userUUid, userId) => {
    return await Users.update(obj, {
        where: {
            userUuid: userUUid,
            createdBy: userId,
            isRemoved: 0,
            userTypeId: 2
        }
    });
}

UserQueries.verifyAdminLogin = async (email, password, userId) => {
    return await Users.findAll({
        raw: true,
        where: {
            email: Encryption.encryptSensitiveData(email.toLowerCase()),
            password: await Encryption.sha256(password),
            userTypeId: 1,
            userId: userId
        }
    });
}

UserQueries.getAllAdmins = async () => {
    let user = await Users.findAll({
        where: {
            isRemoved: 0,
            userTypeId: 1
        },
        attributes: attributes_7,
        raw: true,
    });
    user.map(users => decryptionObject2(users));
    return user;
}

UserQueries.updateCitation = async (obj, userId) => {
    return await Users.update(obj, {
        where: {
            userId: userId,
            isRemoved: 0,
        },
    });
}

UserQueries.getCitation = async (userId) => {
    return await Users.findAll({
        attributes: attributes_8,
        where: {
            userId: userId,
            isRemoved: 0,
        },
    });
}

UserQueries.getUserForLLM = async (userId) => {
    let user = await Users.findOne({
        raw: true,
        attributes: attributes_1,
        where: {
            userId: userId,
            isRemoved: false,
            subscription: false
        }
    });
    if (user) {
        return decryptionObject(user);
    } else {
        return null;
    }
}

UserQueries.verifyAssistantUsers = async (data) => {
    let user = await Users.findOne({
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: false,
            isVerified: true,
            userTypeId: 2,
            subscription: false,
            subscriptionType: 4,
            groupId: {
                [Op.eq]: null
            },
            companyId: {
                [Op.eq]: null
            },
            createdBy: {
                [Op.eq]: null
            },
            firmId: {
                [Op.eq]: null
            }
        },
        raw:true
    });
    if (user) {
        user = decryptionObject(user);
        return user;
    } else {
        return '';
    }
}


UserQueries.verifyAssistantOnly = async (data) => {
    let user = await Users.findOne({
        where: {
            email: Encryption.encryptSensitiveData(data.toLowerCase()),
            isRemoved: false,
            isVerified: true,
            userTypeId: 2,
            subscription: 1,
            subscriptionType: 4,
            groupId: {
                [Op.eq]: null
            },
            companyId: {
                [Op.eq]: null
            },
            createdBy: {
                [Op.eq]: null
            },
            firmId: {
                [Op.not]: null
            }
        },
        raw:true
    });
    if (user) {
        user = decryptionObject(user);
        return user;
    } else {
        return '';
    }
}

UserQueries.getUserByEmailForCaseShare = async (email) => {
    let user = await Users.findAll({
        where: {
            email: Encryption.encryptSensitiveData(email),
            groupId: {
                [Op.eq]: null,
            },
            firmId: {
                [Op.eq]: null,
            },
            companyId: {
                [Op.eq]: null,
            },
            isVerified: true,
            isRemoved: false,
            subscription: true
        },
        raw: true,
        attributes: ['userId', 'email','auto_join', 'userUuid'],
    })
    if (user.length > 0) {
        decryptionObject(user[0]);
    }
    return user;
}

module.exports = UserQueries;
