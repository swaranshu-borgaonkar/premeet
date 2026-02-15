import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

// This function is triggered by a CRON schedule (daily)
serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    // Day 10 reminders (4 days before trial ends)
    const day10Start = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const day10End = new Date(day10Start.getTime() + 24 * 60 * 60 * 1000);

    const { data: day10Users } = await supabase
      .from('users')
      .select('id, email, full_name, trial_ends_at')
      .eq('subscription_tier', 'free')
      .gte('trial_ends_at', day10Start.toISOString())
      .lt('trial_ends_at', day10End.toISOString())
      .eq('status', 'active');

    for (const user of day10Users || []) {
      await sendEmail(user.email, user.full_name, 'day10');
    }

    // Day 13 reminders (1 day before trial ends)
    const day13Start = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const day13End = new Date(day13Start.getTime() + 24 * 60 * 60 * 1000);

    const { data: day13Users } = await supabase
      .from('users')
      .select('id, email, full_name, trial_ends_at')
      .eq('subscription_tier', 'free')
      .gte('trial_ends_at', day13Start.toISOString())
      .lt('trial_ends_at', day13End.toISOString())
      .eq('status', 'active');

    for (const user of day13Users || []) {
      await sendEmail(user.email, user.full_name, 'day13');
    }

    // Expired trials - downgrade
    const { data: expiredUsers } = await supabase
      .from('users')
      .select('id')
      .eq('subscription_tier', 'free')
      .lt('trial_ends_at', now.toISOString())
      .eq('status', 'active');

    // Trial users who haven't upgraded remain on free tier
    // No action needed - they're already 'free'

    return new Response(
      JSON.stringify({
        day10_sent: day10Users?.length || 0,
        day13_sent: day13Users?.length || 0,
        expired: expiredUsers?.length || 0,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Trial reminder error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function sendEmail(
  to: string,
  name: string,
  type: 'day10' | 'day13'
) {
  const templates = {
    day10: {
      subject: 'Your PrepMeet trial ends in 4 days',
      html: `
        <h2>Hi ${name || 'there'},</h2>
        <p>Your PrepMeet trial ends in 4 days. Upgrade to keep your AI-powered session prep, voice notes, and email summaries.</p>
        <p>Individual plan: just $9/month.</p>
        <a href="https://prepmeet.com/pricing"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
          View Plans
        </a>
      `,
    },
    day13: {
      subject: 'Last day of your PrepMeet trial',
      html: `
        <h2>Hi ${name || 'there'},</h2>
        <p>Your PrepMeet trial ends tomorrow. After that, you'll lose access to AI prep, voice notes, and email summaries.</p>
        <p>Don't lose your session context — upgrade now.</p>
        <a href="https://prepmeet.com/pricing"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
          Upgrade Now
        </a>
      `,
    },
  };

  const template = templates[type];

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'PrepMeet <noreply@prepmeet.com>',
      to,
      subject: template.subject,
      html: template.html,
    }),
  });
}
