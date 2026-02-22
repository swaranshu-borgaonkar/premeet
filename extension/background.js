import { checkUpcomingAppointments, handleCalendarAlarm } from './lib/calendar.js';
import { refreshTokensIfNeeded, signInWithGoogle, signInWithMicrosoft, signOut } from './lib/auth.js';
import { processOfflineSyncQueue, runMaintenance, getPendingSyncCount } from './lib/cache.js';
import { initSentry, captureException, captureBreadcrumb } from './lib/sentry.js';
import { setupNotificationListeners, showTrialBadge } from './lib/notifications.js';
import { saveNote, getNotesForContact, getCachedPrep, generatePrep, logPopupView, updateUserProfile, getUserProfile } from './lib/supabase.js';
import { openCheckout, pollSubscriptionStatus, openBillingPortal } from './lib/payments.js';
import { sendEmail, getEmailProvider } from './lib/email-adapter.js';
import {
  createWorkspace, listWorkspaces, updateWorkspace, archiveWorkspace,
  getWorkspaceMembers, removeMember, updateMemberRole, inviteMember,
  getTeamAnalytics, searchNotes, setHandoff, setFollowUp,
  setVacationMode, getVacationMode, importContactsCsv,
  getNoteTemplates, saveNoteTemplate, deleteNoteTemplate,
} from './lib/workspace.js';
import { findContactByEmail, findContactById, searchContacts, discoverContacts } from './lib/contacts.js';
import { getAllFromStore } from './lib/cache.js';

// Initialize error tracking
initSentry();

// Set up notification click handlers
setupNotificationListeners();

// ─── Install / Update ─────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'options/options.html#onboarding' });
  }

  // Calendar check every 5 minutes
  chrome.alarms.create('checkCalendar', { periodInMinutes: 5 });

  // Token refresh every 45 minutes
  chrome.alarms.create('refreshTokens', { periodInMinutes: 45 });

  // Sync queue processing every 10 minutes
  chrome.alarms.create('processSync', { periodInMinutes: 10 });

  // Trial check daily
  chrome.alarms.create('checkTrial', { periodInMinutes: 1440 });

  // Cache maintenance daily
  chrome.alarms.create('maintenance', { periodInMinutes: 1440 });

  // Batch prep pre-generation at midnight
  chrome.alarms.create('batchPrep', { periodInMinutes: 1440 });

  captureBreadcrumb(`Extension ${details.reason}`, 'lifecycle');
});

// ─── Alarm Handler ────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    // System alarms
    switch (alarm.name) {
      case 'checkCalendar': {
        const vacation = await getVacationMode();
        if (vacation.enabled) {
          // Check if return date has passed
          if (vacation.returnDate && new Date(vacation.returnDate) <= new Date()) {
            await setVacationMode(false);
          } else {
            return; // Skip calendar check in vacation mode
          }
        }
        await checkUpcomingAppointments();
        return;
      }
      case 'refreshTokens':
        await refreshTokensIfNeeded();
        return;
      case 'processSync':
        if (navigator.onLine) {
          const conflicts = await processOfflineSyncQueue();
          if (conflicts.length > 0) {
            // Store conflicts for popup to show
            await chrome.storage.local.set({ pendingConflicts: conflicts });
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
          }
          // Update badge with pending sync count
          const pendingCount = await getPendingSyncCount();
          if (pendingCount > 0) {
            chrome.action.setBadgeText({ text: String(pendingCount) });
            chrome.action.setBadgeBackgroundColor({ color: '#6B7280' });
          }
        }
        return;
      case 'checkTrial':
        await checkTrialStatus();
        return;
      case 'maintenance':
        await runMaintenance();
        return;
      case 'batchPrep':
        await batchPreGeneratePreps();
        return;
    }

    // Calendar-related alarms (prep_, note_, snooze_)
    await handleCalendarAlarm(alarm.name);
  } catch (error) {
    captureException(error, { context: 'alarmHandler', alarm: alarm.name });
  }
});

