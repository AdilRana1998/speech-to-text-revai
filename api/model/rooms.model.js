const Encryptions = require('../../utils/Encryptions');

module.exports = (sequelize, DataTypes) => {
    const Rooms = sequelize.define('rooms', {
        roomId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        roomUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER
        },
        transcript: {
            type: DataTypes.TEXT('long'),
			get() {
				const rawValue = this.getDataValue('transcript') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('transcript', transformedData);
			},
		},
		coreTranscript: {
            type: DataTypes.TEXT('long'),
			get() {
				const rawValue = this.getDataValue('coreTranscript') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('coreTranscript', transformedData);
			}
		},
		enhancedTranscript: {
            type: DataTypes.TEXT('long'),
			get() {
				const rawValue = this.getDataValue('enhancedTranscript') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('enhancedTranscript', transformedData);
			}
		},
		promptType: DataTypes.INTEGER,
		meetingType: DataTypes.STRING,
        unMappedLength: {
            type: DataTypes.INTEGER,
        },
        mappedLength: {
            type: DataTypes.INTEGER,
        },
        actionItem: {
			type: DataTypes.TEXT,
			get() {
				const rawValue = this.getDataValue('actionItem') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('actionItem', transformedData);
			},
		},
        meetingLink: DataTypes.STRING,
        title: DataTypes.STRING,
        agenda: DataTypes.STRING,
        otherContext: DataTypes.STRING,
        recordingUrl: DataTypes.TEXT,
        summary: {
			type: DataTypes.TEXT,
			get() {
				const rawValue = this.getDataValue('summary') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('summary', transformedData);
			},
		},
		mindMap: {
			type: DataTypes.TEXT,
			get() {
				const rawValue = this.getDataValue('mindMap') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('mindMap', transformedData);
			},
		},
		finalSummary: {
			type: DataTypes.TEXT,
			get() {
				const rawValue = this.getDataValue('finalSummary') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('finalSummary', transformedData);
			},
		},
        productivityScores: DataTypes.TEXT,
		suggestions: DataTypes.TEXT,
		inconsistencies: DataTypes.TEXT,
        objectives: DataTypes.TEXT,
		whiteboard: DataTypes.TEXT,
		participationLevel: DataTypes.TEXT,
		keywords: DataTypes.TEXT,
        startTime: DataTypes.DATE,
        endTime: DataTypes.DATE,
        botStatus: DataTypes.STRING,
        botName: {
            type: DataTypes.STRING
        },
        botId: {
            unique: true,
            type: DataTypes.STRING,
        },
        retryCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        jsonResponse: {
            type: DataTypes.TEXT('long'),
        },
		add_agenda: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: null,
		},
		old_botId: {
			type: DataTypes.STRING,
			allowNull: true,
			defaultValue: null,
		},
		isEnhanced : {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: null,
		},
		interviewId : {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: null,
		},
		recallVideoStatus : {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: null,
		},
    });

    return Rooms
}
