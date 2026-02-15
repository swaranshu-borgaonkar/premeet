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

    switch (action) {
      case 'create': {
        const { name } = body;
        if (!name) throw new Error('Workspace name required');

        // Check user tier
        const { data: profile } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();

        if (!profile || !['team', 'enterprise'].includes(profile.subscription_tier)) {
          throw new Error('Team tier required to create workspaces');
        }

        // Create workspace
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const { data: workspace, error } = await supabase
          .from('workspaces')
          .insert({ name, slug, owner_id: user.id })
          .select()
          .single();
        if (error) throw error;

        // Add owner as admin member
        await supabase.from('workspace_members').insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString(),
        });

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'workspace.created',
          resource_type: 'workspace',
          resource_id: workspace.id,
          details: { name },
        });

        return new Response(JSON.stringify(workspace), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'update': {
        const { workspace_id, updates } = body;
        const { data, error } = await supabase
          .from('workspaces')
          .update(updates)
          .eq('id', workspace_id)
          .eq('owner_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'archive': {
        const { workspace_id } = body;
        const { error } = await supabase
          .from('workspaces')
          .update({ status: 'archived' })
          .eq('id', workspace_id)
          .eq('owner_id', user.id);
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'workspace.archived',
          resource_type: 'workspace',
          resource_id: workspace_id,
        });

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'list': {
        const { data, error } = await supabase
          .from('workspace_members')
          .select('workspace_id, role, workspaces(id, name, slug, status, created_at, max_seats)')
          .eq('user_id', user.id)
          .eq('status', 'active');
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'members': {
        const workspace_id = url.searchParams.get('workspace_id');
        const { data, error } = await supabase
          .from('workspace_members')
          .select('id, user_id, role, status, joined_at, users(email, profession)')
          .eq('workspace_id', workspace_id)
          .neq('status', 'removed');
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'remove_member': {
        const { workspace_id, member_user_id } = body;

        // Verify caller is admin
        const { data: callerMember } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspace_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (!callerMember || !['admin', 'owner'].includes(callerMember.role)) {
          throw new Error('Admin access required');
        }

        await supabase
          .from('workspace_members')
          .update({ status: 'removed' })
          .eq('workspace_id', workspace_id)
          .eq('user_id', member_user_id);

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'workspace.member_removed',
          resource_type: 'workspace_member',
          resource_id: workspace_id,
          details: { removed_user_id: member_user_id },
        });

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'update_role': {
        const { workspace_id, member_user_id, new_role } = body;

        const { data: callerMember } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspace_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (!callerMember || !['admin', 'owner'].includes(callerMember.role)) {
          throw new Error('Admin access required');
        }

        await supabase
          .from('workspace_members')
          .update({ role: new_role })
          .eq('workspace_id', workspace_id)
          .eq('user_id', member_user_id);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
