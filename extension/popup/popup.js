import { isVoiceAvailable, startVoiceInput, stopVoiceInput, isCurrentlyListening } from '../lib/voice.js';
import { checkAndShowConflicts } from './conflict-resolution.js';

// ─── DOM Elements ─────────────────────────────────────────

const authScreen = document.getElementById('auth-screen');
const loadingScreen = document.getElementById('loading-screen');
const mainScreen = document.getElementById('main-screen');
const noEvents = document.getElementById('no-events');
const eventCard = document.getElementById('event-card');
const noteCapture = document.getElementById('note-capture');
const emailCompose = document.getElementById('email-compose');

let currentEvent = null;
let currentContact = null;
let stopVoice = null;

// ─── Initialize ───────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  showScreen('loading');

  const status = await sendMessage({ type: 'GET_AUTH_STATUS' });

  if (!status.authenticated) {
    showScreen('auth');
    return;
  }

  // Check for pending actions (from notification clicks)
  const pending = await sendMessage({ type: 'GET_PENDING' });

  if (pending.pendingNoteCapture) {
    // Open note capture for the pending event
    await sendMessage({ type: 'CLEAR_PENDING' });
    await loadUpcomingEvents();
    showContent('note-capture');
    return;
  }

  await loadUpcomingEvents();

  // Check tier status and show upgrade prompts
  await checkTierAndShowBanner();

  // Check for sync conflicts
  checkAndShowConflicts();
});

// ─── Auth ─────────────────────────────────────────────────

