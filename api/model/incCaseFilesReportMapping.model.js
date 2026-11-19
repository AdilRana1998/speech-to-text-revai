module.exports = (sequelize, DataTypes) => {
    const IncCaseFilesReportMapping = sequelize.define('inc_case_files_report_mapping', {
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
        incCaseId: { //foregin key from inc_case table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        fileId: { //foregin key from inc_case_files table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        reportId: { //foregin key from inc_case_reports table
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means not avaiable to use
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
    return IncCaseFilesReportMapping;
}