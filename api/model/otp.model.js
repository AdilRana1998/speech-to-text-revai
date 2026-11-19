const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const OTP = sequelize.define('otp', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        otpUuid: { 
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
        },
        otpCode: {
            type: DataTypes.STRING,
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('otpCode') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('otpCode', transformedData);
			},
        },
        otpType: {
            type: DataTypes.INTEGER,
        },
        otpHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        isEmailSent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isUsed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isExpired: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return OTP;
}