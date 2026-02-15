/**
 * Google Calendar Provider
 * Fetches and normalizes events from Google Calendar API v3
 */

import { getGoogleToken } from './auth.js';
import { RateLimiter } from './rate-limiter.js';
import { captureBreadcrumb } from './sentry.js';

const rateLimiter = new RateLimiter('googleCalendarRateLimit');
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/**
 * Fetch Google Calendar events within a time range
 * @param {Date} timeMin
 * @param {Date} timeMax
 * @returns {Promise<CalendarEvent[]>} Normalized events
 */
export async function fetchGoogleEvents(timeMin, timeMax) {
  const token = await getGoogleToken();
  if (!token) return [];

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await rateLimiter.execute(() =>
    fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );

  if (!response.ok) {
    if (response.status === 401) {
      captureBreadcrumb('Google token expired during calendar fetch', 'calendar', 'warning');
      return [];
    }
    throw new Error(`Google Calendar API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.items || [])
    .filter(event => {
      if (!event.attendees || event.attendees.length === 0) return false;
      if (!event.start.dateTime) return false; // Skip all-day events
      return true;
    })
    .map(normalizeGoogleEvent);
}

/**
 * Fetch Google Calendar events for a full day (used for batch prep)
 * @param {Date} dayStart
 * @param {Date} dayEnd
 * @returns {Promise<CalendarEvent[]>}
 */
export async function fetchGoogleEventsForDay(dayStart, dayEnd) {
  return fetchGoogleEvents(dayStart, dayEnd);
}

/**
 * Normalize a Google Calendar event to the standard shape
 */
function normalizeGoogleEvent(event) {
  return {
    id: event.id,
    provider: 'google',
    title: event.summary || 'Untitled Event',
    start: event.start.dateTime,
    end: event.end.dateTime,
    attendees: (event.attendees || []).map(a => ({
      email: a.email,
      name: a.displayName || a.email,
      self: a.self || false,
      responseStatus: a.responseStatus,
    })),
    location: event.location || null,
    description: event.description || null,
    recurringEventId: event.recurringEventId || null,
    htmlLink: event.htmlLink || null,
  };
}
