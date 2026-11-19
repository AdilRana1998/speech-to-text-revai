module.exports = (sequelize, DataTypes) => {
    const IncCaseReportSection = sequelize.define('inc_case_reports_section', {
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
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        incCaseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        reportType: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title: {
            type: DataTypes.TEXT('long'),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
    return IncCaseReportSection;
}