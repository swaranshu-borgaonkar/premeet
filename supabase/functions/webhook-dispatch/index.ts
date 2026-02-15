import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = req.method !== 'GET' ? await req.json() : {};

    // Verify workspace admin access for management actions
    async function verifyAdmin(workspaceId: string) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .single();

      if (!member || !['admin', 'owner'].includes(member.role)) {
        throw new Error('Admin access required');
      }
    }

    switch (action) {
      // ── Register a new webhook endpoint ──
      case 'register_webhook': {
        const { workspace_id, url: webhookUrl, events } = body;
        if (!workspace_id || !webhookUrl || !events?.length) {
          throw new Error('workspace_id, url, and events[] are required');
        }
        await verifyAdmin(workspace_id);

        // Generate HMAC signing secret
        const secretBytes = crypto.getRandomValues(new Uint8Array(32));
        const secret = Array.from(secretBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        const { data: webhook, error } = await supabase
          .from('webhook_endpoints')
          .insert({
            workspace_id,
            url: webhookUrl,
            secret,
            events,
            active: true,
          })
          .select()
          .single();
        if (error) throw error;

        // Return secret only on creation — it cannot be retrieved later
        return json({ ...webhook, secret });
      }

      // ── List webhooks for a workspace ──
      case 'list_webhooks': {
        const workspaceId = url.searchParams.get('workspace_id');
        if (!workspaceId) throw new Error('workspace_id required');
        await verifyAdmin(workspaceId);

        const { data, error } = await supabase
          .from('webhook_endpoints')
          .select('id, workspace_id, url, events, active, created_at, updated_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });
        if (error) throw error;

        return json(data);
      }

      // ── Delete a webhook endpoint ──
      case 'delete_webhook': {
        const { webhook_id, workspace_id } = body;
        if (!webhook_id || !workspace_id) throw new Error('webhook_id and workspace_id required');
        await verifyAdmin(workspace_id);

        const { error } = await supabase
          .from('webhook_endpoints')
          .delete()
          .eq('id', webhook_id)
          .eq('workspace_id', workspace_id);
        if (error) throw error;

        return json({ success: true });
      }

      // ── Test a webhook by sending a ping event ──
      case 'test_webhook': {
        const { webhook_id, workspace_id } = body;
        if (!webhook_id || !workspace_id) throw new Error('webhook_id and workspace_id required');
        await verifyAdmin(workspace_id);

        const { data: webhook } = await supabase
          .from('webhook_endpoints')
          .select('*')
          .eq('id', webhook_id)
          .eq('workspace_id', workspace_id)
          .single();
        if (!webhook) throw new Error('Webhook not found');

        const testPayload = {
          event: 'ping',
          timestamp: new Date().toISOString(),
          workspace_id,
        };

        const result = await deliverWebhook(supabase, webhook, 'ping', testPayload);
        return json(result);
      }

      // ── Dispatch an event to all subscribed webhooks (internal) ──
      case 'dispatch_event': {
        const { workspace_id, event_type, payload } = body;
        if (!workspace_id || !event_type || !payload) {
          throw new Error('workspace_id, event_type, and payload required');
        }

        const results = await dispatchEvent(supabase, workspace_id, event_type, payload);
        return json({ dispatched: results.length, results });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── Internal: dispatch an event to all matching webhooks ──
async function dispatchEvent(
  supabase: any,
  workspaceId: string,
  eventType: string,
  payload: any
) {
  const { data: webhooks } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('active', true)
    .contains('events', [eventType]);

  if (!webhooks || webhooks.length === 0) return [];

  const results = [];
  for (const webhook of webhooks) {
    const result = await deliverWebhook(supabase, webhook, eventType, payload);
    results.push(result);
  }
  return results;
}

// ── Internal: deliver a single webhook with HMAC signing ──
async function deliverWebhook(
  supabase: any,
  webhook: any,
  eventType: string,
  payload: any
) {
  const idempotencyKey = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = JSON.stringify(payload);

  // HMAC-SHA256 signature: timestamp.body
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhook.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${bodyStr}`)
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  let responseStatus = 0;
  let responseBody = '';
  let delivered = false;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PrepMeet-Signature': signature,
          'X-PrepMeet-Timestamp': timestamp,
          'X-PrepMeet-Idempotency-Key': idempotencyKey,
          'X-PrepMeet-Event': eventType,
        },
        body: bodyStr,
      });

      responseStatus = res.status;
      responseBody = await res.text();

      if (res.ok) {
        delivered = true;

        // Log successful delivery
        await supabase.from('webhook_deliveries').insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          response_status: responseStatus,
          response_body: responseBody.slice(0, 2000),
          attempts: attempt,
          idempotency_key: idempotencyKey,
          delivered_at: new Date().toISOString(),
        });

        return { webhook_id: webhook.id, status: 'delivered', attempts: attempt };
      }
    } catch (err) {
      responseStatus = 0;
      responseBody = err.message;
    }

    // Exponential backoff between retries: 1s, 2s, 4s
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  // Log failed delivery
  await supabase.from('webhook_deliveries').insert({
    webhook_id: webhook.id,
    event_type: eventType,
    payload,
    response_status: responseStatus,
    response_body: (responseBody || '').slice(0, 2000),
    attempts: maxAttempts,
    idempotency_key: idempotencyKey,
    delivered_at: null,
  });

  return { webhook_id: webhook.id, status: 'failed', attempts: maxAttempts, last_status: responseStatus };
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
