const RoomImages = {};
const db = require('../model').roomImages

RoomImages.create = async (obj) => {
      return await db.create(obj);
}

RoomImages.getImagesByBotId = async (botId) => {
      return await db.findAll({
            where: {
                  botId
            }
      });
}

RoomImages.updateImages = async (obj, botId) => {
      return await db.update(obj, {
            where: {
                  botId
            }
      });
}

module.exports = RoomImages;