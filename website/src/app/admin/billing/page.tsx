'use client';

import { useEffect, useState } from 'react';

interface StripeCustomer {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  seats_quantity: number;
  current_period_end: string;
  payment_method_updated_at: string;
  users: {
    full_name: string;
    email: string;
    subscription_tier: string;
  } | null;
}

interface BillingSummary {
  totalSeats: number;
  seatsUsed: number;
}

const statusColors: Record<string, string> = {
  Paid: 'bg-green-50 text-green-700',
  Pending: 'bg-amber-50 text-amber-700',
  Overdue: 'bg-red-50 text-red-700',
  Active: 'bg-green-50 text-green-700',
};

export default function BillingPage() {
  const [customers, setCustomers] = useState<StripeCustomer[]>([]);
  const [summary, setSummary] = useState<BillingSummary>({ totalSeats: 0, seatsUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await fetch('/api/admin/billing');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setCustomers(data.customers || []);
        setSummary(data.summary || { totalSeats: 0, seatsUsed: 0 });
      } catch (err) {
        console.error(err);
        setError('Failed to load billing data');
      } finally {
        setLoading(false);
      }
    }
    fetchBilling();
  }, []);

  const seatsUsed = summary.seatsUsed;
  const seatsTotal = summary.totalSeats || Math.max(seatsUsed, 1);
  const utilizationPercent = seatsTotal > 0 ? Math.round((seatsUsed / seatsTotal) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm">Loading billing data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  // Determine plan from first customer
  const firstCustomer = customers[0];
  const planTier = firstCustomer?.users?.subscription_tier || 'free';
  const planLabel = planTier.charAt(0).toUpperCase() + planTier.slice(1);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Manage your subscription, seats, and invoices.</p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Current Plan Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{planLabel}</span>
              </div>
              {firstCustomer?.current_period_end && (
                <p className="text-sm text-gray-500 mb-4">
                  Current period ends {new Date(firstCustomer.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                </p>
              )}
            </div>
            <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
              Change Plan
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Seats</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{seatsTotal}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Users</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{seatsUsed}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subscriptions</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{customers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Seat Utilization */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Seat Utilization</h2>
              <p className="text-sm text-gray-500 mt-1">
                {seatsUsed} of {seatsTotal} seats in use
              </p>
            </div>
            <span className="text-2xl font-bold text-gray-900">{utilizationPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                utilizationPercent > 90 ? 'bg-red-500' : utilizationPercent > 75 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-400">
              {Math.max(seatsTotal - seatsUsed, 0)} seats available
            </p>
            <button className="text-sm text-blue-600 font-medium hover:text-blue-700 transition">
              Add more seats
            </button>
          </div>
        </div>

        {/* Stripe Customers */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Subscription Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Stripe ID</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Seats</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Period End</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                      No billing data yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{cust.users?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{cust.users?.email || ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-500">{cust.stripe_customer_id || '-'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{cust.seats_quantity || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {cust.current_period_end
                          ? new Date(cust.current_period_end).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors['Active']}`}>
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
