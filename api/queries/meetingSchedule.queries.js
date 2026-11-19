const Queries = {};
const db = require('../model').meetingSchedule;

Queries.bulkCreate = async (arr) => {
      return await db.bulkCreate(arr)
}

Queries.getAll = async (filter) => {
      return await db.findAll({
            order: [['start_time']],
            where: {
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


Queries.deleteMeetingScheduleByUserId = async (user_id) => {
      return await db.destroy({
            where: {
                  user_id
            }
      });
}

Queries.deleteMeetingScheduleByCalendarId = async (calendar_id) => {
      return await db.destroy({
            where: {
                  calendar_id
            }
      });
}



module.exports = Queries;