// ─── Online/Offline ───────────────────────────────────────

self.addEventListener('online', async () => {
  chrome.action.setBadgeText({ text: '' });
  captureBreadcrumb('Back online, processing sync queue', 'network');
  const conflicts = await processOfflineSyncQueue();
  if (conflicts.length > 0) {
    await chrome.storage.local.set({ pendingConflicts: conflicts });
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
  }
});

self.addEventListener('offline', () => {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  captureBreadcrumb('Went offline', 'network');
});

// ─── Message Handler ──────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      captureException(error, { context: 'messageHandler', type: message.type });
      sendResponse({ error: error.message });
    });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  const { user } = await chrome.storage.local.get('user');

  switch (message.type) {
    // ── Auth ──
    case 'SIGN_IN_GOOGLE':
      return await signInWithGoogle(message.googleToken);

    case 'SIGN_IN_MICROSOFT':
      return await signInWithMicrosoft();

    case 'SIGN_OUT':
      return await signOut();

    case 'GET_AUTH_STATUS':
      return { authenticated: !!user, user };

    // ── Calendar ──
    case 'GET_UPCOMING':
      return await checkUpcomingAppointments();

    // ── Notes ──
    case 'SAVE_NOTE': {
      if (!user) return { error: 'Not authenticated' };

      const noteData = {
        id: crypto.randomUUID(),
        contact_id: message.payload.contactId,
        user_id: user.id,
        summary: message.payload.summary,
        detailed_notes: message.payload.detailed_notes,
        voice_transcript: message.payload.voice_transcript || null,
        tags: message.payload.tags || [],
        event_id: message.payload.eventId || null,
        event_date: message.payload.eventDate || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const saved = await saveNote(noteData);

      // Clear pending note capture flag
      await chrome.storage.local.remove('pendingNoteCapture');

      return { success: true, note: saved };
    }

    case 'GET_NOTES': {
      if (!message.contactId) return { error: 'contactId required' };
      return await getNotesForContact(message.contactId, message.limit || 10);
    }

    // ── Prep ──
    case 'GET_PREP': {
      if (!user || !message.contactId) {
        return { bullets: [], focusLine: '' };
      }

      // Check subscription tier for AI prep access
      const profile = await getUserProfile(user.id);
      const tier = profile?.subscription_tier || 'free';
      const hasAIAccess = tier !== 'free' || isInTrial(profile);

      if (hasAIAccess) {
        // Try cached prep first
        let prep = await getCachedPrep(message.contactId, user.id);

        if (!prep && navigator.onLine) {
          prep = await generatePrep(message.contactId, user.id);
        }

        if (prep && (prep.bullets?.length > 0 || prep.focus_line)) {
          return {
            bullets: prep.bullets || [],
            focusLine: prep.focus_line || prep.focusLine || '',
          };
        }
      }

      // Free tier or AI unavailable: show last note summary
      const notes = await getNotesForContact(message.contactId, 1);
      if (notes.length > 0) {
        return {
          bullets: [notes[0].summary || 'Review previous session notes'],
          focusLine: 'Follow up on last session',
          tier,
        };
      }
      return { bullets: [], focusLine: 'First session — no prior notes', tier };
    }

    // ── Contacts ──
    case 'GET_CONTACTS': {
      return await getAllFromStore('contacts');
    }

    case 'IMPORT_CONTACTS': {
      if (!user) return { error: 'Not authenticated' };
      const { calendarProvider } = await chrome.storage.local.get('calendarProvider');

      if (calendarProvider === 'microsoft') {
        const { importMicrosoftContacts } = await import('./lib/contacts-microsoft.js');
        return await importMicrosoftContacts(user.id);
      }

      // For Google, contacts are auto-discovered from calendar events
      // Trigger a full calendar scan to discover contacts
      const { fetchEventsForDay } = await import('./lib/calendar.js');
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      try {
        const events = await fetchEventsForDay(thirtyDaysAgo, now);
        let imported = 0;
        for (const event of events) {
          await discoverContacts(event, user.id);
          imported++;
        }
        return { imported, skipped: 0, errors: 0 };
      } catch (error) {
        return { imported: 0, skipped: 0, errors: 1, error: error.message };
      }
    }

    case 'SEARCH_CONTACTS': {
      return await searchContacts(message.query);
    }

    case 'GET_CONTACT': {
      if (message.contactId) {
        return await findContactById(message.contactId);
      }
      if (message.email) {
        return await findContactByEmail(message.email);
      }
      return null;
    }

    // ── Analytics ──
    case 'LOG_VIEW': {
      if (!user) return;
      await logPopupView(
        user.id,
        message.payload.contactId,
        message.payload.eventId,
        message.payload.action
      );
      return { success: true };
    }

    // ── Snooze ──
    case 'SNOOZE': {
      const minutes = message.minutes || 5;
      chrome.alarms.create(`snooze_${message.eventId}`, { delayInMinutes: minutes });
      return { success: true };
    }

    // ── Profile ──
    case 'UPDATE_PROFILE': {
      if (!user) return { error: 'Not authenticated' };
      await updateUserProfile(user.id, message.payload);

      // Update cached user
      const updatedUser = { ...user, ...message.payload };
      await chrome.storage.local.set({ user: updatedUser });
      return { success: true };
    }

    case 'GET_PROFILE': {
      if (!user) return null;
      return await getUserProfile(user.id);
    }

    // ── Pending Actions ──
    case 'GET_PENDING': {
      const pending = await chrome.storage.local.get([
        'pendingEventView',
        'pendingNoteCapture',
      ]);
      return pending;
    }

    case 'CLEAR_PENDING': {
      await chrome.storage.local.remove(['pendingEventView', 'pendingNoteCapture']);
      return { success: true };
    }

    // ── Sync ──
    case 'GET_SYNC_STATUS': {
      const pendingCount = await getPendingSyncCount();
      const { pendingConflicts } = await chrome.storage.local.get('pendingConflicts');
      return {
        pendingCount,
        conflicts: pendingConflicts || [],
        online: navigator.onLine,
      };
    }

    // ── Email Templates ──
    case 'GET_EMAIL_TEMPLATES': {
      if (!user) return [];
      try {
        const { getAccessToken } = await import('./lib/auth.js');
        const config = await (await import('./lib/config.js')).getConfig();
        const token = await getAccessToken();
        const response = await fetch(
          `${config.SUPABASE_URL}/rest/v1/email_templates?user_id=eq.${user.id}&order=name.asc`,
          {
            headers: {
              'apikey': config.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        captureException(error, { context: 'getEmailTemplates' });
        return [];
      }
    }

    case 'SAVE_EMAIL_TEMPLATE': {
      if (!user) return { error: 'Not authenticated' };
      try {
        const { getAccessToken } = await import('./lib/auth.js');
        const config = await (await import('./lib/config.js')).getConfig();
        const token = await getAccessToken();
        const payload = {
          ...message.payload,
          user_id: user.id,
        };
        if (!payload.id) {
          payload.id = crypto.randomUUID();
        }
        await fetch(
          `${config.SUPABASE_URL}/rest/v1/email_templates?on_conflict=id`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': config.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`,
              'Prefer': 'return=minimal,resolution=merge-duplicates',
            },
            body: JSON.stringify(payload),
          }
        );
        return { success: true };
      } catch (error) {
        captureException(error, { context: 'saveEmailTemplate' });
        return { error: error.message };
      }
    }

    case 'DELETE_EMAIL_TEMPLATE': {
      if (!user) return { error: 'Not authenticated' };
      try {
        const { getAccessToken } = await import('./lib/auth.js');
        const config = await (await import('./lib/config.js')).getConfig();
        const token = await getAccessToken();
        await fetch(
          `${config.SUPABASE_URL}/rest/v1/email_templates?id=eq.${message.templateId}&user_id=eq.${user.id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': config.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        return { success: true };
      } catch (error) {
        captureException(error, { context: 'deleteEmailTemplate' });
        return { error: error.message };
      }
    }

    // ── Email ──
    case 'SEND_EMAIL': {
      if (!user) return { error: 'Not authenticated' };

      const tierProfile2 = await getUserProfile(user.id);
      const emailTier = tierProfile2?.subscription_tier || 'free';
      if (emailTier === 'free' && !isInTrial(tierProfile2)) {
        return { error: 'Email summaries require the Individual plan' };
      }

      try {
        if (message.payload.schedule === 'now') {
          // Send directly via the user's email provider
          const provider = await getEmailProvider();
          const result = await sendEmail(provider, {
            to: message.payload.to,
            cc: message.payload.cc || null,
            subject: message.payload.subject,
            body: message.payload.body,
          });

          if (!result.success) {
            return { error: result.error || 'Failed to send email' };
          }
          return { success: true };
        } else {
          // Schedule via edge function
          const config = await (await import('./lib/config.js')).getConfig();
          const token = await (await import('./lib/auth.js')).getAccessToken();

          const response = await fetch(
            `${config.SUPABASE_URL}/functions/v1/email-schedule`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                user_id: user.id,
                to: message.payload.to,
                cc: message.payload.cc || null,
                subject: message.payload.subject,
                body: message.payload.body,
                contact_id: message.payload.contact_id,
                event_id: message.payload.event_id,
                skip_weekend: message.payload.skip_weekend,
              }),
            }
          );

          if (!response.ok) {
            const err = await response.text();
            return { error: `Email scheduling failed: ${err}` };
          }
          return { success: true };
        }
      } catch (error) {
        captureException(error, { context: 'sendEmail' });
        return { error: 'Failed to send email' };
      }
    }

    // ── Payments ──
    case 'OPEN_CHECKOUT': {
      if (!user) return { error: 'Not authenticated' };
      const plan = message.plan || 'monthly';
      await openCheckout(user.id, user.email, plan);
      return { success: true };
    }

    case 'POLL_SUBSCRIPTION': {
      if (!user) return { error: 'Not authenticated' };
      return await pollSubscriptionStatus(user.id);
    }

    case 'OPEN_BILLING': {
      openBillingPortal();
      return { success: true };
    }

    case 'GET_TIER_STATUS': {
      if (!user) return { tier: 'free', inTrial: false, daysLeft: -1 };
      const tierProfile = await getUserProfile(user.id);
      const tier = tierProfile?.subscription_tier || 'free';
      const inTrial = isInTrial(tierProfile);
      const daysLeft = getTrialDaysLeft(tierProfile);
      return { tier, inTrial, daysLeft };
    }

    case 'FORCE_SYNC': {
      if (!navigator.onLine) return { error: 'Offline' };
      const syncConflicts = await processOfflineSyncQueue();
      if (syncConflicts.length > 0) {
        await chrome.storage.local.set({ pendingConflicts: syncConflicts });
      } else {
        await chrome.storage.local.remove('pendingConflicts');
        chrome.action.setBadgeText({ text: '' });
      }
      return { success: true, conflicts: syncConflicts };
    }

    // ── Workspaces ──
    case 'CREATE_WORKSPACE':
      return await createWorkspace(message.name);
    case 'LIST_WORKSPACES':
      return await listWorkspaces();
    case 'UPDATE_WORKSPACE':
      return await updateWorkspace(message.workspaceId, message.updates);
    case 'ARCHIVE_WORKSPACE':
      return await archiveWorkspace(message.workspaceId);
    case 'GET_WORKSPACE_MEMBERS':
      return await getWorkspaceMembers(message.workspaceId);
    case 'INVITE_MEMBER':
      return await inviteMember(message.workspaceId, message.email, message.role);
    case 'REMOVE_MEMBER':
      return await removeMember(message.workspaceId, message.memberUserId);
    case 'UPDATE_MEMBER_ROLE':
      return await updateMemberRole(message.workspaceId, message.memberUserId, message.newRole);
    case 'GET_TEAM_ANALYTICS':
      return await getTeamAnalytics(message.workspaceId);

    // ── Search ──
    case 'SEARCH_NOTES':
      return await searchNotes(message.query, message.workspaceId);

    // ── Handoff & Follow-up ──
    case 'SET_HANDOFF':
      await setHandoff(message.noteId, message.handoffToUserId);
      return { success: true };
    case 'SET_FOLLOW_UP':
      await setFollowUp(message.noteId, message.followUpNote, message.followUpDate);
      return { success: true };

    // ── Vacation Mode ──
    case 'SET_VACATION_MODE':
      await setVacationMode(message.enabled, message.returnDate);
      return { success: true };
    case 'GET_VACATION_MODE':
      return await getVacationMode();

    // ── CSV Import ──
    case 'IMPORT_CSV': {
      if (!user) return { error: 'Not authenticated' };
      return await importContactsCsv(message.csvText, user.id, message.workspaceId);
    }

    // ── Note Templates ──
    case 'GET_NOTE_TEMPLATES':
      return await getNoteTemplates(message.workspaceId);
    case 'SAVE_NOTE_TEMPLATE':
      await saveNoteTemplate(message.payload);
      return { success: true };
    case 'DELETE_NOTE_TEMPLATE':
      await deleteNoteTemplate(message.templateId);
      return { success: true };

    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

// ─── Batch Prep Pre-Generation ────────────────────────────

async function batchPreGeneratePreps() {
  try {
    if (!navigator.onLine) return;

    const { user } = await chrome.storage.local.get('user');
    if (!user) return;

    // Check tier — only generate for paid/trial users
    const profile = await getUserProfile(user.id);
    if (!profile || (profile.subscription_tier === 'free' && !isInTrial(profile))) return;

    // Fetch tomorrow's events from cache
    const { getAllFromStore: getAll } = await import('./lib/cache.js');
    const events = await getAll('calendar_events');

    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const tomorrowEvents = events.filter(e => {
      const start = new Date(e.start);
      return start >= tomorrowStart && start <= tomorrowEnd;
    });

    // For each event with attendees, pre-generate prep
    for (const event of tomorrowEvents) {
      const attendees = (event.attendees || []).filter(a => !a.self);
      if (attendees.length === 0) continue;

      // Find contact for first attendee
      const contact = await findContactByEmail(attendees[0].email);
      if (!contact?.id) continue;

      // Check if we already have a valid cached prep
      const existingPrep = await getCachedPrep(contact.id, user.id);
      if (existingPrep) continue;

      // Generate and cache
      await generatePrep(contact.id, user.id);

      // Small delay to avoid hammering the AI endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    captureBreadcrumb(`Batch prep: generated for ${tomorrowEvents.length} events`, 'ai');
  } catch (error) {
    captureException(error, { context: 'batchPreGeneratePreps' });
  }
}

// ─── Helpers ──────────────────────────────────────────────

function isInTrial(profile) {
  if (!profile?.trial_ends_at) return false;
  return new Date(profile.trial_ends_at) > new Date();
}

function getTrialDaysLeft(profile) {
  if (!profile?.trial_ends_at) return -1;
  const trialEnd = new Date(profile.trial_ends_at);
  return Math.ceil((trialEnd - new Date()) / (24 * 60 * 60 * 1000));
}

// ─── Trial Status Check ───────────────────────────────────

async function checkTrialStatus() {
  try {
    const { user } = await chrome.storage.local.get('user');
    if (!user) return;

    const profile = await getUserProfile(user.id);
    if (!profile) return;

    // Only check for free tier users still in trial
    if (profile.subscription_tier !== 'free' || !profile.trial_ends_at) return;

    const trialEnd = new Date(profile.trial_ends_at);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));

    if (daysLeft <= 3 && daysLeft > 0) {
      await showTrialBadge(daysLeft);
    } else if (daysLeft <= 0) {
      // Trial expired
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
    }
  } catch (error) {
    captureException(error, { context: 'checkTrialStatus' });
  }
}
