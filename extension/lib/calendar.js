/**
 * Calendar orchestration layer
 * Uses calendar-adapter to fetch events from the configured provider,
 * then handles contact discovery, notification scheduling, and caching.
 */

import { captureException, captureBreadcrumb } from './sentry.js';
import { getConfig } from './config.js';
import { putToStore, getAllFromStore } from './cache.js';
import { discoverContacts } from './contacts.js';
import { showPrepNotification, showNoteReminderNotification } from './notifications.js';
import { getCachedPrep, generatePrep } from './supabase.js';
import { fetchEvents } from './calendar-adapter.js';
import { RateLimiter } from './rate-limiter.js';

const rateLimiter = new RateLimiter('calendarRateLimit');

// Track which events we've already notified about to avoid duplicates
const notifiedEvents = new Set();

/**
 * Check for upcoming appointments in the next 15 minutes.
 * Called every 5 minutes by the background alarm.
 */
export async function checkUpcomingAppointments() {
  try {
    const { user, calendarProvider } = await chrome.storage.local.get(['user', 'calendarProvider']);
    if (!user) return [];

    // Check business hours
    if (user.timezone && !rateLimiter.isBusinessHours(user.timezone)) {
      captureBreadcrumb('Outside business hours, skipping calendar check', 'calendar');
      return [];
    }

    const provider = calendarProvider || 'google';
    const events = await fetchEvents(provider);

    // Cache events locally
    for (const event of events) {
      await putToStore('calendar_events', event);
    }

    // Process each event: discover contacts, schedule notifications
    for (const event of events) {
      await discoverContacts(event, user.id);
      await schedulePreNotification(event, user.id);
      await schedulePostSessionReminder(event);
    }

    captureBreadcrumb(`Found ${events.length} upcoming events via ${provider}`, 'calendar');
    return events;
  } catch (error) {
    captureException(error, { context: 'checkUpcomingAppointments' });
    // Return cached events as fallback
    try {
      const cached = await getAllFromStore('calendar_events');
      const now = new Date();
      const fifteenMin = new Date(now.getTime() + 15 * 60 * 1000);
      return cached.filter(e => {
        const start = new Date(e.start);
        return start >= now && start <= fifteenMin;
      });
    } catch {
      return [];
    }
  }
}

/**
 * Fetch events for a specific day (used by batch prep pre-generation)
 * @param {Date} dayStart
 * @param {Date} dayEnd
 * @returns {Promise<CalendarEvent[]>}
 */
export async function fetchEventsForDay(dayStart, dayEnd) {
  const { calendarProvider } = await chrome.storage.local.get('calendarProvider');
  const provider = calendarProvider || 'google';
  return await fetchEvents(provider, { timeMin: dayStart, timeMax: dayEnd });
}

/**
 * Schedule a pre-appointment notification with prep context
 */
async function schedulePreNotification(event, userId) {
  const eventKey = `pre_${event.id}`;
  if (notifiedEvents.has(eventKey)) return;

  const config = await getConfig();
  const startTime = new Date(event.start).getTime();
  const notifyTime = startTime - (config.REMINDER_MINUTES_BEFORE * 60 * 1000);
  const now = Date.now();

  if (notifyTime > now) {
    // Schedule for later
    const delayMinutes = (notifyTime - now) / 60000;
    chrome.alarms.create(`prep_${event.id}`, { delayInMinutes: delayMinutes });

    await chrome.storage.local.set({
      [`alarm_event_${event.id}`]: event,
    });
    return;
  }

  // Notify now (event is within REMINDER_MINUTES_BEFORE)
  if (notifyTime <= now && startTime > now) {
    notifiedEvents.add(eventKey);

    const otherAttendees = event.attendees.filter(a => !a.self);
    let prep = null;

    if (otherAttendees.length > 0) {
      const contactEmail = otherAttendees[0].email;
      const contacts = await getAllFromStore('contacts');
      const contact = contacts.find(c => c.email === contactEmail);

      if (contact) {
        prep = await getCachedPrep(contact.id, userId);
        if (!prep) {
          prep = await generatePrep(contact.id, userId);
        }
      }
    }

    await showPrepNotification(event, prep);
  }
}

/**
 * Schedule a post-session note reminder
 */
async function schedulePostSessionReminder(event) {
  const config = await getConfig();
  const endTime = new Date(event.end).getTime();
  const reminderTime = endTime + (config.POST_SESSION_REMINDER_DELAY * 60 * 1000);
  const now = Date.now();

  if (reminderTime > now) {
    chrome.alarms.create(`note_${event.id}`, { delayInMinutes: (reminderTime - now) / 60000 });
    await chrome.storage.local.set({
      [`alarm_event_${event.id}`]: event,
    });
  }
}

/**
 * Handle alarm firing for scheduled notifications
 */
export async function handleCalendarAlarm(alarmName) {
  if (alarmName.startsWith('prep_')) {
    const eventId = alarmName.replace('prep_', '');
    const eventData = await chrome.storage.local.get(`alarm_event_${eventId}`);
    const event = eventData[`alarm_event_${eventId}`];

    if (event) {
      const { user } = await chrome.storage.local.get('user');
      const otherAttendees = event.attendees.filter(a => !a.self);
      let prep = null;

      if (otherAttendees.length > 0 && user) {
        const contacts = await getAllFromStore('contacts');
        const contact = contacts.find(c => c.email === otherAttendees[0].email);
        if (contact) {
          prep = await getCachedPrep(contact.id, user.id);
          if (!prep) {
            prep = await generatePrep(contact.id, user.id);
          }
        }
      }

      await showPrepNotification(event, prep);
      await chrome.storage.local.remove(`alarm_event_${eventId}`);
    }
  } else if (alarmName.startsWith('note_')) {
    const eventId = alarmName.replace('note_', '');
    const eventData = await chrome.storage.local.get(`alarm_event_${eventId}`);
    const event = eventData[`alarm_event_${eventId}`];

    if (event) {
      showNoteReminderNotification(event);
      await chrome.storage.local.set({ pendingNoteCapture: eventId });
      await chrome.storage.local.remove(`alarm_event_${eventId}`);
    }
  } else if (alarmName.startsWith('snooze_')) {
    const eventId = alarmName.replace('snooze_', '');
    const eventData = await chrome.storage.local.get(`alarm_event_${eventId}`);
    const event = eventData[`alarm_event_${eventId}`];

    if (event) {
      await showPrepNotification(event, null);
    }
  }
}
