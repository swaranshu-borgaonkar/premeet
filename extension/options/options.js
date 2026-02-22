// ─── Navigation ───────────────────────────────────────────

const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-links a');

function navigateTo(hash) {
  const target = hash.replace('#', '').split('/')[0] || 'settings';

  sections.forEach(s => s.classList.add('hidden'));
  navLinks.forEach(l => l.classList.remove('active'));

  const section = document.getElementById(target);
  const link = document.querySelector(`a[href="#${target}"]`);

  if (section) section.classList.remove('hidden');
  if (link) link.classList.add('active');

  // Handle sub-routes (e.g., #contact/uuid)
  if (target === 'contacts' && hash.includes('/')) {
    const contactId = hash.split('/')[1];
    if (contactId) loadContactDetail(contactId);
  }
}

window.addEventListener('hashchange', () => {
  navigateTo(location.hash);
  // Re-render contacts list when navigating back from detail
  if (location.hash === '#contacts') {
    renderContactsList(allContacts);
  }
});

// ─── Initialization ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Check if onboarding
  if (location.hash === '#onboarding') {
    document.getElementById('onboarding').classList.remove('hidden');
    sections.forEach(s => {
      if (s.id !== 'onboarding') s.classList.add('hidden');
    });
  } else {
    navigateTo(location.hash);
  }

  // Load current settings
  await loadSettings();
  await loadAccountInfo();
  await loadContacts();
  await loadTemplates();
});

// ─── Onboarding ──────────────────────────────────────────

function nextStep(step) {
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  document.getElementById(`step-${step}`).classList.remove('hidden');
  document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
  document.querySelector(`.dot[data-step="${step}"]`).classList.add('active');
}

// Onboarding button listeners
document.getElementById('btn-start')?.addEventListener('click', () => nextStep(2));
document.getElementById('btn-skip-cal')?.addEventListener('click', () => nextStep(3));
document.getElementById('btn-finish')?.addEventListener('click', () => finishOnboarding());

// Connect calendar during onboarding
document.getElementById('btn-connect-cal')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-connect-cal');
  btn.textContent = 'Connecting...';
  btn.disabled = true;

  try {
    await chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' });
    btn.textContent = 'Connected!';
    setTimeout(() => nextStep(3), 500);
  } catch (error) {
    btn.textContent = 'Connect Google Calendar';
    btn.disabled = false;
    alert('Failed to connect. Please try again.');
  }
});

// Connect Microsoft calendar during onboarding
document.getElementById('btn-connect-microsoft')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-connect-microsoft');
  btn.textContent = 'Connecting...';
  btn.disabled = true;

  try {
    await chrome.runtime.sendMessage({ type: 'SIGN_IN_MICROSOFT' });
    btn.textContent = 'Connected!';
    setTimeout(() => nextStep(3), 500);
  } catch (error) {
    btn.textContent = 'Connect Microsoft Outlook';
    btn.disabled = false;
    alert('Failed to connect. Please try again.');
  }
});

// Profession selection
document.querySelectorAll('.profession-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.profession-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const profession = btn.dataset.profession;
    await chrome.runtime.sendMessage({
      type: 'UPDATE_PROFILE',
      payload: { profession },
    });

    setTimeout(() => nextStep(4), 300);
  });
});

function finishOnboarding() {
  chrome.runtime.sendMessage({
    type: 'UPDATE_PROFILE',
    payload: { onboarding_completed: true },
  });
  location.hash = '#settings';
  navigateTo('#settings');
};

// ─── Settings ────────────────────────────────────────────

async function loadSettings() {
  // Load from chrome.storage.sync
  const { config } = await chrome.storage.sync.get('config');
  const settings = config || {};

  // Reminder time
  const reminderSelect = document.getElementById('reminder-time');
  if (reminderSelect && settings.REMINDER_MINUTES_BEFORE) {
    reminderSelect.value = settings.REMINDER_MINUTES_BEFORE.toString();
  }

  // Post-session reminder
  const postSession = document.getElementById('post-session-reminder');
  if (postSession) {
    postSession.checked = settings.POST_SESSION_REMINDER !== false;
  }

  // Calendar provider
  const { calendarProvider } = await chrome.storage.local.get('calendarProvider');
  const providerEl = document.getElementById('calendar-provider');
  if (providerEl) {
    providerEl.textContent = calendarProvider === 'microsoft'
      ? 'Microsoft Outlook'
      : calendarProvider === 'google'
        ? 'Google Calendar'
        : 'Not connected';
  }

  // Populate timezone selector
  const tzSelect = document.getElementById('timezone');
  if (tzSelect && tzSelect.children.length === 0) {
    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const zones = [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Toronto', 'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin',
      'Europe/Paris', 'Europe/Madrid', 'Asia/Dubai', 'Asia/Kolkata',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Australia/Sydney',
      'Pacific/Auckland',
    ];

    zones.forEach(zone => {
      const option = document.createElement('option');
      option.value = zone;
      option.textContent = zone.replace(/_/g, ' ');
      option.selected = zone === (settings.timezone || currentTz);
      tzSelect.appendChild(option);
    });
  }
}

