module.exports = (sequelize, DataTypes) => {
    const IncCaseFiles = sequelize.define('inc_case_reports_summary', {
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
        record_uuid: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        incCaseId: { //foregin key from grok thread table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        reportId: { //foregin key from grok thread table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        date: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        summary: {
            type: DataTypes.TEXT('long'),
            allowNull: true,
            defaultValue: null
        },
        reference: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        section: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        fileType: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        pages: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null
        },
        duplicate_flag: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        duplicate_info: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null
        },
        insurer_decision: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
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
    return IncCaseFiles;
}