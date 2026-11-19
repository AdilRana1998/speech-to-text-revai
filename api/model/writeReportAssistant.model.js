module.exports = (sequelize, DataTypes) => {
    const kolabryaSummaryFiles = sequelize.define('kolabrya_summary_files', {
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
        summaryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        fileId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        isProcessed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        status: {
            type: DataTypes.BOOLEAN, // 1 = available, 0 = not available
            allowNull: false,
            defaultValue: false,
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE,
        }
    });
    return kolabryaSummaryFiles;
};
