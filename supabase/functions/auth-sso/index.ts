import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scim-token',
};

const WORKOS_API_KEY = Deno.env.get('WORKOS_API_KEY')!;
const WORKOS_CLIENT_ID = Deno.env.get('WORKOS_CLIENT_ID')!;
const WORKOS_API_BASE = 'https://api.workos.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, ...params } = await req.json();

    switch (action) {
      // ── Initiate SSO Login ──
      case 'get_authorization_url': {
        const { organization_id, redirect_uri } = params;

        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('sso_connection_id, sso_provider')
          .eq('id', organization_id)
          .single();

        if (orgError || !org?.sso_connection_id) {
          throw new Error('SSO not configured for this organization');
        }

        // Generate SAML state for CSRF protection
        const state = crypto.randomUUID();
        await supabase.from('saml_states').insert({
          state,
          organization_id,
          redirect_url: redirect_uri,
        });

        const authUrl = new URL(`${WORKOS_API_BASE}/sso/authorize`);
        authUrl.searchParams.set('client_id', WORKOS_CLIENT_ID);
        authUrl.searchParams.set('connection', org.sso_connection_id);
        authUrl.searchParams.set('redirect_uri', redirect_uri);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('response_type', 'code');

        return json({ url: authUrl.toString(), state });
      }

      // ── SSO Callback ──
      case 'callback': {
        const { code, state } = params;

        // Validate state (CSRF protection + expiry check)
        const { data: samlState, error: stateError } = await supabase
          .from('saml_states')
          .select('*')
          .eq('state', state)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (stateError || !samlState) {
          throw new Error('Invalid or expired SSO state');
        }

        // Exchange code for profile via WorkOS
        const profileRes = await fetch(`${WORKOS_API_BASE}/sso/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: WORKOS_CLIENT_ID,
            client_secret: WORKOS_API_KEY,
            grant_type: 'authorization_code',
            code,
          }),
        });

        if (!profileRes.ok) throw new Error('Failed to exchange SSO code');

        const { profile } = await profileRes.json();

        // JIT provisioning: find or create user
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', profile.email)
          .single();

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          await supabase
            .from('users')
            .update({ full_name: `${profile.first_name} ${profile.last_name}` })
            .eq('id', userId);
        } else {
          // Create user via Supabase Auth
          const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
            email: profile.email,
            email_confirm: true,
            user_metadata: {
              full_name: `${profile.first_name} ${profile.last_name}`,
              sso_provider: profile.connection_type,
            },
          });
          if (createError) throw createError;
          userId = authUser.user.id;

          await supabase.from('users').insert({
            id: userId,
            email: profile.email,
            full_name: `${profile.first_name} ${profile.last_name}`,
            subscription_tier: 'enterprise',
          });

          // Auto-join org workspace
          const { data: workspaces } = await supabase
            .from('workspaces')
            .select('id')
            .eq('organization_id', samlState.organization_id)
            .limit(1);

          if (workspaces && workspaces.length > 0) {
            await supabase.from('workspace_members').insert({
              workspace_id: workspaces[0].id,
              user_id: userId,
              role: 'member',
              invited_by: userId,
            });
          }
        }

        // Generate magic link for session
        const { data: session, error: sessionError } =
          await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: profile.email,
          });
        if (sessionError) throw sessionError;

        // Clean up SAML state
        await supabase.from('saml_states').delete().eq('id', samlState.id);

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'user.sso_login',
          resource_type: 'user',
          resource_id: userId,
          details: {
            provider: profile.connection_type,
            organization_id: samlState.organization_id,
          },
        });

        return json({
          user_id: userId,
          email: profile.email,
          redirect_url: samlState.redirect_url,
          token_url: session.properties?.action_link,
        });
      }

      // ── SCIM: Provision User ──
      case 'scim_provision': {
        const scimToken = req.headers.get('X-SCIM-Token');
        const expectedToken = Deno.env.get('SCIM_BEARER_TOKEN');
        if (!scimToken || scimToken !== expectedToken) {
          throw new Error('Invalid SCIM token');
        }

        const { email, first_name, last_name, organization_id, workspace_id } = params;

        const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: `${first_name} ${last_name}` },
        });
        if (createError) throw createError;

        await supabase.from('users').insert({
          id: authUser.user.id,
          email,
          full_name: `${first_name} ${last_name}`,
          subscription_tier: 'enterprise',
        });

        if (workspace_id) {
          await supabase.from('workspace_members').insert({
            workspace_id,
            user_id: authUser.user.id,
            role: 'member',
            invited_by: authUser.user.id,
          });
        }

        await supabase.from('audit_logs').insert({
          user_id: authUser.user.id,
          action: 'user.scim_provisioned',
          resource_type: 'user',
          resource_id: authUser.user.id,
          details: { organization_id },
        });

        return json({ id: authUser.user.id, email, status: 'provisioned' });
      }

      // ── SCIM: Deprovision User ──
      case 'scim_deprovision': {
        const scimToken = req.headers.get('X-SCIM-Token');
        const expectedToken = Deno.env.get('SCIM_BEARER_TOKEN');
        if (!scimToken || scimToken !== expectedToken) {
          throw new Error('Invalid SCIM token');
        }

        const { user_id } = params;

        await supabase
          .from('workspace_members')
          .update({ status: 'removed' })
          .eq('user_id', user_id);

        await supabase
          .from('users')
          .update({ status: 'suspended' })
          .eq('id', user_id);

        await supabase.from('audit_logs').insert({
          user_id,
          action: 'user.scim_deprovisioned',
          resource_type: 'user',
          resource_id: user_id,
        });

        return json({ id: user_id, status: 'deprovisioned' });
      }

      // ── Domain-Based SSO Discovery ──
      case 'discover_sso': {
        const { email } = params;
        const domain = email.split('@')[1];

        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, sso_provider, sso_connection_id')
          .eq('domain', domain)
          .eq('status', 'active')
          .single();

        if (!org || !org.sso_connection_id) {
          return json({ sso_available: false });
        }

        return json({
          sso_available: true,
          organization_id: org.id,
          organization_name: org.name,
          provider: org.sso_provider,
        });
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
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
}
