/**
 * Email Provider Adapter
 * Routes email sending through the appropriate provider (Gmail or Outlook)
 * based on the user's configured calendar/auth provider.
 */

import { sendViaGmail } from './email-google.js';
import { sendViaOutlook } from './email-microsoft.js';

/**
 * Send an email through the user's configured provider
 * @param {string} provider - 'google' or 'microsoft'
 * @param {Object} email - { to, cc, subject, body }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendEmail(provider, email) {
  switch (provider) {
    case 'microsoft':
      return await sendViaOutlook(email);
    case 'google':
    default:
      return await sendViaGmail(email);
  }
}

/**
 * Get the user's email provider based on their auth provider
 */
export async function getEmailProvider() {
  const { calendarProvider } = await chrome.storage.local.get('calendarProvider');
  return calendarProvider || 'google';
}
