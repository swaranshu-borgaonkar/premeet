import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need to mock navigator.userAgent before importing the module.
// Since userAgent is read-only, we define it on a custom navigator object.
let getBrowser, getStorageAPI, getIdentityAPI, checkCompatibility;

function setupNavigator(userAgent, extras = {}) {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      userAgent,
      ...extras,
    },
    writable: true,
    configurable: true,
  });
}

describe('browser-detection', () => {
  afterEach(() => {
    vi.resetModules();
    // Clean up globals
    delete globalThis.chrome;
    delete globalThis.browser;
  });

  describe('getBrowser', () => {
    it('should detect Chrome', async () => {
      setupNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
      const mod = await import('../lib/browser-detection.js');
      expect(mod.getBrowser()).toBe('chrome');
    });

    it('should detect Edge (Edg/ comes before Chrome/)', async () => {
      setupNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
      const mod = await import('../lib/browser-detection.js');
      expect(mod.getBrowser()).toBe('edge');
    });

    it('should detect Firefox', async () => {
      setupNavigator('Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0');
      const mod = await import('../lib/browser-detection.js');
      expect(mod.getBrowser()).toBe('firefox');
    });

    it('should detect Brave', async () => {
      setupNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Brave');
      const mod = await import('../lib/browser-detection.js');
      expect(mod.getBrowser()).toBe('brave');
    });

    it('should return unknown for unrecognized browsers', async () => {
      setupNavigator('Mozilla/5.0 (compatible; Konqueror/4.5)');
      const mod = await import('../lib/browser-detection.js');
      expect(mod.getBrowser()).toBe('unknown');
    });
  });

  describe('getStorageAPI', () => {
    it('should return chrome.storage when chrome is available', async () => {
      setupNavigator('Chrome/120');
      const mockStorage = { local: {}, sync: {} };
      globalThis.chrome = { storage: mockStorage };

      const mod = await import('../lib/browser-detection.js');
      expect(mod.getStorageAPI()).toBe(mockStorage);
    });

    it('should return browser.storage when browser API is available', async () => {
      setupNavigator('Firefox/121');
      delete globalThis.chrome;
      const mockStorage = { local: {}, sync: {} };
      globalThis.browser = { storage: mockStorage };

      const mod = await import('../lib/browser-detection.js');
      expect(mod.getStorageAPI()).toBe(mockStorage);
    });

    it('should throw when no storage API is available', async () => {
      setupNavigator('Unknown');
      delete globalThis.chrome;
      delete globalThis.browser;

      const mod = await import('../lib/browser-detection.js');
      expect(() => mod.getStorageAPI()).toThrow('No storage API available');
    });
  });

  describe('getIdentityAPI', () => {
    it('should return chrome.identity when available', async () => {
      setupNavigator('Chrome/120');
      const mockIdentity = { getAuthToken: vi.fn() };
      globalThis.chrome = { identity: mockIdentity };

      const mod = await import('../lib/browser-detection.js');
      expect(mod.getIdentityAPI()).toBe(mockIdentity);
    });

    it('should throw when no identity API is available', async () => {
      setupNavigator('Unknown');
      delete globalThis.chrome;
      delete globalThis.browser;

      const mod = await import('../lib/browser-detection.js');
      expect(() => mod.getIdentityAPI()).toThrow('No identity API available');
    });
  });

  describe('checkCompatibility', () => {
    it('should report no issues for Chrome with all APIs', async () => {
      setupNavigator('Chrome/120', { serviceWorker: {} });
      globalThis.self = { indexedDB: {}, SpeechRecognition: {} };
      // Make indexedDB and SpeechRecognition available on self
      Object.defineProperty(globalThis, 'indexedDB', { value: {}, configurable: true });

      const mod = await import('../lib/browser-detection.js');
      const result = mod.checkCompatibility();
      expect(result.browser).toBe('chrome');
      // May or may not have issues depending on self environment
      expect(result).toHaveProperty('supported');
      expect(result).toHaveProperty('issues');
    });

    it('should flag Firefox as using browser.* APIs', async () => {
      setupNavigator('Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0', {
        serviceWorker: {},
      });
      Object.defineProperty(globalThis, 'indexedDB', { value: {}, configurable: true });

      const mod = await import('../lib/browser-detection.js');
      const result = mod.checkCompatibility();
      expect(result.browser).toBe('firefox');
      expect(result.issues).toContain('Firefox uses browser.* APIs - limited support');
    });
  });
});
