import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Get user's Google token
    const { data: user } = await supabase
      .from('users')
      .select('encrypted_google_refresh_token')
      .eq('id', email.user_id)
      .single();

    if (!user?.encrypted_google_refresh_token) {
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error: 'No Google token available' })
        .eq('id', email_id);
      return new Response('No Google token', { status: 400 });
    }

    // TODO: Decrypt token and send via Gmail API
    // For now, mark as sending
    await supabase
      .from('email_queue')
      .update({ status: 'sending' })
      .eq('id', email_id);

    // Build RFC 2822 message
    const ccHeader = email.cc_emails?.length
      ? `Cc: ${email.cc_emails.join(', ')}\r\n`
      : '';

    const rawMessage = [
      `To: ${email.to_email}`,
      `Subject: ${email.subject}`,
      ccHeader ? `Cc: ${email.cc_emails.join(', ')}` : null,
      'Content-Type: text/html; charset=UTF-8',
      '',
      email.body,
    ]
      .filter(Boolean)
      .join('\r\n');

    // Base64url encode
    const encoded = btoa(rawMessage)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // TODO: Use decrypted access token to send via Gmail API
    // const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${accessToken}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ raw: encoded }),
    // });

    // Mark as sent (placeholder)
    await supabase
      .from('email_queue')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', email_id);

    return new Response(JSON.stringify({ success: true }), {
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
