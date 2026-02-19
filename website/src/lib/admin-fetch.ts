import { createBrowserClient } from '@/lib/supabase-browser';

/**
 * Wrapper around fetch that automatically attaches the Supabase auth token
 * to API requests. Use this for all admin API calls.
 */
export async function adminFetch(url: string, options?: RequestInit): Promise<Response> {
  const supabase = createBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(options?.headers);

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
