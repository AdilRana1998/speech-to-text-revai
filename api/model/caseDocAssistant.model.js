const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const caseDocAssistant = sequelize.define('case_doc_assistant', {
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
            type: DataTypes.INTEGER, //forwign key from case table
            allowNull: false,
        },
        fileId: {
            type: DataTypes.INTEGER, //forwign key from file tablt
            allowNull: false,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        assistantId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        threadId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        runId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        messageId: {
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
        userNote: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('userNote') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('userNote', transformedData);
            }
        },
        retryCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        status: { // pending, success, failed
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        jsonResponse: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return caseDocAssistant;
}
