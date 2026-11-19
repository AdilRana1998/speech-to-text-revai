module.exports = (sequelize, DataTypes) => {
    const InterViewObjectives = sequelize.define('interview_objectives', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        objectiveUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        botId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        objective: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.BOOLEAN, //1 means avaiable for use. 0 means already used by specific rooms
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE
        }
    });
    return InterViewObjectives;
}