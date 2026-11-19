const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const kolabryaAssistant = sequelize.define('kolabrya_assistants', {
        id: {
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        requestUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            unique: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        caseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        fileDetails: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
				const rawValue = this.getDataValue('fileDetails') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('fileDetails', transformedData);
			}
        },
        isCitation: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        featureType: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        responseId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        request: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('request') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('request', transformedData);
			}
        },
        response: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            defaultValue: null,
            get() {
				const rawValue = this.getDataValue('response') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('response', transformedData);
			}
        },
        userQuery: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('userQuery') ?? '';
                return Encryptions.decryptSensitiveData(rawValue); 
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('userQuery', transformedData);
            },
        },
        retryCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: null,
        },
        isActivated: { 
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        jsonResponse: { 
            type: DataTypes.TEXT,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return kolabryaAssistant;
}
