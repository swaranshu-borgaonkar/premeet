'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

export default function EmailConfigPage() {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await adminFetch('/api/admin/security');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const emailConfig = data.settings?.emailConfig || {};
        setSmtpHost(emailConfig.smtpHost || '');
        setSmtpPort(emailConfig.smtpPort || '');
        setSmtpUsername(emailConfig.smtpUsername || '');
        setSmtpPassword(emailConfig.smtpPassword || '');
        setFromAddress(emailConfig.fromAddress || '');
      } catch (err) {
        console.error(err);
        setError('Failed to load email settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      // First fetch existing settings so we don't overwrite security settings
      const fetchRes = await adminFetch('/api/admin/security');
      const existing = await fetchRes.json();
      const existingSettings = existing.settings || {};

      const res = await adminFetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...existingSettings,
            emailConfig: {
              smtpHost,
              smtpPort,
              smtpUsername,
              smtpPassword,
              fromAddress,
            },
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save email settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm">Loading email settings...</div>
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Email Configuration</h1>
        <p className="text-gray-500 mt-1">Configure SMTP settings for outbound emails.</p>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* SMTP Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">SMTP Server</h2>
              <p className="text-sm text-gray-500">Configure your outbound email server.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="587"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter SMTP password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Address</label>
              <input
                type="email"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="noreply@yourcompany.com"
              />
              <p className="text-xs text-gray-400 mt-2">This address will appear as the sender for all outbound emails.</p>
            </div>
          </div>
        </div>

        {/* Test Connection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Test Connection</h2>
              <p className="text-sm text-gray-500">Send a test email to verify your SMTP configuration.</p>
            </div>
          </div>
          <button
            disabled={!smtpHost || !smtpPort}
            className="px-4 py-2.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Test Email
          </button>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-sm text-green-600 font-medium">Email settings saved successfully</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
