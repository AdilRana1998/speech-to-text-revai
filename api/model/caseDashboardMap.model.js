module.exports = (sequelize, DataTypes) => {
    const caseDashboardMap = sequelize.define('case_dashboard_map', {
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
        tableName: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        tableType: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        tablePrompt: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        combineAccordian: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return caseDashboardMap;
}
