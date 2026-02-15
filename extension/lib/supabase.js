import { getConfig } from './config.js';
import { getAccessToken } from './auth.js';
import { captureException } from './sentry.js';
import { addToSyncQueue, putToStore, getFromStore } from './cache.js';

/**
 * Make an authenticated request to Supabase REST API
 */
async function supabaseRequest(path, options = {}) {
  const config = await getConfig();
  const token = await getAccessToken();

  const url = `${config.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': config.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Prefer': options.prefer || 'return=representation',
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${path}: ${response.status} — ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ─── Contacts ──────────────────────────────────────────────

/**
 * Upsert a contact in Supabase (and local cache)
 */
export async function upsertContact(contact) {
  try {
    if (!navigator.onLine) {
      await putToStore('contacts', contact);
      await addToSyncQueue('contacts', contact.id, 'upsert', contact);
      return contact;
    }

    const [result] = await supabaseRequest(
      'contacts?on_conflict=id',
      {
        method: 'POST',
        body: contact,
        headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
      }
    );

    const saved = result || contact;
    await putToStore('contacts', saved);
    return saved;
  } catch (error) {
    captureException(error, { context: 'upsertContact' });
    // Fall back to local-only
    await putToStore('contacts', contact);
    await addToSyncQueue('contacts', contact.id, 'upsert', contact);
    return contact;
  }
}

/**
 * Find a contact by email in Supabase (with local cache fallback)
 */
export async function findContactByEmail(email, userId) {
  try {
    if (!navigator.onLine) {
      const cached = await getFromStore('contacts', email);
      return cached || null;
    }

    const results = await supabaseRequest(
      `contacts?email=eq.${encodeURIComponent(email)}&user_id=eq.${userId}&limit=1`
    );

    if (results && results.length > 0) {
      await putToStore('contacts', results[0]);
      return results[0];
    }
    return null;
  } catch (error) {
    captureException(error, { context: 'findContactByEmail' });
    return null;
  }
}

/**
 * Get all contacts for a user
 */
export async function getContacts(userId) {
  try {
    if (!navigator.onLine) {
      const { getAllFromStore } = await import('./cache.js');
      return await getAllFromStore('contacts');
    }

    const results = await supabaseRequest(
      `contacts?user_id=eq.${userId}&order=full_name.asc&limit=500`
    );

    // Cache locally
    for (const contact of results || []) {
      await putToStore('contacts', contact);
    }

    return results || [];
  } catch (error) {
    captureException(error, { context: 'getContacts' });
    const { getAllFromStore } = await import('./cache.js');
    return await getAllFromStore('contacts');
  }
}

// ─── Notes ─────────────────────────────────────────────────

/**
 * Save a note to Supabase (and local cache)
 */
export async function saveNote(note) {
  try {
    // Always cache locally first
    await putToStore('notes', { ...note, _localOnly: !navigator.onLine });

    if (!navigator.onLine) {
      await addToSyncQueue('notes', note.id, 'insert', note);
      return note;
    }

    const [result] = await supabaseRequest('notes', {
      method: 'POST',
      body: note,
    });

    const saved = result || note;
    await putToStore('notes', saved);
    return saved;
  } catch (error) {
    captureException(error, { context: 'saveNote' });
    await addToSyncQueue('notes', note.id, 'insert', note);
    return note;
  }
}

/**
 * Get notes for a contact (most recent first)
 */
export async function getNotesForContact(contactId, limit = 5) {
  try {
    if (!navigator.onLine) {
      const { getAllFromStore } = await import('./cache.js');
      const allNotes = await getAllFromStore('notes');
      return allNotes
        .filter(n => n.contact_id === contactId)
        .sort((a, b) => new Date(b.event_date || b.created_at) - new Date(a.event_date || a.created_at))
        .slice(0, limit);
    }

    const results = await supabaseRequest(
      `notes?contact_id=eq.${contactId}&order=event_date.desc&limit=${limit}`
    );

    // Cache locally
    for (const note of results || []) {
      await putToStore('notes', note);
    }

    return results || [];
  } catch (error) {
    captureException(error, { context: 'getNotesForContact' });
    const { getAllFromStore } = await import('./cache.js');
    const allNotes = await getAllFromStore('notes');
    return allNotes
      .filter(n => n.contact_id === contactId)
      .sort((a, b) => new Date(b.event_date || b.created_at) - new Date(a.event_date || a.created_at))
      .slice(0, limit);
  }
}

/**
 * Get all notes for a user
 */
export async function getNotesForUser(userId, limit = 50) {
  try {
    if (!navigator.onLine) {
      const { getAllFromStore } = await import('./cache.js');
      const allNotes = await getAllFromStore('notes');
      return allNotes
        .filter(n => n.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    }

    return await supabaseRequest(
      `notes?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`
    );
  } catch (error) {
    captureException(error, { context: 'getNotesForUser' });
    return [];
  }
}

// ─── Prep Cache ────────────────────────────────────────────

/**
 * Get cached prep for a contact
 */
export async function getCachedPrep(contactId, userId) {
  try {
    // Check local cache first
    const cached = await getFromStore('prep_cache', contactId);
    if (cached && new Date(cached.expires_at) > new Date()) {
      return cached;
    }

    if (!navigator.onLine) return null;

    const results = await supabaseRequest(
      `prep_cache?contact_id=eq.${contactId}&user_id=eq.${userId}&expires_at=gt.${new Date().toISOString()}&order=created_at.desc&limit=1`
    );

    if (results && results.length > 0) {
      await putToStore('prep_cache', { ...results[0], id: contactId });
      return results[0];
    }
    return null;
  } catch (error) {
    captureException(error, { context: 'getCachedPrep' });
    return null;
  }
}

/**
 * Generate prep by calling the AI edge function
 */
export async function generatePrep(contactId, userId) {
  try {
    const config = await getConfig();
    const token = await getAccessToken();

    const response = await fetch(
      `${config.SUPABASE_URL}/functions/v1/ai-generate-prep`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ contact_id: contactId, user_id: userId }),
      }
    );

    if (!response.ok) {
      throw new Error(`Prep generation failed: ${response.status}`);
    }

    const prep = await response.json();
    // Cache locally with contact_id as key for quick lookup
    await putToStore('prep_cache', { ...prep, id: contactId });
    return prep;
  } catch (error) {
    captureException(error, { context: 'generatePrep' });
    return { bullets: [], focus_line: 'Unable to generate prep — check your notes' };
  }
}

// ─── Popup Views (Analytics) ──────────────────────────────

/**
 * Log a popup view action
 */
export async function logPopupView(userId, contactId, eventId, action) {
  const record = {
    user_id: userId,
    contact_id: contactId,
    event_id: eventId,
    action,
    viewed_at: new Date().toISOString(),
  };

  try {
    if (!navigator.onLine) {
      await addToSyncQueue('popup_views', crypto.randomUUID(), 'insert', record);
      return;
    }

    await supabaseRequest('popup_views', {
      method: 'POST',
      body: record,
      prefer: 'return=minimal',
    });
  } catch (error) {
    captureException(error, { context: 'logPopupView' });
    // Non-critical, don't throw
  }
}

// ─── User Profile ──────────────────────────────────────────

/**
 * Update user profile in Supabase
 */
export async function updateUserProfile(userId, updates) {
  try {
    if (!navigator.onLine) {
      await addToSyncQueue('users', userId, 'update', updates);
      return;
    }

    await supabaseRequest(`users?id=eq.${userId}`, {
      method: 'PATCH',
      body: updates,
      prefer: 'return=minimal',
    });
  } catch (error) {
    captureException(error, { context: 'updateUserProfile' });
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId) {
  try {
    const results = await supabaseRequest(`users?id=eq.${userId}&limit=1`);
    return results?.[0] || null;
  } catch (error) {
    captureException(error, { context: 'getUserProfile' });
    return null;
  }
}
