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

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        subscription_tier,
        profession,
        status,
        created_at,
        last_active_at,
        trial_ends_at,
        workspace_members (
          workspace_id,
          role,
          status,
          workspaces (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Users query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
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
    const { full_name, email, role } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Create user in the users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        full_name,
        status: 'invited',
        subscription_tier: 'free',
      })
      .select()
      .single();

    if (userError) {
      console.error('Create user error:', userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // If a role was specified, try to add to the first available workspace
    if (role && user) {
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1);

      if (workspaces && workspaces.length > 0) {
        await supabase.from('workspace_members').insert({
          user_id: user.id,
          workspace_id: workspaces[0].id,
          role: role.toLowerCase(),
          status: 'invited',
        });
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Create user API error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
