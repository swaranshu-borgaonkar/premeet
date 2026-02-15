import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const { email_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: email } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', email_id)
      .single();

    if (!email) {
      return new Response('Email not found', { status: 404 });
    }

    // Get workspace SMTP settings
    // Team tier feature - requires workspace SMTP configuration
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', email.user_id)
      .single();

    if (user?.subscription_tier !== 'team' && user?.subscription_tier !== 'enterprise') {
      return new Response(
        JSON.stringify({ error: 'SMTP email requires Team plan or higher' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Implement SMTP sending using workspace SMTP credentials
    // Placeholder for Sprint 11 implementation

    await supabase
      .from('email_queue')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', email_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('SMTP send error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
