'use client';

import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

const certifications = [
  {
    title: 'SOC 2 Type II',
    status: 'In Progress',
    statusColor: 'bg-yellow-100 text-yellow-800',
    desc: 'Independent audit of security controls, availability, and confidentiality. Expected completion Q3 2026.',
  },
  {
    title: 'GDPR Compliant',
    status: 'Active',
    statusColor: 'bg-green-100 text-green-800',
    desc: 'Full compliance with EU General Data Protection Regulation. Data export, right to deletion, and data portability.',
  },
  {
    title: 'HIPAA Eligible',
    status: 'Available',
    statusColor: 'bg-blue-100 text-blue-800',
    desc: 'HIPAA-eligible deployment path with BAA available for Enterprise customers. Azure-hosted option.',
  },
];

const sections = [
  {
    title: 'Data Encryption',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    items: [
      { label: 'At rest', detail: 'AES-256 encryption on all database storage via Supabase (PostgreSQL on AWS).' },
      { label: 'In transit', detail: 'TLS 1.3 encryption on all connections between clients, APIs, and third-party services.' },
      { label: 'OAuth tokens', detail: 'AES-GCM-256 client-side encryption with PBKDF2 key derivation (100,000 iterations).' },
      { label: 'Local cache', detail: 'IndexedDB with browser-level isolation. Data never persists after sign-out.' },
    ],
  },
  {
    title: 'Authentication & Access Control',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
    items: [
      { label: 'SSO / SAML', detail: 'Enterprise SSO via WorkOS supporting Okta, Azure AD, Google Workspace, and OneLogin.' },
      { label: 'MFA enforcement', detail: 'Workspace admins can enforce multi-factor authentication for all team members.' },
      { label: 'IP allowlisting', detail: 'Restrict API and dashboard access to approved IP addresses or CIDR ranges.' },
      { label: 'Row-Level Security', detail: 'RLS policies on all database tables ensure users only access their own data.' },
      { label: 'Role-based permissions', detail: 'Admin, Member, and Viewer roles with granular RBAC for Enterprise customers.' },
    ],
  },
  {
    title: 'Data Residency',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    items: [
      { label: 'United States', detail: 'Default region. Data stored in AWS us-east-1.' },
      { label: 'European Union', detail: 'EU data residency option for GDPR compliance. Data stored in AWS eu-west-1.' },
      { label: 'Asia-Pacific', detail: 'APAC data residency for organizations in Australia, Singapore, and Japan. AWS ap-southeast-1.' },
    ],
  },
  {
    title: 'Audit & Compliance',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    items: [
      { label: 'Audit logging', detail: 'Immutable, append-only audit trail for every user action. Searchable and exportable (CSV/JSON).' },
      { label: 'Legal holds', detail: 'Prevent data deletion for specific users or contacts during legal proceedings.' },
      { label: 'Data export', detail: 'One-click GDPR data export for any user. Automated deletion workflows with configurable retention.' },
      { label: 'Compliance reporting', detail: 'Pre-built compliance reports for SOC 2, GDPR, and internal audit requirements.' },
    ],
  },
  {
    title: 'Emergency Access',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    items: [
      { label: 'Break-glass access', detail: 'Emergency access to workspace data with mandatory 24-hour waiting period and full audit trail.' },
      { label: 'Multi-party approval', detail: 'Emergency access requires approval from two workspace admins.' },
      { label: 'Automatic notification', detail: 'All workspace members are notified when emergency access is requested or granted.' },
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-block bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Security &amp; Compliance
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Security at every layer
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          PrepMeet is built with defense-in-depth security. Your data and your clients&apos; data
          are protected by enterprise-grade encryption, access controls, and compliance frameworks.
        </p>
      </section>

      {/* Certifications */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {certifications.map((cert) => (
            <div key={cert.title} className="p-6 rounded-xl border border-gray-200 text-center">
              <div className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${cert.statusColor}`}>
                {cert.status}
              </div>
              <h3 className="font-bold text-lg mb-2">{cert.title}</h3>
              <p className="text-gray-600 text-sm">{cert.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detail Sections */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-16">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  {section.icon}
                </div>
                <h2 className="text-2xl font-bold">{section.title}</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {section.items.map((item) => (
                  <div key={item.label} className="p-5 rounded-lg bg-gray-50">
                    <h4 className="font-semibold mb-1">{item.label}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Data Handling */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">AI Data Handling</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-1">No training on your data</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              Session notes are sent to AI providers only to generate prep summaries. Your data is never used for model training.
            </p>
          </div>
          <div className="p-5 rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-1">Provider options</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              OpenAI (primary) and Anthropic (fallback). Enterprise customers can use Azure OpenAI for additional data control.
            </p>
          </div>
          <div className="p-5 rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-1">Minimal data transmission</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              Only the minimum context needed for prep is sent to AI. No PII is included unless explicitly part of session notes.
            </p>
          </div>
          <div className="p-5 rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-1">Data retention</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              AI provider data retention is 0 days (no storage). Requests are processed and immediately discarded by the provider.
            </p>
          </div>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="max-w-4xl mx-auto px-6 py-12 pb-8">
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-4">Responsible Disclosure Policy</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            We take security vulnerabilities seriously. If you discover a potential security issue,
            we ask that you follow responsible disclosure practices.
          </p>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
              <p>Email your findings to <a href="mailto:security@prepmeet.com" className="text-blue-600 hover:underline font-medium">security@prepmeet.com</a> with a detailed description.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
              <p>Allow up to 72 hours for an initial response and 90 days for a fix before public disclosure.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
              <p>Do not access, modify, or delete other users&apos; data. Use test accounts where possible.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
              <p>We will acknowledge your contribution publicly (with your permission) and will not pursue legal action for good-faith reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-12 pb-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Have security questions?</h2>
          <p className="text-gray-600 mb-6">
            Our security team is happy to answer questions, provide documentation, or join a call with your compliance team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:security@prepmeet.com"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Contact Security Team
            </a>
            <Link
              href="/hipaa"
              className="inline-block border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              HIPAA Compliance
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
