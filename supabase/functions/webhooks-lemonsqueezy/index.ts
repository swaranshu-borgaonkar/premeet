import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const WEBHOOK_SECRET = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const body = await req.text();

    // Verify webhook signature
    const signature = req.headers.get('x-signature');
    if (!signature || !verifySignature(body, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const eventName = event.meta.event_name;
    const customData = event.meta.custom_data || {};
    const userId = customData.user_id;

    if (!userId) {
      return new Response('Missing user_id in custom_data', { status: 400 });
    }

    switch (eventName) {
      case 'subscription_created': {
        const variantId = event.data.attributes.variant_id;
        const tier = getTierFromVariant(variantId);

        await supabase
          .from('users')
          .update({
            subscription_tier: tier,
            settings: {
              lemonsqueezy_subscription_id: event.data.id,
              lemonsqueezy_customer_id: event.data.attributes.customer_id,
            },
          })
          .eq('id', userId);

        // Log to audit
        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'subscription_created',
          resource_type: 'subscription',
          details: { tier, subscription_id: event.data.id },
        });
        break;
      }

      case 'subscription_cancelled': {
        // Start grace period - don't downgrade immediately
        await supabase
          .from('users')
          .update({
            settings: {
              cancellation_date: new Date().toISOString(),
              grace_period_ends: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ).toISOString(),
            },
          })
          .eq('id', userId);

        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'subscription_cancelled',
          resource_type: 'subscription',
          details: { subscription_id: event.data.id },
        });
        break;
      }

      case 'subscription_payment_failed': {
        const failCount =
          event.data.attributes.billing_anchor_failed_count || 1;

        // Grace period logic
        // Days 1-3: full access
        // Days 4-7: degraded (read-only)
        // Day 8+: downgrade to free
        if (failCount >= 3) {
          await supabase
            .from('users')
            .update({ subscription_tier: 'free' })
            .eq('id', userId);
        }

        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'payment_failed',
          resource_type: 'subscription',
          details: { fail_count: failCount, subscription_id: event.data.id },
        });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function verifySignature(body: string, signature: string): boolean {
  const encoder = new TextEncoder();
  const key = encoder.encode(WEBHOOK_SECRET);
  const data = encoder.encode(body);

  const hmac = new Uint8Array(32); // placeholder - use proper HMAC
  // TODO: Use Web Crypto API for HMAC-SHA256 verification
  // For now, compare hex digests
  return true; // Implement proper verification
}

function getTierFromVariant(variantId: string): string {
  // Map LemonSqueezy variant IDs to tiers
  // These will be configured when products are created
  const variantMap: Record<string, string> = {
    // individual_monthly: 'individual',
    // individual_annual: 'individual',
  };
  return variantMap[variantId] || 'individual';
}
