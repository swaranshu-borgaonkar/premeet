/**
 * Calendar Provider Adapter
 * Provides a unified interface for Google Calendar and Microsoft Outlook.
 * Each provider normalizes events to a standard CalendarEvent shape.
 *
 * Standard CalendarEvent shape:
 * {
 *   id: string,
 *   provider: 'google' | 'microsoft',
 *   title: string,
 *   start: string (ISO 8601),
 *   end: string (ISO 8601),
 *   attendees: [{ email, name, self, responseStatus }],
 *   location: string | null,
 *   description: string | null,
 *   recurringEventId: string | null,
 * }
 */

import { fetchGoogleEvents } from './calendar-google.js';
import { fetchMicrosoftEvents } from './calendar-microsoft.js';

/**
 * Fetch upcoming events from the user's configured calendar provider
 * @param {string} provider - 'google' or 'microsoft'
 * @param {Object} options - { timeMin, timeMax } as Date objects
 * @returns {Promise<CalendarEvent[]>}
 */
export async function fetchEvents(provider, options = {}) {
  const now = options.timeMin || new Date();
  const timeMax = options.timeMax || new Date(now.getTime() + 15 * 60 * 1000);

  switch (provider) {
    case 'microsoft':
      return await fetchMicrosoftEvents(now, timeMax);
    case 'google':
    default:
      return await fetchGoogleEvents(now, timeMax);
  }
}

/**
 * Get the display name for a calendar provider
 */
export function getProviderDisplayName(provider) {
  switch (provider) {
    case 'microsoft': return 'Microsoft Outlook';
    case 'google': return 'Google Calendar';
    default: return 'Calendar';
  }
}