// Save settings on change
document.getElementById('reminder-time')?.addEventListener('change', async (e) => {
  await saveConfig({ REMINDER_MINUTES_BEFORE: parseInt(e.target.value) });
});

document.getElementById('post-session-reminder')?.addEventListener('change', async (e) => {
  await saveConfig({ POST_SESSION_REMINDER: e.target.checked });
});

document.getElementById('timezone')?.addEventListener('change', async (e) => {
  await saveConfig({ timezone: e.target.value });
  await chrome.runtime.sendMessage({
    type: 'UPDATE_PROFILE',
    payload: { timezone: e.target.value },
  });
});

async function saveConfig(updates) {
  const { config } = await chrome.storage.sync.get('config');
  const merged = { ...(config || {}), ...updates };
  await chrome.storage.sync.set({ config: merged });
}

// ─── Account ─────────────────────────────────────────────

async function loadAccountInfo() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });

  if (status.authenticated && status.user) {
    document.getElementById('account-email').textContent = status.user.email || 'N/A';

    // Get full profile for tier and trial info
    const profile = await chrome.runtime.sendMessage({ type: 'GET_PROFILE' });

    if (profile) {
      const tierNames = {
        free: 'Free',
        individual: 'Individual ($9/mo)',
        team: 'Team ($29/seat/mo)',
        enterprise: 'Enterprise',
      };
      document.getElementById('account-plan').textContent =
        tierNames[profile.subscription_tier] || 'Free';

      if (profile.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at);
        const now = new Date();
        const daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));

        if (daysLeft > 0) {
          document.getElementById('account-trial').textContent =
            `${daysLeft} days left (ends ${trialEnd.toLocaleDateString()})`;
        } else {
          document.getElementById('account-trial').textContent = 'Expired';
        }
      } else {
        document.getElementById('account-trial').textContent = 'N/A';
      }
    }
  }
}

// Sign out
document.getElementById('btn-signout')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to sign out?')) {
    await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
    window.close();
  }
});

// ─── Contacts Page ───────────────────────────────────────

let allContacts = [];

async function loadContacts() {
  const contacts = await chrome.runtime.sendMessage({ type: 'GET_CONTACTS' });
  allContacts = contacts || [];
  renderContactsList(allContacts);
}

function renderContactsList(contacts) {
  const container = document.getElementById('contacts-list');
  if (!container) return;

  if (!contacts || contacts.length === 0) {
    container.innerHTML = '<p class="empty-state">No contacts yet. They\'ll appear after your first appointment.</p>';
    return;
  }

  // Sort by last_seen_at descending
  const sorted = [...contacts].sort((a, b) => {
    const dateA = new Date(a.last_seen_at || a.created_at || 0);
    const dateB = new Date(b.last_seen_at || b.created_at || 0);
    return dateB - dateA;
  });

  container.innerHTML = sorted.map(contact => {
    const initials = getInitials(contact.full_name || contact.email || '?');
    const lastSeen = contact.last_seen_at
      ? new Date(contact.last_seen_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
      : '';
    return `
      <div class="contact-row" data-contact-id="${contact.id}">
        <div class="contact-avatar">${escapeHtml(initials)}</div>
        <div class="contact-info">
          <div class="contact-info-name">${escapeHtml(contact.full_name || 'Unknown')}</div>
          <div class="contact-info-email">${escapeHtml(contact.email || '')}</div>
        </div>
        ${lastSeen ? `<span class="contact-last-seen">${lastSeen}</span>` : ''}
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.contact-row').forEach(row => {
    row.addEventListener('click', () => {
      const contactId = row.dataset.contactId;
      location.hash = `#contacts/${contactId}`;
      loadContactDetail(contactId);
    });
  });
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name[0] || '?').toUpperCase();
}

// Import contacts
document.getElementById('btn-import-contacts')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-import-contacts');
  const statusEl = document.getElementById('import-status');

  btn.textContent = 'Importing...';
  btn.disabled = true;
  statusEl.classList.remove('hidden');
  statusEl.textContent = 'Importing contacts from your calendar provider...';

  try {
    const result = await chrome.runtime.sendMessage({ type: 'IMPORT_CONTACTS' });

    if (result.error) {
      statusEl.textContent = `Import failed: ${result.error}`;
    } else {
      statusEl.textContent = `Done! ${result.imported} imported, ${result.skipped} skipped.`;
      await loadContacts(); // Refresh the list
    }
  } catch (error) {
    statusEl.textContent = 'Import failed. Please try again.';
  } finally {
    btn.textContent = 'Import';
    btn.disabled = false;
    setTimeout(() => statusEl.classList.add('hidden'), 5000);
  }
});

// Contact search
document.getElementById('contact-search')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    renderContactsList(allContacts);
    return;
  }
  const filtered = allContacts.filter(c =>
    (c.full_name || '').toLowerCase().includes(query) ||
    (c.email || '').toLowerCase().includes(query) ||
    (c.company || '').toLowerCase().includes(query)
  );
  renderContactsList(filtered);
});

