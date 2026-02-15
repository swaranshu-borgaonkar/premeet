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

    // Verify enterprise admin access
    const { data: memberRoles } = await supabase
      .from('workspace_members')
      .select('role, workspace_id, workspaces(organization_id)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['admin', 'owner']);

    if (!memberRoles || memberRoles.length === 0) {
      throw new Error('Enterprise admin access required');
    }

    switch (action) {
      // ── Dashboard Stats ──
      case 'dashboard': {
        const orgId = url.searchParams.get('org_id');

        const { data: stats } = await supabase.rpc('team_analytics_summary', {
          p_workspace_id: memberRoles[0].workspace_id,
        });

        // AI usage costs
        const { data: aiUsage } = await supabase
          .from('ai_usage')
          .select('cost_usd')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const totalAiCost = (aiUsage || []).reduce((sum, u) => sum + Number(u.cost_usd), 0);

        return json({ ...stats, ai_cost_this_month: totalAiCost });
      }

      // ── Custom Fields ──
      case 'list_custom_fields': {
        const wsId = url.searchParams.get('workspace_id');
        const { data } = await supabase
          .from('custom_fields')
          .select('*')
          .eq('workspace_id', wsId)
          .order('sort_order');
        return json(data);
      }

      case 'save_custom_field': {
        const field = body;
        if (!field.id) field.id = crypto.randomUUID();
        const { error } = await supabase
          .from('custom_fields')
          .upsert(field);
        if (error) throw error;
        return json({ success: true });
      }

      case 'delete_custom_field': {
        await supabase.from('custom_fields').delete().eq('id', body.field_id);
        return json({ success: true });
      }

      // ── Custom AI Prompts ──
      case 'list_ai_prompts': {
        const { data } = await supabase
          .from('ai_prompts')
          .select('*')
          .order('version', { ascending: false });
        return json(data);
      }

      case 'save_ai_prompt': {
        const prompt = body;
        if (!prompt.id) prompt.id = crypto.randomUUID();
        const { error } = await supabase
          .from('ai_prompts')
          .upsert(prompt);
        if (error) throw error;
        return json({ success: true });
      }

      // ── AI Cost Tracking ──
      case 'ai_costs': {
        const days = parseInt(url.searchParams.get('days') || '30');
        const { data } = await supabase
          .from('ai_usage')
          .select('model, purpose, cost_usd, input_tokens, output_tokens, created_at')
          .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1000);

        const summary = {
          total_cost: (data || []).reduce((s, u) => s + Number(u.cost_usd), 0),
          total_requests: data?.length || 0,
          by_model: {} as Record<string, number>,
          by_purpose: {} as Record<string, number>,
          daily: {} as Record<string, number>,
        };

        for (const u of data || []) {
          summary.by_model[u.model] = (summary.by_model[u.model] || 0) + Number(u.cost_usd);
          summary.by_purpose[u.purpose] = (summary.by_purpose[u.purpose] || 0) + Number(u.cost_usd);
          const day = u.created_at.split('T')[0];
          summary.daily[day] = (summary.daily[day] || 0) + Number(u.cost_usd);
        }

        return json(summary);
      }

      // ── Legal Holds ──
      case 'create_legal_hold': {
        const { workspace_id, organization_id, reason } = body;
        const { data, error } = await supabase
          .from('legal_holds')
          .insert({
            organization_id,
            workspace_id,
            reason,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'legal_hold.created',
          resource_type: 'legal_hold',
          resource_id: data.id,
          details: { reason },
        });

        return json(data);
      }

      case 'release_legal_hold': {
        const { hold_id } = body;
        await supabase
          .from('legal_holds')
          .update({ status: 'released', released_by: user.id, released_at: new Date().toISOString() })
          .eq('id', hold_id);

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'legal_hold.released',
          resource_type: 'legal_hold',
          resource_id: hold_id,
        });

        return json({ success: true });
      }

      // ── Emergency Access ──
      case 'request_emergency_access': {
        const { target_user_id, reason, waiting_period_days = 7 } = body;
        const { data, error } = await supabase
          .from('emergency_access_requests')
          .insert({
            organization_id: body.organization_id,
            requester_id: user.id,
            target_user_id,
            reason,
            waiting_period_days,
          })
          .select()
          .single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'emergency_access.requested',
          resource_type: 'emergency_access',
          resource_id: data.id,
          details: { target_user_id, reason },
        });

        return json(data);
      }

      case 'approve_emergency_access': {
        const { request_id, waiting_period_days = 7 } = body;
        const accessGrantedAt = new Date(Date.now() + waiting_period_days * 24 * 60 * 60 * 1000);
        const accessExpiresAt = new Date(accessGrantedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

        await supabase
          .from('emergency_access_requests')
          .update({
            status: 'approved',
            approved_by: user.id,
            access_granted_at: accessGrantedAt.toISOString(),
            access_expires_at: accessExpiresAt.toISOString(),
          })
          .eq('id', request_id);

        return json({ success: true, access_granted_at: accessGrantedAt });
      }

      // ── White-Label Branding ──
      case 'update_branding': {
        const { workspace_id, branding } = body;
        // branding: { logo_url, primary_color, extension_name, hide_powered_by }
        await supabase
          .from('workspaces')
          .update({ branding })
          .eq('id', workspace_id);

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'workspace.branding_updated',
          resource_type: 'workspace',
          resource_id: workspace_id,
          details: branding,
        });

        return json({ success: true });
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

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
