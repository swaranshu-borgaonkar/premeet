import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    });
  }

  try {
    const { google_access_token } = await req.json();

    if (!google_access_token) {
      return new Response(JSON.stringify({ error: 'google_access_token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 1. Verify the Google access token by calling Google's userinfo endpoint
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${google_access_token}` },
    });

    if (!googleResponse.ok) {
      return new Response(JSON.stringify({ error: 'Invalid Google access token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const googleUser = await googleResponse.json();
    // googleUser: { sub, email, email_verified, name, picture, given_name, family_name }

    if (!googleUser.email) {
      return new Response(JSON.stringify({ error: 'No email in Google profile' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 2. Use Supabase Admin API to find or create the user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let user = existingUsers?.users?.find((u: any) => u.email === googleUser.email);

    if (!user) {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: googleUser.email,
        email_confirm: true,
        user_metadata: {
          full_name: googleUser.name,
          avatar_url: googleUser.picture,
          provider: 'google',
          google_sub: googleUser.sub,
        },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: `User creation failed: ${createError.message}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      user = newUser.user;

      // Initialize user in our users table with 14-day trial
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await supabase.from('users').upsert({
        id: user.id,
        email: googleUser.email,
        full_name: googleUser.name,
        subscription_tier: 'free',
        trial_ends_at: trialEnd.toISOString(),
        timezone: 'America/New_York', // Will be updated by extension
        status: 'active',
      }, { onConflict: 'id' });
    } else {
      // Update existing user metadata
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          full_name: googleUser.name,
          avatar_url: googleUser.picture,
          google_sub: googleUser.sub,
        },
      });
    }

    // 3. Generate a Supabase session for this user
    // Use admin generateLink to create a magic link, then exchange it
    // Actually, the simplest approach: use admin to create a session directly
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: googleUser.email,
    });

    if (sessionError || !sessionData) {
      return new Response(JSON.stringify({ error: `Session creation failed: ${sessionError?.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Extract the token hash and verify it to get a session
    const tokenHash = sessionData.properties?.hashed_token;
    if (!tokenHash) {
      return new Response(JSON.stringify({ error: 'Failed to generate auth token' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Verify the OTP to get a real session
    const verifyResponse = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        type: 'magiclink',
        token_hash: tokenHash,
      }),
    });

    if (!verifyResponse.ok) {
      const errText = await verifyResponse.text();
      return new Response(JSON.stringify({ error: `Token verification failed: ${errText}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const session = await verifyResponse.json();

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        email: googleUser.email,
        full_name: googleUser.name,
        avatar_url: googleUser.picture,
      },
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in || 3600,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Auth exchange error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
