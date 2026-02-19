import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = createClient();

    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, plan, settings')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Security query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = (orgs?.settings as Record<string, unknown>) || {};

    return NextResponse.json({
      orgId: orgs?.id || null,
      settings: {
        ssoProvider: (settings.ssoProvider as string) || '',
        connectionId: (settings.connectionId as string) || '',
        domain: (settings.domain as string) || '',
        ipAllowlist: (settings.ipAllowlist as string) || '',
        sessionTimeout: (settings.sessionTimeout as string) || '24',
        mfaEnabled: (settings.mfaEnabled as boolean) ?? false,
        emailConfig: (settings.emailConfig as Record<string, string>) || {
          smtpHost: '',
          smtpPort: '',
          smtpUsername: '',
          smtpPassword: '',
          fromAddress: '',
        },
      },
    });
  } catch (error) {
    console.error('Security API error:', error);
    return NextResponse.json({ error: 'Failed to fetch security settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const body = await request.json();

    // Check if org exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (existingOrg) {
      const { error } = await supabase
        .from('organizations')
        .update({ settings: body.settings })
        .eq('id', existingOrg.id);

      if (error) {
        console.error('Update security error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('organizations')
        .insert({ name: 'Default Organization', plan: 'free', settings: body.settings });

      if (error) {
        console.error('Create org error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Security POST API error:', error);
    return NextResponse.json({ error: 'Failed to save security settings' }, { status: 500 });
  }
}
