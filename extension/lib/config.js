/**
 * Centralized configuration for the PrepMeet extension.
 * Values are loaded from chrome.storage.sync (set during onboarding)
 * with fallbacks to defaults.
 */

const DEFAULTS = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  SENTRY_DSN: '',
  REMINDER_MINUTES_BEFORE: 5,
  POST_SESSION_REMINDER_DELAY: 5, // minutes after event ends
  CALENDAR_POLL_INTERVAL: 5, // minutes
  TOKEN_REFRESH_INTERVAL: 45, // minutes
  SYNC_INTERVAL: 10, // minutes
  MAX_NOTES_FOR_PREP: 5,
  PREP_CACHE_TTL_HOURS: 24,
  OFFLINE_CACHE_MAX_CONTACTS: 500,
  OFFLINE_CACHE_MAX_NOTE_DAYS: 90,
  BUSINESS_HOURS_START: 8,
  BUSINESS_HOURS_END: 20,
  MICROSOFT_CLIENT_ID: '',
  LEMONSQUEEZY_MONTHLY_VARIANT_ID: '',
  LEMONSQUEEZY_YEARLY_VARIANT_ID: '',
};

let _configCache = null;

/**
 * Get the full config, merging stored values with defaults
 */
export async function getConfig() {
  if (_configCache) return _configCache;

  const stored = await chrome.storage.sync.get('config');
  _configCache = { ...DEFAULTS, ...(stored.config || {}) };
  return _configCache;
}

/**
 * Update config values
 */
export async function setConfig(updates) {
  const current = await getConfig();
  const merged = { ...current, ...updates };
  await chrome.storage.sync.set({ config: merged });
  _configCache = merged;
  return merged;
}

/**
 * Get a single config value
 */
export async function getConfigValue(key) {
  const config = await getConfig();
  return config[key];
}

/**
 * Clear config cache (call when config changes externally)
 */
export function clearConfigCache() {
  _configCache = null;
}

// Listen for config changes from options page
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.config) {
    _configCache = null;
  }
});
