const QUOTA_LIMIT = 900000; // 90% of 1M daily quota
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Rate limiter for Google Calendar API
 * Tracks usage and queues requests when nearing quota
 */
export class RateLimiter {
  constructor(storageKey = 'rateLimiter') {
    this.storageKey = storageKey;
    this.queue = [];
    this.processing = false;
  }

  async getUsage() {
    const data = await chrome.storage.local.get(this.storageKey);
    const usage = data[this.storageKey] || { timestamps: [] };

    // Clean entries older than 24 hours
    const cutoff = Date.now() - WINDOW_MS;
    usage.timestamps = usage.timestamps.filter(t => t > cutoff);

    await chrome.storage.local.set({ [this.storageKey]: usage });
    return usage;
  }

  async canMakeRequest() {
    const usage = await this.getUsage();
    return usage.timestamps.length < QUOTA_LIMIT;
  }

  async recordRequest() {
    const usage = await this.getUsage();
    usage.timestamps.push(Date.now());
    await chrome.storage.local.set({ [this.storageKey]: usage });
  }

  /**
   * Execute a request with rate limiting
   * @param {Function} requestFn - Async function to execute
   * @returns {Promise} Result of the request
   */
  async execute(requestFn) {
    if (await this.canMakeRequest()) {
      await this.recordRequest();
      return requestFn();
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      if (await this.canMakeRequest()) {
        const { requestFn, resolve, reject } = this.queue.shift();
        try {
          await this.recordRequest();
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } else {
        // Wait 1 minute before retrying
        await new Promise(r => setTimeout(r, 60000));
      }
    }

    this.processing = false;
  }

  /**
   * Check if we should poll based on business hours
   * @param {string} timezone - User's timezone
   * @returns {boolean}
   */
  isBusinessHours(timezone) {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      });
      const hour = parseInt(formatter.format(now));
      return hour >= 8 && hour <= 20;
    } catch {
      return true; // Default to allowing if timezone is invalid
    }
  }
}
