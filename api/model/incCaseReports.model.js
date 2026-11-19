const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const IncCaseReports = sequelize.define('inc_case_reports', {
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
        summaryName: {
            type: DataTypes.STRING,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('summaryName') ?? '';
                return Encryptions.decryptSensitiveData(rawValue);
            },
            set(value) {
                const transformedData = Encryptions.encryptSensitiveData(value);
                this.setDataValue('summaryName', transformedData);
            }
        },
        jobUuid: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        incCaseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        isProcessed: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: false, //0 for the pending , 1 , 2
        },
        isCombined: {
            type: DataTypes.BOOLEAN,
            defaultValue: false, //0 not combine report
            allowNull: false,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        status: {
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
    return IncCaseReports;
}