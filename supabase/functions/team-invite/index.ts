import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { email, workspace_id, role } = await req.json();

    // Verify the requester is a workspace admin
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      return new Response('Forbidden: Admin role required', { status: 403 });
    }

    // Check seat limits
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspace_id)
      .single();

    const { count: currentMembers } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id);

    const seatLimit = workspace?.settings?.seats || 3;
    if ((currentMembers || 0) >= seatLimit) {
      return new Response(
        JSON.stringify({ error: 'Seat limit reached. Upgrade to add more members.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Add to workspace directly
      await supabase.from('workspace_members').insert({
        workspace_id,
        user_id: existingUser.id,
        role: role || 'member',
      });
    }

    // Send invite email
    const { data: workspaceInfo } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspace_id)
      .single();

    const { data: inviter } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PrepMeet <noreply@prepmeet.com>',
        to: email,
        subject: `${inviter?.full_name || 'A colleague'} invited you to ${workspaceInfo?.name || 'a workspace'} on PrepMeet`,
        html: `
          <h2>You've been invited to PrepMeet</h2>
          <p>${inviter?.full_name || 'A colleague'} has invited you to join
          <strong>${workspaceInfo?.name || 'their workspace'}</strong> on PrepMeet.</p>
          <p>PrepMeet gives you 2-bullet context about your next client, 5 minutes before appointments.</p>
          <a href="https://prepmeet.com/join?workspace=${workspace_id}&email=${encodeURIComponent(email)}"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
            Accept Invitation
          </a>
        `,
      }),
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      workspace_id,
      action: 'team_invite_sent',
      resource_type: 'workspace_member',
      details: { invited_email: email, role },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Invite error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
