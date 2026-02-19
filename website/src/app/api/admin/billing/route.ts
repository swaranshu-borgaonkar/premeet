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

    const { data: customers, error } = await supabase
      .from('stripe_customers')
      .select(`
        id,
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        seats_quantity,
        current_period_end,
        payment_method_updated_at,
        users (
          full_name,
          email,
          subscription_tier
        )
      `)
      .order('current_period_end', { ascending: false });

    if (error) {
      console.error('Billing query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate totals
    const totalSeats = (customers || []).reduce((sum: number, c: Record<string, unknown>) => sum + ((c.seats_quantity as number) || 0), 0);

    // Count active users for seat utilization
    const { count: activeUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    return NextResponse.json({
      customers: customers || [],
      summary: {
        totalSeats,
        seatsUsed: activeUsers || 0,
      },
    });
  } catch (error) {
    console.error('Billing API error:', error);
    return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 });
  }
}
