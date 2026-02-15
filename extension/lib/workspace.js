/**
 * Workspace management for Team tier
 * Handles workspace CRUD, member management, invites, and team features
 */

import { getConfig } from './config.js';
import { getAccessToken } from './auth.js';
import { captureException } from './sentry.js';

async function workspaceRequest(action, body = {}, params = {}) {
  const config = await getConfig();
  const token = await getAccessToken();

  const url = new URL(`${config.SUPABASE_URL}/functions/v1/workspace-crud`);
  url.searchParams.set('action', action);
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }

  const response = await fetch(url.toString(), {
    method: Object.keys(body).length > 0 ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Workspace request failed: ${response.status}`);
  }

  return await response.json();
}

// ─── Workspace CRUD ───────────────────────────────────────

export async function createWorkspace(name) {
  return await workspaceRequest('create', { name });
}

export async function listWorkspaces() {
  return await workspaceRequest('list');
}

export async function updateWorkspace(workspaceId, updates) {
  return await workspaceRequest('update', { workspace_id: workspaceId, updates });
}

export async function archiveWorkspace(workspaceId) {
  return await workspaceRequest('archive', { workspace_id: workspaceId });
}

// ─── Members ──────────────────────────────────────────────

export async function getWorkspaceMembers(workspaceId) {
  return await workspaceRequest('members', {}, { workspace_id: workspaceId });
}

export async function removeMember(workspaceId, memberUserId) {
  return await workspaceRequest('remove_member', {
    workspace_id: workspaceId,
    member_user_id: memberUserId,
  });
}

export async function updateMemberRole(workspaceId, memberUserId, newRole) {
  return await workspaceRequest('update_role', {
    workspace_id: workspaceId,
    member_user_id: memberUserId,
    new_role: newRole,
  });
}

// ─── Invites ──────────────────────────────────────────────

export async function inviteMember(workspaceId, email, role = 'member') {
  const config = await getConfig();
  const token = await getAccessToken();

  const response = await fetch(`${config.SUPABASE_URL}/functions/v1/team-invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ workspace_id: workspaceId, email, role }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Invite failed');
  }

  return await response.json();
}

// ─── Team Analytics ───────────────────────────────────────

export async function getTeamAnalytics(workspaceId) {
  const config = await getConfig();
  const token = await getAccessToken();

  const response = await fetch(
    `${config.SUPABASE_URL}/rest/v1/rpc/team_analytics_summary`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ p_workspace_id: workspaceId }),
    }
  );

  if (!response.ok) return null;
  return await response.json();
}

// ─── Full-Text Search ─────────────────────────────────────

export async function searchNotes(query, workspaceId = null) {
  const config = await getConfig();
  const token = await getAccessToken();
  const { user } = await chrome.storage.local.get('user');

  const response = await fetch(
    `${config.SUPABASE_URL}/rest/v1/rpc/search_notes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        p_user_id: user.id,
        p_query: query,
        p_workspace_id: workspaceId,
        p_limit: 20,
      }),
    }
  );

  if (!response.ok) return [];
  return await response.json();
}

// ─── Handoff Tags ─────────────────────────────────────────

export async function setHandoff(noteId, handoffToUserId) {
  const config = await getConfig();
  const token = await getAccessToken();

  await fetch(`${config.SUPABASE_URL}/rest/v1/notes?id=eq.${noteId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ handoff_to: handoffToUserId }),
  });
}

export async function setFollowUp(noteId, followUpNote, followUpDate = null) {
  const config = await getConfig();
  const token = await getAccessToken();

  await fetch(`${config.SUPABASE_URL}/rest/v1/notes?id=eq.${noteId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      follow_up: true,
      follow_up_note: followUpNote,
      follow_up_date: followUpDate,
    }),
  });
}

// ─── Vacation Mode ────────────────────────────────────────

export async function setVacationMode(enabled, returnDate = null) {
  await chrome.storage.local.set({
    vacationMode: enabled,
    vacationReturnDate: returnDate,
  });

  // Disable/enable calendar polling
  if (enabled) {
    chrome.alarms.clear('checkCalendar');
  } else {
    chrome.alarms.create('checkCalendar', { periodInMinutes: 5 });
  }
}

export async function getVacationMode() {
  const { vacationMode, vacationReturnDate } = await chrome.storage.local.get([
    'vacationMode',
    'vacationReturnDate',
  ]);
  return { enabled: !!vacationMode, returnDate: vacationReturnDate || null };
}

// ─── CSV Import ───────────────────────────────────────────

export async function importContactsCsv(csvText, userId, workspaceId = null) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { imported: 0, errors: 0, error: 'CSV must have header + data' };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const emailIdx = headers.findIndex(h => h === 'email' || h === 'e-mail');
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'full_name' || h === 'full name');
  const companyIdx = headers.findIndex(h => h === 'company' || h === 'organization');

  if (emailIdx === -1) return { imported: 0, errors: 0, error: 'CSV must have an "email" column' };

  const { upsertContact } = await import('./supabase.js');
  let imported = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const email = cols[emailIdx]?.trim();
    if (!email || !email.includes('@')) continue;

    try {
      await upsertContact({
        id: crypto.randomUUID(),
        user_id: userId,
        workspace_id: workspaceId,
        email: email.toLowerCase(),
        full_name: cols[nameIdx]?.trim() || email,
        company: cols[companyIdx]?.trim() || null,
        metadata: { source: 'csv_import', imported_at: new Date().toISOString() },
      });
      imported++;
    } catch {
      errors++;
    }
  }

  return { imported, errors };
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ─── Note Templates ───────────────────────────────────────

export async function getNoteTemplates(workspaceId = null) {
  const config = await getConfig();
  const token = await getAccessToken();
  const { user } = await chrome.storage.local.get('user');

  let query = `${config.SUPABASE_URL}/rest/v1/note_templates?or=(user_id.eq.${user.id}`;
  if (workspaceId) {
    query += `,workspace_id.eq.${workspaceId}`;
  }
  query += ')&order=name.asc';

  const response = await fetch(query, {
    headers: {
      'apikey': config.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) return [];
  return await response.json();
}

export async function saveNoteTemplate(template) {
  const config = await getConfig();
  const token = await getAccessToken();

  if (!template.id) template.id = crypto.randomUUID();

  await fetch(`${config.SUPABASE_URL}/rest/v1/note_templates?on_conflict=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=minimal,resolution=merge-duplicates',
    },
    body: JSON.stringify(template),
  });
}

export async function deleteNoteTemplate(templateId) {
  const config = await getConfig();
  const token = await getAccessToken();

  await fetch(`${config.SUPABASE_URL}/rest/v1/note_templates?id=eq.${templateId}`, {
    method: 'DELETE',
    headers: {
      'apikey': config.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
  });
}
