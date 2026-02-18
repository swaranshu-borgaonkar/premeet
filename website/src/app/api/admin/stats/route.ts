import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createClient();

    const [usersRes, notesRes, prepCacheRes, popupViewsRes, auditRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('notes').select('id', { count: 'exact', head: true }),
      supabase.from('prep_cache').select('id', { count: 'exact', head: true }),
      supabase.from('popup_views').select('id', { count: 'exact', head: true }),
      supabase
        .from('audit_logs')
        .select('id, user_id, action, resource_type, resource_id, details, created_at, users!audit_logs_user_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Build recent activity from audit_logs
    const recentActivity = (auditRes.data || []).map((log: Record<string, unknown>) => {
      const users = log.users as { full_name: string } | null;
      const userName = users?.full_name || 'Unknown User';
      const createdAt = log.created_at as string;
      const action = log.action as string;
      const details = log.details as string | null;
      const resourceType = log.resource_type as string | null;
      return {
        user: userName,
        action: details || `${action} on ${resourceType || 'resource'}`,
        time: createdAt,
      };
    });

    return NextResponse.json({
      stats: {
        users: usersRes.count || 0,
        notes: notesRes.count || 0,
        preps: prepCacheRes.count || 0,
        popupViews: popupViewsRes.count || 0,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
