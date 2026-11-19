const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const grokThreads = sequelize.define('grok_threads', {
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
        grokThreadHistoryId: { //foregin key from grok thread chat table
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null
        },
        userId: {
            type: DataTypes.STRING(36),
            allowNull: false,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        threadId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        messageId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        jurisdiction: {
            type: DataTypes.STRING,
            defaultValue: null,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('jurisdiction') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('jurisdiction', transformedData);
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
            type: DataTypes.JSON,
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
        subscription: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        jsonResponse: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return grokThreads;
}