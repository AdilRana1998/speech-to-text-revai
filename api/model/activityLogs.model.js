module.exports = (sequelize, DataTypes) => {
    const activityLogs = sequelize.define('activity_logs', {
        id: {
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        activityUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        activityType: { //it will define the api route or activity like one of many assistant
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means not avaiable to use
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return activityLogs;
}
