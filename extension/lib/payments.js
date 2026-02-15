import { getConfig } from './config.js';
import { captureException } from './sentry.js';

/**
 * Generate a LemonSqueezy checkout URL for Individual plan
 * Uses redirect flow (not overlay) per plan requirements
 */
export async function getCheckoutUrl(userId, userEmail, plan = 'monthly') {
  try {
    const config = await getConfig();

    const variantId = plan === 'yearly'
      ? config.LEMONSQUEEZY_YEARLY_VARIANT_ID
      : config.LEMONSQUEEZY_MONTHLY_VARIANT_ID;

    if (!variantId) {
      throw new Error('LemonSqueezy variant ID not configured');
    }

    // Build checkout URL with prefilled data
    const checkoutUrl = new URL(`https://prepmeet.lemonsqueezy.com/checkout/buy/${variantId}`);
    checkoutUrl.searchParams.set('checkout[email]', userEmail);
    checkoutUrl.searchParams.set('checkout[custom][user_id]', userId);
    checkoutUrl.searchParams.set('media', '0'); // Hide product media
    checkoutUrl.searchParams.set('discount', '0');

    return checkoutUrl.toString();
  } catch (error) {
    captureException(error, { context: 'getCheckoutUrl' });
    throw error;
  }
}

/**
 * Open checkout in a new tab
 */
export async function openCheckout(userId, userEmail, plan = 'monthly') {
  const url = await getCheckoutUrl(userId, userEmail, plan);
  chrome.tabs.create({ url });
}

/**
 * Check if user has active subscription (poll after checkout return)
 */
export async function pollSubscriptionStatus(userId, maxAttempts = 10) {
  const { getUserProfile } = await import('./supabase.js');

  for (let i = 0; i < maxAttempts; i++) {
    const profile = await getUserProfile(userId);
    if (profile && profile.subscription_tier !== 'free') {
      // Update cached user
      const { user } = await chrome.storage.local.get('user');
      if (user) {
        await chrome.storage.local.set({
          user: { ...user, subscription_tier: profile.subscription_tier },
        });
      }
      return { upgraded: true, tier: profile.subscription_tier };
    }

    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return { upgraded: false };
}

/**
 * Open billing portal for subscription management
 */
export function openBillingPortal() {
  chrome.tabs.create({ url: 'https://prepmeet.lemonsqueezy.com/billing' });
}
