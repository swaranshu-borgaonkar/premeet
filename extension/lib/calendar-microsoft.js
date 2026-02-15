/**
 * Microsoft Calendar Provider
 * Fetches and normalizes events from Microsoft Graph API
 */

import { getMicrosoftToken } from './auth.js';
import { RateLimiter } from './rate-limiter.js';
import { captureBreadcrumb } from './sentry.js';

const rateLimiter = new RateLimiter('microsoftCalendarRateLimit');
const MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0';

/**
 * Fetch Microsoft Calendar events within a time range
 * @param {Date} timeMin
 * @param {Date} timeMax
 * @returns {Promise<CalendarEvent[]>} Normalized events
 */
export async function fetchMicrosoftEvents(timeMin, timeMax) {
  const token = await getMicrosoftToken();
  if (!token) return [];

  const params = new URLSearchParams({
    startDateTime: timeMin.toISOString(),
    endDateTime: timeMax.toISOString(),
    $orderby: 'start/dateTime',
    $top: '50',
    $select: 'id,subject,start,end,attendees,location,bodyPreview,seriesMasterId,isAllDay,webLink',
  });

  const response = await rateLimiter.execute(() =>
    fetch(`${MICROSOFT_GRAPH_API}/me/calendarView?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    })
  );

  if (!response.ok) {
    if (response.status === 401) {
      captureBreadcrumb('Microsoft token expired during calendar fetch', 'calendar', 'warning');
      return [];
    }
    throw new Error(`Microsoft Calendar API error: ${response.status}`);
  }

  const data = await response.json();
  let events = (data.value || [])
    .filter(event => {
      if (!event.attendees || event.attendees.length === 0) return false;
      if (event.isAllDay) return false;
      return true;
    })
    .map(normalizeMicrosoftEvent);

  // Handle pagination if @odata.nextLink exists
  let nextLink = data['@odata.nextLink'];
  while (nextLink) {
    const nextResponse = await rateLimiter.execute(() =>
      fetch(nextLink, {
        headers: {
          Authorization: `Bearer ${token}`,
          Prefer: 'outlook.timezone="UTC"',
        },
      })
    );

    if (!nextResponse.ok) break;

    const nextData = await nextResponse.json();
    const moreEvents = (nextData.value || [])
      .filter(event => {
        if (!event.attendees || event.attendees.length === 0) return false;
        if (event.isAllDay) return false;
        return true;
      })
      .map(normalizeMicrosoftEvent);

    events = events.concat(moreEvents);
    nextLink = nextData['@odata.nextLink'];
  }

  return events;
}

/**
 * Fetch Microsoft Calendar events for a full day (used for batch prep)
 * @param {Date} dayStart
 * @param {Date} dayEnd
 * @returns {Promise<CalendarEvent[]>}
 */
export async function fetchMicrosoftEventsForDay(dayStart, dayEnd) {
  return fetchMicrosoftEvents(dayStart, dayEnd);
}

/**
 * Normalize a Microsoft Calendar event to the standard shape
 */
function normalizeMicrosoftEvent(event) {
  // Determine which attendee is "self" (the organizer or the user)
  const attendees = (event.attendees || []).map(a => {
    const isSelf = a.type === 'required' && a.status?.response === 'organizer';
    return {
      email: a.emailAddress?.address || '',
      name: a.emailAddress?.name || a.emailAddress?.address || '',
      self: isSelf,
      responseStatus: mapMicrosoftResponseStatus(a.status?.response),
    };
  });

  // Microsoft returns dateTime without 'Z' when timezone is specified
  let startIso = event.start?.dateTime || '';
  let endIso = event.end?.dateTime || '';

  // Ensure ISO format with timezone
  if (startIso && !startIso.endsWith('Z') && !startIso.includes('+')) {
    startIso += 'Z';
  }
  if (endIso && !endIso.endsWith('Z') && !endIso.includes('+')) {
    endIso += 'Z';
  }

  return {
    id: event.id,
    provider: 'microsoft',
    title: event.subject || 'Untitled Event',
    start: startIso,
    end: endIso,
    attendees,
    location: event.location?.displayName || null,
    description: event.bodyPreview || null,
    recurringEventId: event.seriesMasterId || null,
    htmlLink: event.webLink || null,
  };
}

/**
 * Map Microsoft response status to Google-compatible values
 */
function mapMicrosoftResponseStatus(msStatus) {
  switch (msStatus) {
    case 'accepted': return 'accepted';
    case 'tentativelyAccepted': return 'tentative';
    case 'declined': return 'declined';
    case 'organizer': return 'accepted';
    default: return 'needsAction';
  }
}
