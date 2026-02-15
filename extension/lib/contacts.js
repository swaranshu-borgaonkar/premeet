import { captureException } from './sentry.js';
import { putToStore, getAllFromStore } from './cache.js';
import { upsertContact, findContactByEmail as findContactByEmailRemote } from './supabase.js';

/**
 * Auto-discover contacts from calendar event attendees.
 * Creates new contacts in both local cache and Supabase.
 */
export async function discoverContacts(event, userId) {
  const contacts = [];

  for (const attendee of event.attendees) {
    if (attendee.self) continue;

    try {
      // Check local cache first
      const allContacts = await getAllFromStore('contacts');
      let existing = allContacts.find(c => c.email === attendee.email);

      if (existing) {
        // Update last seen
        existing.last_seen_at = new Date().toISOString();
        existing.updated_at = new Date().toISOString();
        await upsertContact(existing);
        contacts.push(existing);
      } else {
        // Try remote lookup
        existing = await findContactByEmailRemote(attendee.email, userId);

        if (existing) {
          existing.last_seen_at = new Date().toISOString();
          await putToStore('contacts', existing);
          contacts.push(existing);
        } else {
          // Create new contact
          const newContact = {
            id: crypto.randomUUID(),
            user_id: userId,
            email: attendee.email,
            full_name: attendee.name || attendee.email,
            source: 'calendar',
            metadata: {},
            tags: [],
            last_seen_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const saved = await upsertContact(newContact);
          contacts.push(saved);

          // Check for potential duplicates (same name, different email)
          const dupes = await findPotentialDuplicates(attendee.name || attendee.email);
          if (dupes.length > 1) {
            // Store duplicate info for conflict resolution UI
            await chrome.storage.local.set({
              [`duplicate_contact_${newContact.id}`]: {
                newContact: newContact,
                possibleMatches: dupes.filter(d => d.id !== newContact.id),
              },
            });
          }
        }
      }
    } catch (error) {
      captureException(error, { context: 'discoverContacts', attendee: attendee.email });
    }
  }

  return contacts;
}

/**
 * Find a contact by email in local cache
 */
export async function findContactByEmail(email) {
  try {
    const allContacts = await getAllFromStore('contacts');
    return allContacts.find(c => c.email === email) || null;
  } catch (error) {
    captureException(error, { context: 'findContactByEmail' });
    return null;
  }
}

/**
 * Find a contact by ID
 */
export async function findContactById(id) {
  try {
    const allContacts = await getAllFromStore('contacts');
    return allContacts.find(c => c.id === id) || null;
  } catch (error) {
    captureException(error, { context: 'findContactById' });
    return null;
  }
}

/**
 * Check for potential duplicate contacts (same name, different email)
 */
export async function findPotentialDuplicates(name) {
  try {
    if (!name) return [];
    const allContacts = await getAllFromStore('contacts');
    return allContacts.filter(c =>
      c.full_name?.toLowerCase() === name.toLowerCase()
    );
  } catch (error) {
    captureException(error, { context: 'findPotentialDuplicates' });
    return [];
  }
}

/**
 * Merge two contacts: keep primary, transfer notes from secondary
 */
export async function mergeContacts(primaryId, secondaryId) {
  try {
    const allContacts = await getAllFromStore('contacts');
    const primary = allContacts.find(c => c.id === primaryId);
    const secondary = allContacts.find(c => c.id === secondaryId);

    if (!primary || !secondary) {
      throw new Error('Contact not found for merge');
    }

    // Merge metadata
    primary.metadata = { ...secondary.metadata, ...primary.metadata };

    // Combine tags (deduplicated)
    const allTags = [...(primary.tags || []), ...(secondary.tags || [])];
    primary.tags = [...new Set(allTags)];

    // Keep the earlier created_at
    if (secondary.created_at < primary.created_at) {
      primary.created_at = secondary.created_at;
    }

    primary.updated_at = new Date().toISOString();

    // Save merged primary
    await upsertContact(primary);

    // TODO: Transfer notes from secondary to primary (requires Supabase call)
    // For now, store merge info for sync queue
    const { addToSyncQueue } = await import('./cache.js');
    await addToSyncQueue('contacts', secondaryId, 'merge', {
      primary_id: primaryId,
      secondary_id: secondaryId,
    });

    // Remove secondary from local cache
    const { deleteFromStore } = await import('./cache.js');
    await deleteFromStore('contacts', secondaryId);

    return primary;
  } catch (error) {
    captureException(error, { context: 'mergeContacts' });
    throw error;
  }
}

/**
 * Search contacts by name or email (local)
 */
export async function searchContacts(query) {
  try {
    if (!query || query.length < 2) return [];

    const allContacts = await getAllFromStore('contacts');
    const lowerQuery = query.toLowerCase();

    return allContacts.filter(c =>
      c.full_name?.toLowerCase().includes(lowerQuery) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      c.company?.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    captureException(error, { context: 'searchContacts' });
    return [];
  }
}
