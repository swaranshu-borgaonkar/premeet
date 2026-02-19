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
    const { searchParams } = new URL(request.url);
    const actionFilter = searchParams.get('action') || 'all';
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('audit_logs')
      .select('id, user_id, action, resource_type, resource_id, details, ip_address, created_at, users!audit_logs_user_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (actionFilter !== 'all') {
      query = query.ilike('action', `${actionFilter}%`);
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,details.ilike.%${search}%,resource_type.ilike.%${search}%`);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Audit query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (logs || []).map((log: Record<string, unknown>) => {
      const users = log.users as { full_name: string } | null;
      return {
        id: log.id,
        timestamp: log.created_at,
        user: users?.full_name || 'Unknown User',
        action: log.action,
        resource: log.resource_type || '',
        details: (log.details as string) || '',
        ip_address: log.ip_address,
      };
    });

    return NextResponse.json({ logs: formatted });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
