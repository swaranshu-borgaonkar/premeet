import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../lib/rate-limiter.js';

// Mock chrome.storage.local
const storageData = {};
globalThis.chrome = {
  storage: {
    local: {
      get: vi.fn(async (key) => {
        return { [key]: storageData[key] || undefined };
      }),
      set: vi.fn(async (obj) => {
        Object.assign(storageData, obj);
      }),
    },
  },
};

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter('testLimiter');
    // Clear stored data
    for (const key in storageData) {
      delete storageData[key];
    }
    vi.clearAllMocks();
  });

  describe('canMakeRequest', () => {
    it('should allow requests when under quota', async () => {
      storageData.testLimiter = { timestamps: [Date.now()] };
      const allowed = await limiter.canMakeRequest();
      expect(allowed).toBe(true);
    });

    it('should block requests when quota is exceeded', async () => {
      // Fill with 900000 timestamps (at quota limit)
      const now = Date.now();
      storageData.testLimiter = {
        timestamps: new Array(900000).fill(now),
      };
      const allowed = await limiter.canMakeRequest();
      expect(allowed).toBe(false);
    });

    it('should allow requests when all timestamps are within window', async () => {
      storageData.testLimiter = { timestamps: [] };
      const allowed = await limiter.canMakeRequest();
      expect(allowed).toBe(true);
    });
  });

  describe('getUsage - timestamp cleanup', () => {
    it('should remove timestamps older than 24 hours', async () => {
      const now = Date.now();
      const oldTimestamp = now - 25 * 60 * 60 * 1000; // 25 hours ago
      const recentTimestamp = now - 1000; // 1 second ago

      storageData.testLimiter = {
        timestamps: [oldTimestamp, recentTimestamp],
      };

      const usage = await limiter.getUsage();
      expect(usage.timestamps).toHaveLength(1);
      expect(usage.timestamps[0]).toBe(recentTimestamp);
    });

    it('should keep all timestamps within the 24-hour window', async () => {
      const now = Date.now();
      const timestamps = [now - 1000, now - 2000, now - 3000];
      storageData.testLimiter = { timestamps };

      const usage = await limiter.getUsage();
      expect(usage.timestamps).toHaveLength(3);
    });

    it('should initialize empty timestamps if no data exists', async () => {
      const usage = await limiter.getUsage();
      expect(usage.timestamps).toEqual([]);
    });
  });

  describe('recordRequest', () => {
    it('should add current timestamp to usage', async () => {
      storageData.testLimiter = { timestamps: [] };
      const before = Date.now();
      await limiter.recordRequest();
      const after = Date.now();

      const saved = storageData.testLimiter;
      expect(saved.timestamps).toHaveLength(1);
      expect(saved.timestamps[0]).toBeGreaterThanOrEqual(before);
      expect(saved.timestamps[0]).toBeLessThanOrEqual(after);
    });
  });

  describe('execute', () => {
    it('should execute the request function when under quota', async () => {
      storageData.testLimiter = { timestamps: [] };
      const fn = vi.fn().mockResolvedValue('result');

      const result = await limiter.execute(fn);
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should not execute the function immediately when quota is exceeded', async () => {
      const now = Date.now();
      storageData.testLimiter = {
        timestamps: new Array(900000).fill(now),
      };

      const fn = vi.fn().mockResolvedValue('queued-result');
      // Don't await - just fire and forget since it will queue with a 60s wait
      limiter.execute(fn);

      // Give a tick for the async code to run
      await new Promise(r => setTimeout(r, 50));

      // fn should not have been called since quota is full
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('isBusinessHours', () => {
    it('should return true during business hours', () => {
      // Mock Date to 10:00 AM UTC
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));

      // UTC timezone, 10 AM is within 8-20
      const result = limiter.isBusinessHours('UTC');
      expect(result).toBe(true);

      vi.useRealTimers();
    });

    it('should return false outside business hours', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T03:00:00Z'));

      // UTC timezone, 3 AM is outside 8-20
      const result = limiter.isBusinessHours('UTC');
      expect(result).toBe(false);

      vi.useRealTimers();
    });

    it('should default to true for invalid timezone', () => {
      const result = limiter.isBusinessHours('Invalid/Timezone');
      expect(result).toBe(true);
    });
  });
});
