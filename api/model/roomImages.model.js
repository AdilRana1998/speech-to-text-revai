module.exports = (sequelize, DataTypes) => {
      const RoomImages = sequelize.define('roomImages', {
            botId: {
                  type: DataTypes.STRING,
            },
            images: {
                  type: DataTypes.JSON
            }
      });

      return RoomImages
}