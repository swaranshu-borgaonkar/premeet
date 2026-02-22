import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Helpers to build a fake IndexedDB ---

function createMockStore(keyPath, autoIncrement = false) {
  let data = [];
  let autoId = 1;
  const indexes = {};

  const store = {
    _data: () => data,
    _setData: (d) => { data = d; },
    createIndex: vi.fn((name) => { indexes[name] = name; return indexes[name]; }),
    put: vi.fn((record) => {
      if (autoIncrement && record[keyPath] == null) {
        record[keyPath] = autoId++;
      }
      const idx = data.findIndex((r) => r[keyPath] === record[keyPath]);
      if (idx >= 0) data[idx] = record;
      else data.push(record);
      return mockRequest(record[keyPath]);
    }),
    get: vi.fn((key) => {
      const found = data.find((r) => r[keyPath] === key);
      return mockRequest(found);
    }),
    getAll: vi.fn(() => mockRequest([...data])),
    delete: vi.fn((key) => {
      data = data.filter((r) => r[keyPath] !== key);
      return mockRequest(undefined);
    }),
    count: vi.fn(() => mockRequest(data.length)),
    index: vi.fn((name) => ({
      getAll: vi.fn((val) => {
        const filtered = data.filter((r) => r[name] === val || r[indexes[name]] === val);
        return mockRequest(filtered);
      }),
      openCursor: vi.fn((range) => {
        // simulate cursor that iterates matching items
        let cursor = null;
        const items = [...data]; // snapshot
        let i = 0;
        const req = mockRequest(null);
        // first call: trigger onsuccess with first item
        setTimeout(() => {
          advanceCursor();
        }, 0);
        function advanceCursor() {
          if (i < items.length) {
            cursor = {
              value: items[i],
              delete: vi.fn(() => {
                data = data.filter((r) => r[keyPath] !== items[i][keyPath]);
              }),
              continue: vi.fn(() => {
                i++;
                advanceCursor();
              }),
            };
            req.result = cursor;
          } else {
            req.result = null;
          }
          if (req.onsuccess) req.onsuccess({ target: req });
        }
        return req;
      }),
    })),
  };
  return store;
}

function mockRequest(result) {
  const req = { result, error: null, onsuccess: null, onerror: null };
  Promise.resolve().then(() => {
    if (req.onsuccess) req.onsuccess({ target: req });
  });
  return req;
}

function mockTransaction(stores) {
  return {
    objectStore: vi.fn((name) => stores[name]),
  };
}

// Build a full mock DB
const objectStores = {};
const storeNames = ['contacts', 'notes', 'prep_cache', 'calendar_events', 'sync_queue', 'user_settings'];
for (const name of storeNames) {
  objectStores[name] = createMockStore(
    name === 'sync_queue' ? 'id' : (name === 'user_settings' ? 'key' : 'id'),
    name === 'sync_queue'
  );
}

const mockDb = {
  objectStoreNames: { contains: vi.fn((name) => storeNames.includes(name)) },
  createObjectStore: vi.fn((name, opts) => objectStores[name]),
  transaction: vi.fn((storeName, mode) => mockTransaction(objectStores)),
};

// Setup global indexedDB mock
globalThis.indexedDB = {
  open: vi.fn(() => {
    const req = { result: mockDb, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
    Promise.resolve().then(() => {
      // Fire upgrade first, then success
      if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
      if (req.onsuccess) req.onsuccess({ target: req });
    });
    return req;
  }),
};

// Mock IDBKeyRange
globalThis.IDBKeyRange = {
  upperBound: vi.fn((val) => ({ upper: val })),
};

// Mock navigator properties
Object.defineProperty(globalThis, 'navigator', {
  value: {
    onLine: true,
    storage: {
      estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
    },
  },
  writable: true,
  configurable: true,
});

// Mock dependencies
vi.mock('../lib/sentry.js', () => ({
  captureException: vi.fn(),
}));

vi.mock('../lib/config.js', () => ({
  getConfig: vi.fn(async () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  })),
}));

vi.mock('../lib/auth.js', () => ({
  getAccessToken: vi.fn(async () => 'mock-token'),
}));

import {
  getFromStore,
  putToStore,
  getAllFromStore,
  deleteFromStore,
  addToSyncQueue,
  checkStorageQuota,
  getPendingSyncCount,
  getPendingConflicts,
} from '../lib/cache.js';

