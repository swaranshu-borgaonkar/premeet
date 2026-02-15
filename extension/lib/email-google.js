/**
 * Gmail Email Provider
 * Sends emails via Gmail API using the user's authenticated Google account
 */

import { getGoogleToken } from './auth.js';
import { captureException } from './sentry.js';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Send an email via Gmail API
 * @param {Object} email - { to, cc, subject, body }
 * @returns {Promise<{ success: boolean, error?: string, messageId?: string }>}
 */
export async function sendViaGmail(email) {
  try {
    const token = await getGoogleToken();
    if (!token) {
      return { success: false, error: 'Not authenticated with Google' };
    }

    // Build RFC 2822 message
    const message = buildRfc2822Message(email);

    // Base64url encode
    const encoded = base64urlEncode(message);

    const response = await fetch(`${GMAIL_API}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Gmail API error: ${response.status} — ${errorText}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    captureException(error, { context: 'sendViaGmail' });
    return { success: false, error: error.message };
  }
}

/**
 * Build an RFC 2822 formatted email message
 */
function buildRfc2822Message({ to, cc, subject, body }) {
  const lines = [
    `To: ${to}`,
  ];

  if (cc) {
    lines.push(`Cc: ${cc}`);
  }

  lines.push(
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body
  );

  return lines.join('\r\n');
}

/**
 * Base64url encode a string (Gmail API requirement)
 */
function base64urlEncode(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let base64 = '';

  // Manual base64 encoding for service worker compatibility
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let i = 0;
  while (i < data.length) {
    const a = data[i++] || 0;
    const b = data[i++] || 0;
    const c = data[i++] || 0;
    const triple = (a << 16) | (b << 8) | c;
    base64 += chars[(triple >> 18) & 0x3f];
    base64 += chars[(triple >> 12) & 0x3f];
    base64 += i - 2 <= data.length ? chars[(triple >> 6) & 0x3f] : '=';
    base64 += i - 1 <= data.length ? chars[triple & 0x3f] : '=';
  }

  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
