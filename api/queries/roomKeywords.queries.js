const { Sequelize, Op } = require("sequelize");
const endpoints = require("../external/endpoint");
const RoomKeywords = {};
const db = require('../model').roomKeywords;
const dbRooms = require('../model').rooms;
const attributes_1 = ['id', 'botId', 'roomId', 'keyword']
const socketUrl = process.env.URL_SOCKET_CORE
const { getChatHistory } = require('../external/index')
let current_room_new_topics;
let current_bot_id;
RoomKeywords.create = async (obj) => {
  return await db.upsert(obj);
}
RoomKeywords.getRoomIds = async (keywords2, userId, botId) => {
  const keywords = keywords2;
  current_bot_id = botId;
  current_room_new_topics = keywords;
  const results = await db.findAll({
    attributes: [
      'keyword',
      'botId', 'id'
    ],
    include: [{
      model: dbRooms,
      as: "roomInfo",
      where: {
        userId: userId
      },
      attributes: ['roomId']
    }],
    where: {
      botId: {
        [Sequelize.Op.ne]: botId
      },
    },
    order: [
      ['id', 'DESC'],
    ],
    // logging: console.log,
    limit: 20
  });
  const roomKeywordMap = {};
  results.forEach((result) => {
    const { botId, keyword } = result;
    if (!roomKeywordMap[botId]) {
      roomKeywordMap[botId] = [];
    }
    if (!roomKeywordMap[botId].includes(keyword)) {
      roomKeywordMap[botId].push(keyword);
    }
  });
  const previousRoomKeywords = await getPreviousRoomKeywords(userId, current_bot_id);
  const fetch_current_room_old_topic = await get_current_room_old_topic(userId, current_bot_id);
  const resultArray = {
    "previous_room_topics": previousRoomKeywords,
    "botID": current_bot_id,
    "current_room_new_topics": { [current_bot_id]: current_room_new_topics },
    "current_room_old_topics": fetch_current_room_old_topic.map(result => result.keyword)
  };
  // const apiData = await getChatHistory(resultArray);
  // console.log("---------------------- JSON PAYLOAD -----------------------------");
  // console.log(""); 
  // console.log(resultArray);
  // console.log("---------------------- JSON PAYLOAD -----------------------------");
  // console.log("---------------------- apiData -----------------------------"); 
  // console.log(apiData);
  // console.log(""); 
  // console.log("---------------------- apiData -----------------------------");

  // Convert the object to the desired format
  const dataArray = Object.entries(roomKeywordMap).map(([botId, keywords]) => ({
    botID: botId, // Convert roomId to integer if needed
    webhook_url: socketUrl + endpoints.socketCore.Rooms.updateFrontend,
    keywords,
  }));

  return dataArray;
}
async function getPreviousRoomKeywords(userId, current_bot_id) {
  const previous_room_bot_Id = await db.findAll({
    attributes: [
      'botId',
      [Sequelize.fn('MAX', Sequelize.col('roomInfo.createdAt')), 'maxCreatedAt']
    ],
    include: [{
      model: dbRooms,
      as: "roomInfo",
      attributes: [],
      where: {
        userId: userId
      },
    }],
    where: {
      botId: {
        [Sequelize.Op.ne]: current_bot_id
      },
    },
    group: ['botId', 'roomInfo.createdAt'],
    order: [[Sequelize.fn('MAX', Sequelize.col('roomInfo.createdAt')), 'DESC']],
    // logging: console.log,
    // raw: true
  });
  const botIdToKeywords = {};
  for (const data of previous_room_bot_Id) {
    const get_bot_id = data.botId;
    try {
      const check = await db.findAll({
        attributes: ['keyword'],
        include: [{
          model: dbRooms,
          as: "roomInfo",
          where: {
            userId: userId
          },
        }],
        where: {
          botId: {
            [Sequelize.Op.eq]: get_bot_id
          },
        },
        order: [
          ['id', 'DESC'],
        ],
        // logging: console.log,
        // limit: 5
      });
      const getopics = check.map(result => result.keyword);
      botIdToKeywords[get_bot_id] = getopics;
    } catch (error) {
      console.error("Error fetching keywords:", error);
    }
  }
  return botIdToKeywords;
}
async function get_current_room_old_topic(userId, current_bot_id) {
  const currentDateTime = new Date();
  return await db.findAll({
    attributes: [
      'keyword',
    ],
    include: [{
      model: dbRooms,
      as: "roomInfo",
      where: {
        userId: userId,
        createdAt: {
          [Sequelize.Op.lt]: currentDateTime
        }
      },
    }],
    where: {
      botId: {
        [Sequelize.Op.eq]: current_bot_id
      },
    },
    order: [
      ['id', 'DESC'],
    ]
    // ,logging: console.log  
    // ,raw : true
  });
}
module.exports = RoomKeywords;
