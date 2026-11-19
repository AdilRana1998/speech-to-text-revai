const { sendStatus, Logger } = require("../../utils");
const Recall = require("../../utils/Recall");
const { UserServices, RoomServices, CalendarServices } = require("../services");

exports.getAuthURL = async (req, res, next) => {
      try {
            let { platform } = req.query
            platform = platform || "google"

            let result = {}
            if (platform === "outlook") {
                  result = CalendarServices.getOutlookAuthURL();
            } else {
                  result = CalendarServices.getGoogleAuthURL();
            }
            sendStatus.data.sortStatus(res, req, result.obj, result.message, 'googleAuth', result.statusCode);
      } catch (e) {
            req.logger.exception.message = e.message;
            next(e);
      }
}

exports.getGoogleURL = async (req, res, next) => {
      try {
            let result = CalendarServices.getGoogleAuthURL();
            sendStatus.data.sortStatus(res, req, result.obj, result.message, 'googleAuth', result.statusCode);
      } catch (e) {
            req.logger.exception.message = e.message;
            next(e);
      }
}

exports.createCalendar = async (req, res, next) => {
      try {
            const userId = req.userId
            let { platform, code } = req.jsonObject
            platform = code.includes('scope') ? 'google' : 'outlook'

            console.log("platform", platform)
            let getToken = {}

            if (platform === 'outlook') {
                  getToken = await CalendarServices.getOutlookAuthToken(req.jsonObject);
            } else {
                  getToken = await CalendarServices.getGoogleAuthToken(req.jsonObject);
            }

            console.log("TOKEN", getToken)


            if (!getToken?.obj?.access_token) {
                  if (platform === 'google') {
                        const revokeTokenStaus = await CalendarServices.getRevokeTokenStatus(userId)

                        if (revokeTokenStaus === 200) {
                              sendStatus.data.badRequestStatus(res, res, null, "Your token is revoked please connect your calendar again")
                        } else {
                              sendStatus.data.badRequestStatus(res, res, null, "Your code is expired or invalid please try again")
                        }

                  } else {
                        sendStatus.data.badRequestStatus(res, res, null, "Invalid code")
                  }
                  return
            }

            Logger.data.successLog(getToken.obj, 'createCalendarToken')

            let result = {}
            let calendarId = null

            if (platform === 'outlook') {
                  result = await CalendarServices.createOutlookCalendar(getToken.obj.refresh_token);
            } else {
                  result = await CalendarServices.createGoogleCalendar(getToken.obj.refresh_token);
            }

            calendarId = result?.obj?.id
            console.log("CRATE CALENDAR", calendarId)

            if (!calendarId) {
                  sendStatus.data.badRequestStatus(res, res, null, "Error in creating calendar")
                  return
            }


            Logger.data.successLog(result.obj, 'createCalendarResult')

            await UserServices.updateUser({ googleAuthCode: calendarId }, userId)

            await CalendarServices.deleteCalendarEventsByUserId(userId)
            const events = await Recall.getCalendarEventsV2(calendarId)

            console.log("******EVENTS from calendar******", events)

            await CalendarServices.saveCalendarEventList(events?.results, calendarId, userId)
            await UserServices.saveMeetingScheduleList(events?.results, calendarId, userId)
            sendStatus.data.sortStatus(res, req, events, result.message, 'createCalendarEvents', 200);
      } catch (e) {
            req.logger.exception.message = e.message;
            next(e);
      }
}

exports.setCalendarEvents = async (req, res, next) => {
      try {
            const userId = req.userId
            const user = await UserServices.getUser(req.userId)
            const calendarId = user?.obj?.googleAuthCode

            if (calendarId) {
                  const events = await Recall.getCalendarEventsV2(calendarId)
                  console.log("***** events in setCalendarEvents ****\n", events)
                  const saving = await CalendarServices.saveCalendarEventList(events?.results, calendarId, userId)
                  await UserServices.saveMeetingScheduleList(events?.results, calendarId, userId)

                  sendStatus.data.sortStatus(res, req, saving.obj, saving.message, 'setCalendarEvents', saving.statusCode);
            } else {
                  sendStatus.data.sortStatus(res, req, {}, "no event found", 'setCalendarEvents', 200);
            }

      }
      catch (e) {
            req.logger.exception.message = e.message;
            next(e);
      }
}


exports.webhooktest = async (req, res, next) => {
      try {
            const result = await RoomServices.CalendarUpdateByCalendarId(req.jsonObject)
            sendStatus.data.sortStatus(res, req, result.obj, result?.message, 'scheduleCalendarUpdate', result?.statusCode);

      } catch (e) {
            req.logger.exception.message = e.message;
            next(e);
      }
}

exports.getCalendarEvents = async (req, res, next) => {
      try {
            const userId = req.userId
            const user = await UserServices.getUser(userId)
            if (!user?.obj?.googleAuthCode) {
                  const obj = {
                        message: "You are not authorized"
                  }
                  sendStatus.data.unauthorizedStatus(res, req, obj, "getCalendar");
                  return
            }

            const result = await UserServices.getCalendarEvents(userId);

            let events = result.obj.map((meeting) => {
                  return {
                        id: meeting.dataValues.id,
                        title: meeting?.dataValues?.raw?.summary || meeting?.dataValues?.raw?.subject,
                        startTime: meeting.dataValues.start_time,
                        endTime: meeting.dataValues.end_time,
                        meetingLink: meeting.dataValues.meeting_url,
                        platform: meeting.dataValues.platform,
                        date: meeting.dataValues.start_time.toISOString().split('T')[0],
                        calendar_id: meeting.dataValues.calendar_id
                  };
            });

            const platform = await CalendarServices.getPlatform(userId)

            const response = {
                  events: events,
                  platform
            }

            sendStatus.data.sortStatus(res, req, response, result.message, 'getCalendar', result.statusCode);
      } catch (e) {
            req.logger.exception.message = e.message;
            next(e);
      }
}


exports.deleteCalendar = async (req, res, next) => {
      try {
            const userId = req.userId
            const user = await UserServices.getUser(userId)

            if (!user?.obj?.googleAuthCode) {
                  const obj = {
                        message: "You have no calendar to disconnect"
                  }
                  sendStatus.data.unauthorizedStatus(res, req, obj, "deleteCalendar");
                  return
            }

            await CalendarServices.getRevokeTokenStatus(userId)

            const result = await CalendarServices.deleteCalendar(userId, user?.obj?.googleAuthCode);
            sendStatus.data.sortStatus(res, req, result.obj, result.message, 'deleteCalendar', result.statusCode);
      } catch (e) {
            req.logger.exception.message = e.message;
            next(e);
      }
}