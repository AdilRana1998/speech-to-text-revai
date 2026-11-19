const Encryptions = require('../../utils/Encryptions');
module.exports = (sequelize, DataTypes) => {
    const incCaseSummaryReport = sequelize.define('inc_case_summary_report', {
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
        jobUuid: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        incCaseId: { //foregin key from inc_case table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        reportId: { //foregin key from inc_case_reports table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        reportType: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        threadId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        messageId: {
            type: DataTypes.STRING,
            allowNull: true,
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
            allowNull: true,
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
        citations: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        status: { // pending, success, failed
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        jsonResponse: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return incCaseSummaryReport;
}
