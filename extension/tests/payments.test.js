import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../lib/config.js', () => ({
  getConfig: vi.fn(async () => ({
    LEMONSQUEEZY_MONTHLY_VARIANT_ID: 'variant-monthly-123',
    LEMONSQUEEZY_YEARLY_VARIANT_ID: 'variant-yearly-456',
  })),
}));

vi.mock('../lib/sentry.js', () => ({
  captureException: vi.fn(),
}));

// Mock chrome APIs
globalThis.chrome = {
  tabs: {
    create: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {}),
    },
  },
};

// Mock supabase module (dynamically imported in pollSubscriptionStatus)
vi.mock('../lib/supabase.js', () => ({
  getUserProfile: vi.fn(async () => null),
}));

import { getCheckoutUrl, openCheckout, pollSubscriptionStatus, openBillingPortal } from '../lib/payments.js';
import { getConfig } from '../lib/config.js';
import { getUserProfile } from '../lib/supabase.js';

describe('payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCheckoutUrl', () => {
    it('should generate a monthly checkout URL by default', async () => {
      const url = await getCheckoutUrl('user-1', 'user@example.com');

      expect(url).toContain('variant-monthly-123');
      expect(url).toContain('prepmeet.lemonsqueezy.com/checkout/buy/');
    });

    it('should generate a yearly checkout URL when plan is yearly', async () => {
      const url = await getCheckoutUrl('user-1', 'user@example.com', 'yearly');

      expect(url).toContain('variant-yearly-456');
    });

    it('should include the user email as a checkout parameter', async () => {
      const url = await getCheckoutUrl('user-1', 'test@example.com');

      expect(url).toContain(encodeURIComponent('test@example.com'));
    });

    it('should include the user ID as a custom parameter', async () => {
      const url = await getCheckoutUrl('user-1', 'test@example.com');

      expect(url).toContain('user-1');
    });

    it('should disable media and discount in the checkout URL', async () => {
      const url = await getCheckoutUrl('user-1', 'test@example.com');

      const parsed = new URL(url);
      expect(parsed.searchParams.get('media')).toBe('0');
      expect(parsed.searchParams.get('discount')).toBe('0');
    });

    it('should throw when variant ID is not configured', async () => {
      getConfig.mockResolvedValueOnce({
        LEMONSQUEEZY_MONTHLY_VARIANT_ID: null,
        LEMONSQUEEZY_YEARLY_VARIANT_ID: null,
      });

      await expect(getCheckoutUrl('user-1', 'test@example.com')).rejects.toThrow(
        'LemonSqueezy variant ID not configured'
      );
    });

    it('should throw for yearly plan when yearly variant is missing', async () => {
      getConfig.mockResolvedValueOnce({
        LEMONSQUEEZY_MONTHLY_VARIANT_ID: 'variant-monthly-123',
        LEMONSQUEEZY_YEARLY_VARIANT_ID: null,
      });

      await expect(getCheckoutUrl('user-1', 'test@example.com', 'yearly')).rejects.toThrow(
        'LemonSqueezy variant ID not configured'
      );
    });
  });

  describe('openCheckout', () => {
    it('should open a new tab with the checkout URL', async () => {
      await openCheckout('user-1', 'test@example.com');

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('prepmeet.lemonsqueezy.com/checkout/buy/'),
      });
    });

    it('should use the correct plan variant', async () => {
      await openCheckout('user-1', 'test@example.com', 'yearly');

      const call = chrome.tabs.create.mock.calls[0][0];
      expect(call.url).toContain('variant-yearly-456');
    });
  });

  describe('pollSubscriptionStatus', () => {
    it('should return upgraded: true when profile has a non-free tier', async () => {
      getUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        subscription_tier: 'individual',
      });

      const result = await pollSubscriptionStatus('user-1', 1);

      expect(result.upgraded).toBe(true);
      expect(result.tier).toBe('individual');
    });

    it('should return upgraded: false after max attempts with no upgrade', async () => {
      vi.useFakeTimers();
      getUserProfile.mockResolvedValue({ id: 'user-1', subscription_tier: 'free' });

      const promise = pollSubscriptionStatus('user-1', 2);

      // Advance through the setTimeout delays (3000ms each)
      for (let i = 0; i < 2; i++) {
        await vi.advanceTimersByTimeAsync(3100);
      }

      const result = await promise;
      expect(result.upgraded).toBe(false);
      vi.useRealTimers();
    });

    it('should update cached user in chrome.storage when upgrade detected', async () => {
      getUserProfile.mockResolvedValueOnce({
        id: 'user-1',
        subscription_tier: 'team',
      });

      chrome.storage.local.get.mockResolvedValueOnce({
        user: { id: 'user-1', subscription_tier: 'free', email: 'test@example.com' },
      });

      await pollSubscriptionStatus('user-1', 1);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 'user-1',
          subscription_tier: 'team',
          email: 'test@example.com',
        }),
      });
    });

    it('should handle null profile gracefully', async () => {
      getUserProfile.mockResolvedValue(null);

      const result = await pollSubscriptionStatus('user-1', 1);

      expect(result.upgraded).toBe(false);
    });
  });

  describe('openBillingPortal', () => {
    it('should open the billing portal URL in a new tab', () => {
      openBillingPortal();

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://prepmeet.lemonsqueezy.com/billing',
      });
    });
  });
});