async function loadContactDetail(contactId) {
  const contact = await chrome.runtime.sendMessage({
    type: 'GET_CONTACT',
    contactId,
  });

  if (!contact) return;

  const notes = await chrome.runtime.sendMessage({
    type: 'GET_NOTES',
    contactId,
    limit: 20,
  });

  // Build contact detail view dynamically
  const section = document.getElementById('contacts');
  section.innerHTML = `
    <div class="contact-detail">
      <button onclick="location.hash='#contacts'" class="btn btn-link">&larr; Back</button>
      <h2>${escapeHtml(contact.full_name)}</h2>
      <p class="contact-email">${escapeHtml(contact.email || '')}</p>
      ${contact.company ? `<p class="contact-company">${escapeHtml(contact.company)}</p>` : ''}
      <p class="contact-meta">Last seen: ${contact.last_seen_at ? new Date(contact.last_seen_at).toLocaleDateString() : 'Never'}</p>

      <h3>Notes (${notes?.length || 0})</h3>
      <div class="notes-list">
        ${(notes || []).map(note => `
          <div class="note-card">
            <div class="note-card-header">
              <strong>${escapeHtml(note.summary || 'Untitled Note')}</strong>
              <span class="note-date">${note.event_date ? new Date(note.event_date).toLocaleDateString() : ''}</span>
            </div>
            ${note.detailed_notes ? `<p class="note-body">${escapeHtml(note.detailed_notes)}</p>` : ''}
            ${note.voice_transcript ? `<p class="note-voice"><em>Voice: ${escapeHtml(note.voice_transcript.substring(0, 100))}...</em></p>` : ''}
          </div>
        `).join('')}
        ${!notes || notes.length === 0 ? '<p class="empty-state">No notes yet</p>' : ''}
      </div>
    </div>
  `;
}

// ─── Email Templates ─────────────────────────────────────

let emailTemplates = [];
let editingTemplateId = null;

async function loadTemplates() {
  const result = await chrome.runtime.sendMessage({ type: 'GET_EMAIL_TEMPLATES' });
  emailTemplates = result || [];
  renderTemplatesList();
}

function renderTemplatesList() {
  const container = document.getElementById('templates-list');
  if (!container) return;

  if (emailTemplates.length === 0) {
    container.innerHTML = '<p class="empty-state">No custom templates yet.</p>';
    return;
  }

  container.innerHTML = emailTemplates.map(tpl => `
    <div class="template-card" data-id="${tpl.id}">
      <div>
        <div class="template-card-name">${escapeHtml(tpl.name)}</div>
        <div class="template-card-subject">${escapeHtml(tpl.subject_template || '')}</div>
      </div>
      <div class="template-card-actions">
        <button class="btn btn-link btn-edit-tpl" data-id="${tpl.id}">Edit</button>
        <button class="btn btn-link btn-delete-tpl" data-id="${tpl.id}" style="color:#EF4444;">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-edit-tpl').forEach(btn => {
    btn.addEventListener('click', () => editTemplate(btn.dataset.id));
  });

  container.querySelectorAll('.btn-delete-tpl').forEach(btn => {
    btn.addEventListener('click', () => deleteTemplate(btn.dataset.id));
  });
}

function editTemplate(id) {
  const tpl = emailTemplates.find(t => t.id === id);
  if (!tpl) return;

  editingTemplateId = id;
  document.getElementById('template-editor-title').textContent = 'Edit Template';
  document.getElementById('tpl-name').value = tpl.name || '';
  document.getElementById('tpl-subject').value = tpl.subject_template || '';
  document.getElementById('tpl-body').value = tpl.body_template || '';
  document.getElementById('template-editor').classList.remove('hidden');
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;

  await chrome.runtime.sendMessage({
    type: 'DELETE_EMAIL_TEMPLATE',
    templateId: id,
  });

  emailTemplates = emailTemplates.filter(t => t.id !== id);
  renderTemplatesList();
}

document.getElementById('btn-add-template')?.addEventListener('click', () => {
  editingTemplateId = null;
  document.getElementById('template-editor-title').textContent = 'New Template';
  document.getElementById('tpl-name').value = '';
  document.getElementById('tpl-subject').value = '';
  document.getElementById('tpl-body').value = '';
  document.getElementById('template-editor').classList.remove('hidden');
});

document.getElementById('btn-save-template')?.addEventListener('click', async () => {
  const name = document.getElementById('tpl-name').value.trim();
  const subject = document.getElementById('tpl-subject').value.trim();
  const body = document.getElementById('tpl-body').value.trim();

  if (!name) {
    alert('Please enter a template name.');
    return;
  }

  const payload = {
    name,
    subject_template: subject,
    body_template: body,
  };

  if (editingTemplateId) {
    payload.id = editingTemplateId;
  }

  await chrome.runtime.sendMessage({
    type: 'SAVE_EMAIL_TEMPLATE',
    payload,
  });

  document.getElementById('template-editor').classList.add('hidden');
  await loadTemplates();
});

document.getElementById('btn-cancel-template')?.addEventListener('click', () => {
  document.getElementById('template-editor').classList.add('hidden');
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
