import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { firstName, lastName, email, company, jobTitle, teamSize, plan, message } = await req.json();

    if (!firstName || !lastName || !email || !company || !teamSize) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('audit_logs').insert({
      action: 'sales_inquiry',
      resource_type: 'contact_form',
      details: { firstName, lastName, email, company, jobTitle, teamSize, plan, message },
    });

    // Send notification email to sales team via Resend
    const emailBody = `
      <h2>New Sales Inquiry</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold;">Name</td><td style="padding: 8px;">${firstName} ${lastName}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email</td><td style="padding: 8px;">${email}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Company</td><td style="padding: 8px;">${company}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Job Title</td><td style="padding: 8px;">${jobTitle || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Team Size</td><td style="padding: 8px;">${teamSize}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Plan Interest</td><td style="padding: 8px;">${plan}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Message</td><td style="padding: 8px;">${message || 'N/A'}</td></tr>
      </table>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PrepMeet <notifications@prepmeet.com>',
        to: ['sales@prepmeet.com'],
        subject: `Sales Inquiry: ${company} (${teamSize} seats, ${plan})`,
        html: emailBody,
      }),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
