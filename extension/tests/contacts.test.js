import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../lib/sentry.js', () => ({
  captureException: vi.fn(),
}));

vi.mock('../lib/cache.js', () => {
  let store = [];
  return {
    getAllFromStore: vi.fn(async () => [...store]),
    putToStore: vi.fn(async (storeName, data) => {
      const idx = store.findIndex((c) => c.id === data.id);
      if (idx >= 0) {
        store[idx] = data;
      } else {
        store.push(data);
      }
      return data;
    }),
    deleteFromStore: vi.fn(async (storeName, key) => {
      store = store.filter((c) => c.id !== key);
    }),
    addToSyncQueue: vi.fn(async () => {}),
    __setStore: (data) => { store = data; },
    __getStore: () => store,
  };
});

vi.mock('../lib/supabase.js', () => ({
  upsertContact: vi.fn(async (contact) => contact),
  findContactByEmail: vi.fn(async () => null),
}));

// Mock chrome.storage.local
globalThis.chrome = {
  storage: {
    local: {
      set: vi.fn(async () => {}),
      get: vi.fn(async () => ({})),
    },
  },
};

// Mock crypto.randomUUID
if (!globalThis.crypto) {
  globalThis.crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  let counter = 0;
  globalThis.crypto.randomUUID = () => `mock-uuid-${++counter}`;
}

import {
  discoverContacts,
  findContactByEmail,
  findPotentialDuplicates,
  mergeContacts,
  searchContacts,
} from '../lib/contacts.js';
import { getAllFromStore, putToStore, deleteFromStore, __setStore, __getStore } from '../lib/cache.js';
import { upsertContact, findContactByEmail as findContactByEmailRemote } from '../lib/supabase.js';