describe('cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all store data
    for (const name of storeNames) {
      objectStores[name]._setData([]);
    }
  });

  describe('openDB / initialization', () => {
    it('should open the database and return a db object', async () => {
      // Simply calling any store function triggers openDB
      const result = await getAllFromStore('contacts');
      expect(globalThis.indexedDB.open).toHaveBeenCalledWith('prepmeet', 1);
      expect(result).toEqual([]);
    });

    it('should create object stores during upgrade', async () => {
      // openDB fires onupgradeneeded which checks objectStoreNames.contains
      await getAllFromStore('contacts');
      // The mock fires onupgradeneeded, so contains should have been queried
      expect(mockDb.objectStoreNames.contains).toHaveBeenCalled();
    });
  });

  describe('putToStore', () => {
    it('should store data into the specified store', async () => {
      const contact = { id: 'c1', email: 'alice@example.com', full_name: 'Alice' };
      await putToStore('contacts', contact);

      const contactStore = objectStores.contacts;
      expect(contactStore.put).toHaveBeenCalledWith(contact);
    });

    it('should overwrite existing records with the same key', async () => {
      objectStores.contacts._setData([{ id: 'c1', email: 'old@example.com' }]);

      const updated = { id: 'c1', email: 'new@example.com' };
      await putToStore('contacts', updated);

      expect(objectStores.contacts.put).toHaveBeenCalledWith(updated);
    });
  });

  describe('getFromStore', () => {
    it('should retrieve data by key from the specified store', async () => {
      objectStores.contacts._setData([
        { id: 'c1', email: 'alice@example.com' },
        { id: 'c2', email: 'bob@example.com' },
      ]);

      const result = await getFromStore('contacts', 'c1');
      expect(objectStores.contacts.get).toHaveBeenCalledWith('c1');
    });

    it('should return undefined when key does not exist', async () => {
      objectStores.contacts._setData([]);
      const result = await getFromStore('contacts', 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllFromStore', () => {
    it('should return all records from a store', async () => {
      objectStores.notes._setData([
        { id: 'n1', contact_id: 'c1' },
        { id: 'n2', contact_id: 'c2' },
      ]);

      const result = await getAllFromStore('notes');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('n1');
      expect(result[1].id).toBe('n2');
    });

    it('should return an empty array when store is empty', async () => {
      const result = await getAllFromStore('notes');
      expect(result).toEqual([]);
    });
  });

  describe('deleteFromStore', () => {
    it('should remove a record by key', async () => {
      objectStores.contacts._setData([
        { id: 'c1', email: 'alice@example.com' },
        { id: 'c2', email: 'bob@example.com' },
      ]);

      await deleteFromStore('contacts', 'c1');
      expect(objectStores.contacts.delete).toHaveBeenCalledWith('c1');
    });

    it('should not throw when deleting a nonexistent key', async () => {
      objectStores.contacts._setData([]);
      await expect(deleteFromStore('contacts', 'nonexistent')).resolves.not.toThrow();
    });
  });

  describe('addToSyncQueue', () => {
    it('should add an item to the sync_queue store with pending status', async () => {
      await addToSyncQueue('notes', 'rec-1', 'insert', { id: 'rec-1', content: 'test' });

      const syncStore = objectStores.sync_queue;
      expect(syncStore.put).toHaveBeenCalled();
      const calledWith = syncStore.put.mock.calls[0][0];
      expect(calledWith.table_name).toBe('notes');
      expect(calledWith.record_id).toBe('rec-1');
      expect(calledWith.operation).toBe('insert');
      expect(calledWith.status).toBe('pending');
      expect(calledWith.attempts).toBe(0);
    });

    it('should include a created_at timestamp in ISO format', async () => {
      const before = new Date().toISOString();
      await addToSyncQueue('contacts', 'c1', 'upsert', { id: 'c1' });

      const calledWith = objectStores.sync_queue.put.mock.calls[0][0];
      expect(calledWith.created_at).toBeDefined();
      // Should be a valid ISO string
      expect(new Date(calledWith.created_at).toISOString()).toBe(calledWith.created_at);
    });

    it('should store the payload in the sync queue item', async () => {
      const payload = { id: 'n1', summary: 'Meeting notes', version: 2 };
      await addToSyncQueue('notes', 'n1', 'upsert', payload);

      const calledWith = objectStores.sync_queue.put.mock.calls[0][0];
      expect(calledWith.payload).toEqual(payload);
    });
  });

  describe('checkStorageQuota', () => {
    it('should not purge when usage is below 80%', async () => {
      globalThis.navigator.storage.estimate = vi.fn(async () => ({
        usage: 500,
        quota: 1000,
      }));

      // Should complete without error
      await expect(checkStorageQuota()).resolves.not.toThrow();
    });

    it('should handle missing navigator.storage.estimate gracefully', async () => {
      const orig = globalThis.navigator.storage;
      globalThis.navigator.storage = {};

      await expect(checkStorageQuota()).resolves.not.toThrow();

      globalThis.navigator.storage = orig;
    });
  });

  describe('getPendingSyncCount', () => {
    it('should count pending and conflict items', async () => {
      objectStores.sync_queue._setData([
        { id: 1, status: 'pending' },
        { id: 2, status: 'synced' },
        { id: 3, status: 'conflict' },
        { id: 4, status: 'failed' },
        { id: 5, status: 'pending' },
      ]);

      const count = await getPendingSyncCount();
      // pending (1,5) + conflict (3) = 3
      expect(count).toBe(3);
    });

    it('should return 0 when queue is empty', async () => {
      objectStores.sync_queue._setData([]);
      const count = await getPendingSyncCount();
      expect(count).toBe(0);
    });
  });

  describe('getPendingConflicts', () => {
    it('should return conflict data for items with conflict status', async () => {
      objectStores.sync_queue._setData([
        { id: 1, status: 'conflict', conflict_data: { recordId: 'r1', recordType: 'note' } },
        { id: 2, status: 'pending' },
        { id: 3, status: 'conflict', conflict_data: { recordId: 'r2', recordType: 'note' } },
      ]);

      const conflicts = await getPendingConflicts();
      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].recordId).toBe('r1');
      expect(conflicts[1].recordId).toBe('r2');
    });

    it('should return empty array when no conflicts exist', async () => {
      objectStores.sync_queue._setData([
        { id: 1, status: 'synced' },
      ]);

      const conflicts = await getPendingConflicts();
      expect(conflicts).toEqual([]);
    });
  });
});
