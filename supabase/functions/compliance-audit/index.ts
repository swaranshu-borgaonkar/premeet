import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    // Verify admin access
    const { data: memberRoles } = await supabase
      .from('workspace_members')
      .select('role, workspace_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['admin', 'owner']);

    if (!memberRoles || memberRoles.length === 0) {
      throw new Error('Admin access required');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'list': {
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
        const actionFilter = url.searchParams.get('action_filter');
        const userFilter = url.searchParams.get('user_id');
        const dateFrom = url.searchParams.get('date_from');
        const dateTo = url.searchParams.get('date_to');

        let query = supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (actionFilter) query = query.like('action', `${actionFilter}%`);
        if (userFilter) query = query.eq('user_id', userFilter);
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        const { data, count, error } = await query;
        if (error) throw error;

        return json({
          logs: data || [],
          total: count || 0,
          page,
          limit,
          total_pages: Math.ceil((count || 0) / limit),
        });
      }

      case 'export': {
        const format = url.searchParams.get('format') || 'json';
        const dateFrom = url.searchParams.get('date_from');
        const dateTo = url.searchParams.get('date_to');

        let query = supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10000);

        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        const { data, error } = await query;
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'audit_log.exported',
          resource_type: 'audit_log',
          details: { format, record_count: data?.length || 0 },
        });

        if (format === 'csv') {
          const headers = ['id', 'user_id', 'action', 'resource_type', 'resource_id', 'details', 'created_at'];
          const csvRows = [headers.join(',')];

          for (const row of data || []) {
            csvRows.push(headers.map(h => {
              const val = h === 'details' ? JSON.stringify(row[h] || {}) : (row[h] ?? '');
              return `"${String(val).replace(/"/g, '""')}"`;
            }).join(','));
          }

          return new Response(csvRows.join('\n'), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`,
            },
          });
        }

        return json(data || []);
      }

      case 'summary': {
        const days = parseInt(url.searchParams.get('days') || '30');
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: logs } = await supabase
          .from('audit_logs')
          .select('action, created_at')
          .gte('created_at', since);

        const summary = {
          total_events: logs?.length || 0,
          by_action: {} as Record<string, number>,
          by_day: {} as Record<string, number>,
        };

        for (const log of logs || []) {
          const category = log.action.split('.')[0];
          summary.by_action[category] = (summary.by_action[category] || 0) + 1;
          const day = log.created_at.split('T')[0];
          summary.by_day[day] = (summary.by_day[day] || 0) + 1;
        }

        return json(summary);
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
}
