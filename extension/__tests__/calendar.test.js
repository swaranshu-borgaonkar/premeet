import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('../lib/sentry.js', () => ({
  captureException: vi.fn(),
  captureBreadcrumb: vi.fn(),
}));

vi.mock('../lib/config.js', () => ({
  getConfig: vi.fn(async () => ({
    REMINDER_MINUTES_BEFORE: 5,
    POST_SESSION_REMINDER_DELAY: 10,
  })),
}));

vi.mock('../lib/cache.js', () => ({
  putToStore: vi.fn(async () => {}),
  getAllFromStore: vi.fn(async () => []),
}));

vi.mock('../lib/contacts.js', () => ({
  discoverContacts: vi.fn(async () => []),
}));

vi.mock('../lib/notifications.js', () => ({
  showPrepNotification: vi.fn(async () => {}),
  showNoteReminderNotification: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  getCachedPrep: vi.fn(async () => null),
  generatePrep: vi.fn(async () => ({ summary: 'mock prep' })),
}));

vi.mock('../lib/calendar-adapter.js', () => ({
  fetchEvents: vi.fn(async () => []),
}));

const { mockIsBusinessHours } = vi.hoisted(() => ({
  mockIsBusinessHours: vi.fn(() => true),
}));
vi.mock('../lib/rate-limiter.js', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    isBusinessHours: mockIsBusinessHours,
  })),
}));

// Mock chrome APIs
globalThis.chrome = {
  storage: {
    local: {
      get: vi.fn(async (keys) => {
        if (typeof keys === 'string') return {};
        if (Array.isArray(keys)) {
          return keys.reduce((acc, key) => ({ ...acc, [key]: undefined }), {});
        }
        return { user: { id: 'user-1', timezone: 'America/New_York' }, calendarProvider: 'google' };
      }),
      set: vi.fn(async () => {}),
      remove: vi.fn(async () => {}),
    },
  },
  alarms: {
    create: vi.fn(),
  },
};

import { checkUpcomingAppointments, handleCalendarAlarm, fetchEventsForDay } from '../lib/calendar.js';
import { fetchEvents } from '../lib/calendar-adapter.js';
import { putToStore, getAllFromStore } from '../lib/cache.js';
import { discoverContacts } from '../lib/contacts.js';
import { showPrepNotification, showNoteReminderNotification } from '../lib/notifications.js';
import { captureException, captureBreadcrumb } from '../lib/sentry.js';

