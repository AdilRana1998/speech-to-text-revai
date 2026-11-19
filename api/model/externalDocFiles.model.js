const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const ExternalDocFiles = sequelize.define('external_doc_files', {
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
        batchId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        vectorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
    return ExternalDocFiles;
}
