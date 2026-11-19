const { Strings } = require("../../utils");
const Google = require("../../utils/Google");
const Outlook = require("../../utils/Outlook");
const Recall = require("../../utils/Recall");
const { CalendarQueries } = require("../queries");
const UserServices = require("./users.services");

exports.getGoogleAuthToken = async (obj) => {
      const result = await Google.getToken(obj.code);
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}

exports.getOutlookAuthToken = async (obj) => {
      const result = await Outlook.getToken(obj.code);
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}


exports.getGoogleAuthURL = () => {
      const result = Google.authorizationUrl;
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}

exports.getOutlookAuthURL = () => {
      const result = Outlook.getURL();
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}


exports.createGoogleCalendar = async (token) => {
      const result = await Recall.createGoogleCalendar(token);
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}

exports.createOutlookCalendar = async (token) => {
      const result = await Recall.createOutlookCalendar(token);
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}

exports.deleteCalendar = async (userId, calendarId) => {
      const result = await Recall.deleteCalendar(calendarId);
      await UserServices.updateUser({ googleAuthCode: null }, userId)
      const res = await this.deleteCalendarEventsByUserId(userId)
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}


exports.calendarEventList = async (calendarId) => {
      const result = await Recall.calendarEventList(calendarId);
      // const result = await getRecall(`/calendar-events/?calendar_id=${calendarId}`);
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}


exports.deleteCalendarEventsByUserId = async (userId) => {
      const result = await CalendarQueries.deleteCalendarEventsByUserId(userId);
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}

exports.deleteCalendarEventsByCalendarId = async (calendarId) => {
      const result = await CalendarQueries.deleteCalendarEventsByCalendarId(calendarId);
      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
      }
}

exports.saveCalendarEventList = async (arr, calendar_id, user_id) => {

      const data = []

      arr.forEach(elem => {
            const obj = {
                  ...elem,
                  email: elem?.raw?.creator?.email,
                  event_id: elem.id,
                  calendar_id,
                  user_id
            }

            delete obj.id
            data.push(obj)
      })

      await CalendarQueries.bulkCreate(data);

      return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {}
      }
}

exports.getRevokeTokenStatus = async (userId) => {
      const user = await UserServices.getUser(userId)
      const calendar = await Recall.getCalendar(user?.obj?.googleAuthCode)

      let revoke = {}
      if (calendar.platform === 'google_calendar') {
            revoke = await Google.revokeToken(calendar?.oauth_refresh_token)
      }

      return revoke?.status || 400
}

exports.getPlatform = async (userId) => {
      const user = await UserServices.getUser(userId)
      const calendar = await Recall.getCalendar(user?.obj?.googleAuthCode)

      return calendar?.platform
}