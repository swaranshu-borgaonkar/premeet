/**
 * Detect the current browser environment
 */
export function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Brave')) return 'brave';
  if (ua.includes('Chrome/')) return 'chrome';
  if (ua.includes('Firefox/')) return 'firefox';
  return 'unknown';
}

/**
 * Get the appropriate storage API for the current browser
 */
export function getStorageAPI() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage;
  }
  if (typeof browser !== 'undefined' && browser.storage) {
    return browser.storage;
  }
  throw new Error('No storage API available');
}

/**
 * Get the appropriate identity API
 */
export function getIdentityAPI() {
  if (typeof chrome !== 'undefined' && chrome.identity) {
    return chrome.identity;
  }
  if (typeof browser !== 'undefined' && browser.identity) {
    return browser.identity;
  }
  throw new Error('No identity API available');
}

/**
 * Check if the browser supports all required APIs
 */
export function checkCompatibility() {
  const issues = [];
  const browser = getBrowser();

  if (browser === 'firefox') {
    issues.push('Firefox uses browser.* APIs - limited support');
  }

  if (!('serviceWorker' in navigator)) {
    issues.push('Service Workers not supported');
  }

  if (!('indexedDB' in self)) {
    issues.push('IndexedDB not available');
  }

  if (!('SpeechRecognition' in self || 'webkitSpeechRecognition' in self)) {
    issues.push('Speech Recognition not available');
  }

  return {
    browser,
    supported: issues.length === 0 || (issues.length === 1 && browser === 'firefox'),
    issues
  };
}
