import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

type VerifyResult =
  | { authenticated: true; user: { id: string; email: string; full_name: string } }
  | { authenticated: false; error: string };

export async function verifyAdmin(request: Request): Promise<VerifyResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false, error: 'Server configuration error' };
  }

  // Extract token from Authorization header or cookies
  let accessToken: string | null = null;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.slice(7);
  }

  // Fall back to cookies if no Authorization header
  if (!accessToken) {
    const cookieHeader = request.headers.get('cookie') || '';
    // Supabase stores tokens in cookies with format: sb-<project-ref>-auth-token
    // The cookie value is a JSON-encoded object with access_token inside
    const cookies = parseCookies(cookieHeader);
    for (const [name, value] of Object.entries(cookies)) {
      if (name.includes('auth-token')) {
        try {
          // Try base64 decode first (Supabase v2 format)
          let parsed;
          try {
            parsed = JSON.parse(Buffer.from(value, 'base64').toString('utf-8'));
          } catch {
            parsed = JSON.parse(value);
          }
          if (parsed?.access_token) {
            accessToken = parsed.access_token;
            break;
          }
        } catch {
          // Not a JSON cookie, skip
        }
      }
    }
  }

  if (!accessToken) {
    return { authenticated: false, error: 'No authentication token provided' };
  }

  // Verify the token by calling Supabase auth
  const authClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data: { user: authUser }, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !authUser) {
    return { authenticated: false, error: 'Invalid or expired token' };
  }

  // Now use the service role client to check admin privileges
  const serviceClient = createClient();

  // Look up the user in the users table
  const { data: dbUser, error: userError } = await serviceClient
    .from('users')
    .select('id, email, full_name, subscription_tier, status')
    .eq('id', authUser.id)
    .single();

  if (userError || !dbUser) {
    return { authenticated: false, error: 'User not found in system' };
  }

  // Check 1: Does the user have an admin or owner role in any workspace?
  const { data: memberRoles } = await serviceClient
    .from('workspace_members')
    .select('role')
    .eq('user_id', dbUser.id)
    .in('role', ['admin', 'owner']);

  const hasAdminRole = memberRoles && memberRoles.length > 0;

  // Check 2: Does the user have enterprise or team subscription?
  const hasElevatedSubscription = ['enterprise', 'team'].includes(dbUser.subscription_tier);

  if (!hasAdminRole && !hasElevatedSubscription) {
    return { authenticated: false, error: 'Insufficient permissions. Admin or owner role required.' };
  }

  return {
    authenticated: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      full_name: dbUser.full_name,
    },
  };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const eqIndex = cookie.indexOf('=');
    if (eqIndex === -1) return;
    const name = cookie.slice(0, eqIndex).trim();
    const value = cookie.slice(eqIndex + 1).trim();
    cookies[name] = decodeURIComponent(value);
  });

  return cookies;
}
