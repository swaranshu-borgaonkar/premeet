import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

serve(async (req) => {
  try {
    const { email_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get email from queue
    const { data: email } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', email_id)
      .single();

    if (!email) {
      return new Response('Email not found', { status: 404 });
    }

    // Get user's encrypted Google refresh token
    const { data: user } = await supabase
      .from('users')
      .select('id, encrypted_google_refresh_token')
      .eq('id', email.user_id)
      .single();

    if (!user?.encrypted_google_refresh_token) {
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error: 'No Google token available' })
        .eq('id', email_id);
      return new Response('No Google token', { status: 400 });
    }

    // Mark as sending
    await supabase
      .from('email_queue')
      .update({ status: 'sending' })
      .eq('id', email_id);

    // Decrypt the refresh token using AES-GCM-256
    const refreshToken = await decryptToken(user.encrypted_google_refresh_token, user.id);

    // Exchange refresh token for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error: `Token refresh failed: ${err}` })
        .eq('id', email_id);
      return new Response('Token refresh failed', { status: 401 });
    }

    const { access_token: accessToken } = await tokenResponse.json();

    // Build RFC 2822 message
    const messageParts = [
      `To: ${email.to_email}`,
      `Subject: ${email.subject}`,
    ];
    if (email.cc_emails?.length) {
      messageParts.push(`Cc: ${email.cc_emails.join(', ')}`);
    }
    messageParts.push('Content-Type: text/html; charset=UTF-8', '', email.body);

    const rawMessage = messageParts.join('\r\n');

    // Base64url encode
    const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const gmailResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      }
    );

    if (!gmailResponse.ok) {
      const errText = await gmailResponse.text();
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error: `Gmail API error: ${errText}` })
        .eq('id', email_id);
      return new Response(`Gmail send failed: ${errText}`, { status: 500 });
    }

    const gmailResult = await gmailResponse.json();

    // Mark as sent
    await supabase
      .from('email_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_message_id: gmailResult.id,
      })
      .eq('id', email_id);

    return new Response(JSON.stringify({ success: true, messageId: gmailResult.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Gmail send error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Decrypt an AES-GCM-256 encrypted token.
 * Token format: base64(iv + ciphertext)
 * Key derived from userId + salt via PBKDF2.
 */
async function decryptToken(encryptedBase64: string, userId: string): Promise<string> {
  const SALT = 'prepmeet-token-encryption-salt-v1';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Derive key from userId using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decode base64
  const raw = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  // First 12 bytes = IV, rest = ciphertext
  const iv = raw.slice(0, 12);
  const ciphertext = raw.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return decoder.decode(decrypted);
}