document.getElementById('btn-signin').addEventListener('click', async () => {
  showScreen('loading');
  try {
    const result = await sendMessage({ type: 'SIGN_IN_GOOGLE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    await loadUpcomingEvents();
  } catch (error) {
    showScreen('auth');
    showError('Sign in failed: ' + (error.message || 'Please try again.'));
  }
});

// Microsoft sign-in (add a button in popup.html for this later)
// document.getElementById('btn-signin-microsoft')?.addEventListener(...)

// ─── Event Card Actions ───────────────────────────────────

document.getElementById('btn-got-it')?.addEventListener('click', async () => {
  if (currentEvent && currentContact) {
    await sendMessage({
      type: 'LOG_VIEW',
      payload: {
        eventId: currentEvent.id,
        contactId: currentContact?.id,
        action: 'dismissed',
      },
    });
  }
  window.close();
});

document.getElementById('btn-snooze')?.addEventListener('click', async () => {
  if (currentEvent) {
    await sendMessage({ type: 'SNOOZE', eventId: currentEvent.id, minutes: 5 });
  }
  window.close();
});

document.getElementById('btn-history')?.addEventListener('click', async () => {
  if (currentContact) {
    chrome.tabs.create({
      url: `options/options.html#contact/${currentContact.id}`,
    });
  }
});

document.getElementById('btn-settings')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ─── Note Capture ─────────────────────────────────────────

document.getElementById('btn-save-note')?.addEventListener('click', async () => {
  const summary = document.getElementById('note-summary').value.trim();
  const details = document.getElementById('note-details').value.trim();

  if (!summary && !details) {
    showError('Please enter a note.');
    return;
  }

  const saveBtn = document.getElementById('btn-save-note');
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    const result = await sendMessage({
      type: 'SAVE_NOTE',
      payload: {
        contactId: currentContact?.id,
        eventId: currentEvent?.id,
        eventDate: currentEvent?.start || new Date().toISOString(),
        summary,
        detailed_notes: details,
        voice_transcript: document.getElementById('note-details').dataset.voiceTranscript || null,
      },
    });

    if (result.error) {
      showError(result.error);
    } else {
      // Clear form
      document.getElementById('note-summary').value = '';
      document.getElementById('note-details').value = '';
      delete document.getElementById('note-details').dataset.voiceTranscript;

      showSuccess('Note saved!');
      setTimeout(() => showContent('event-card'), 1000);
    }
  } catch (error) {
    showError('Failed to save note. It will sync when you reconnect.');
  } finally {
    saveBtn.textContent = 'Save Note';
    saveBtn.disabled = false;
  }
});

document.getElementById('btn-cancel-note')?.addEventListener('click', () => {
  if (stopVoice) {
    stopVoice();
    stopVoice = null;
  }
  showContent('event-card');
});

// ─── Voice Input ──────────────────────────────────────────

document.getElementById('btn-voice')?.addEventListener('click', () => {
  const voiceBtn = document.getElementById('btn-voice');
  const detailsField = document.getElementById('note-details');

  if (isCurrentlyListening()) {
    // Stop recording
    if (stopVoice) {
      stopVoice();
      stopVoice = null;
    }
    voiceBtn.textContent = '\u{1F3A4}';
    voiceBtn.classList.remove('recording');
    return;
  }

  if (!isVoiceAvailable()) {
    showError('Voice input is not available in this browser.');
    return;
  }

  voiceBtn.textContent = '\u{1F534}';
  voiceBtn.classList.add('recording');

  stopVoice = startVoiceInput({
    onResult: ({ full }) => {
      detailsField.value = full;
    },
    onEnd: (finalText) => {
      voiceBtn.textContent = '\u{1F3A4}';
      voiceBtn.classList.remove('recording');
      if (finalText) {
        detailsField.value = finalText;
        detailsField.dataset.voiceTranscript = finalText;
      }
      stopVoice = null;
    },
    onError: (error) => {
      voiceBtn.textContent = '\u{1F3A4}';
      voiceBtn.classList.remove('recording');
      showError('Voice input error. Please try again.');
      stopVoice = null;
    },
  });
});

// ─── Add Note Button (from event card) ───────────────────

// We need a way to open note capture from the event card
// Listen for clicks on a "Add Note" link if we add one
document.addEventListener('click', (e) => {
  if (e.target.id === 'btn-add-note' || e.target.closest('#btn-add-note')) {
    if (currentContact) {
      document.getElementById('note-contact-info').textContent =
        `Notes for ${currentContact.full_name || currentContact.email}`;
      noteCapture.dataset.contactId = currentContact.id;
      noteCapture.dataset.eventId = currentEvent?.id || '';
    }
    showContent('note-capture');
  }
});

// ─── Data Loading ─────────────────────────────────────────

async function loadUpcomingEvents() {
  const events = await sendMessage({ type: 'GET_UPCOMING' });
  showScreen('main');

  if (!events || events.length === 0) {
    showContent('no-events');
    return;
  }

  // Show first upcoming event
  currentEvent = events[0];
  await displayEvent(currentEvent);
}

async function displayEvent(event) {
  const otherAttendees = event.attendees.filter(a => !a.self);

  // Resolve contact from attendee
  if (otherAttendees.length > 0) {
    currentContact = await sendMessage({
      type: 'GET_CONTACT',
      email: otherAttendees[0].email,
    });
  }

  const contactName = currentContact?.full_name
    || otherAttendees[0]?.name
    || 'Unknown Contact';

  document.getElementById('contact-name').textContent = contactName;
  document.getElementById('event-time').textContent = formatTime(event.start);
  document.getElementById('event-title').textContent = event.title;

  // Show multiple attendees if present
  if (otherAttendees.length > 1) {
    const othersCount = otherAttendees.length - 1;
    document.getElementById('event-title').textContent =
      `${event.title} (+${othersCount} other${othersCount > 1 ? 's' : ''})`;
  }

  eventCard.dataset.eventId = event.id;
  eventCard.dataset.contactId = currentContact?.id || otherAttendees[0]?.email || '';

  showContent('event-card');

  // Load prep data
  await loadPrep();
}

async function loadPrep() {
  // Hide all content sections initially
  hide('prep-section');
  hide('last-note');
  hide('first-session');

  if (!currentContact?.id) {
    show('first-session');
    return;
  }

  const prep = await sendMessage({
    type: 'GET_PREP',
    contactId: currentContact.id,
  });

  if (prep.bullets && prep.bullets.length > 0) {
    const bulletsList = document.getElementById('prep-bullets');
    bulletsList.innerHTML = '';
    prep.bullets.forEach(bullet => {
      const li = document.createElement('li');
      li.textContent = bullet;
      bulletsList.appendChild(li);
    });

    const focusLine = document.getElementById('focus-line');
    if (prep.focusLine) {
      focusLine.textContent = prep.focusLine;
      focusLine.classList.remove('hidden');
    } else {
      focusLine.classList.add('hidden');
    }

    show('prep-section');
  } else if (prep.focusLine && prep.focusLine.includes('First session')) {
    show('first-session');
  } else {
    // Try to show the last note as fallback
    const notes = await sendMessage({
      type: 'GET_NOTES',
      contactId: currentContact.id,
      limit: 1,
    });

    if (notes && notes.length > 0) {
      document.getElementById('last-note-summary').textContent =
        notes[0].summary || notes[0].detailed_notes?.substring(0, 100) || 'Previous notes available';
      document.getElementById('last-note-date').textContent =
        formatDate(notes[0].event_date || notes[0].created_at);
      show('last-note');
    } else {
      show('first-session');
    }
  }
}

// ─── UI Helpers ───────────────────────────────────────────

function showScreen(name) {
  authScreen.classList.toggle('hidden', name !== 'auth');
  loadingScreen.classList.toggle('hidden', name !== 'loading');
  mainScreen.classList.toggle('hidden', name !== 'main');
}

function showContent(name) {
  noEvents.classList.toggle('hidden', name !== 'no-events');
  eventCard.classList.toggle('hidden', name !== 'event-card');
  noteCapture.classList.toggle('hidden', name !== 'note-capture');
  emailCompose.classList.toggle('hidden', name !== 'email-compose');
}

function show(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function hide(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function showError(msg) {
  // Simple inline error
  let errorEl = document.getElementById('popup-error');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = 'popup-error';
    errorEl.style.cssText = 'background:#FEF2F2;color:#991B1B;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:8px;';
    document.querySelector('.screen:not(.hidden) .content:not(.hidden)')?.prepend(errorEl);
  }
  errorEl.textContent = msg;
  setTimeout(() => errorEl?.remove(), 5000);
}

function showSuccess(msg) {
  let successEl = document.getElementById('popup-success');
  if (!successEl) {
    successEl = document.createElement('div');
    successEl.id = 'popup-success';
    successEl.style.cssText = 'background:#F0FDF4;color:#166534;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:8px;';
    document.querySelector('.screen:not(.hidden) .content:not(.hidden)')?.prepend(successEl);
  }
  successEl.textContent = msg;
  setTimeout(() => successEl?.remove(), 3000);
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

// ─── Email Compose ────────────────────────────────────────

document.getElementById('btn-send-summary')?.addEventListener('click', async () => {
  // Check tier
  const tierStatus = await sendMessage({ type: 'GET_TIER_STATUS' });
  if (tierStatus.tier === 'free' && !tierStatus.inTrial) {
    showError('Email summaries require the Individual plan.');
    return;
  }

  if (currentContact) {
    document.getElementById('email-contact-info').textContent =
      `Summary for ${currentContact.full_name || currentContact.email}`;
    document.getElementById('email-to').value = currentContact.email || '';
    document.getElementById('email-subject').value =
      `Meeting Summary — ${currentContact.full_name || 'Session'} — ${formatDate(currentEvent?.start || new Date().toISOString())}`;

    // Pre-fill body from prep bullets
    const prep = await sendMessage({ type: 'GET_PREP', contactId: currentContact.id });
    if (prep?.bullets?.length > 0) {
      const body = `Hi ${(currentContact.full_name || '').split(' ')[0]},\n\nHere's a summary of our session:\n\n${prep.bullets.map(b => `• ${b}`).join('\n')}\n\n${prep.focusLine ? `Focus: ${prep.focusLine}\n\n` : ''}Best regards`;
      document.getElementById('email-body').value = body;
    }
  }
  showContent('email-compose');
});

document.getElementById('btn-send-email')?.addEventListener('click', async () => {
  const to = document.getElementById('email-to').value.trim();
  const cc = document.getElementById('email-cc').value.trim();
  const subject = document.getElementById('email-subject').value.trim();
  const body = document.getElementById('email-body').value.trim();
  const schedule = document.getElementById('email-schedule').value;
  const skipWeekend = document.getElementById('email-skip-weekend').checked;

  if (!to || !subject || !body) {
    showError('Please fill in To, Subject, and Body.');
    return;
  }

  const btn = document.getElementById('btn-send-email');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    const result = await sendMessage({
      type: 'SEND_EMAIL',
      payload: {
        to, cc, subject, body,
        schedule,
        skip_weekend: skipWeekend,
        contact_id: currentContact?.id,
        event_id: currentEvent?.id,
      },
    });

    if (result.error) {
      showError(result.error);
    } else {
      showSuccess(schedule === 'now' ? 'Email sent!' : 'Email scheduled!');
      setTimeout(() => showContent('event-card'), 1500);
    }
  } catch (error) {
    showError('Failed to send email.');
  } finally {
    btn.textContent = 'Send';
    btn.disabled = false;
  }
});

document.getElementById('btn-cancel-email')?.addEventListener('click', () => {
  showContent('event-card');
});

// Template selector — update body based on template
document.getElementById('email-template')?.addEventListener('change', async (e) => {
  const template = e.target.value;
  if (!currentContact) return;

  const prep = await sendMessage({ type: 'GET_PREP', contactId: currentContact.id });
  const firstName = (currentContact.full_name || '').split(' ')[0] || '';
  const bullets = (prep?.bullets || []).map(b => `• ${b}`).join('\n');

  switch (template) {
    case 'brief':
      document.getElementById('email-body').value =
        `Hi ${firstName},\n\nKey points from our session:\n${bullets}\n\nBest`;
      break;
    case 'detailed':
      document.getElementById('email-body').value =
        `Hi ${firstName},\n\nThank you for our session today. Here's a detailed summary:\n\n${bullets}\n\n${prep?.focusLine ? `Recommended focus: ${prep.focusLine}\n\n` : ''}Please don't hesitate to reach out if you have any questions.\n\nBest regards`;
      break;
    default: // standard
      document.getElementById('email-body').value =
        `Hi ${firstName},\n\nHere's a summary of our session:\n\n${bullets}\n\n${prep?.focusLine ? `Focus: ${prep.focusLine}\n\n` : ''}Best regards`;
  }
});

// ─── Tier / Upgrade ───────────────────────────────────────

async function checkTierAndShowBanner() {
  const tierStatus = await sendMessage({ type: 'GET_TIER_STATUS' });
  const banner = document.getElementById('upgrade-banner');
  const bannerText = document.getElementById('upgrade-banner-text');

  if (!tierStatus || tierStatus.tier !== 'free') {
    banner?.classList.add('hidden');
    return;
  }

  if (tierStatus.inTrial && tierStatus.daysLeft > 3) {
    // Trial active, plenty of time — subtle info
    banner?.classList.add('hidden');
    return;
  }

  if (tierStatus.inTrial && tierStatus.daysLeft > 0) {
    // Trial ending soon
    bannerText.textContent = `Trial ends in ${tierStatus.daysLeft} day${tierStatus.daysLeft === 1 ? '' : 's'}`;
    banner?.classList.remove('hidden');
    return;
  }

  if (tierStatus.daysLeft <= 0 && tierStatus.inTrial === false) {
    // Trial expired — show gate on first visit after expiry
    const { trialGateDismissed } = await chrome.storage.local.get('trialGateDismissed');
    if (!trialGateDismissed) {
      document.getElementById('trial-gate')?.classList.remove('hidden');
    }
    // Show persistent banner
    bannerText.textContent = 'Free plan — upgrade for AI prep & voice input';
    banner?.classList.remove('hidden');
  }
}

// Upgrade button handlers
document.getElementById('btn-upgrade')?.addEventListener('click', () => {
  sendMessage({ type: 'OPEN_CHECKOUT', plan: 'monthly' });
});

document.getElementById('btn-upgrade-monthly')?.addEventListener('click', () => {
  sendMessage({ type: 'OPEN_CHECKOUT', plan: 'monthly' });
});

document.getElementById('btn-upgrade-yearly')?.addEventListener('click', () => {
  sendMessage({ type: 'OPEN_CHECKOUT', plan: 'yearly' });
});

document.getElementById('btn-continue-free')?.addEventListener('click', async () => {
  document.getElementById('trial-gate')?.classList.add('hidden');
  await chrome.storage.local.set({ trialGateDismissed: true });
});
