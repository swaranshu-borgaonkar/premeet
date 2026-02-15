import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { contact_id, template_id, to_email, cc_emails, subject, body, schedule, scheduled_for } = await req.json();

    // Validate user has email permission (Individual tier+)
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier, trial_ends_at')
      .eq('id', user.id)
      .single();

    const isTrialActive = userData?.trial_ends_at && new Date(userData.trial_ends_at) > new Date();
    const hasTier = ['individual', 'team', 'enterprise'].includes(userData?.subscription_tier || '');

    if (!isTrialActive && !hasTier) {
      return new Response(JSON.stringify({ error: 'Email feature requires Individual plan or higher' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate scheduled time
    let scheduledAt = null;
    if (schedule === 'next_morning') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      // Skip weekends
      if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2);
      scheduledAt = tomorrow.toISOString();
    } else if (schedule === 'custom' && scheduled_for) {
      scheduledAt = scheduled_for;
    }

    const { data: emailEntry, error } = await supabase
      .from('email_queue')
      .insert({
        user_id: user.id,
        contact_id,
        template_id,
        to_email,
        cc_emails: cc_emails || [],
        subject,
        body,
        schedule: schedule || 'immediate',
        scheduled_for: scheduledAt,
        status: schedule === 'immediate' ? 'pending' : 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // If immediate, trigger send now
    if (schedule === 'immediate') {
      // Invoke the email-send function
      await supabase.functions.invoke('email-send-gmail', {
        body: { email_id: emailEntry.id },
        headers: { Authorization: authHeader },
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: emailEntry.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Email schedule error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
