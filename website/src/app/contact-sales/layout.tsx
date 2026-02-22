import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Sales — Get a Custom PrepMeet Plan',
  description:
    'Talk to the PrepMeet sales team about Team and Enterprise plans. Get custom pricing, SSO, HIPAA compliance, and dedicated onboarding for your organization.',
  alternates: {
    canonical: 'https://prepmeet.com/contact-sales',
  },
  openGraph: {
    title: 'Contact Sales — Get a Custom PrepMeet Plan',
    description:
      'Talk to the PrepMeet sales team about Team and Enterprise plans with custom pricing and dedicated onboarding.',
    url: 'https://prepmeet.com/contact-sales',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact PrepMeet Sales',
    description:
      'Get custom pricing, SSO, HIPAA compliance, and dedicated onboarding for your organization.',
  },
};

export default function ContactSalesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
