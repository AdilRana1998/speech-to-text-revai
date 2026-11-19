module.exports = (sequelize, DataTypes) => {
    const Prompts = sequelize.define('prompts', {
        promptsId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        promptsUuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        title: DataTypes.STRING,
        request: DataTypes.TEXT,
        type: DataTypes.INTEGER,
        prompt: {
            type: DataTypes.TEXT,
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });

    return Prompts
}