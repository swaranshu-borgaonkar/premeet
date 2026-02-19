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

    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select(`
        id,
        name,
        created_by,
        created_at,
        workspace_members (
          user_id
        ),
        notes (
          id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Workspaces query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (workspaces || []).map((ws: Record<string, unknown>) => ({
      id: ws.id,
      name: ws.name,
      created_by: ws.created_by,
      created_at: ws.created_at,
      members: Array.isArray(ws.workspace_members) ? ws.workspace_members.length : 0,
      notes: Array.isArray(ws.notes) ? ws.notes.length : 0,
    }));

    return NextResponse.json({ workspaces: formatted });
  } catch (error) {
    console.error('Workspaces API error:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
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
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('Create workspace error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('Create workspace API error:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
