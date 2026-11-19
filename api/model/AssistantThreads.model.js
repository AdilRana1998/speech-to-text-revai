const Encryptions = require('../../utils/Encryptions');

module.exports = (sequelize, DataTypes) => {
    const Assistant = sequelize.define('assistant_threads', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        requestUuid: {
            type: DataTypes.UUID, 
            defaultValue: DataTypes.UUIDV4,
            allowNull: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        botId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        assistantId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        threadId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        runId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        stepId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        messageId: { 
            type: DataTypes.STRING,
            allowNull: true,
        },
        caseId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        question: { 
            type: DataTypes.TEXT('long'),
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('question') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('question', transformedData);
			},
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
        answer: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
				const rawValue = this.getDataValue('answer') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('answer', transformedData);
			},
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        kolabryaAssistant: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        like: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        feedBack: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
				const rawValue = this.getDataValue('feedBack') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('feedBack', transformedData);
			},
        },
        jsonResponse: { 
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
				const rawValue = this.getDataValue('jsonResponse') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('jsonResponse', transformedData);
			},
        },
        isCitation: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        citationStatus: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        retryCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
		groupId:{
			type: DataTypes.INTEGER,
			allowNull: true
		},
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return Assistant;
}
