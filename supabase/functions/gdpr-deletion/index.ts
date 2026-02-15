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

    const { action } = await req.json();

    switch (action) {
      case 'request_deletion': {
        // Check for active legal holds
        const { data: holds } = await supabase
          .from('legal_holds')
          .select('id')
          .eq('status', 'active')
          .in('workspace_id', (
            await supabase
              .from('workspace_members')
              .select('workspace_id')
              .eq('user_id', user.id)
          ).data?.map(m => m.workspace_id) || []);

        if (holds && holds.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete account: active legal hold exists. Contact your administrator.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Start 30-day grace period
        await supabase
          .from('users')
          .update({
            status: 'pending_deletion',
            deletion_requested_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'user.deletion_requested',
          resource_type: 'user',
          resource_id: user.id,
          details: { grace_period_days: 30 },
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Deletion scheduled. Your account will be permanently deleted in 30 days. You can cancel anytime during this period.',
            deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancel_deletion': {
        await supabase
          .from('users')
          .update({
            status: 'active',
            deletion_requested_at: null,
          })
          .eq('id', user.id);

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'user.deletion_cancelled',
          resource_type: 'user',
          resource_id: user.id,
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Account deletion cancelled.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'execute_deletion': {
        // This is called by a CRON job for users past their 30-day grace period
        // Only service role should call this
        const { data: pendingUsers } = await supabase
          .from('users')
          .select('id')
          .eq('status', 'pending_deletion')
          .lt('deletion_requested_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        for (const pendingUser of pendingUsers || []) {
          // Check legal holds again
          const { data: holds } = await supabase
            .from('legal_holds')
            .select('id')
            .eq('status', 'active');

          // Skip if any legal hold
          if (holds && holds.length > 0) continue;

          // Delete user data in order
          await supabase.from('prep_cache').delete().eq('user_id', pendingUser.id);
          await supabase.from('popup_views').delete().eq('user_id', pendingUser.id);
          await supabase.from('email_queue').delete().eq('user_id', pendingUser.id);
          await supabase.from('sync_queue').delete().eq('user_id', pendingUser.id);
          await supabase.from('notes').delete().eq('user_id', pendingUser.id);
          await supabase.from('contacts').delete().eq('user_id', pendingUser.id);
          await supabase.from('email_templates').delete().eq('user_id', pendingUser.id);
          await supabase.from('data_exports').delete().eq('user_id', pendingUser.id);

          // Mark user as deleted
          await supabase
            .from('users')
            .update({
              status: 'deleted',
              deleted_at: new Date().toISOString(),
              email: `deleted_${pendingUser.id}@deleted.prepmeet.com`,
              encrypted_google_refresh_token: null,
              encrypted_microsoft_refresh_token: null,
            })
            .eq('id', pendingUser.id);

          // Final audit entry
          await supabase.from('audit_logs').insert({
            user_id: pendingUser.id,
            action: 'user.permanently_deleted',
            resource_type: 'user',
            resource_id: pendingUser.id,
          });
        }

        return new Response(
          JSON.stringify({ success: true, deleted: pendingUsers?.length || 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
