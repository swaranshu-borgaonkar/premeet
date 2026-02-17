'use client';

import Link from 'next/link';
import { useState } from 'react';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

const technicalSafeguards = [
  {
    title: 'Encryption at Rest',
    desc: 'All ePHI is encrypted using AES-256 encryption on database storage. Encryption keys are managed by the cloud provider and rotated automatically.',
  },
  {
    title: 'Encryption in Transit',
    desc: 'All data transmitted between clients, servers, and third-party services uses TLS 1.3. No unencrypted connections are permitted.',
  },
  {
    title: 'Access Controls',
    desc: 'Row-Level Security (RLS) on all database tables. Role-based access control with Admin, Member, and Viewer permissions. SSO/SAML for Enterprise.',
  },
  {
    title: 'Audit Trails',
    desc: 'Immutable, append-only audit logs capture every access, modification, and deletion of ePHI. Logs are retained for 7 years.',
  },
  {
    title: 'Automatic Logoff',
    desc: 'Browser extension sessions expire after configurable inactivity periods. Enterprise admins can set organization-wide timeout policies.',
  },
  {
    title: 'Unique User Identification',
    desc: 'Every user has a unique identifier. Shared accounts are prohibited. All actions are attributable to a specific user via audit logs.',
  },
];

const administrativeSafeguards = [
  {
    title: 'Security Officer',
    desc: 'A designated security officer oversees all HIPAA compliance activities, risk assessments, and incident response procedures.',
  },
  {
    title: 'Employee Training',
    desc: 'All employees complete HIPAA training during onboarding and annually thereafter. Training covers privacy, security, and breach notification rules.',
  },
  {
    title: 'Risk Assessment',
    desc: 'Regular risk assessments identify potential vulnerabilities and threats to ePHI. Findings are documented and remediated on a defined schedule.',
  },
  {
    title: 'Incident Response',
    desc: 'Documented incident response plan with defined roles, communication procedures, and breach notification timelines (60 days per HIPAA requirements).',
  },
  {
    title: 'Access Management',
    desc: 'Workforce access to ePHI is granted on a minimum-necessary basis. Access is reviewed quarterly and revoked immediately upon termination.',
  },
  {
    title: 'Business Associate Agreements',
    desc: 'BAAs are maintained with all subprocessors who may access ePHI, including cloud infrastructure providers and AI service providers.',
  },
];

const physicalSafeguards = [
  {
    title: 'Cloud Infrastructure',
    desc: 'PrepMeet runs on Azure and AWS infrastructure. Both providers maintain SOC 2 Type II, ISO 27001, and HIPAA compliance certifications.',
  },
  {
    title: 'Data Center Security',
    desc: 'Cloud data centers feature 24/7 physical security, biometric access controls, video surveillance, and environmental controls.',
  },
  {
    title: 'No On-Premises Data',
    desc: 'PrepMeet does not store ePHI on employee devices or on-premises servers. All data resides in encrypted cloud storage.',
  },
  {
    title: 'Workstation Security',
    desc: 'Employee workstations use full-disk encryption, screen lock policies, and endpoint detection and response (EDR) software.',
  },
];

