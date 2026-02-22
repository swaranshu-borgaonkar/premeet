import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: 'Pricing — Free, Individual & Team Plans',
  description:
    'PrepMeet pricing starts free for solo practitioners. Individual plans at $9/mo with AI prep bullets. Team and Enterprise plans for organizations with HIPAA compliance.',
  alternates: {
    canonical: 'https://prepmeet.com/pricing',
  },
  openGraph: {
    title: 'Pricing — Free, Individual & Team Plans',
    description:
      'PrepMeet pricing starts free for solo practitioners. Individual plans at $9/mo with AI prep bullets. Team and Enterprise plans for organizations.',
    url: 'https://prepmeet.com/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrepMeet Pricing — Plans for Every Practice Size',
    description:
      'Free for solo practitioners. $9/mo for AI-powered prep. Team and Enterprise plans available.',
  },
};

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Basic note-taking for solo practitioners',
    features: [
      'Google Calendar sync',
      'Up to 50 contacts',
      '30-day note history',
      'Manual session notes',
    ],
    cta: 'Get Started',
    ctaLink: '/download',
    highlighted: false,
  },
  {
    name: 'Individual',
    price: '$9',
    period: '/month',
    annualPrice: '$89/year (save 18%)',
    description: 'AI-powered prep for busy professionals',
    features: [
      'Everything in Free',
      'AI-generated prep bullets',
      'Voice note input',
      'Email summaries via Gmail',
      'Unlimited contacts',
      'Full note history',
      'Microsoft Calendar support',
    ],
    cta: 'Start 14-Day Trial',
    ctaLink: '/download',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$29',
    period: '/seat/month',
    annualPrice: '$290/seat/year (save 17%)',
    description: 'Shared context for clinical teams',
    features: [
      'Everything in Individual',
      'Shared contacts & notes',
      'Team workspaces',
      'Handoff tags & follow-ups',
      'Team analytics dashboard',
      'Role-based permissions',
      'SMTP email support',
      'CSV bulk import',
    ],
    cta: 'Start Team Trial',
    ctaLink: '/contact-sales?plan=team',
    highlighted: false,
    minSeats: '3 seat minimum',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Compliance-ready for large organizations',
    features: [
      'Everything in Team',
      'SSO/SAML (via WorkOS)',
      'SCIM provisioning',
      'Audit logs',
      'Data residency (US/EU/APAC)',
      'Custom AI prompts',
      'Custom branding (50+ seats)',
      'GDPR data export',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact-sales?plan=enterprise',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-gray-600">
            Start free. Upgrade when you need AI prep, voice notes, and team features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                plan.highlighted
                  ? 'border-blue-600 ring-2 ring-blue-600 relative'
                  : 'border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-gray-500">{plan.period}</span>
              </div>
              {plan.annualPrice && (
                <p className="text-sm text-gray-500 mb-2">{plan.annualPrice}</p>
              )}
              {plan.minSeats && (
                <p className="text-sm text-gray-500 mb-2">{plan.minSeats}</p>
              )}
              <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg
                      className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaLink}
                className={`block text-center py-3 rounded-lg font-medium transition ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
