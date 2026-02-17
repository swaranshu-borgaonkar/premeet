'use client';

import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

const features = [
  {
    title: 'SSO / SAML',
    desc: 'Single sign-on via Okta, Azure AD, Google Workspace, and OneLogin through WorkOS integration.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    title: 'SCIM Provisioning',
    desc: 'Automatically sync users and groups from your identity provider. No manual account management.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: 'Custom AI Prompts',
    desc: 'Tailor AI prep summaries to your organization\'s workflow, terminology, and clinical standards.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    title: 'Audit Logs',
    desc: 'Immutable, append-only audit trail for every action. Filter, search, and export to CSV or JSON.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: 'Legal Holds',
    desc: 'Prevent data deletion for specific users or contacts during legal proceedings or investigations.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    title: 'Data Residency',
    desc: 'Choose where your data lives: US, EU, or APAC regions. Meet data sovereignty requirements.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    title: 'White-Label Branding',
    desc: 'Customize the extension with your organization\'s logo, colors, and domain. Available for 50+ seats.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    title: 'Priority Support',
    desc: 'Dedicated account manager, custom onboarding, SLA guarantees, and a private Slack channel.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
];

const comparisonRows = [
  { feature: 'AI-powered prep bullets', individual: true, team: true, enterprise: true },
  { feature: 'Google & Microsoft Calendar sync', individual: true, team: true, enterprise: true },
  { feature: 'Voice note input', individual: true, team: true, enterprise: true },
  { feature: 'Unlimited contacts', individual: true, team: true, enterprise: true },
  { feature: 'Shared contacts & notes', individual: false, team: true, enterprise: true },
  { feature: 'Team workspaces', individual: false, team: true, enterprise: true },
  { feature: 'Handoff tags & follow-ups', individual: false, team: true, enterprise: true },
  { feature: 'Role-based permissions', individual: false, team: true, enterprise: true },
  { feature: 'SSO / SAML', individual: false, team: false, enterprise: true },
  { feature: 'SCIM provisioning', individual: false, team: false, enterprise: true },
  { feature: 'Custom AI prompts', individual: false, team: false, enterprise: true },
  { feature: 'Audit logs & legal holds', individual: false, team: false, enterprise: true },
  { feature: 'Data residency (US/EU/APAC)', individual: false, team: false, enterprise: true },
  { feature: 'White-label branding', individual: false, team: false, enterprise: true },
  { feature: 'Dedicated account manager', individual: false, team: false, enterprise: true },
  { feature: 'BAA for HIPAA compliance', individual: false, team: false, enterprise: true },
  { feature: 'Custom SLA', individual: false, team: false, enterprise: true },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DashIcon() {
  return <span className="block w-5 h-0.5 bg-gray-300 mx-auto" />;
}

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Enterprise
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          PrepMeet for Enterprise
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Team-wide clinical and professional context, delivered before every appointment.
          Compliance-ready infrastructure for organizations of any size.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact-sales?plan=enterprise"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
          >
            Contact Sales
          </Link>
          <Link
            href="/download"
            className="inline-block border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 transition"
          >
            Start 30-Day Trial
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Built for security-conscious teams</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Everything your IT, compliance, and procurement teams need to approve PrepMeet.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Plan comparison</h2>
        <p className="text-gray-600 text-center mb-12">
          See what&apos;s included at every level.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 pr-4 font-semibold text-gray-900">Feature</th>
                <th className="py-4 px-4 font-semibold text-gray-900 text-center w-28">Individual</th>
                <th className="py-4 px-4 font-semibold text-gray-900 text-center w-28">Team</th>
                <th className="py-4 px-4 font-semibold text-center w-28 text-blue-600">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-gray-100">
                  <td className="py-3 pr-4 text-gray-700">{row.feature}</td>
                  <td className="py-3 px-4 text-center">{row.individual ? <CheckIcon /> : <DashIcon />}</td>
                  <td className="py-3 px-4 text-center">{row.team ? <CheckIcon /> : <DashIcon />}</td>
                  <td className="py-3 px-4 text-center">{row.enterprise ? <CheckIcon /> : <DashIcon />}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-6 pr-4"></td>
                <td className="pt-6 px-4 text-center">
                  <span className="text-sm font-semibold">$9/mo</span>
                </td>
                <td className="pt-6 px-4 text-center">
                  <span className="text-sm font-semibold">$29/seat/mo</span>
                </td>
                <td className="pt-6 px-4 text-center">
                  <span className="text-sm font-semibold text-blue-600">Custom</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Trusted By */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-gray-50 rounded-2xl p-12">
          <h2 className="text-2xl font-bold text-center mb-3">Trusted by clinical and professional teams</h2>
          <p className="text-gray-600 text-center mb-8 max-w-xl mx-auto">
            Therapists, lawyers, doctors, financial advisors, and consultants rely on PrepMeet to prepare for every meeting.
          </p>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">5 min</div>
              <div className="text-sm text-gray-600 mt-1">avg. time saved per appointment</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">99.9%</div>
              <div className="text-sm text-gray-600 mt-1">uptime SLA for Enterprise</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">&lt; 2 hr</div>
              <div className="text-sm text-gray-600 mt-1">priority support response time</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 pb-24">
        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to roll out PrepMeet across your team?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Get a personalized demo, volume pricing, and a dedicated onboarding plan for your organization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact-sales?plan=enterprise"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-50 transition"
            >
              Contact Sales
            </Link>
            <Link
              href="/download"
              className="inline-block border border-white/30 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-white/10 transition"
            >
              Start 30-Day Trial
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
