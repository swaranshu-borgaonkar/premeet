import { captureException } from './sentry.js';
import { getConfig } from './config.js';

/**
 * Show a pre-appointment notification with prep context
 */
export async function showPrepNotification(event, prep) {
  const otherAttendees = event.attendees.filter(a => !a.self);
  const names = otherAttendees.map(a => a.name).join(', ');

  let message = `With ${names}`;
  if (prep?.bullets?.length > 0) {
    message += `\n• ${prep.bullets[0]}`;
    if (prep.bullets[1]) message += `\n• ${prep.bullets[1]}`;
  }

  try {
    chrome.notifications.create(`event_${event.id}`, {
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: `In 5 min: ${event.title}`,
      message,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: 'View Details' },
        { title: 'Dismiss' },
      ],
    });
  } catch (error) {
    // Some browsers don't support buttons on notifications
    chrome.notifications.create(`event_${event.id}`, {
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: `In 5 min: ${event.title}`,
      message,
      priority: 2,
      requireInteraction: true,
    });
  }
}

/**
 * Show a post-session note reminder notification
 */
export function showNoteReminderNotification(event) {
  const otherAttendees = event.attendees.filter(a => !a.self);
  const names = otherAttendees.map(a => a.name).join(', ');

  chrome.notifications.create(`note_${event.id}`, {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: 'Session ended — capture your notes',
    message: `${event.title} with ${names} just ended. Add a quick note while it's fresh.`,
    priority: 1,
    requireInteraction: false,
  });
}

/**
 * Show a trial expiry warning badge
 */
export async function showTrialBadge(daysLeft) {
  if (daysLeft <= 1) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  } else if (daysLeft <= 3) {
    chrome.action.setBadgeText({ text: `${daysLeft}d` });
    chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
  }
}

/**
 * Clear all notification badges
 */
export function clearBadge() {
  chrome.action.setBadgeText({ text: '' });
}

/**
 * Set up notification click handlers
 */
export function setupNotificationListeners() {
  chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith('event_')) {
      // Open popup (clicking the extension icon equivalent)
      // Service workers can't open popups directly, so store the event for the popup to pick up
      const eventId = notificationId.replace('event_', '');
      chrome.storage.local.set({ pendingEventView: eventId });
    } else if (notificationId.startsWith('note_')) {
      // Open note capture
      const eventId = notificationId.replace('note_', '');
      chrome.storage.local.set({ pendingNoteCapture: eventId });
    }

    chrome.notifications.clear(notificationId);
  });

  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId.startsWith('event_')) {
      if (buttonIndex === 0) {
        // View Details
        const eventId = notificationId.replace('event_', '');
        chrome.storage.local.set({ pendingEventView: eventId });
      }
      // buttonIndex === 1 is Dismiss, just clear
    }
    chrome.notifications.clear(notificationId);
  });
}
