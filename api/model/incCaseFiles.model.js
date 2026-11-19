const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const IncCaseFiles = sequelize.define('inc_case_files', {
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
        incCaseId: { //foregin key from grok thread table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        pageCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        fileSize: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
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
        folderPath: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('folderPath') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('folderPath', transformedData);
            }
        },
        reviewers: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            defaultValue: null,
            get() {
                const rawValue = this.getDataValue('reviewers') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('reviewers', transformedData);
            }
        },
        caseFileTypes: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
        fileSummary: {
            type: DataTypes.JSON, 
            allowNull: true,
            defaultValue: null
        },
        isProcessed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isCombined: {
            type: DataTypes.BOOLEAN,
            defaultValue: false, //0 not combine report
            allowNull: false,
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
        isFileUpdated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isFileDeleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        vectorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means not avaiable to use
            allowNull: false,
            defaultValue: false,
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
    return IncCaseFiles;
}