describe('contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setStore([]);
  });

  describe('discoverContacts', () => {
    it('should skip attendees marked as self', async () => {
      const event = {
        attendees: [
          { email: 'me@example.com', self: true },
          { email: 'other@example.com', name: 'Other Person', self: false },
        ],
      };

      const contacts = await discoverContacts(event, 'user-1');

      // Should only process the non-self attendee
      expect(contacts).toHaveLength(1);
      expect(contacts[0].email).toBe('other@example.com');
    });

    it('should update last_seen_at for existing contacts in local cache', async () => {
      const existing = {
        id: 'contact-1',
        email: 'alice@example.com',
        full_name: 'Alice',
        user_id: 'user-1',
        last_seen_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        metadata: {},
        tags: [],
      };
      __setStore([existing]);

      const event = {
        attendees: [{ email: 'alice@example.com', name: 'Alice', self: false }],
      };

      const contacts = await discoverContacts(event, 'user-1');

      expect(contacts).toHaveLength(1);
      expect(upsertContact).toHaveBeenCalled();
      // last_seen_at should be updated
      const upsertedContact = upsertContact.mock.calls[0][0];
      expect(upsertedContact.last_seen_at).not.toBe('2024-01-01T00:00:00.000Z');
    });

    it('should create a new contact when not found locally or remotely', async () => {
      const event = {
        attendees: [
          { email: 'newperson@example.com', name: 'New Person', self: false },
        ],
      };

      const contacts = await discoverContacts(event, 'user-1');

      expect(contacts).toHaveLength(1);
      expect(contacts[0].email).toBe('newperson@example.com');
      expect(contacts[0].full_name).toBe('New Person');
      expect(contacts[0].source).toBe('calendar');
      expect(contacts[0].user_id).toBe('user-1');
    });

    it('should use email as full_name when name is not provided', async () => {
      const event = {
        attendees: [{ email: 'noname@example.com', self: false }],
      };

      const contacts = await discoverContacts(event, 'user-1');

      expect(contacts).toHaveLength(1);
      expect(contacts[0].full_name).toBe('noname@example.com');
    });

    it('should fall back to remote lookup when not in local cache', async () => {
      const remoteContact = {
        id: 'remote-1',
        email: 'remote@example.com',
        full_name: 'Remote Person',
        user_id: 'user-1',
        last_seen_at: '2024-01-01T00:00:00.000Z',
      };
      findContactByEmailRemote.mockResolvedValueOnce(remoteContact);

      const event = {
        attendees: [{ email: 'remote@example.com', name: 'Remote Person', self: false }],
      };

      const contacts = await discoverContacts(event, 'user-1');

      expect(findContactByEmailRemote).toHaveBeenCalledWith('remote@example.com', 'user-1');
      expect(contacts).toHaveLength(1);
      expect(contacts[0].id).toBe('remote-1');
      // Should be saved to local cache
      expect(putToStore).toHaveBeenCalledWith('contacts', expect.objectContaining({ id: 'remote-1' }));
    });
  });

  describe('findContactByEmail', () => {
    it('should return the contact matching the email', async () => {
      __setStore([
        { id: '1', email: 'alice@example.com', full_name: 'Alice' },
        { id: '2', email: 'bob@example.com', full_name: 'Bob' },
      ]);

      const result = await findContactByEmail('bob@example.com');
      expect(result).toEqual({ id: '2', email: 'bob@example.com', full_name: 'Bob' });
    });

    it('should return null when no match is found', async () => {
      __setStore([{ id: '1', email: 'alice@example.com' }]);
      const result = await findContactByEmail('nobody@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findPotentialDuplicates', () => {
    it('should find contacts with the same full_name (case-insensitive)', async () => {
      __setStore([
        { id: '1', email: 'alice1@example.com', full_name: 'Alice Smith' },
        { id: '2', email: 'alice2@example.com', full_name: 'alice smith' },
        { id: '3', email: 'bob@example.com', full_name: 'Bob Jones' },
      ]);

      const dupes = await findPotentialDuplicates('Alice Smith');
      expect(dupes).toHaveLength(2);
    });

    it('should return empty array for null/empty name', async () => {
      const result = await findPotentialDuplicates('');
      expect(result).toEqual([]);
      const result2 = await findPotentialDuplicates(null);
      expect(result2).toEqual([]);
    });
  });

  describe('mergeContacts', () => {
    it('should merge metadata and tags from secondary into primary', async () => {
      __setStore([
        {
          id: 'primary-1',
          email: 'alice@a.com',
          full_name: 'Alice',
          metadata: { title: 'Manager' },
          tags: ['vip'],
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
        {
          id: 'secondary-1',
          email: 'alice@b.com',
          full_name: 'Alice',
          metadata: { company: 'Acme', title: 'Director' },
          tags: ['vip', 'client'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
      ]);

      const result = await mergeContacts('primary-1', 'secondary-1');

      // Primary metadata takes precedence (spread order: secondary first, then primary)
      expect(result.metadata.title).toBe('Manager');
      expect(result.metadata.company).toBe('Acme');

      // Tags should be deduplicated
      expect(result.tags).toContain('vip');
      expect(result.tags).toContain('client');
      expect(result.tags).toHaveLength(2);

      // Should keep the earlier created_at
      expect(result.created_at).toBe('2024-01-01T00:00:00Z');
    });

    it('should throw when a contact is not found', async () => {
      __setStore([]);
      await expect(mergeContacts('nonexistent-1', 'nonexistent-2')).rejects.toThrow(
        'Contact not found for merge'
      );
    });
  });

  describe('searchContacts', () => {
    it('should match contacts by name substring', async () => {
      __setStore([
        { id: '1', email: 'alice@ex.com', full_name: 'Alice Smith' },
        { id: '2', email: 'bob@ex.com', full_name: 'Bob Jones' },
      ]);

      const results = await searchContacts('alice');
      expect(results).toHaveLength(1);
      expect(results[0].full_name).toBe('Alice Smith');
    });

    it('should match contacts by email substring', async () => {
      __setStore([
        { id: '1', email: 'alice@acme.com', full_name: 'Alice' },
        { id: '2', email: 'bob@other.com', full_name: 'Bob' },
      ]);

      const results = await searchContacts('acme');
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('alice@acme.com');
    });

    it('should return empty array for queries shorter than 2 characters', async () => {
      __setStore([{ id: '1', email: 'alice@ex.com', full_name: 'Alice' }]);
      const results = await searchContacts('a');
      expect(results).toEqual([]);
    });

    it('should be case-insensitive', async () => {
      __setStore([
        { id: '1', email: 'alice@ex.com', full_name: 'Alice SMITH' },
      ]);

      const results = await searchContacts('alice smith');
      expect(results).toHaveLength(1);
    });
  });
});
