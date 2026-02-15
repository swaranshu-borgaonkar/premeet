'use client';

const invoices = [
  { id: 'INV-2026-012', date: 'Feb 1, 2026', amount: '$2,490.00', status: 'Paid' },
  { id: 'INV-2026-011', date: 'Jan 1, 2026', amount: '$2,490.00', status: 'Paid' },
  { id: 'INV-2025-012', date: 'Dec 1, 2025', amount: '$2,340.00', status: 'Paid' },
  { id: 'INV-2025-011', date: 'Nov 1, 2025', amount: '$2,340.00', status: 'Paid' },
  { id: 'INV-2025-010', date: 'Oct 1, 2025', amount: '$2,340.00', status: 'Paid' },
  { id: 'INV-2025-009', date: 'Sep 1, 2025', amount: '$1,990.00', status: 'Paid' },
];

const statusColors: Record<string, string> = {
  Paid: 'bg-green-50 text-green-700',
  Pending: 'bg-amber-50 text-amber-700',
  Overdue: 'bg-red-50 text-red-700',
};

export default function BillingPage() {
  const seatsUsed = 83;
  const seatsTotal = 100;
  const utilizationPercent = Math.round((seatsUsed / seatsTotal) * 100);

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
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">Enterprise</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">Billed annually. Next renewal on March 1, 2027.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$2,490</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">$29,880 billed annually</p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
              Change Plan
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Seats Included</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{seatsTotal}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Features</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">All</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Support</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">Priority</p>
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
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-400">
              {seatsTotal - seatsUsed} seats available
            </p>
            <button className="text-sm text-blue-600 font-medium hover:text-blue-700 transition">
              Add more seats
            </button>
          </div>
        </div>

        {/* Invoice History */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Invoice History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Invoice</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">{inv.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{inv.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-blue-600 font-medium hover:text-blue-700 transition">
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
