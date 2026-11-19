module.exports = (sequelize, DataTypes) => {
    const IncCaseReportDownload = sequelize.define('inc_case_reports_summary_download_manager', {
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
    return IncCaseReportDownload;
}
