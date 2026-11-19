const Queries = {};
const dbModel = require('../model');
const db = dbModel.otp; 
const Op = dbModel.op;
const attributes_1 = ['id', 'userId', 'otpCode', 'otpHash', 'otpType', 'isUsed', 'isExpired', 'createdAt'];
const attributes_2 = ['otpUuid'];
const attributes_3 = ['otpUuid', 'isExpired'];
const currentDateTime = new Date();
const { Encryption } = require('../../utils');


Queries.create = async (obj) => {
    const result = await db.create(obj, 
        {  
            returning: true 
        });
    return result; 
}

Queries.getEntry = async (otpType, otpCode, otpUuid) => {
    return await db.findOne({
        where: {
            otpUuid: otpUuid,
            isUsed: false,
            isEmailSent: false,
            otpType: otpType,
            otpCode: Encryption.encryptSensitiveData(otpCode.toString())
        },
        raw:true,
        attributes: attributes_1,
    });
}

Queries.getVerificationStatus = async (otpUuid) => {
    return await db.findOne({
        where: {
            otpUuid: otpUuid,
            isUsed: false,
            isEmailSent: true,
            is_verified: true,
        },
        attributes: attributes_1,
    });
}

Queries.update = async (obj, id) => {
    return await db.update(obj, {
        where: {
            id: id
        }
    });
}

Queries.getOTP = async (id) => {
    let data = await db.findOne({
        order: [['id', 'desc']],
        where: {
            userId: id
        },
        attributes: ['otpCode']
    });
    data = decryptionArray(data);
    return data;
} 

Queries.validateOtp = async () => {  
    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() - 0); // chnage to zero, as we receive all calender events in UTC
    const fiveMinutesAgo = new Date(currentDateTime - 5 * 60 * 1000);
    return await db.findAll({
        attributes: attributes_2,
        where: {
            createdAt: {
                [Op.lt]: fiveMinutesAgo
            },
            isUsed: 0,
            isExpired: 0
        },
        raw: true,
        // logging: console.log
    });
}

Queries.validateOtpRegeration = async (userId) => {
    return await db.findAll({
        attributes: attributes_2,
        where: {
            userId: userId,
            isUsed: false,
            isVerified: false,
            isEmailSent: false,
            isExpired: false
        },
        raw: true
    });
}

Queries.findExpired = async (userId, otpUuid) => {
    return await db.findAll({
        attributes: attributes_3,
        where: {
            userId: userId,
            // isExpired: true,
            otpUuid: otpUuid
        },
        raw: true
    });
}

Queries.expireOtp = async (obj, otpUuid) => {
    return  await db.update(obj, {
        where: {
            otpUuid: otpUuid,
            isUsed: 0,
            isExpired: 0
        }
    });
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
    if (obj.otpCode) {
        obj.otpCode = Encryption.decryptSensitiveData(obj.otpCode)
    }
    return obj;
}

module.exports = Queries;