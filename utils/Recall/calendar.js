const moment = require('moment');
const { getRecall, postRecall } = require('../../api/external/ChatGPT');
const { webhooks, keys } = require('../../config');

module.exports = (sdk) => {
    const createGoogleCalendar = async (oauth_refresh_token) => {
        const obj = {
            platform: "google_calendar",
            oauth_client_id: keys.googleOAuthClientId,
            oauth_client_secret: keys.googleOAuthClientSecret,
            oauth_refresh_token: oauth_refresh_token,
            webhook_url: webhooks.bot
        }

        return await postRecall(obj, 'calendars')
    }

    const createOutlookCalendar = async (oauth_refresh_token) => {
        const obj = {
            platform: 'microsoft_outlook',
            oauth_client_id: keys.outlookOAuthClientId,
            oauth_client_secret: keys.outlookOAuthSecret,
            oauth_refresh_token: oauth_refresh_token,
            webhook_url: webhooks.bot
        }

        return await postRecall(obj, 'calendars')
    }

    const calendarEventList = async (id) => {
        const data = await sdk.calendar_events_list({ calendar_id: id })
        return data;
    }

    const calendarEvent = async (id) => {
        const data = await sdk.calendars_retrieve({ id: id })
        return data;
    }

    const deleteCalendar = async (id) => {
        const data = await sdk.calendars_destroy({ id })
        return data;
    }

    const getCalendarEventsV2 = (calendar_id, greaterThanDate) => {
        let query = `/calendar-events/?calendar_id=${calendar_id}`

        if (greaterThanDate) {
            const date = moment.utc(greaterThanDate).format('YYYY-MM-DD HH:mm:ss')
            query += `&updated_at__gte=${date}`
        }

        return getRecall(query)
    }

    const getCalendar = async (calendarId) => {
        return await getRecall(`/calendars/${calendarId}`)
    }

    return {
        createGoogleCalendar, calendarEventList, calendarEvent, deleteCalendar, getCalendarEventsV2, createOutlookCalendar, getCalendar
    };
}
