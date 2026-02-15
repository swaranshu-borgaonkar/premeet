import { captureException } from './sentry.js';
import { getConfig } from './config.js';
import { getAccessToken } from './auth.js';

const DB_NAME = 'prepmeet';
const DB_VERSION = 1;
const MAX_CONTACTS = 500;
const MAX_NOTE_AGE_DAYS = 90;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Open the IndexedDB database
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('contacts')) {
        const contacts = db.createObjectStore('contacts', { keyPath: 'id' });
        contacts.createIndex('userId', 'user_id');
        contacts.createIndex('email', 'email');
      }

      if (!db.objectStoreNames.contains('notes')) {
        const notes = db.createObjectStore('notes', { keyPath: 'id' });
        notes.createIndex('contactId', 'contact_id');
        notes.createIndex('userId', 'user_id');
        notes.createIndex('eventDate', 'event_date');
      }

      if (!db.objectStoreNames.contains('prep_cache')) {
        const cache = db.createObjectStore('prep_cache', { keyPath: 'id' });
        cache.createIndex('contactId', 'contact_id');
        cache.createIndex('expiresAt', 'expires_at');
      }

      if (!db.objectStoreNames.contains('calendar_events')) {
        const events = db.createObjectStore('calendar_events', { keyPath: 'id' });
        events.createIndex('start', 'start');
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const sync = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        sync.createIndex('status', 'status');
        sync.createIndex('createdAt', 'created_at');
      }

      if (!db.objectStoreNames.contains('user_settings')) {
        db.createObjectStore('user_settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic get from store
 */
export async function getFromStore(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic put to store
 */
export async function putToStore(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all records from a store
 */
export async function getAllFromStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete from store
 */
export async function deleteFromStore(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Count records in a store
 */
async function countStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add an operation to the sync queue for offline processing
 */
export async function addToSyncQueue(tableName, recordId, operation, payload) {
  await putToStore('sync_queue', {
    table_name: tableName,
    record_id: recordId,
    operation,
    payload,
    status: 'pending',
    attempts: 0,
    created_at: new Date().toISOString(),
  });
}

/**
 * Make a Supabase REST API request (used internally for sync)
 */
async function supabaseSync(path, options = {}) {
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
    throw new Error(`Supabase sync ${options.method || 'GET'} ${path}: ${response.status} — ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Sync a single queue item to Supabase
 * Returns { success, conflict? } where conflict contains server version if detected
 */
async function syncItemToSupabase(item) {
  const { table_name, record_id, operation, payload } = item;

  switch (operation) {
    case 'insert': {
      const [result] = await supabaseSync(
        `${table_name}?on_conflict=id`,
        {
          method: 'POST',
          body: payload,
          headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
        }
      );
      if (result) {
        await putToStore(table_name, result);
      }
      return { success: true };
    }

    case 'upsert': {
      // Check for version conflicts on notes
      if (table_name === 'notes' && payload.version) {
        const serverVersions = await supabaseSync(
          `${table_name}?id=eq.${record_id}&select=id,version,summary,detailed_notes,updated_at`
        );

        if (serverVersions && serverVersions.length > 0) {
          const serverRecord = serverVersions[0];
          if (serverRecord.version > payload.version) {
            return {
              success: false,
              conflict: {
                recordId: record_id,
                recordType: 'note',
                localVersion: payload,
                serverVersion: serverRecord,
              },
            };
          }
        }
      }

      const [result] = await supabaseSync(
        `${table_name}?on_conflict=id`,
        {
          method: 'POST',
          body: payload,
          headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
        }
      );
      if (result) {
        await putToStore(table_name, result);
      }
      return { success: true };
    }

    case 'update': {
      await supabaseSync(
        `${table_name}?id=eq.${record_id}`,
        {
          method: 'PATCH',
          body: payload,
          prefer: 'return=minimal',
        }
      );
      return { success: true };
    }

    case 'delete': {
      await supabaseSync(
        `${table_name}?id=eq.${record_id}`,
        { method: 'DELETE', prefer: 'return=minimal' }
      );
      await deleteFromStore(table_name, record_id);
      return { success: true };
    }

    default:
      return { success: false };
  }
}

/**
 * Process the offline sync queue (FIFO) with retry + conflict detection
 * Returns array of conflicts that need user resolution
 */
export async function processOfflineSyncQueue() {
  if (!navigator.onLine) return [];

  const conflicts = [];

  try {
    await checkStorageQuota();

    const db = await openDB();
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const index = store.index('status');
    const request = index.getAll('pending');

    const pending = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Sort by created_at for FIFO
    pending.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    for (const item of pending) {
      try {
        const result = await syncItemToSupabase(item);

        if (result.success) {
          item.status = 'synced';
          item.synced_at = new Date().toISOString();
          await putToStore('sync_queue', item);
        } else if (result.conflict) {
          item.status = 'conflict';
          item.conflict_data = result.conflict;
          await putToStore('sync_queue', item);
          conflicts.push(result.conflict);
        }
      } catch (error) {
        item.attempts = (item.attempts || 0) + 1;

        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          item.status = 'failed';
          item.error = error.message;
          await putToStore('sync_queue', item);
          captureException(error, { context: 'syncQueue', item: { id: item.id, table: item.table_name } });
        } else {
          // Keep as pending for retry with exponential backoff delay
          item.next_retry_at = new Date(
            Date.now() + RETRY_BASE_DELAY_MS * Math.pow(2, item.attempts)
          ).toISOString();
          await putToStore('sync_queue', item);
        }
      }
    }

    // Also retry failed items that are ready
    await retryFailedItems();

    // Clean up old synced items (older than 7 days)
    await cleanupSyncedItems();
  } catch (error) {
    captureException(error, { context: 'processOfflineSyncQueue' });
  }

  return conflicts;
}

/**
 * Retry items that have a next_retry_at in the past
 */
async function retryFailedItems() {
  const allItems = await getAllFromStore('sync_queue');
  const now = new Date();

  for (const item of allItems) {
    if (item.status === 'pending' && item.next_retry_at && new Date(item.next_retry_at) <= now) {
      try {
        const result = await syncItemToSupabase(item);
        if (result.success) {
          item.status = 'synced';
          item.synced_at = now.toISOString();
        } else {
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts >= MAX_RETRY_ATTEMPTS) {
            item.status = 'failed';
          } else {
            item.next_retry_at = new Date(
              Date.now() + RETRY_BASE_DELAY_MS * Math.pow(2, item.attempts)
            ).toISOString();
          }
        }
        await putToStore('sync_queue', item);
      } catch (error) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          item.status = 'failed';
          item.error = error.message;
        }
        await putToStore('sync_queue', item);
      }
    }
  }
}

/**
 * Remove synced items older than 7 days
 */
async function cleanupSyncedItems() {
  const allItems = await getAllFromStore('sync_queue');
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const item of allItems) {
    if (item.status === 'synced' && item.synced_at && new Date(item.synced_at) < cutoff) {
      await deleteFromStore('sync_queue', item.id);
    }
  }
}

/**
 * Resolve a sync conflict — apply the chosen version
 */
export async function resolveConflict(recordId, tableName, resolution, localVersion, serverVersion) {
  if (resolution === 'keep_local') {
    // Force push local version with incremented version
    const updatedPayload = {
      ...localVersion,
      version: (serverVersion.version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    await supabaseSync(
      `${tableName}?id=eq.${recordId}`,
      { method: 'PATCH', body: updatedPayload, prefer: 'return=representation' }
    );
    await putToStore(tableName, updatedPayload);
  } else {
    // Accept server version — update local cache
    await putToStore(tableName, serverVersion);
  }

  // Remove the conflict item from sync queue
  const allItems = await getAllFromStore('sync_queue');
  for (const item of allItems) {
    if (item.record_id === recordId && item.status === 'conflict') {
      item.status = 'resolved';
      item.resolution = resolution;
      item.resolved_at = new Date().toISOString();
      await putToStore('sync_queue', item);
    }
  }
}

/**
 * Get pending sync count (for badge display)
 */
export async function getPendingSyncCount() {
  const allItems = await getAllFromStore('sync_queue');
  return allItems.filter(i => i.status === 'pending' || i.status === 'conflict').length;
}

/**
 * Get conflicts awaiting resolution
 */
export async function getPendingConflicts() {
  const allItems = await getAllFromStore('sync_queue');
  return allItems
    .filter(i => i.status === 'conflict' && i.conflict_data)
    .map(i => i.conflict_data);
}

/**
 * Check storage quota and purge if needed
 */
export async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return;

  const { usage, quota } = await navigator.storage.estimate();
  const usageRatio = usage / quota;

  if (usageRatio > 0.9) {
    // Aggressive purge
    await purgeOldNotes(30);
    await purgeExpiredPrepCache();
    await enforceContactLimit();
  } else if (usageRatio > 0.8) {
    await purgeOldNotes(60);
    await purgeExpiredPrepCache();
  }
}

/**
 * Purge notes older than given days
 */
async function purgeOldNotes(days) {
  const db = await openDB();
  const tx = db.transaction('notes', 'readwrite');
  const store = tx.objectStore('notes');
  const index = store.index('eventDate');
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const range = IDBKeyRange.upperBound(cutoff);
  const request = index.openCursor(range);

  return new Promise((resolve) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => resolve();
  });
}

/**
 * Remove expired prep cache entries
 */
async function purgeExpiredPrepCache() {
  const db = await openDB();
  const tx = db.transaction('prep_cache', 'readwrite');
  const store = tx.objectStore('prep_cache');
  const index = store.index('expiresAt');
  const now = new Date().toISOString();

  const range = IDBKeyRange.upperBound(now);
  const request = index.openCursor(range);

  return new Promise((resolve) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => resolve();
  });
}

/**
 * Enforce max 500 contacts, removing LRU
 */
async function enforceContactLimit() {
  const contacts = await getAllFromStore('contacts');
  if (contacts.length <= MAX_CONTACTS) return;

  // Sort by last_seen_at ascending (oldest first)
  contacts.sort((a, b) => {
    const dateA = new Date(a.last_seen_at || a.created_at || 0);
    const dateB = new Date(b.last_seen_at || b.created_at || 0);
    return dateA - dateB;
  });

  const toRemove = contacts.slice(0, contacts.length - MAX_CONTACTS);
  for (const contact of toRemove) {
    await deleteFromStore('contacts', contact.id);
  }
}

/**
 * Run periodic maintenance — call from alarm
 */
export async function runMaintenance() {
  await checkStorageQuota();
  await purgeOldNotes(MAX_NOTE_AGE_DAYS);
  await purgeExpiredPrepCache();
  await enforceContactLimit();
  await cleanupSyncedItems();
}
