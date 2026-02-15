import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Create export record
    const { data: exportRecord } = await supabase
      .from('data_exports')
      .insert({
        user_id: user.id,
        export_type: 'gdpr',
        status: 'processing',
      })
      .select()
      .single();

    // Collect ALL user data
    const [
      { data: profile },
      { data: contacts },
      { data: notes },
      { data: prepCache },
      { data: popupViews },
      { data: emailQueue },
      { data: syncQueue },
      { data: auditLogs },
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('contacts').select('*').eq('user_id', user.id),
      supabase.from('notes').select('*').eq('user_id', user.id),
      supabase.from('prep_cache').select('*').eq('user_id', user.id),
      supabase.from('popup_views').select('*').eq('user_id', user.id),
      supabase.from('email_queue').select('*').eq('user_id', user.id),
      supabase.from('sync_queue').select('*').eq('user_id', user.id),
      supabase.from('audit_logs').select('*').eq('user_id', user.id),
    ]);

    // Remove sensitive fields
    if (profile) {
      delete profile.encrypted_google_refresh_token;
      delete profile.encrypted_microsoft_refresh_token;
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      profile,
      contacts: contacts || [],
      notes: notes || [],
      prep_cache: prepCache || [],
      popup_views: popupViews || [],
      email_queue: emailQueue || [],
      sync_queue: syncQueue || [],
      audit_logs: auditLogs || [],
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    // Upload to Supabase Storage
    const fileName = `exports/${user.id}/${exportRecord!.id}.json`;
    const { error: uploadError } = await supabase.storage
      .from('gdpr-exports')
      .upload(fileName, blob, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Create signed URL (7-day expiry)
    const { data: signedUrl } = await supabase.storage
      .from('gdpr-exports')
      .createSignedUrl(fileName, 7 * 24 * 60 * 60); // 7 days in seconds

    // Update export record
    await supabase
      .from('data_exports')
      .update({
        status: 'completed',
        file_url: signedUrl?.signedUrl,
        file_size_bytes: jsonStr.length,
        completed_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .eq('id', exportRecord!.id);

    // Notify user via email
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PrepMeet <noreply@prepmeet.com>',
        to: profile?.email || user.email,
        subject: 'Your PrepMeet data export is ready',
        html: `
          <h2>Your data export is ready</h2>
          <p>Your GDPR data export has been generated. Click the link below to download it.</p>
          <p>This link expires in 7 days.</p>
          <a href="${signedUrl?.signedUrl}"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
            Download Export
          </a>
        `,
      }),
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'gdpr_export_completed',
      resource_type: 'data_export',
      resource_id: exportRecord!.id,
      details: { file_size_bytes: jsonStr.length },
    });

    return new Response(
      JSON.stringify({
        export_id: exportRecord!.id,
        download_url: signedUrl?.signedUrl,
        expires_in_days: 7,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('GDPR export error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
