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
    if (!signature || !(await verifySignature(body, signature))) {
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

async function verifySignature(body: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSig === signature;
  } catch {
    return false;
  }
}

function getTierFromVariant(variantId: string): string {
  // Map LemonSqueezy variant IDs to subscription tiers
  // Variant IDs are set when creating products in LemonSqueezy dashboard
  // and configured via LEMONSQUEEZY_MONTHLY_VARIANT_ID / LEMONSQUEEZY_YEARLY_VARIANT_ID env vars
  const monthlyVariant = Deno.env.get('LEMONSQUEEZY_MONTHLY_VARIANT_ID') || '';
  const yearlyVariant = Deno.env.get('LEMONSQUEEZY_YEARLY_VARIANT_ID') || '';

  const variantMap: Record<string, string> = {};
  if (monthlyVariant) variantMap[monthlyVariant] = 'individual';
  if (yearlyVariant) variantMap[yearlyVariant] = 'individual';

  return variantMap[String(variantId)] || 'individual';
}
