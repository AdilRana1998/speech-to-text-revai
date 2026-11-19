const { Op } = require('sequelize');

const Queries = {};
const db = require('../model').calendarEvents;

Queries.bulkCreate = async (arr) => {
      return await db.bulkCreate(arr)
} 

Queries.getAll = async (filter) => {
      return await db.findAll({
            // order: [['start_time']],
            // order: [['id', 'DESC']],
            order: [['start_time', 'DESC']],
            where: {
                  // start_time: {
                  //       [Op.between]: [new Date('2023-11-01'), new Date('2023-11-30')],
                  // },
                  ...filter
            },
      });
}

Queries.update = async (obj, filter) => {
      return await db.update(obj, {
            where: filter
      });
}

Queries.upsert = async (obj, filter) => {
      return await db.upsert(obj, {
            where: filter
      });
}


Queries.deleteCalendarEventsByUserId = async (user_id) => {
      return await db.destroy({
            where: {
                  user_id
            }
      });
}

Queries.deleteCalendarEventsByCalendarId = async (calendar_id) => {
      return await db.destroy({
            where: {
                  calendar_id
            }
      });
}



module.exports = Queries;