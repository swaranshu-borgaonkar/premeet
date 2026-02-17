import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing signature', { status: 401 });
    }

    // Verify Stripe webhook signature (HMAC-SHA256)
    const verified = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
    if (!verified) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata.workspace_id;
        const seats = session.metadata.seats || 3;

        await supabase
          .from('workspaces')
          .update({
            settings: {
              stripe_subscription_id: session.subscription,
              stripe_customer_id: session.customer,
              seats: parseInt(seats),
              plan: 'team',
            },
          })
          .eq('id', workspaceId);

        // Update all workspace members to team tier
        const { data: members } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId);

        if (members) {
          for (const member of members) {
            await supabase
              .from('users')
              .update({ subscription_tier: 'team' })
              .eq('id', member.user_id);
          }
        }

        await supabase.from('audit_logs').insert({
          workspace_id: workspaceId,
          action: 'team_subscription_created',
          resource_type: 'subscription',
          details: { seats, subscription_id: session.subscription },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const quantity = subscription.items.data[0]?.quantity || 3;

        // Find workspace by stripe subscription ID
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .contains('settings', {
            stripe_subscription_id: subscription.id,
          })
          .single();

        if (workspace) {
          await supabase
            .from('workspaces')
            .update({
              settings: {
                stripe_subscription_id: subscription.id,
                seats: quantity,
              },
            })
            .eq('id', workspace.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id, owner_id, settings')
          .contains('settings', {
            stripe_customer_id: invoice.customer,
          })
          .single();

        if (workspace) {
          const failCount =
            (workspace.settings?.payment_fail_count || 0) + 1;

          await supabase
            .from('workspaces')
            .update({
              settings: {
                ...workspace.settings,
                payment_fail_count: failCount,
                last_payment_failure: new Date().toISOString(),
              },
            })
            .eq('id', workspace.id);

          // Day 15+: suspend workspace
          if (failCount >= 4) {
            await supabase
              .from('workspaces')
              .update({ archived: true })
              .eq('id', workspace.id);
          }

          await supabase.from('audit_logs').insert({
            workspace_id: workspace.id,
            user_id: workspace.owner_id,
            action: 'team_payment_failed',
            resource_type: 'subscription',
            details: { fail_count: failCount },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .contains('settings', {
            stripe_subscription_id: subscription.id,
          })
          .single();

        if (workspace) {
          // Downgrade all members
          const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspace.id);

          if (members) {
            for (const member of members) {
              await supabase
                .from('users')
                .update({ subscription_tier: 'free' })
                .eq('id', member.user_id);
            }
          }

          await supabase.from('audit_logs').insert({
            workspace_id: workspace.id,
            action: 'team_subscription_cancelled',
            resource_type: 'subscription',
            details: { subscription_id: subscription.id },
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !sig) return false;

    // Reject if timestamp is older than 5 minutes
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300) return false;

    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSig === sig;
  } catch {
    return false;
  }
}
