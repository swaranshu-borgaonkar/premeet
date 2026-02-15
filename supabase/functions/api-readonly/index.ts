import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startTime = Date.now();
  let apiKeyRecord: any = null;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── API Key Authentication ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer pk_')) {
      throw new Error('Invalid API key. Expected: Bearer pk_...');
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const keyHash = await hashApiKey(apiKey);

    const { data: keyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, workspace_id, user_id, permissions, rate_limit, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !keyRecord) {
      throw new Error('Invalid API key');
    }

    apiKeyRecord = keyRecord;

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      throw new Error('API key expired');
    }

    // ── Rate Limiting ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentRequests } = await supabase
      .from('api_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyRecord.id)
      .gte('created_at', oneHourAgo);

    if ((recentRequests || 0) >= keyRecord.rate_limit) {
      const responseTime = Date.now() - startTime;
      await logRequest(supabase, keyRecord.id, req.method, 'rate_limited', 429, responseTime);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', limit: keyRecord.rate_limit, window: '1 hour' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id);

    // ── Route to action ──
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const workspaceId = keyRecord.workspace_id;

    let result: any;

    switch (action) {
      case 'list_contacts': {
        const { data, error, count } = await supabase
          .from('contacts')
          .select('id, full_name, email, phone, company, last_seen_at, created_at', { count: 'exact' })
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) throw error;

        result = { data, total: count, limit, offset };
        break;
      }

      case 'get_contact': {
        const contactId = url.searchParams.get('contact_id');
        if (!contactId) throw new Error('contact_id required');

        const { data, error } = await supabase
          .from('contacts')
          .select('id, full_name, email, phone, company, metadata, tags, source, last_seen_at, created_at')
          .eq('id', contactId)
          .eq('workspace_id', workspaceId)
          .single();
        if (error) throw error;

        result = { data };
        break;
      }

      case 'list_notes': {
        const contactId = url.searchParams.get('contact_id');
        let query = supabase
          .from('notes')
          .select('id, contact_id, summary, event_date, tags, created_at', { count: 'exact' })
          .eq('workspace_id', workspaceId)
          .order('event_date', { ascending: false })
          .range(offset, offset + limit - 1);

        if (contactId) {
          query = query.eq('contact_id', contactId);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        result = { data, total: count, limit, offset };
        break;
      }

      case 'get_note': {
        const noteId = url.searchParams.get('note_id');
        if (!noteId) throw new Error('note_id required');

        const { data, error } = await supabase
          .from('notes')
          .select('id, contact_id, summary, detailed_notes, tags, event_date, created_at, updated_at')
          .eq('id', noteId)
          .eq('workspace_id', workspaceId)
          .single();
        if (error) throw error;

        result = { data };
        break;
      }

      case 'list_preps': {
        const contactId = url.searchParams.get('contact_id');
        let query = supabase
          .from('prep_cache')
          .select('id, contact_id, bullets, focus_line, created_at, expires_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (contactId) {
          query = query.eq('contact_id', contactId);
        }

        // Filter to workspace: join through contacts in this workspace
        const { data: workspaceContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('workspace_id', workspaceId);

        const contactIds = (workspaceContacts || []).map((c: any) => c.id);
        if (contactIds.length === 0) {
          result = { data: [], total: 0, limit, offset };
          break;
        }

        query = query.in('contact_id', contactIds);
        const { data, error, count } = await query;
        if (error) throw error;

        result = { data, total: count, limit, offset };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}. Available: list_contacts, get_contact, list_notes, get_note, list_preps`);
    }

    const responseTime = Date.now() - startTime;
    await logRequest(supabase, keyRecord.id, req.method, action || 'unknown', 200, responseTime);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const status = error.message.includes('Unauthorized') || error.message.includes('Invalid API key') ? 401
      : error.message.includes('expired') ? 403
      : 400;

    if (apiKeyRecord) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const url = new URL(req.url);
      await logRequest(supabase, apiKeyRecord.id, req.method, url.searchParams.get('action') || 'error', status, responseTime);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── Helpers ──

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function logRequest(
  supabase: any,
  apiKeyId: string,
  method: string,
  path: string,
  status: number,
  responseTimeMs: number
) {
  try {
    await supabase.from('api_request_logs').insert({
      api_key_id: apiKeyId,
      method,
      path,
      status,
      response_time_ms: responseTimeMs,
    });
  } catch (e) {
    console.error('Failed to log API request:', e);
  }
}