const faqs = [
  {
    q: 'Is PrepMeet HIPAA compliant?',
    a: 'PrepMeet offers a HIPAA-eligible deployment path for Enterprise customers. This includes a signed Business Associate Agreement (BAA), Azure-hosted infrastructure, enhanced audit logging, and all required technical, administrative, and physical safeguards.',
  },
  {
    q: 'Do I need the Enterprise plan for HIPAA compliance?',
    a: 'Yes. HIPAA compliance requires specific infrastructure configurations, a signed BAA, and enhanced security controls that are only available on the Enterprise plan. Contact our sales team to get started.',
  },
  {
    q: 'Will PrepMeet sign a BAA?',
    a: 'Yes. We provide a Business Associate Agreement for all Enterprise customers who require HIPAA compliance. The BAA covers PrepMeet and all relevant subprocessors.',
  },
  {
    q: 'Does the AI processing comply with HIPAA?',
    a: 'For HIPAA-eligible deployments, AI processing is routed through Azure OpenAI, which is covered under Microsoft\'s BAA. No data is used for model training, and Azure OpenAI has 0-day data retention.',
  },
  {
    q: 'Where is ePHI stored?',
    a: 'For HIPAA-eligible deployments, all ePHI is stored in Azure-hosted infrastructure in the US region. Data is encrypted at rest with AES-256 and in transit with TLS 1.3.',
  },
  {
    q: 'What happens in a data breach?',
    a: 'PrepMeet maintains a documented breach notification procedure. In the event of a breach involving ePHI, affected covered entities are notified within 24 hours of discovery, well within the HIPAA-required 60-day window.',
  },
  {
    q: 'Can I use PrepMeet for therapy or medical notes?',
    a: 'Yes, with the Enterprise plan and a signed BAA. PrepMeet is designed for service professionals including therapists, physicians, and other healthcare providers who need pre-appointment context.',
  },
  {
    q: 'How do I get started with HIPAA-compliant PrepMeet?',
    a: 'Contact our sales team at sales@prepmeet.com. We will walk you through the Enterprise plan, sign a BAA, configure your HIPAA-eligible deployment, and provide a dedicated onboarding experience.',
  },
];

export default function HipaaPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-block bg-purple-50 text-purple-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          HIPAA Compliance
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          HIPAA-eligible deployment for healthcare teams
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          PrepMeet offers a HIPAA-eligible deployment path for Enterprise customers who handle
          protected health information (PHI). We implement the technical, administrative, and
          physical safeguards required by the HIPAA Security Rule.
        </p>
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 text-sm px-4 py-2 rounded-lg">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>HIPAA compliance requires the Enterprise plan and a signed BAA.</span>
        </div>
      </section>

      {/* BAA Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-blue-50 rounded-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">Business Associate Agreement (BAA)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                PrepMeet will execute a Business Associate Agreement with any Enterprise customer who
                requires HIPAA compliance. The BAA defines PrepMeet&apos;s obligations for protecting
                ePHI, including permitted uses and disclosures, safeguards, breach notification
                procedures, and subcontractor requirements.
              </p>
              <p className="text-gray-600 text-sm">
                Our BAA covers all relevant subprocessors including Azure (infrastructure), Azure OpenAI
                (AI processing), and Supabase (database). Contact sales to request a copy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Safeguards */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Technical Safeguards</h2>
        </div>
        <p className="text-gray-600 mb-8 ml-13">
          Controls that protect ePHI through technology and access management.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {technicalSafeguards.map((item) => (
            <div key={item.title} className="p-5 rounded-lg border border-gray-200">
              <h4 className="font-semibold mb-2">{item.title}</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Administrative Safeguards */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Administrative Safeguards</h2>
        </div>
        <p className="text-gray-600 mb-8 ml-13">
          Policies and procedures that manage the selection, development, and maintenance of security measures.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {administrativeSafeguards.map((item) => (
            <div key={item.title} className="p-5 rounded-lg border border-gray-200">
              <h4 className="font-semibold mb-2">{item.title}</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Physical Safeguards */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Physical Safeguards</h2>
        </div>
        <p className="text-gray-600 mb-8 ml-13">
          Physical measures, policies, and procedures to protect electronic information systems from natural and environmental hazards.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {physicalSafeguards.map((item) => (
            <div key={item.title} className="p-5 rounded-lg border border-gray-200">
              <h4 className="font-semibold mb-2">{item.title}</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-4">Frequently asked questions</h2>
        <p className="text-gray-600 text-center mb-10">
          Common questions about HIPAA compliance with PrepMeet.
        </p>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition"
              >
                <span className="font-semibold pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5">
                  <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-12 pb-24">
        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready for HIPAA-compliant session prep?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Contact our sales team to discuss your HIPAA requirements, sign a BAA, and get started with a dedicated onboarding plan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:sales@prepmeet.com"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-50 transition"
            >
              Contact Sales
            </a>
            <Link
              href="/security"
              className="inline-block border border-white/30 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-white/10 transition"
            >
              Security Overview
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
