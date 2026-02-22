import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { google_access_token } = await req.json();

    if (!google_access_token) {
      return jsonResponse({ error: 'google_access_token required' });
    }

    // 1. Verify the Google access token
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${google_access_token}` },
    });

    if (!googleResponse.ok) {
      const googleErr = await googleResponse.text();
      console.error('Google userinfo failed:', googleResponse.status, googleErr);
      return jsonResponse({ error: 'Invalid Google access token', detail: googleErr });
    }

    const googleUser = await googleResponse.json();

    if (!googleUser.email) {
      return jsonResponse({ error: 'No email in Google profile' });
    }

    console.log('Google user verified:', googleUser.email);

    // 2. Find or create the Supabase user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists by email
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    let user = existingUsers?.find((u: any) => u.email === googleUser.email);

    if (!user) {
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
        console.error('User creation failed:', createError);
        return jsonResponse({ error: `User creation failed: ${createError.message}` });
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
        timezone: 'America/New_York',
        status: 'active',
      }, { onConflict: 'id' });

      console.log('New user created:', user.id);
    } else {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          full_name: googleUser.name,
          avatar_url: googleUser.picture,
          google_sub: googleUser.sub,
        },
      });
      console.log('Existing user found:', user.id);
    }

    // 3. Generate a session via magic link + verify
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: googleUser.email,
    });

    if (sessionError || !sessionData) {
      console.error('Session creation failed:', sessionError);
      return jsonResponse({ error: `Session creation failed: ${sessionError?.message}` });
    }

    const tokenHash = sessionData.properties?.hashed_token;
    if (!tokenHash) {
      return jsonResponse({ error: 'Failed to generate auth token' });
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
      console.error('Token verification failed:', errText);
      return jsonResponse({ error: `Token verification failed: ${errText}` });
    }

    const session = await verifyResponse.json();
    console.log('Session created for:', googleUser.email);

    return jsonResponse({
      user: {
        id: user.id,
        email: googleUser.email,
        full_name: googleUser.name,
        avatar_url: googleUser.picture,
      },
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in || 3600,
    });
  } catch (error) {
    console.error('Auth exchange error:', error);
    return jsonResponse({ error: error.message });
  }
});
