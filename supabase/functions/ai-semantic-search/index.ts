import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

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

    const body = await req.json();
    const { query, match_threshold = 0.7, match_count = 10 } = body;
    if (!query || typeof query !== 'string') throw new Error('query string is required');

    // ── Enterprise tier check ──
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(organization_id)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Check if user belongs to an organization (enterprise tier)
    const hasEnterprise = (memberships || []).some(
      (m: any) => m.workspaces?.organization_id != null
    );

    if (!hasEnterprise) {
      // Also check user's subscription_tier directly
      const { data: profile } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (!profile || profile.subscription_tier !== 'enterprise') {
        return new Response(
          JSON.stringify({
            error: 'Semantic search is available on the Enterprise tier only',
            upgrade_url: 'https://prepmeet.com/pricing',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Generate query embedding ──
    const queryEmbedding = await generateEmbedding(query);

    // ── Call semantic_search_notes RPC ──
    const { data: results, error: rpcError } = await supabase.rpc('semantic_search_notes', {
      query_embedding: queryEmbedding,
      match_threshold,
      match_count,
      p_user_id: user.id,
    });

    if (rpcError) throw rpcError;

    // ── Track AI usage ──
    const workspaceId = memberships?.[0]?.workspace_id || null;
    await supabase.from('ai_usage').insert({
      user_id: user.id,
      workspace_id: workspaceId,
      model: 'text-embedding-3-small',
      input_tokens: Math.ceil(query.length / 4),
      output_tokens: 0,
      cost_usd: 0.00002, // embedding is very cheap
      purpose: 'search',
    });

    return json({
      query,
      match_threshold,
      results: results || [],
      count: results?.length || 0,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── Generate embedding via text-embedding-3-small ──
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
