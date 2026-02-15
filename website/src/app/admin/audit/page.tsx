'use client';

import { useState } from 'react';

const mockLogs = [
  { id: 1, timestamp: '2026-02-14 09:42:18', user: 'Dr. Sarah Chen', action: 'user.login', resource: 'Session', details: 'SSO login via Okta' },
  { id: 2, timestamp: '2026-02-14 09:38:05', user: 'Mark Thompson', action: 'note.create', resource: 'Note #4821', details: 'Created pre-appointment note for client J. Smith' },
  { id: 3, timestamp: '2026-02-14 09:15:33', user: 'Admin User', action: 'user.invite', resource: 'User', details: 'Invited anna.k@medgroup.com as Member' },
  { id: 4, timestamp: '2026-02-14 08:52:11', user: 'Lisa Park', action: 'workspace.update', resource: 'Cardiology Team', details: 'Updated workspace settings' },
  { id: 5, timestamp: '2026-02-14 08:30:44', user: 'Admin User', action: 'security.update', resource: 'SSO Config', details: 'Updated identity provider to Okta' },
  { id: 6, timestamp: '2026-02-13 17:20:09', user: 'James Wilson', action: 'export.create', resource: 'Audit Logs', details: 'Exported audit logs as CSV' },
  { id: 7, timestamp: '2026-02-13 16:45:22', user: 'Emily Davis', action: 'billing.update', resource: 'Subscription', details: 'Changed plan from Team to Enterprise' },
  { id: 8, timestamp: '2026-02-13 15:10:38', user: 'Robert Martinez', action: 'note.delete', resource: 'Note #4790', details: 'Deleted draft note' },
  { id: 9, timestamp: '2026-02-13 14:05:51', user: 'Admin User', action: 'user.suspend', resource: 'User', details: 'Suspended r.martinez@legal.io' },
  { id: 10, timestamp: '2026-02-13 11:22:17', user: 'Anna Kowalski', action: 'user.login', resource: 'Session', details: 'Password login with MFA' },
];

const actionColors: Record<string, string> = {
  'user.login': 'bg-blue-50 text-blue-700',
  'note.create': 'bg-green-50 text-green-700',
  'note.delete': 'bg-red-50 text-red-700',
  'user.invite': 'bg-purple-50 text-purple-700',
  'user.suspend': 'bg-red-50 text-red-700',
  'workspace.update': 'bg-amber-50 text-amber-700',
  'security.update': 'bg-indigo-50 text-indigo-700',
  'export.create': 'bg-gray-100 text-gray-700',
  'billing.update': 'bg-pink-50 text-pink-700',
};

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredLogs = mockLogs.filter((log) => {
    const matchesAction = actionFilter === 'all' || log.action.startsWith(actionFilter);
    const matchesSearch =
      search === '' ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all actions performed across your organization.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by user, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Actions</option>
          <option value="user">User Actions</option>
          <option value="note">Note Actions</option>
          <option value="workspace">Workspace Actions</option>
          <option value="security">Security Actions</option>
          <option value="billing">Billing Actions</option>
          <option value="export">Export Actions</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Timestamp</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Resource</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-[10px] flex-shrink-0">
                        {log.user
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{log.resource}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredLogs.length} of {mockLogs.length} entries
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
