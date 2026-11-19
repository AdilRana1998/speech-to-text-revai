module.exports = (sequelize, DataTypes) => {
    const RoomKeyword = sequelize.define('roomKeywords', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        roomId: {
            type: DataTypes.INTEGER,
        },
        botId: {
            type: DataTypes.STRING,
        },
        keyword: {
            type: DataTypes.STRING,
        },
    },
        {
            indexes: [
                {
                    unique: true,
                    fields: ['roomId', 'botId', 'keyword']
                }
            ]
        });

    return RoomKeyword
}
