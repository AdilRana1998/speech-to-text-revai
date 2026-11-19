const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const CaseFiles = sequelize.define('case_files', {
        id: {
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        fileUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        caseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('fileName') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('fileName', transformedData);
			}
        },
        filePath: {
            type: DataTypes.TEXT,
            allowNull: false,
            get() {
				const rawValue = this.getDataValue('filePath') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('filePath', transformedData);
			}
        },
        fileType: {
            type: DataTypes.BOOLEAN, //1 is only audio file, other text file will be 0
            allowNull: false,
            defaultValue: false,
        },
        fileTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
        isOpenAIProcessed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }, 
        openAIFileId: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
        },
        isProcessed: {
            type: DataTypes.BOOLEAN, //1 is for if file is converted to text 0 is for pending
            allowNull: false,
            defaultValue: false,
        },
        isFileUpdated: {
            type: DataTypes.BOOLEAN, //1 is for if file is converted to text 0 is for pending
            allowNull: false,
            defaultValue: false,
        },
        isFileDeleted: {
            type: DataTypes.BOOLEAN, //1 is for if file is converted to text 0 is for pending
            allowNull: false,
            defaultValue: false,
        },
        isReport: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: null,
        },
        vectorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        isCitation: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: null,
        },
        isDocProcessed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }, 
        transcript: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            get() {
				const rawValue = this.getDataValue('transcript') ?? '';
				return Encryptions.decryptSensitiveData(rawValue);
			},
			set(value) {
				const transformedData = Encryptions.encryptSensitiveData(value);
				this.setDataValue('transcript', transformedData);
			}
        }, 
        status: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means not avaiable to use
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return CaseFiles;
}
