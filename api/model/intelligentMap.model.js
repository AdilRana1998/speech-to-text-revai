const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const CaseIntelligentMap = sequelize.define('case_intelligent_map', {
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
        },
        responseId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        caseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
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
            get() {
                const rawValue = this.getDataValue('response') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('response', transformedData);
            }
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
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return CaseIntelligentMap;
}