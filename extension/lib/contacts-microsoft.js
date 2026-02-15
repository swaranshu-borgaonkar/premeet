/**
 * Microsoft Contacts Import
 * Fetches contacts from Microsoft Graph People API
 * and imports them into PrepMeet's contact system.
 */

import { getMicrosoftToken } from './auth.js';
import { captureException, captureBreadcrumb } from './sentry.js';
import { upsertContact } from './supabase.js';

const MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0';

/**
 * Import contacts from Microsoft People API
 * @param {string} userId - PrepMeet user ID
 * @param {Object} options - { limit: number }
 * @returns {Promise<{ imported: number, skipped: number, errors: number }>}
 */
export async function importMicrosoftContacts(userId, options = {}) {
  const limit = options.limit || 500;
  const token = await getMicrosoftToken();

  if (!token) {
    return { imported: 0, skipped: 0, errors: 0, error: 'Not authenticated with Microsoft' };
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let nextLink = `${MICROSOFT_GRAPH_API}/me/people?$top=100&$select=displayName,emailAddresses,companyName,department,jobTitle`;

  try {
    while (nextLink && imported + skipped < limit) {
      const response = await fetch(nextLink, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { imported, skipped, errors, error: 'Microsoft token expired' };
        }
        throw new Error(`Microsoft People API error: ${response.status}`);
      }

      const data = await response.json();
      const people = data.value || [];

      for (const person of people) {
        // Skip people without email
        const email = person.emailAddresses?.[0]?.address;
        if (!email) {
          skipped++;
          continue;
        }

        try {
          await upsertContact({
            id: crypto.randomUUID(),
            user_id: userId,
            email: email.toLowerCase(),
            full_name: person.displayName || email,
            company: person.companyName || null,
            metadata: {
              source: 'microsoft_import',
              department: person.department || null,
              job_title: person.jobTitle || null,
              imported_at: new Date().toISOString(),
            },
          });
          imported++;
        } catch (error) {
          errors++;
          captureException(error, { context: 'importMicrosoftContact', email });
        }
      }

      nextLink = data['@odata.nextLink'] || null;
    }

    captureBreadcrumb(`Microsoft contacts import: ${imported} imported, ${skipped} skipped`, 'contacts');
    return { imported, skipped, errors };
  } catch (error) {
    captureException(error, { context: 'importMicrosoftContacts' });
    return { imported, skipped, errors, error: error.message };
  }
}

/**
 * Fetch Microsoft contacts for search/autocomplete
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching people
 */
export async function searchMicrosoftPeople(query) {
  const token = await getMicrosoftToken();
  if (!token) return [];

  try {
    const response = await fetch(
      `${MICROSOFT_GRAPH_API}/me/people?$search="${encodeURIComponent(query)}"&$top=10&$select=displayName,emailAddresses,companyName`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-PeopleQuery-QuerySources': 'Mailbox,Directory',
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.value || [])
      .filter(p => p.emailAddresses?.length > 0)
      .map(p => ({
        name: p.displayName,
        email: p.emailAddresses[0].address,
        company: p.companyName || null,
      }));
  } catch (error) {
    captureException(error, { context: 'searchMicrosoftPeople' });
    return [];
  }
}
