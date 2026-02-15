/**
 * Microsoft Outlook Email Provider
 * Sends emails via Microsoft Graph API Mail.Send
 */

import { getMicrosoftToken } from './auth.js';
import { captureException } from './sentry.js';

const MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0';

/**
 * Send an email via Microsoft Graph Mail.Send
 * @param {Object} email - { to, cc, subject, body }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendViaOutlook(email) {
  try {
    const token = await getMicrosoftToken();
    if (!token) {
      return { success: false, error: 'Not authenticated with Microsoft' };
    }

    const message = buildGraphMessage(email);

    const response = await fetch(`${MICROSOFT_GRAPH_API}/me/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        saveToSentItems: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Outlook API error: ${response.status} — ${errorText}` };
    }

    // Microsoft Graph sendMail returns 202 Accepted with no body
    return { success: true };
  } catch (error) {
    captureException(error, { context: 'sendViaOutlook' });
    return { success: false, error: error.message };
  }
}

/**
 * Build a Microsoft Graph API message object
 */
function buildGraphMessage({ to, cc, subject, body }) {
  const message = {
    subject,
    body: {
      contentType: 'Text',
      content: body,
    },
    toRecipients: parseRecipients(to),
  };

  if (cc) {
    message.ccRecipients = parseRecipients(cc);
  }

  return message;
}

/**
 * Parse a comma-separated email string into Graph API recipient format
 */
function parseRecipients(emailString) {
  return emailString
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0)
    .map(email => ({
      emailAddress: { address: email },
    }));
}
