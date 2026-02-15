// ─── PrepMeet Read-Only API Client ────────────────────────
// For external integrations (Zapier, Make, custom apps)
// API key management from the extension's options page.

import { getConfig } from './config.js';
import { getAccessToken } from './auth.js';

const API_BASE = getConfig('SUPABASE_URL') + '/functions/v1';

/**
 * Generate a new API key for the current workspace.
 */
export async function generateApiKey(name, permissions = ['read'], expiresInDays = 365) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}/api-readonly?action=generate_key`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, permissions, expires_in_days: expiresInDays }),
  });

  if (!response.ok) throw new Error('Failed to generate API key');
  return response.json();
}

/**
 * List API keys for the current workspace.
 */
export async function listApiKeys() {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}/api-readonly?action=list_keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to list API keys');
  return response.json();
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(keyId) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}/api-readonly?action=revoke_key`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key_id: keyId }),
  });

  if (!response.ok) throw new Error('Failed to revoke API key');
  return response.json();
}

// ─── Webhook Management ──────────────────────────────────

/**
 * Register a new webhook endpoint.
 */
export async function registerWebhook(url, events) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}/webhook-dispatch?action=register_webhook`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, events }),
  });

  if (!response.ok) throw new Error('Failed to register webhook');
  return response.json();
}

/**
 * List registered webhooks.
 */
export async function listWebhooks() {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}/webhook-dispatch?action=list_webhooks`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to list webhooks');
  return response.json();
}

/**
 * Delete a webhook endpoint.
 */
export async function deleteWebhook(webhookId) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}/webhook-dispatch?action=delete_webhook`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ webhook_id: webhookId }),
  });

  if (!response.ok) throw new Error('Failed to delete webhook');
  return response.json();
}

/**
 * Test a webhook endpoint with a ping event.
 */
export async function testWebhook(webhookId) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}/webhook-dispatch?action=test_webhook`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ webhook_id: webhookId }),
  });

  if (!response.ok) throw new Error('Failed to test webhook');
  return response.json();
}