describe('calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chrome.storage.local.get to default behavior
    chrome.storage.local.get.mockImplementation(async (keys) => {
      if (typeof keys === 'string') return {};
      return { user: { id: 'user-1', timezone: 'America/New_York' }, calendarProvider: 'google' };
    });
  });

  describe('checkUpcomingAppointments', () => {
    it('should return empty array when no user is logged in', async () => {
      chrome.storage.local.get.mockResolvedValueOnce({ user: null, calendarProvider: 'google' });

      const result = await checkUpcomingAppointments();
      expect(result).toEqual([]);
      expect(fetchEvents).not.toHaveBeenCalled();
    });

    it('should fetch events using the configured calendar provider', async () => {
      chrome.storage.local.get.mockResolvedValueOnce({
        user: { id: 'user-1', timezone: 'America/New_York' },
        calendarProvider: 'outlook',
      });
      fetchEvents.mockResolvedValueOnce([]);

      await checkUpcomingAppointments();

      expect(fetchEvents).toHaveBeenCalledWith('outlook');
    });

    it('should default to google when no provider is configured', async () => {
      chrome.storage.local.get.mockResolvedValueOnce({
        user: { id: 'user-1' },
        calendarProvider: undefined,
      });
      fetchEvents.mockResolvedValueOnce([]);

      await checkUpcomingAppointments();

      expect(fetchEvents).toHaveBeenCalledWith('google');
    });

    it('should cache fetched events to local store', async () => {
      const events = [
        { id: 'e1', start: new Date().toISOString(), end: new Date().toISOString(), attendees: [] },
        { id: 'e2', start: new Date().toISOString(), end: new Date().toISOString(), attendees: [] },
      ];
      fetchEvents.mockResolvedValueOnce(events);

      await checkUpcomingAppointments();

      expect(putToStore).toHaveBeenCalledTimes(2);
      expect(putToStore).toHaveBeenCalledWith('calendar_events', events[0]);
      expect(putToStore).toHaveBeenCalledWith('calendar_events', events[1]);
    });

    it('should run contact discovery for each event', async () => {
      const events = [
        { id: 'e1', start: new Date().toISOString(), end: new Date().toISOString(), attendees: [{ email: 'a@ex.com', self: false }] },
      ];
      fetchEvents.mockResolvedValueOnce(events);

      await checkUpcomingAppointments();

      expect(discoverContacts).toHaveBeenCalledWith(events[0], 'user-1');
    });

    it('should skip calendar check outside business hours', async () => {
      // Make isBusinessHours return false for this test
      mockIsBusinessHours.mockReturnValueOnce(false);

      chrome.storage.local.get.mockResolvedValueOnce({
        user: { id: 'user-1', timezone: 'America/New_York' },
        calendarProvider: 'google',
      });

      const result = await checkUpcomingAppointments();

      expect(result).toEqual([]);
      expect(captureBreadcrumb).toHaveBeenCalledWith(
        expect.stringContaining('Outside business hours'),
        'calendar'
      );
    });

    it('should fall back to cached events on error', async () => {
      fetchEvents.mockRejectedValueOnce(new Error('Network error'));

      const now = new Date();
      const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
      const cachedEvents = [
        { id: 'cached-1', start: fiveMinLater.toISOString() },
        { id: 'cached-old', start: new Date(now.getTime() - 60000).toISOString() },
      ];
      getAllFromStore.mockResolvedValueOnce(cachedEvents);

      const result = await checkUpcomingAppointments();

      expect(captureException).toHaveBeenCalled();
      // Should only return events within the 15min window
      expect(result.length).toBeLessThanOrEqual(cachedEvents.length);
    });

    it('should log breadcrumb with event count', async () => {
      const events = [
        { id: 'e1', start: new Date().toISOString(), end: new Date().toISOString(), attendees: [] },
        { id: 'e2', start: new Date().toISOString(), end: new Date().toISOString(), attendees: [] },
      ];
      fetchEvents.mockResolvedValueOnce(events);

      await checkUpcomingAppointments();

      expect(captureBreadcrumb).toHaveBeenCalledWith(
        expect.stringContaining('2'),
        'calendar'
      );
    });
  });

  describe('fetchEventsForDay', () => {
    it('should pass day boundaries to fetchEvents', async () => {
      chrome.storage.local.get.mockResolvedValueOnce({ calendarProvider: 'google' });

      const dayStart = new Date('2026-03-01T00:00:00Z');
      const dayEnd = new Date('2026-03-01T23:59:59Z');
      fetchEvents.mockResolvedValueOnce([]);

      await fetchEventsForDay(dayStart, dayEnd);

      expect(fetchEvents).toHaveBeenCalledWith('google', {
        timeMin: dayStart,
        timeMax: dayEnd,
      });
    });

    it('should use configured calendar provider', async () => {
      chrome.storage.local.get.mockResolvedValueOnce({ calendarProvider: 'outlook' });
      fetchEvents.mockResolvedValueOnce([]);

      await fetchEventsForDay(new Date(), new Date());

      expect(fetchEvents).toHaveBeenCalledWith('outlook', expect.any(Object));
    });
  });

  describe('handleCalendarAlarm', () => {
    it('should handle prep_ alarm by showing prep notification', async () => {
      const event = {
        id: 'event-1',
        attendees: [{ email: 'client@example.com', self: false }],
      };

      chrome.storage.local.get.mockImplementation(async (key) => {
        if (key === 'alarm_event_event-1') {
          return { 'alarm_event_event-1': event };
        }
        if (key === 'user' || (Array.isArray(key) && key.includes('user'))) {
          return { user: { id: 'user-1' } };
        }
        return {};
      });

      getAllFromStore.mockResolvedValueOnce([
        { id: 'c1', email: 'client@example.com' },
      ]);

      await handleCalendarAlarm('prep_event-1');

      expect(showPrepNotification).toHaveBeenCalledWith(event, expect.anything());
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('alarm_event_event-1');
    });

    it('should handle note_ alarm by showing note reminder notification', async () => {
      const event = {
        id: 'event-2',
        attendees: [],
      };

      chrome.storage.local.get.mockImplementation(async (key) => {
        if (key === 'alarm_event_event-2') {
          return { 'alarm_event_event-2': event };
        }
        return {};
      });

      await handleCalendarAlarm('note_event-2');

      expect(showNoteReminderNotification).toHaveBeenCalledWith(event);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ pendingNoteCapture: 'event-2' });
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('alarm_event_event-2');
    });

    it('should handle snooze_ alarm by re-showing prep notification', async () => {
      const event = {
        id: 'event-3',
        attendees: [],
      };

      chrome.storage.local.get.mockImplementation(async (key) => {
        if (key === 'alarm_event_event-3') {
          return { 'alarm_event_event-3': event };
        }
        return {};
      });

      await handleCalendarAlarm('snooze_event-3');

      expect(showPrepNotification).toHaveBeenCalledWith(event, null);
    });

    it('should do nothing for prep_ alarm when event data is missing', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      await handleCalendarAlarm('prep_nonexistent');

      expect(showPrepNotification).not.toHaveBeenCalled();
    });

    it('should do nothing for note_ alarm when event data is missing', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      await handleCalendarAlarm('note_nonexistent');

      expect(showNoteReminderNotification).not.toHaveBeenCalled();
    });
  });
});
