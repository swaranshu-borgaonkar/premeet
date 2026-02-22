import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: 'Features — AI-Powered Pre-Appointment Context',
  description:
    'AI prep bullets, smart calendar sync, quick session notes, voice input, team workspaces, and HIPAA-eligible deployment. Everything you need to stay prepared for every client meeting.',
  alternates: {
    canonical: 'https://prepmeet.com/features',
  },
  openGraph: {
    title: 'Features — AI-Powered Pre-Appointment Context',
    description:
      'AI prep bullets, smart calendar sync, quick session notes, voice input, team workspaces, and HIPAA-eligible deployment.',
    url: 'https://prepmeet.com/features',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrepMeet Features — Everything for Pre-Appointment Prep',
    description:
      'AI-generated prep bullets, calendar sync, voice notes, team workspaces, and HIPAA compliance.',
  },
};

const features = [
  {
    category: 'Core',
    items: [
      {
        title: 'AI-Powered Prep Bullets',
        description:
          'Get 2 concise bullet points summarizing key context about your client, generated from your session notes using AI.',
      },
      {
        title: 'Smart Calendar Sync',
        description:
          'Connects to Google Calendar and Microsoft Outlook. Detects upcoming appointments with clients automatically.',
      },
      {
        title: 'Quick Session Notes',
        description:
          'Capture notes after each session with a simple text input. Add summaries, detailed notes, and tags.',
      },
      {
        title: 'Voice Input',
        description:
          'Speak your notes instead of typing. Built-in speech recognition transcribes your voice in real-time.',
      },
    ],
  },
  {
    category: 'Team',
    items: [
      {
        title: 'Shared Workspaces',
        description:
          'Create team workspaces where practitioners can share contacts, notes, and handoff context.',
      },
      {
        title: 'Handoff Tags',
        description:
          'See who last saw a client and when. Flag follow-ups and assign contacts to team members.',
      },
      {
        title: 'Team Analytics',
        description:
          'Track appointments per provider, contact frequency, and team utilization in a dashboard.',
      },
      {
        title: 'Role-Based Access',
        description:
          'Admin, Member, and Viewer roles with granular permissions for team data access.',
      },
    ],
  },
  {
    category: 'Enterprise',
    items: [
      {
        title: 'SSO/SAML',
        description:
          'Single sign-on via Okta, Azure AD, Google Workspace, or OneLogin through WorkOS integration.',
      },
      {
        title: 'SCIM Provisioning',
        description:
          'Automatically provision and deprovision users from your identity provider.',
      },
      {
        title: 'Audit Logs',
        description:
          'Immutable, exportable audit trail of all actions for compliance and security reviews.',
      },
      {
        title: 'Data Residency',
        description:
          'Choose where your data is stored: US, EU, or APAC regions for regulatory compliance.',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h1 className="text-4xl font-bold mb-4">Everything you need to stay prepared</h1>
          <p className="text-xl text-gray-600">
            From solo practitioners to enterprise teams
          </p>
        </div>

        {features.map((section) => (
          <div key={section.category} className="mb-20">
            <h2 className="text-2xl font-bold mb-8 text-blue-600">
              {section.category} Features
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {section.items.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl border border-gray-200"
                >
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="text-center py-12">
          <Link
            href="/download"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
