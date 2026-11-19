const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const grokFiles = sequelize.define('grok_files', {
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
        grokThreadId: { //foregin key from grok thread table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.STRING(36),
            allowNull: false,
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
        fileHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        fileType: {
            type: DataTypes.BOOLEAN, //0 is only external attachment
            allowNull: false,
            defaultValue: false,
        },
        isProcessed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return grokFiles;
}